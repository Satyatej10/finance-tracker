import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTransactions } from '../services/transactions';

function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('Transactions: No token found, redirecting to login');
        setError('Please log in to view transactions.');
        setLoading(false);
        navigate('/login');
        return;
      }
      try {
        console.log('Transactions: Fetching transactions for page:', page);
        const res = await getTransactions({ page, limit: 10 }, token);
        setTransactions(res.data.transactions);
        setTotalPages(Math.ceil(res.data.total / res.data.limit));
      } catch (err) {
        console.error('Transactions: Error fetching transactions:', err);
        const message = err.response?.data?.message || 'Failed to load transactions. Please try again.';
        setError(message);
        if (err.response?.status === 401) {
          console.log('Transactions: 401 Unauthorized, clearing localStorage and redirecting');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
        }
      }
      setLoading(false);
    };
    fetchTransactions();
  }, [page, navigate]);

  return (
    <div className="mt-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Transaction History</h1>
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
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-3 text-left">Date</th>
                <th className="border p-3 text-left">Amount</th>
                <th className="border p-3 text-left">Description</th>
                <th className="border p-3 text-left">Category</th>
                <th className="border p-3 text-left">Type</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length > 0 ? (
                transactions.map(t => (
                  <tr key={t._id} className="hover:bg-gray-50">
                    <td className="border p-3">{new Date(t.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' })}</td>
                    <td className="border p-3">${t.amount.toFixed(2)}</td>
                    <td className="border p-3">{t.description}</td>
                    <td className="border p-3">{t.category}</td>
                    <td className="border p-3 capitalize">{t.type}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="border p-3 text-center text-gray-500">
                    No transactions found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="mt-4 flex justify-between">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-300"
            >
              Previous
            </button>
            <span>Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-300"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Transactions;