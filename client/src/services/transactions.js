import axios from 'axios';

const API_URL = 'http://localhost:5000/api/transactions';

export const addTransaction = async (transaction, token) => {
  console.log('addTransaction: Sending request with token:', token);
  return axios.post(API_URL, transaction, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const getTransactions = async (params, token) => {
  console.log('getTransactions: Sending request with token:', token, 'Params:', params);
  return axios.get(API_URL, {
    params,
    headers: { Authorization: `Bearer ${token}` },
  });
};

export const getSummary = async (token) => {
  console.log('getSummary: Sending request with token:', token);
  if (!token) {
    console.error('getSummary: No token provided');
    throw new Error('No authentication token provided');
  }
  return axios.get(`${API_URL}/summary`, {
    headers: { Authorization: `Bearer ${token}` },
  });
};