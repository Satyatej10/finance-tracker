import axios from 'axios';

const API_URL = 'http://localhost:5000/api/transactions';

export const uploadReceipt = async (file, token) => {
  const formData = new FormData();
  formData.append('file', file);
  return axios.post(`${API_URL}/upload`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const uploadPdfHistory = async (file, token) => {
  const formData = new FormData();
  formData.append('file', file);
  return axios.post(`${API_URL}/upload-pdf-history`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
  });
};