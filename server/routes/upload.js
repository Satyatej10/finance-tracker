const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const uploadController = require('../controllers/uploadController');
const authMiddleware = require('../middlewares/authMiddleware');

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Upload receipt (image/pdf)
router.post('/upload', authMiddleware, upload.single('file'), uploadController.uploadReceipt);
// Upload transaction history PDF
router.post('/upload-pdf-history', authMiddleware, upload.single('file'), uploadController.uploadPdfHistory);

module.exports = router;
