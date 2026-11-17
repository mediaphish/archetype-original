import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { OptimizedImage } from '../OptimizedImage';
import { clearAliSessionEmail } from '../../lib/magicLinkBrowserSession';

/**
 * ALI app header. Main items: Results (the results screen at /ali/dashboard),
 * Send survey (/ali/deploy), Settings, Billing. The old report pages
 * (/ali/reports/*) now redirect to Results and are no longer linked here.
 */
export const ALI_NAV_ITEMS = Object.freeze([
  { key: 'dashboard', label: 'Results', path: '/ali/dashboard' },
  { key: 'deploy', label: 'Send survey', path: '/ali/deploy' },
  { key: 'settings', label: 'Settings', path: '/ali/settings' },
  { key: 'billing', label: 'Billing', path: '/ali/billing' },
]);

export default function AliHeader({ active = 'dashboard', email = '', isSuperAdminUser = false, onNavigate }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavigate = (path) => {
    setMobileMenuOpen(false);
    if (typeof onNavigate === 'function') return onNavigate(path);
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/ali/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (_) {
      // proceed with client-side cleanup even if the network call fails
    }
    clearAliSessionEmail();
    handleNavigate('/ali/login');
  };

  const withEmail = (path) => {
    if (!email) return path;
    if (!path || typeof path !== 'string') return path;
    if (path.includes('email=')) return path;
    const joiner = path.includes('?') ? '&' : '?';
    return `${path}${joiner}email=${encodeURIComponent(email)}`;
  };

  // Old report pages count as Results (they redirect there).
  const activeKey = typeof active === 'string' && active.startsWith('reports') ? 'dashboard' : active;

  const tabClass = (key) =>
    key === activeKey ? 'text-blue-600 font-semibold' : 'text-gray-600 hover:text-gray-900';

  const mobileTabClass = (key) =>
    key === activeKey ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700 hover:bg-gray-50';

  const items = isSuperAdminUser
    ? [...ALI_NAV_ITEMS, { key: 'super-admin', label: 'Super Admin', path: '/ali/super-admin/overview' }]
    : ALI_NAV_ITEMS;

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => handleNavigate(withEmail('/ali/dashboard'))}
            className="flex items-center gap-2 text-xl font-bold text-gray-900 min-h-[44px] min-w-[44px] md:min-w-0"
            aria-label="Go to ALI results"
          >
            <OptimizedImage src="/brand/ao-icon.svg" alt="Archetype Original" className="w-6 h-6" loading="eager" width={24} height={24} />
            <span>ALI</span>
          </button>

          <nav className="hidden md:flex items-center gap-6" role="navigation" aria-label="ALI main navigation">
            {items.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => handleNavigate(withEmail(item.path))}
                className={tabClass(item.key)}
                aria-current={item.key === activeKey ? 'page' : undefined}
              >
                {item.label}
              </button>
            ))}
            <button type="button" onClick={handleLogout} className="min-h-[44px] px-3 py-2 text-gray-600 hover:text-gray-900 rounded">
              Log Out
            </button>
          </nav>

          {/* Mobile menu button - 44px touch target */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="ali-mobile-navigation"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile navigation drawer */}
        {mobileMenuOpen && (
          <nav id="ali-mobile-navigation" className="md:hidden mt-4 pb-4 border-t border-gray-200 pt-4" role="navigation" aria-label="ALI mobile navigation">
            <div className="flex flex-col gap-1">
              {items.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleNavigate(withEmail(item.path))}
                  className={`min-h-[44px] px-4 py-3 rounded-lg text-left ${mobileTabClass(item.key)}`}
                  aria-current={item.key === activeKey ? 'page' : undefined}
                >
                  {item.label}
                </button>
              ))}
              <button type="button" onClick={handleLogout} className="min-h-[44px] px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-gray-50 border-t border-gray-200 mt-2 pt-2">
                Log Out
              </button>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
