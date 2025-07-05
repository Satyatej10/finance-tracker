import React, { useState } from 'react';
import { addTransaction } from '../services/transactions';

const categories = [
  'Salary', 'Business', 'Food', 'Transport', 'Shopping', 'Health', 'Entertainment', 'Other'
];

function AddTransaction() {
  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    const token = localStorage.getItem('token');
    if (!token) {
      setError('You must be logged in.');
      setLoading(false);
      return;
    }
    if (parseFloat(amount) <= 0) {
      setError('Amount must be greater than 0.');
      setLoading(false);
      return;
    }
    try {
      await addTransaction({ type, amount: parseFloat(amount), category, date, description }, token);
      setSuccess('Transaction added successfully!');
      setAmount('');
      setCategory('');
      setDate('');
      setDescription('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add transaction');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-lg mx-auto bg-white p-8 rounded-lg shadow-lg mt-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Add Transaction</h1>
      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
      {success && <div className="bg-green-100 text-green-700 p-3 rounded mb-4">{success}</div>}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex gap-6">
          <label className="flex items-center">
            <input
              type="radio"
              value="income"
              checked={type === 'income'}
              onChange={() => setType('income')}
              className="mr-2"
            />
            Income
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="expense"
              checked={type === 'expense'}
              onChange={() => setType('expense')}
              className="mr-2"
            />
            Expense
          </label>
        </div>
        <input
          type="number"
          placeholder="Amount"
          className="w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-blue-500"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          required
          min="0.01"
          step="0.01"
        />
        <select
          className="w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-blue-500"
          value={category}
          onChange={e => setCategory(e.target.value)}
          required
        >
          <option value="">Select Category</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <input
          type="date"
          className="w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-blue-500"
          value={date}
          onChange={e => setDate(e.target.value)}
          required
          max={new Date().toISOString().split('T')[0]}
        />
        <input
          type="text"
          placeholder="Description (optional)"
          className="w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-blue-500"
          value={description}
          onChange={e => setDescription(e.target.value)}
        />
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700 transition duration-200 disabled:bg-blue-300"
          disabled={loading}
        >
          {loading ? 'Adding...' : 'Add Transaction'}
        </button>
      </form>
    </div>
  );
}

export default AddTransaction;