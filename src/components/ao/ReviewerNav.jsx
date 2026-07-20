import React, { useState } from 'react';

/**
 * Shared top nav for reviewer-scoped pages (Publishing / Library / Settings).
 * @param {'publishing'|'library'|'settings'} active
 */
export default function ReviewerNav({ active = 'publishing' }) {
  const [loggingOut, setLoggingOut] = useState(false);

  const linkClass = (key) =>
    key === active
      ? 'text-sm text-gray-900 font-medium'
      : 'text-sm text-gray-500 hover:text-gray-900';

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/ao/auth/logout', { method: 'POST' });
    } catch (_) {
      // proceed to redirect regardless
    } finally {
      window.location.href = '/ao/reviewer-login';
    }
  };

  return (
    <div className="border-b border-gray-200 bg-white mb-8">
      <div className="mx-auto max-w-3xl px-4 py-4 flex items-center gap-6">
        <span className="text-sm font-semibold text-gray-900">AO Automation</span>
        <a href="/ao/reviewer" className={linkClass('publishing')}>
          Publishing
        </a>
        <a href="/ao/reviewer/library" className={linkClass('library')}>
          Library
        </a>
        <a href="/ao/reviewer/settings" className={linkClass('settings')}>
          Settings
        </a>
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="ml-auto text-sm text-gray-500 hover:text-gray-900 disabled:opacity-50"
        >
          {loggingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </div>
  );
}
