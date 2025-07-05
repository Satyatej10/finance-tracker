const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');

// Add income/expense
exports.addTransaction = async (req, res, next) => {
  try {
    const { type, amount, category, date, description } = req.body;
    if (!type || !amount || !category || !date) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({ message: 'Invalid transaction type' });
    }
    if (amount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0' });
    }
    const transaction = new Transaction({
      userId: req.user.userId,
      type,
      amount: parseFloat(amount),
      category,
      date: new Date(date),
      description
    });
    await transaction.save();
    res.status(201).json(transaction);
  } catch (err) {
    next(err);
  }
};

// List transactions with pagination and date filter
exports.getTransactions = async (req, res, next) => {
  try {
    const { startDate, endDate, page = 1, limit = 10 } = req.query;
    const filter = { userId: req.user.userId };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Transaction.countDocuments(filter);
    const transactions = await Transaction.find(filter)
      .sort({ date: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    res.json({ total, page: parseInt(page), limit: parseInt(limit), transactions });
  } catch (err) {
    next(err);
  }
};

// Summary analytics
exports.getSummary = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    console.log('getSummary: Processing for userId:', userId); // Debug logging
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.log('getSummary: Invalid user ID:', userId);
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    const summary = await Transaction.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: { category: '$category', type: '$type' },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.type': 1, '_id.category': 1 } }
    ]);
    console.log('getSummary: Aggregation result:', summary);
    res.json(summary);
  } catch (err) {
    console.log('getSummary: Error:', err.message);
    next(err);
  }
};