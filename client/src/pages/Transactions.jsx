import React, { useEffect, useState } from 'react';
import { getTransactions } from '../services/transactions';

function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchTransactions = async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    if (!token) {
      setError('You must be logged in.');
      setLoading(false);
      return;
    }
    try {
      const params = { page, limit };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await getTransactions(params, token);
      setTransactions(res.data.transactions);
      setTotal(res.data.total);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch transactions');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTransactions();
  }, [page]);

  const handleFilter = (e) => {
    e.preventDefault();
    setPage(1);
    fetchTransactions();
  };

  return (
    <div className="mt-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Transactions</h1>
      <form className="flex gap-4 mb-6 flex-wrap" onSubmit={handleFilter}>
        <input
          type="date"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          className="border border-gray-300 p-3 rounded focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="date"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
          className="border border-gray-300 p-3 rounded focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-3 rounded hover:bg-blue-700 transition duration-200"
        >
          Filter
        </button>
      </form>
      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
      {loading ? (
        <div className="text-center text-gray-600">Loading...</div>
      ) : (
        <div>
          {transactions.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border rounded-lg overflow-hidden">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-3 text-left">Date</th>
                      <th className="p-3 text-left">Type</th>
                      <th className="p-3 text-left">Category</th>
                      <th className="p-3 text-left">Amount</th>
                      <th className="p-3 text-left">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(tx => (
                      <tr key={tx._id} className="border-t hover:bg-gray-50">
                        <td className="p-3">{new Date(tx.date).toLocaleDateString()}</td>
                        <td className="p-3">{tx.type}</td>
                        <td className="p-3">{tx.category}</td>
                        <td className="p-3">${tx.amount.toFixed(2)}</td>
                        <td className="p-3">{tx.description || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between items-center mt-4">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400 transition duration-200 disabled:opacity-50"
                >
                  Prev
                </button>
                <span className="text-gray-600">Page {page} of {Math.ceil(total / limit) || 1}</span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page * limit >= total}
                  className="bg-gray-300 px-4 py-2 rounded hover:bg-gray-400 transition duration-200 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </>
          ) : (
            <div className="text-gray-500 text-center">No transactions found</div>
          )}
        </div>
      )}
    </div>
  );
}

export default Transactions;