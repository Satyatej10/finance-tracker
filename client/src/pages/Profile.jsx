import React, { useState } from 'react';
import { updatePassword } from '../services/auth';

function Profile() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handlePasswordUpdate = async (e) => {
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
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      setLoading(false);
      return;
    }
    try {
      await updatePassword(currentPassword, newPassword, token);
      setSuccess('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update password');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-lg mx-auto bg-white p-8 rounded-lg shadow-lg mt-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Profile</h1>
      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
      {success && <div className="bg-green-100 text-green-700 p-3 rounded mb-4">{success}</div>}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-2">User Details</h2>
        <p className="text-gray-600">Name: {user.name || 'Not available'}</p>
        <p className="text-gray-600">Email: {user.email || 'Not available'}</p>
        <p className="text-gray-600">Role: {user.role || 'Not available'}</p>
      </div>
      <h2 className="text-lg font-semibold text-gray-700 mb-2">Update Password</h2>
      <form onSubmit={handlePasswordUpdate} className="space-y-5">
        <input
          type="password"
          placeholder="Current Password"
          className="w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-blue-500"
          value={currentPassword}
          onChange={e => setCurrentPassword(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="New Password"
          className="w-full border border-gray-300 p-3 rounded focus:ring-2 focus:ring-blue-500"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          required
        />
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700 transition duration-200 disabled:bg-blue-300"
          disabled={loading}
        >
          {loading ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}

export default Profile;