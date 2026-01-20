import React from 'react';

export default function AliHeader({ active = 'dashboard', email = '', isSuperAdminUser = false, onNavigate }) {
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

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => handleNavigate(withEmail('/ali/dashboard'))}
            className="flex items-center gap-2 text-xl font-bold text-gray-900"
            aria-label="Go to ALI Dashboard"
          >
            <img src="/brand/ao-icon.svg" alt="Archetype Original" className="w-6 h-6" />
            <span>ALI</span>
          </button>

          <nav className="flex items-center gap-6">
            <button onClick={() => handleNavigate(withEmail('/ali/dashboard'))} className={tabClass('dashboard')}>
              Dashboard
            </button>
            <button onClick={() => handleNavigate(withEmail('/ali/reports'))} className={tabClass('reports')}>
              Reports
            </button>
            <button onClick={() => handleNavigate(withEmail('/ali/deploy'))} className={tabClass('deploy')}>
              Deploy
            </button>
            <button onClick={() => handleNavigate(withEmail('/ali/settings'))} className={tabClass('settings')}>
              Settings
            </button>
            <button onClick={() => handleNavigate(withEmail('/ali/billing'))} className={tabClass('billing')}>
              Billing
            </button>
            {isSuperAdminUser && (
              <button onClick={() => handleNavigate(withEmail('/ali/super-admin/overview'))} className={tabClass('super-admin')}>
                Super Admin
              </button>
            )}
            <button onClick={() => handleNavigate('/ali/login')} className="text-gray-600 hover:text-gray-900">
              Log Out
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}

