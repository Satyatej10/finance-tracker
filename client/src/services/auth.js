import axios from 'axios';

const API_URL = 'http://localhost:5000/api/auth';

export const register = async (name, email, password) => {
  return axios.post(`${API_URL}/register`, { name, email, password });
};

export const login = async (email, password) => {
  return axios.post(`${API_URL}/login`, { email, password });
};

export const updatePassword = async (currentPassword, newPassword, token) => {
  return axios.put(`${API_URL}/password`, { currentPassword, newPassword }, {
    headers: { Authorization: `Bearer ${token}` },
  });
};