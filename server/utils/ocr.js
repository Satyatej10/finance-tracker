const Tesseract = require('tesseract.js');
const pdfParse = require('pdf-parse');
const fs = require('fs');

exports.extractTextFromImage = async (filePath) => {
  const result = await Tesseract.recognize(filePath, 'eng');
  return result.data.text;
};

exports.extractTextFromPdf = async (filePath) => {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return data.text;
};
