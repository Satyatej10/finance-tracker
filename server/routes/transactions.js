const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const authMiddleware = require('../middlewares/authMiddleware');

// Add income/expense
router.post('/', authMiddleware, transactionController.addTransaction);
// List transactions (paginated, filterable)
router.get('/', authMiddleware, transactionController.getTransactions);
// Summary analytics
router.get('/summary', authMiddleware, transactionController.getSummary);

module.exports = router;
