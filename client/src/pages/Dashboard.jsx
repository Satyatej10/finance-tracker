import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSummary } from '../services/transactions';
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28CFE', '#FF6699', '#33CC99', '#FF4444'];

function Dashboard() {
  const [summary, setSummary] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('Dashboard: No token found, redirecting to login');
        setError('Please log in to view your dashboard.');
        setLoading(false);
        navigate('/login');
        return;
      }
      try {
        console.log('Dashboard: Fetching summary with token:', token);
        const res = await getSummary(token);
        setSummary(res.data);
      } catch (err) {
        console.error('Dashboard: Error fetching summary:', err);
        const message = err.response?.data?.message || 'Failed to load dashboard data. Please try again.';
        setError(message);
        if (err.response?.status === 401) {
          console.log('Dashboard: 401 Unauthorized, clearing localStorage and redirecting');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
        }
      }
      setLoading(false);
    };
    fetchSummary();
  }, [navigate]);

  const categoryData = summary.filter(s => s._id.type === 'expense').map(s => ({
    name: s._id.category,
    value: s.total
  }));
  const incomeExpenseData = [
    { name: 'Income', value: summary.filter(s => s._id.type === 'income').reduce((a, b) => a + b.total, 0) },
    { name: 'Expense', value: summary.filter(s => s._id.type === 'expense').reduce((a, b) => a + b.total, 0) }
  ];

  return (
    <div className="mt-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h1>
      {error && (
        <div className="bg-red-100 text-red-700 p-4 rounded mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}
      {loading ? (
        <div className="text-center text-gray-600 flex items-center justify-center">
          <svg className="animate-spin h-5 w-5 mr-2 text-blue-600" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h8a8 8 0 01-8 8v-8H4z" />
          </svg>
          Loading...
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Expenses by Category</h2>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-gray-500 text-center">No expense data available</div>
            )}
          </div>
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Income vs Expense</h2>
            {incomeExpenseData.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={incomeExpenseData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                  <Legend />
                  <Bar dataKey="value" fill="#0088FE" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-gray-500 text-center">No income/expense data available</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;