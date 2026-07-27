import React, { useState } from 'react';
import { setAliSessionEmail } from '../../lib/magicLinkBrowserSession';

const ALISetupAccount = () => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token') || '';
  const email = params.get('email') || '';

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleNavigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!token || !email) {
      setError('This setup link is missing required information. Please use the link from your email.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/ali/setup-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          token,
          email,
          password: formData.password,
        }),
      });
      const result = await response.json();
      if (!result.ok) {
        setError(result.error || 'Something went wrong. Please try again.');
        setSubmitting(false);
        return;
      }
      // CRITICAL: the app's route guard (src/App.jsx's hasAliEmail() check) requires an
      // email in the URL or in local session storage before it will render any tenant
      // page, including /ali/dashboard — the new HttpOnly ali_session cookie alone is not
      // enough to pass that client-side check. Store the email locally AND put it in the
      // redirect URL (same pattern api/ali/auth/verify-magic-link.js already uses), or the
      // user gets bounced straight back to /ali/login despite a valid, working session.
      setAliSessionEmail(email);
      handleNavigate(`/ali/dashboard?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError('Network error. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="text-3xl font-bold text-gray-900 mb-2">ALI</div>
          <h1 className="text-2xl font-bold text-gray-900">Set Up Your Account</h1>
          <p className="text-gray-600 mt-2">Create a password to finish setting up your account</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password <span className="text-gray-600">*</span>
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                required
                minLength={8}
              />
              <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password <span className="text-gray-600">*</span>
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Setting up...' : 'Complete Setup'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ALISetupAccount;
