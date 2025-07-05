import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSummary } from '../services/transactions';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function Reports() {
  const [summary, setSummary] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('monthly');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('Reports: No token found, redirecting to login');
        setError('Please log in to view reports.');
        setLoading(false);
        navigate('/login');
        return;
      }
      try {
        console.log('Reports: Fetching summary with token:', token);
        const res = await getSummary(token);
        setSummary(res.data);
      } catch (err) {
        console.error('Reports: Error fetching summary:', err);
        const message = err.response?.data?.message || 'Failed to load report data. Please try again.';
        setError(message);
        if (err.response?.status === 401) {
          console.log('Reports: 401 Unauthorized, clearing localStorage and redirecting');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
        }
      }
      setLoading(false);
    };
    fetchSummary();
  }, [navigate]);

  const filteredData = summary
    .filter(s => s._id.type === 'expense')
    .map(s => ({
      name: s._id.category,
      value: s.total
    }));

  return (
    <div className="mt-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Reports</h1>
      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}
      <div className="mb-6">
        <label className="text-gray-700 font-semibold mr-2">Select Timeframe:</label>
        <select
          className="border border-gray-300 p-2 rounded focus:ring-2 focus:ring-blue-500"
          value={timeframe}
          onChange={e => setTimeframe(e.target.value)}
        >
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>
      </div>
      {loading ? (
        <div className="text-center text-gray-600 flex items-center justify-center">
          <svg className="animate-spin h-5 w-5 mr-2 text-blue-600" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h8a8 8 0 01-8 8v-8H4z" />
          </svg>
          Loading...
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Expense Breakdown ({timeframe})</h2>
          {filteredData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={filteredData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                <Legend />
                <Bar dataKey="value" fill="#00C49F" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-gray-500 text-center">No expense data available</div>
          )}
        </div>
      )}
    </div>
  );
}

export default Reports;