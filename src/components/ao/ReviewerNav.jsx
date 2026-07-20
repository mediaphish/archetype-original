import React from 'react';

/**
 * Shared top nav for reviewer-scoped pages (Publishing / Library / Settings).
 * @param {'publishing'|'library'|'settings'} active
 */
export default function ReviewerNav({ active = 'publishing' }) {
  const linkClass = (key) =>
    key === active
      ? 'text-sm text-gray-900 font-medium'
      : 'text-sm text-gray-500 hover:text-gray-900';

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
      </div>
    </div>
  );
}
