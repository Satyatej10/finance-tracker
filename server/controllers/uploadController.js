const path = require('path');
const fs = require('fs').promises;
const Tesseract = require('tesseract.js');
const pdfParse = require('pdf-parse');
const Transaction = require('../models/Transaction');

exports.uploadReceipt = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const filePath = req.file.path;
    let text = '';
    if (req.file.mimetype === 'application/pdf') {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdfParse(dataBuffer);
      text = data.text;
    } else {
      const result = await Tesseract.recognize(filePath, 'eng');
      text = result.data.text;
    }
    // Parse text to extract transaction details
    const parsedData = parseReceiptText(text);
    if (parsedData) {
      const transaction = new Transaction({
        userId: req.user.userId,
        type: 'expense',
        amount: parsedData.amount,
        category: parsedData.category || 'Other',
        date: parsedData.date || new Date(),
        description: parsedData.description || `Receipt from ${req.file.originalname}`,
      });
      await transaction.save();
    }
    await fs.unlink(filePath).catch(err => console.error('File deletion error:', err));
    res.json({ text, transaction: parsedData });
  } catch (err) {
    await fs.unlink(req.file?.path).catch(() => {});
    next(err);
  }
};

exports.uploadPdfHistory = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const filePath = req.file.path;
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdfParse(dataBuffer);
    const transactions = parsePdfHistory(data.text);
    const savedTransactions = [];
    for (const tx of transactions) {
      const transaction = new Transaction({
        userId: req.user.userId,
        type: tx.type || 'expense',
        amount: tx.amount,
        category: tx.category || 'Other',
        date: tx.date || new Date(),
        description: tx.description || `PDF transaction from ${req.file.originalname}`,
      });
      await transaction.save();
      savedTransactions.push(transaction);
    }
    await fs.unlink(filePath).catch(err => console.error('File deletion error:', err));
    res.json({ text: data.text, transactions: savedTransactions });
  } catch (err) {
    await fs.unlink(req.file?.path).catch(() => {});
    next(err);
  }
};

// Simple text parsing for receipts (customize based on receipt format)
function parseReceiptText(text) {
  const amountMatch = text.match(/total[:\s]*\$?(\d+\.?\d*)/i);
  const dateMatch = text.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/);
  const categoryMatch = text.match(/restaurant|grocer|transport|shop|health|entertain/i);
  return {
    amount: amountMatch ? parseFloat(amountMatch[1]) : 0,
    date: dateMatch ? new Date(dateMatch[0]) : new Date(),
    category: categoryMatch ? categoryMatch[0].toLowerCase() : 'Other',
    description: text.slice(0, 100),
  };
}

// Simple PDF history parsing (assumes tabular format, customize as needed)
function parsePdfHistory(text) {
  const lines = text.split('\n').filter(line => line.trim());
  const transactions = [];
  for (const line of lines) {
    const parts = line.split(/\s+/);
    if (parts.length >= 4) {
      const dateMatch = parts[0].match(/\d{1,2}\/\d{1,2}\/\d{2,4}/);
      const amountMatch = parts.find(p => p.match(/\$?\d+\.?\d*/));
      if (dateMatch && amountMatch) {
        transactions.push({
          date: new Date(parts[0]),
          amount: parseFloat(amountMatch.replace('$', '')),
          category: parts.find(p => p.match(/restaurant|grocer|transport|shop|health|entertain/i))?.toLowerCase() || 'Other',
          description: parts.join(' ').slice(0, 100),
        });
      }
    }
  }
  return transactions;
}