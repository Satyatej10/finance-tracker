import axios from 'axios';
const API_URL = 'https://finance-tracker-one-sable.vercel.app/api/transactions';

export const uploadReceipt = async (file, token) => {
  const formData = new FormData();
  formData.append('file', file);
  console.log('uploadReceipt: Sending request with token:', token);
  return axios.post(`${API_URL}/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      Authorization: `Bearer ${token}`,
    },
  });
};

export const uploadPdfHistory = async (file, token) => {
  const formData = new FormData();
  formData.append('file', file);
  console.log('uploadPdfHistory: Sending request with token:', token);
  return axios.post(`${API_URL}/upload-pdf-history`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      Authorization: `Bearer ${token}`,
    },
  });
};