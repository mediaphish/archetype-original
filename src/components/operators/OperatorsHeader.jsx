import React from 'react';

export default function OperatorsHeader({ active = 'events', email = '', userRoles = [], onNavigate }) {
  const handleNavigate = (path) => {
    if (typeof onNavigate === 'function') return onNavigate(path);
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const withEmail = (path) => {
    if (!email) return path;
    if (!path || typeof path !== 'string') return path;
    if (path.includes('email=')) return path;
    const joiner = path.includes('?') ? '&' : '?';
    return `${path}${joiner}email=${encodeURIComponent(email)}`;
  };

  const tabClass = (key) =>
    key === active ? 'text-blue-600 font-semibold' : 'text-gray-600 hover:text-gray-900';

  const isSA = userRoles.includes('super_admin');
  const isCO = userRoles.includes('chief_operator');

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => handleNavigate(withEmail('/operators/events'))}
            className="flex items-center gap-2 text-xl font-bold text-gray-900"
            aria-label="Go to Operators Events"
          >
            <img src="/brand/ao-icon.svg" alt="Archetype Original" className="w-6 h-6" />
            <span>The Operators</span>
          </button>

          <nav className="flex items-center gap-6">
            <button onClick={() => handleNavigate(withEmail('/operators/events'))} className={tabClass('events')}>
              Events
            </button>
            <button onClick={() => handleNavigate(withEmail('/operators/dashboard'))} className={tabClass('dashboard')}>
              Dashboard
            </button>
            <button onClick={() => handleNavigate(withEmail('/operators/profile'))} className={tabClass('profile')}>
              Profile
            </button>
            {isCO && (
              <button onClick={() => handleNavigate(withEmail('/operators/candidates'))} className={tabClass('candidates')}>
                Candidates
              </button>
            )}
            {isSA && (
              <button onClick={() => handleNavigate(withEmail('/operators/admin'))} className={tabClass('admin')}>
                Admin
              </button>
            )}
            {email && (
              <span className="text-sm text-gray-500">{email}</span>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
