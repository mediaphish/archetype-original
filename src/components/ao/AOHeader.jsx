import React, { useState, useCallback } from 'react';
import { Menu, X, LogOut } from 'lucide-react';
import { OptimizedImage } from '../OptimizedImage';
import AOBottomNav from './AOBottomNav';
import { useKeyboardInset } from '../../hooks/useKeyboardInset';

const TABS = [
  { key: 'analyst', path: '/ao/analyst', label: 'Auto' },
  { key: 'library', path: '/ao/library', label: 'Library' },
  { key: 'settings', path: '/ao/settings', label: 'Settings' },
];

export default function AOHeader({ active, email, onNavigate }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const keyboardInset = useKeyboardInset({ enabled: true });

  const handleNavigate = useCallback((path) => {
    setMobileMenuOpen(false);
    if (typeof onNavigate === 'function') {
      onNavigate(path);
    } else {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [onNavigate]);

  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/ao/auth/logout', { method: 'POST' });
    } catch (e) {}
    handleNavigate('/ao/login');
  }, [handleNavigate]);

  const tabClass = (key) =>
    key === active ? 'text-blue-600 font-semibold' : 'text-gray-600 hover:text-gray-900';
  const mobileTabClass = (key) =>
    key === active ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700 hover:bg-gray-50';

  return (
    <>
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => handleNavigate('/ao/analyst')}
            className="flex items-center gap-2 text-gray-900 min-h-[44px]"
            aria-label="Go to Auto"
          >
            <OptimizedImage src="/brand/ao-icon.svg" alt="" className="w-6 h-6" loading="eager" width={24} height={24} />
            <span className="font-semibold">AO Automation</span>
          </button>

          <nav className="hidden md:flex items-center gap-6" role="navigation" aria-label="AO Dashboard">
            {TABS.map(({ key, path, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => handleNavigate(path)}
                className={tabClass(key)}
                aria-current={active === key ? 'page' : undefined}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-4">
            {email && (
              <span className="text-sm text-gray-500 truncate max-w-[160px]" title={email}>{email}</span>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1 text-gray-600 hover:text-gray-900 text-sm"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((o) => !o)}
            className="md:hidden min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-gray-200 space-y-1">
            {TABS.map(({ key, path, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => handleNavigate(path)}
                className={`block w-full text-left min-h-[44px] px-4 py-3 rounded-lg ${mobileTabClass(key)}`}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={handleLogout}
              className="block w-full text-left min-h-[44px] px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
    <AOBottomNav active={active} onNavigate={handleNavigate} keyboardInset={keyboardInset} />
    </>
  );
}
