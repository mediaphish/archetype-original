import React, { useState } from 'react';

export default function AOLogin() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleNavigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address');
      return;
    }
    setStatus('sending');
    setErrorMessage('');
    try {
      const response = await fetch('/api/ao/auth/send-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (data.ok || response.ok) {
        setStatus('sent');
        setErrorMessage('');
      } else {
        setStatus('error');
        setErrorMessage(data.error || 'Failed to send magic link. Please try again.');
      }
    } catch (err) {
      setStatus('error');
      setErrorMessage('Network error. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">AO Automation</h1>
          <p className="text-gray-600 mt-2">Sign in with a magic link (owner only)</p>
        </div>
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8">
          {status === 'sent' ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Check Your Email</h2>
              <p className="text-gray-600 mb-4">
                We&apos;ve sent a magic link to <strong>{email}</strong>
              </p>
              <p className="text-sm text-gray-500">Click the link in the email to sign in. The link expires in 15 minutes.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <label htmlFor="ao-email" className="block text-sm font-medium text-gray-700 mb-2">
                Email address
              </label>
              <input
                id="ao-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                autoComplete="email"
              />
              {errorMessage && (
                <p className="mt-2 text-sm text-red-600" role="alert">{errorMessage}</p>
              )}
              <button
                type="submit"
                disabled={status === 'sending'}
                className="mt-4 w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === 'sending' ? 'Sending…' : 'Send magic link'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
