const multer = require('multer');
const Tesseract = require('tesseract.js');
const pdfParse = require('pdf-parse');
const Transaction = require('../models/Transaction');
const fs = require('fs');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|pdf/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('File type not supported. Please upload a JPEG, PNG, or PDF.'));
  },
});

exports.uploadReceipt = [
  upload.single('receipt'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        console.log('uploadReceipt: No file uploaded');
        return res.status(400).json({ message: 'No file uploaded' });
      }
      const filePath = path.join(__dirname, '../uploads', req.file.filename);
      let text;
      try {
        if (req.file.mimetype === 'application/pdf') {
          console.log('uploadReceipt: Processing PDF:', req.file.filename);
          const dataBuffer = fs.readFileSync(filePath);
          const data = await pdfParse(dataBuffer, { max: 1 }); // Limit to first page for simplicity
          text = data.text;
        } else {
          console.log('uploadReceipt: Processing image with Tesseract:', req.file.filename);
          const { data: { text: ocrText } } = await Tesseract.recognize(filePath, 'eng', {
            tessedit_char_whitelist: '0123456789.$/abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
          });
          text = ocrText;
        }
        console.log('uploadReceipt: Extracted text:', text);
      } catch (err) {
        console.error('uploadReceipt: Text extraction failed:', err.message);
        fs.unlinkSync(filePath);
        return res.status(500).json({ message: 'Failed to process file. Please ensure the file is clear and contains readable text.' });
      }
      const transaction = parseReceiptText(text);
      transaction.userId = req.user.userId;
      console.log('uploadReceipt: Parsed transaction:', transaction);
      if (transaction.amount <= 0 && transaction.type === 'expense') {
        fs.unlinkSync(filePath);
        return res.status(400).json({ message: 'Invalid transaction amount for expense' });
      }
      const savedTransaction = await new Transaction(transaction).save();
      fs.unlinkSync(filePath);
      res.json(savedTransaction);
    } catch (err) {
      console.error('uploadReceipt: Error:', err.message);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      next(err);
    }
  }
];

function parseReceiptText(text) {
  // Normalize text to lowercase for case-insensitive matching
  const normalizedText = text.toLowerCase();

  // Determine transaction type and category
  let type = 'expense';
  let category = 'Uncategorized';
  if (normalizedText.includes('refund') ||
      normalizedText.includes('credit') ||
      normalizedText.includes('payment received') ||
      normalizedText.includes('deposit') ||
      normalizedText.match(/-\$\d+\.\d{2}/)) {
    type = 'income';
    category = 'Income';
  } else {
    // Assign expense sub-categories based on keywords
    if (normalizedText.includes('grocery') || normalizedText.includes('supermarket') || normalizedText.includes('market')) {
      category = 'Grocery';
    } else if (normalizedText.includes('restaurant') || normalizedText.includes('diner') || normalizedText.includes('cafe')) {
      category = 'Dining';
    } else if (normalizedText.includes('fuel') || normalizedText.includes('gas') || normalizedText.includes('petrol')) {
      category = 'Fuel';
    } else if (normalizedText.includes('utility') || normalizedText.includes('bill') || normalizedText.includes('electricity')) {
      category = 'Utilities';
    }
  }

  // Extract amount (e.g., $12.34, -$12.34, Total: 12.34, 12.34 USD)
  const amountMatch = text.match(/(?:Total|Subtotal|Amount|Paid|Refund|Credit)[:\s]*[+-]?\s*\$?\s*(\d+\.\d{2})(?:\s*USD)?/i) ||
                      text.match(/[+-]?\s*\$?\s*(\d+\.\d{2})/i);
  const amount = amountMatch ? Math.abs(parseFloat(amountMatch[1])) : 0; // Use absolute value for consistency

  // Extract date (e.g., MM/DD/YYYY, MM-DD-YYYY, DD MMM YYYY)
  const dateMatch = text.match(/\d{2}[\/-]\d{2}[\/-]\d{4}/) || // MM/DD/YYYY or MM-DD-YYYY
                    text.match(/\d{2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}/i); // DD MMM YYYY
  let date;
  if (dateMatch) {
    date = dateMatch[0].includes('/') || dateMatch[0].includes('-') ?
      new Date(dateMatch[0].replace(/-/g, '/')) :
      new Date(dateMatch[0]);
    if (isNaN(date)) date = new Date(); // Fallback to current date if invalid
  } else {
    date = new Date(); // Fallback to current date
  }

  // Extract place/company name (e.g., Merchant: Walmart, or first line)
  const placeMatch = text.match(/(?:Merchant|Store|Vendor|Company)[:\s]*(.*)/i) ||
                     text.match(/(.*?)\n/);
  const description = placeMatch ? placeMatch[1].trim() : 'Unknown Place';

  // Handle tabular data in PDFs (basic row parsing)
  const transactions = [];
  const lines = text.split('\n').filter(line => line.trim());
  let isTable = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Detect table-like structure (e.g., lines with amount and date)
    const rowAmount = line.match(/[+-]?\s*\$?\s*(\d+\.\d{2})(?:\s*USD)?/i);
    const rowDate = line.match(/\d{2}[\/-]\d{2}[\/-]\d{4}/) || line.match(/\d{2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}/i);
    if (rowAmount && rowDate) {
      isTable = true;
      const rowType = line.toLowerCase().includes('refund') || line.toLowerCase().includes('credit') || line.match(/-\$\d+\.\d{2}/) ? 'income' : 'expense';
      const rowCategory = rowType === 'income' ? 'Income' : category; // Use same category logic
      const rowDate = rowDate[0].includes('/') || rowDate[0].includes('-') ?
        new Date(rowDate[0].replace(/-/g, '/')) :
        new Date(rowDate[0]);
      transactions.push({
        type: rowType,
        amount: Math.abs(parseFloat(rowAmount[1])),
        category: rowCategory,
        date: isNaN(rowDate) ? new Date() : rowDate,
        description: description || 'Table Entry',
        userId: null, // Set later
      });
    }
  }

  // Return single transaction if not a table, or first valid transaction from table
  if (isTable && transactions.length > 0) {
    return transactions[0]; // Return first transaction for simplicity; extend to handle multiple if needed
  }

  return {
    type,
    amount,
    category,
    date,
    description,
  };
}