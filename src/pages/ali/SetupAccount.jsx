import React, { useState } from 'react';
import { setAliSessionEmail } from '../../lib/magicLinkBrowserSession';

// Finish account setup from the emailed link. No password: ALI sign-in is by email link only.
// The person presses one button (rather than the page acting on load) so email link
// scanners that open links automatically cannot use up the setup link.
const ALISetupAccount = () => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token') || '';
  const email = params.get('email') || '';

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleNavigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

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
        body: JSON.stringify({ token, email }),
      });
      const result = await response.json().catch(() => ({}));
      if (!result.ok) {
        setError(result.error || 'Something went wrong. Please try again.');
        setSubmitting(false);
        return;
      }
      // The app's route guard needs the email locally as well as the session cookie.
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
          <h1 className="text-2xl font-bold text-gray-900">Finish setting up your account</h1>
          <p className="text-gray-600 mt-2">
            There is no password to remember. Each time you sign in, we email you a link.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          {error && (
            <div role="alert" className="mb-6 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
              {error}
            </div>
          )}
          {email && (
            <p className="text-sm text-gray-600 mb-6">
              Signing in as <span className="font-semibold text-gray-900">{email}</span>
            </p>
          )}
          <form onSubmit={handleSubmit}>
            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[44px] bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Finishing setup...' : 'Finish setup and go to my dashboard'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ALISetupAccount;
