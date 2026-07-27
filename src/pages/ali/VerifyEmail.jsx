import React from 'react';

const ALIVerifyEmail = () => {
  const params = new URLSearchParams(window.location.search);
  const email = params.get('email') || '';

  const handleNavigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h1>
          <p className="text-gray-600 mb-6">
            {email ? `We sent a setup link to ${email}.` : 'We sent you a setup link.'} Click it to finish setting up your account. The link expires in 24 hours.
          </p>
          <button
            onClick={() => handleNavigate('/ali/login')}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Already set up? Log in
          </button>
        </div>
      </div>
    </div>
  );
};

export default ALIVerifyEmail;
