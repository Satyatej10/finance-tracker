import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadReceipt, uploadPdfHistory } from '../services/upload';

function Upload() {
  const [file, setFile] = useState(null);
  const [uploadType, setUploadType] = useState('receipt');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in to upload files.');
        setLoading(false);
        navigate('/login');
        return;
      }
      console.log(`Upload: Sending ${uploadType} with token:`, token);
      const res = uploadType === 'receipt' ?
        await uploadReceipt(file, token) :
        await uploadPdfHistory(file, token);
      setSuccess(uploadType === 'receipt' ?
        'Receipt uploaded successfully' :
        `Transaction history uploaded successfully (${res.data.length} transactions)`);
      setFile(null);
    } catch (err) {
      console.error('Upload: Error:', err);
      setError(err.response?.data?.message || 'Failed to upload file');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-lg mt-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Upload Receipt or Transaction History</h1>
      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-100 text-green-700 p-4 rounded mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          {success}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="text-gray-700 font-semibold mr-2">Upload Type:</label>
          <select
            className="border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500"
            value={uploadType}
            onChange={e => setUploadType(e.target.value)}
          >
            <option value="receipt">Single Receipt</option>
            <option value="history">Transaction History</option>
          </select>
        </div>
        <input
          type="file"
          accept="image/*,application/pdf"
          className="w-full border border-gray-300 p-3 rounded"
          onChange={e => setFile(e.target.files[0])}
        />
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700 transition duration-200 disabled:bg-blue-300"
          disabled={loading}
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <svg className="animate-spin h-5 w-5 mr-2 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h8a8 8 0 01-8 8v-8H4z" />
              </svg>
              Uploading...
            </div>
          ) : (
            'Upload'
          )}
        </button>
      </form>
    </div>
  );
}

export default Upload;