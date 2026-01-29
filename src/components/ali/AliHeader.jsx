import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function AliHeader({ active = 'dashboard', email = '', isSuperAdminUser = false, onNavigate }) {
  const [reportsDropdownOpen, setReportsDropdownOpen] = useState(false);

  const handleNavigate = (path) => {
    if (typeof onNavigate === 'function') return onNavigate(path);
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
    setReportsDropdownOpen(false);
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

  const isReportsActive = active === 'reports' || active === 'reports-mirror' || active === 'reports-zones' || active === 'reports-analytics' || active === 'reports-profile';

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
            
            {/* Reports Dropdown */}
            <div 
              className="relative"
              onMouseEnter={() => setReportsDropdownOpen(true)}
              onMouseLeave={() => setReportsDropdownOpen(false)}
            >
              <button 
                type="button"
                className={`flex items-center gap-1 ${isReportsActive ? 'text-blue-600 font-semibold' : 'text-gray-600 hover:text-gray-900'}`}
                aria-expanded={reportsDropdownOpen}
                aria-haspopup="true"
                aria-label="Reports menu"
              >
                Reports
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${reportsDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {reportsDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50" role="menu" aria-label="Reports menu">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleNavigate(withEmail('/ali/reports'))}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                  >
                    Reports Hub
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleNavigate(withEmail('/ali/reports/mirror'))}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                  >
                    Leadership Mirror
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleNavigate(withEmail('/ali/reports/zones'))}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                  >
                    Zones Guide
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleNavigate(withEmail('/ali/reports/profile'))}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                  >
                    Leadership Profile
                  </button>
                </div>
              )}
            </div>
            
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

