import React, { useState } from 'react';

const OperatorsLogin = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle, sending, sent, error
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
      const response = await fetch('/api/operators/auth/send-magic-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
      console.error('Magic link request error:', err);
      setStatus('error');
      setErrorMessage('Network error. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <img src="/brand/the-operators-logo.svg" alt="The Operators" className="h-10 w-auto max-w-[200px] mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Log In</h1>
          <p className="text-gray-600 mt-2">We'll send you a magic link to sign in</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {status === 'sent' ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Check Your Email</h2>
              <p className="text-gray-600 mb-4">
                We've sent a magic link to <strong>{email}</strong>
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Click the link in the email to sign in. The link will expire in 15 minutes.
              </p>
              <button
                onClick={() => {
                  setStatus('idle');
                  setEmail('');
                  setErrorMessage('');
                }}
                className="text-blue-600 hover:underline"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  placeholder="you@company.com"
                  required
                  aria-required="true"
                  aria-describedby={errorMessage ? 'email-error' : undefined}
                />
                {errorMessage && (
                  <p id="email-error" className="mt-2 text-sm text-red-600" role="alert">
                    {errorMessage}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={status === 'sending'}
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={status === 'sending' ? 'Sending magic link' : 'Send magic link'}
              >
                {status === 'sending' ? 'Sending...' : 'Send Magic Link'}
              </button>
              
              {status === 'error' && errorMessage && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm" role="alert">
                  {errorMessage}
                </div>
              )}
            </form>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={() => handleNavigate('/operators')}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperatorsLogin;
