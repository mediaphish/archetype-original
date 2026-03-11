import React, { useEffect, useState } from 'react';

const REDIRECT_DELAY_MS = 1500;

export default function LinkedInHandoff() {
  const [countdown, setCountdown] = useState(Math.ceil(REDIRECT_DELAY_MS / 1000));

  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const status = params.get('status') || 'error';
  const message = params.get('message') || '';
  const isSuccess = status === 'success';

  useEffect(() => {
    const target = `/ao/settings?provider=linkedin&status=${isSuccess ? 'connected' : 'error'}${message ? `&message=${encodeURIComponent(message)}` : ''}`;

    const t = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(t);
          window.location.replace(target);
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    const timeout = setTimeout(() => {
      window.location.replace(target);
    }, REDIRECT_DELAY_MS);

    return () => {
      clearInterval(t);
      clearTimeout(timeout);
    };
  }, [isSuccess, message]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-2">AO Automation</h1>
          {isSuccess ? (
            <p className="text-gray-700">LinkedIn connected. Returning to settings...</p>
          ) : (
            <p className="text-gray-700">LinkedIn connection failed. Returning to settings...</p>
          )}
          {message && !isSuccess && (
            <p className="text-sm text-red-600 mt-2 max-w-xs mx-auto truncate" title={message}>{message}</p>
          )}
          <p className="text-sm text-gray-500 mt-4">Redirecting in {countdown} second{countdown !== 1 ? 's' : ''}...</p>
        </div>
      </div>
    </div>
  );
}
