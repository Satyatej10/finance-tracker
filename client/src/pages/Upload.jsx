import React, { useState } from 'react';
import { uploadReceipt, uploadPdfHistory } from '../services/upload';

function Upload() {
  const [file, setFile] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [ocrResult, setOcrResult] = useState(null);
  const [pdfResult, setPdfResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleReceiptUpload = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setOcrResult(null);
    const token = localStorage.getItem('token');
    if (!token) {
      setError('You must be logged in.');
      setLoading(false);
      return;
    }
    try {
      const res = await uploadReceipt(file, token);
      setOcrResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'OCR failed');
    }
    setLoading(false);
  };

  const handlePdfUpload = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setPdfResult(null);
    const token = localStorage.getItem('token');
    if (!token) {
      setError('You must be logged in.');
      setLoading(false);
      return;
    }
    try {
      const res = await uploadPdfHistory(pdfFile, token);
      setPdfResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'PDF extraction failed');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-lg mx-auto bg-white p-8 rounded-lg shadow-lg mt-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Upload Receipts/History</h1>
      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
      <form onSubmit={handleReceiptUpload} className="mb-6">
        <label className="block mb-2 font-semibold text-gray-700">Upload Receipt (Image/PDF for OCR):</label>
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={e => setFile(e.target.files[0])}
          className="mb-4 w-full"
          required
        />
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700 transition duration-200 disabled:bg-blue-300"
          disabled={loading}
        >
          {loading ? 'Uploading...' : 'Upload & OCR'}
        </button>
      </form>
      {ocrResult && (
        <div className="bg-gray-100 p-4 rounded mb-6">
          <div className="font-semibold text-gray-700 mb-2">Extracted Transaction:</div>
          {ocrResult.transaction ? (
            <div className="text-sm text-gray-600">
              <p>Amount: ${ocrResult.transaction.amount.toFixed(2)}</p>
              <p>Category: {ocrResult.transaction.category}</p>
              <p>Date: {new Date(ocrResult.transaction.date).toLocaleDateString()}</p>
              <p>Description: {ocrResult.transaction.description}</p>
              <p className="mt-2">Raw Text: <pre className="whitespace-pre-wrap">{ocrResult.text}</pre></p>
            </div>
          ) : (
            <p className="text-sm text-gray-600">Raw Text: <pre className="whitespace-pre-wrap">{ocrResult.text}</pre></p>
          )}
        </div>
      )}
      <form onSubmit={handlePdfUpload}>
        <label className="block mb-2 font-semibold text-gray-700">Upload Transaction History PDF:</label>
        <input
          type="file"
          accept="application/pdf"
          onChange={e => setPdfFile(e.target.files[0])}
          className="mb-4 w-full"
          required
        />
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700 transition duration-200 disabled:bg-blue-300"
          disabled={loading}
        >
          {loading ? 'Uploading...' : 'Upload & Extract'}
        </button>
      </form>
      {pdfResult && (
        <div className="bg-gray-100 p-4 rounded mt-6">
          <div className="font-semibold text-gray-700 mb-2">Extracted Transactions:</div>
          {pdfResult.transactions && pdfResult.transactions.length > 0 ? (
            <div className="text-sm text-gray-600">
              {pdfResult.transactions.map((tx, index) => (
                <div key={index} className="mb-2">
                  <p>Transaction {index + 1}:</p>
                  <p>Amount: ${tx.amount.toFixed(2)}</p>
                  <p>Category: {tx.category}</p>
                  <p>Date: {new Date(tx.date).toLocaleDateString()}</p>
                  <p>Description: {tx.description}</p>
                </div>
              ))}
              <p className="mt-2">Raw Text: <pre className="whitespace-pre-wrap">{pdfResult.text}</pre></p>
            </div>
          ) : (
            <p className="text-sm text-gray-600">Raw Text: <pre className="whitespace-pre-wrap">{pdfResult.text}</pre></p>
          )}
        </div>
      )}
    </div>
  );
}

export default Upload;