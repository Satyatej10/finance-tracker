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
          const data = await pdfParse(dataBuffer, { max: 1 });
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
      const transactions = parseReceiptText(text, req.user.userId);
      if (transactions.length === 0) {
        fs.unlinkSync(filePath);
        return res.status(400).json({ message: 'No valid transactions found in the receipt' });
      }
      const savedTransactions = [];
      for (const transaction of transactions) {
        if (transaction.amount <= 0 && transaction.type === 'expense') {
          console.log('uploadReceipt: Skipping invalid expense transaction:', transaction);
          continue;
        }
        const savedTransaction = await new Transaction(transaction).save();
        savedTransactions.push(savedTransaction);
      }
      fs.unlinkSync(filePath);
      if (savedTransactions.length === 0) {
        return res.status(400).json({ message: 'No valid transactions saved' });
      }
      res.json(savedTransactions[0]); // Return first transaction for single receipt
    } catch (err) {
      console.error('uploadReceipt: Error:', err.message);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      next(err);
    }
  }
];

exports.uploadPdfHistory = [
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        console.log('uploadPdfHistory: No file uploaded');
        return res.status(400).json({ message: 'No file uploaded' });
      }
      const filePath = path.join(__dirname, '../uploads', req.file.filename);
      let text;
      try {
        console.log('uploadPdfHistory: Processing PDF:', req.file.filename);
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer); // Process all pages
        text = data.text;
        console.log('uploadPdfHistory: Extracted text:', text);
      } catch (err) {
        console.error('uploadPdfHistory: Text extraction failed:', err.message);
        fs.unlinkSync(filePath);
        return res.status(500).json({ message: 'Failed to process PDF. Please ensure the file contains readable text.' });
      }
      const transactions = parseReceiptText(text, req.user.userId);
      if (transactions.length === 0) {
        fs.unlinkSync(filePath);
        return res.status(400).json({ message: 'No valid transactions found in the PDF' });
      }
      const savedTransactions = [];
      for (const transaction of transactions) {
        if (transaction.amount <= 0 && transaction.type === 'expense') {
          console.log('uploadPdfHistory: Skipping invalid expense transaction:', transaction);
          continue;
        }
        const savedTransaction = await new Transaction(transaction).save();
        savedTransactions.push(savedTransaction);
      }
      fs.unlinkSync(filePath);
      if (savedTransactions.length === 0) {
        return res.status(400).json({ message: 'No valid transactions saved' });
      }
      res.json(savedTransactions); // Return all transactions for history
    } catch (err) {
      console.error('uploadPdfHistory: Error:', err.message);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      next(err);
    }
  }
];

function parseReceiptText(text, userId) {
  const normalizedText = text.toLowerCase();
  const transactions = [];
  let defaultDescription = 'Unknown Place';
  let defaultCategory = 'Uncategorized';

  // Extract default place/company name
  const placeMatch = text.match(/(?:Merchant|Store|Vendor|Company)[:\s]*(.*)/i) ||
                     text.match(/(.*?)\n/);
  if (placeMatch) {
    defaultDescription = placeMatch[1].trim();
  }

  // Determine default category for expenses
  if (normalizedText.includes('grocery') || normalizedText.includes('supermarket') || normalizedText.includes('market')) {
    defaultCategory = 'Grocery';
  } else if (normalizedText.includes('restaurant') || normalizedText.includes('diner') || normalizedText.includes('cafe')) {
    defaultCategory = 'Dining';
  } else if (normalizedText.includes('fuel') || normalizedText.includes('gas') || normalizedText.includes('petrol')) {
    defaultCategory = 'Fuel';
  } else if (normalizedText.includes('utility') || normalizedText.includes('bill') || normalizedText.includes('electricity')) {
    defaultCategory = 'Utilities';
  }

  // Handle tabular data (e.g., transaction history)
  const lines = text.split('\n').filter(line => line.trim());
  let isTable = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const rowAmount = line.match(/[+-]?\s*\$?\s*(\d+\.\d{2})(?:\s*USD)?/i);
    const rowDate = line.match(/\d{2}[\/-]\d{2}[\/-]\d{4}/) || 
                    line.match(/\d{2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}/i);
    const rowDescription = line.match(/(?:[A-Za-z\s]+)(?=\s+\d{2}[\/-])/i) || // Description before date
                          line.match(/(?:[A-Za-z\s]+)(?=\s+[+-]?\s*\$?\s*\d+\.\d{2})/i); // Description before amount
    if (rowAmount && rowDate) {
      isTable = true;
      const rowType = line.toLowerCase().includes('refund') || 
                      line.toLowerCase().includes('credit') || 
                      line.toLowerCase().includes('payment received') || 
                      line.toLowerCase().includes('deposit') || 
                      line.match(/-\$\d+\.\d{2}/) ? 'income' : 'expense';
      const rowCategory = rowType === 'income' ? 'Income' : defaultCategory;
      const rowDate = rowDate[0].includes('/') || rowDate[0].includes('-') ?
        new Date(rowDate[0].replace(/-/g, '/')) :
        new Date(rowDate[0]);
      transactions.push({
        type: rowType,
        amount: Math.abs(parseFloat(rowAmount[1])),
        category: rowCategory,
        date: isNaN(rowDate) ? new Date() : rowDate,
        description: rowDescription ? rowDescription[0].trim() : defaultDescription,
        userId,
      });
    }
  }

  // Handle single transaction (non-tabular receipt)
  if (!isTable) {
    let type = 'expense';
    let category = defaultCategory;
    if (normalizedText.includes('refund') ||
        normalizedText.includes('credit') ||
        normalizedText.includes('payment received') ||
        normalizedText.includes('deposit') ||
        normalizedText.match(/-\$\d+\.\d{2}/)) {
      type = 'income';
      category = 'Income';
    }
    const amountMatch = text.match(/(?:Total|Subtotal|Amount|Paid|Refund|Credit)[:\s]*[+-]?\s*\$?\s*(\d+\.\d{2})(?:\s*USD)?/i) ||
                        text.match(/[+-]?\s*\$?\s*(\d+\.\d{2})/i);
    const amount = amountMatch ? Math.abs(parseFloat(amountMatch[1])) : 0;
    const dateMatch = text.match(/\d{2}[\/-]\d{2}[\/-]\d{4}/) ||
                      text.match(/\d{2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}/i);
    let date = new Date();
    if (dateMatch) {
      date = dateMatch[0].includes('/') || dateMatch[0].includes('-') ?
        new Date(dateMatch[0].replace(/-/g, '/')) :
        new Date(dateMatch[0]);
      if (isNaN(date)) date = new Date();
    }
    if (amount > 0) {
      transactions.push({
        type,
        amount,
        category,
        date,
        description: defaultDescription,
        userId,
      });
    }
  }

  return transactions;
}