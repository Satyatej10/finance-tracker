const Tesseract = require('tesseract.js');
const pdfParse = require('pdf-parse');
const Transaction = require('../models/Transaction');
const fs = require('fs');
const path = require('path');

/**
 * Handles the upload and OCR/text extraction for a single receipt (image or single-page PDF).
 */
exports.uploadReceipt = async (req, res, next) => {
  const filePath = req.file ? path.join(__dirname, '../uploads', req.file.filename) : null;
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    let text;
    try {
      if (req.file.mimetype === 'application/pdf') {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer, { max: 1 });
        text = data.text;
      } else {
        const { data: { text: ocrText } } = await Tesseract.recognize(filePath, 'eng');
        text = ocrText;
      }
    } catch (err) {
      console.error('uploadReceipt: Text extraction failed:', err.message);
      if (filePath) fs.unlinkSync(filePath);
      return res.status(500).json({ message: 'Failed to process file.' });
    }
    
    // Use the original parser for single receipts
    const transactions = parseReceiptText(text, req.user.userId);
    if (transactions.length === 0) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ message: 'No valid transactions found in the receipt' });
    }
    
    const savedTransaction = await new Transaction(transactions[0]).save();
    fs.unlinkSync(filePath);
    res.json(savedTransaction);
  } catch (err) {
    console.error('uploadReceipt: Error:', err.message);
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    next(err);
  }
};

/**
 * Handles the upload and parsing of a multi-page PDF transaction history (bank statement).
 */
exports.uploadPdfHistory = async (req, res, next) => {
  const filePath = req.file ? path.join(__dirname, '../uploads', req.file.filename) : null;
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Crucial: Validate that the file is a PDF
    if (req.file.mimetype !== 'application/pdf') {
      fs.unlinkSync(filePath);
      return res.status(400).json({ message: 'Invalid file type. Only PDF files are allowed for history upload.' });
    }
    
    let text;
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer); // Process all pages
      text = data.text;
    } catch (err) {
      console.error('uploadPdfHistory: Text extraction failed:', err.message);
      if (filePath) fs.unlinkSync(filePath);
      return res.status(500).json({ message: 'Failed to process PDF. The file may be corrupt.' });
    }
    
    // Use the new, specialized parser for tabular data
    const transactions = parseTransactionHistoryPdf(text, req.user.userId);
    if (transactions.length === 0) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ message: 'No valid transactions found in the PDF' });
    }
    
    // Save all found transactions to the database
    const savedTransactions = await Transaction.insertMany(transactions);
    
    fs.unlinkSync(filePath);
    res.json(savedTransactions);
  } catch (err) {
    console.error('uploadPdfHistory: Error:', err.message);
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    next(err);
  }
};


/**
 * NEW, SPECIALIZED PARSER for tabular transaction history from a PDF.
 */
function parseTransactionHistoryPdf(text, userId) {
  const transactions = [];
  const lines = text.split('\n');

  // Regex to find a date in formats like 01/15/2023, 15-01-2023, or Jan 15, 2023
  const dateRegex = /(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})/i;
  // Regex to find a monetary amount, handling commas, e.g., 1,234.56 or 50.00
  const amountRegex = /([+-]?\s*\$?\s*\d{1,3}(?:,\d{3})*\.\d{2})/;

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // A transaction line must have a date and an amount. This filters out most headers/footers.
    const dateMatch = trimmedLine.match(dateRegex);
    const amountMatch = trimmedLine.match(amountRegex);

    if (dateMatch && amountMatch) {
      try {
        const date = new Date(dateMatch[0].replace(/-/g, '/'));
        // If the date is invalid, skip this line
        if (isNaN(date.getTime())) continue;

        const amountStr = amountMatch[0].replace(/[^0-9.-]+/g, "");
        const amount = parseFloat(amountStr);
        if (isNaN(amount) || amount === 0) continue;
        
        // The description is what's left of the line after removing the date and amount
        let description = trimmedLine
          .replace(dateMatch[0], '')
          .replace(amountMatch[0], '')
          .replace(/\s{2,}/g, ' ') // Replace multiple spaces with a single space
          .trim();

        // If description is just numbers or very short, it's likely not a real description
        if (/^\d+$/.test(description) || description.length < 3) {
            description = "Unspecified Transaction";
        }
        
        // Determine transaction type. Look for keywords or negative sign.
        const isIncome = /credit|cr|deposit|payment/i.test(trimmedLine) || amount > 0;
        const type = isIncome ? 'income' : 'expense';
        
        const finalAmount = Math.abs(amount);

        transactions.push({
          userId,
          date,
          amount: finalAmount,
          description,
          type,
          category: type === 'income' ? 'Income' : 'Uncategorized', // Default category
        });
      } catch (e) {
        console.log(`Skipping a line due to parsing error: ${trimmedLine}`);
      }
    }
  }
  return transactions;
}

/**
 * Original parser, best for simple, non-tabular receipts.
 */
function parseReceiptText(text, userId) {
  const normalizedText = text.toLowerCase();
  const transactions = [];
  let defaultDescription = 'Scanned Receipt';
  let defaultCategory = 'Uncategorized';

  // Determine default category for expenses
  if (normalizedText.includes('grocery') || normalizedText.includes('market')) {
    defaultCategory = 'Grocery';
  } else if (normalizedText.includes('restaurant') || normalizedText.includes('cafe')) {
    defaultCategory = 'Dining';
  } else if (normalizedText.includes('fuel') || normalizedText.includes('gas')) {
    defaultCategory = 'Fuel';
  }

  // Find the most likely total amount
  const amountMatch = text.match(/(?:Total|Amount|Paid)[:\s]*[+-]?\s*\$?\s*(\d+\.\d{2})/i) || text.match(/[+-]?\s*\$?\s*(\d+\.\d{2})/);
  const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;

  // Find a date
  const dateMatch = text.match(/\d{2}[\/-]\d{2}[\/-]\d{4}/);
  let date = new Date();
  if (dateMatch) {
    const parsedDate = new Date(dateMatch[0].replace(/-/g, '/'));
    if (!isNaN(parsedDate.getTime())) {
      date = parsedDate;
    }
  }

  if (amount > 0) {
    transactions.push({
      type: 'expense',
      amount,
      category: defaultCategory,
      date,
      description: defaultDescription,
      userId,
    });
  }

  return transactions;
}