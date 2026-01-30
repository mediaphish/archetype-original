import React, { useState } from 'react';
import { ChevronDown, Menu, X } from 'lucide-react';
import { OptimizedImage } from '../OptimizedImage';

export default function AliHeader({ active = 'dashboard', email = '', isSuperAdminUser = false, onNavigate }) {
  const [reportsDropdownOpen, setReportsDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavigate = (path) => {
    setMobileMenuOpen(false);
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

  const mobileTabClass = (key) =>
    key === active ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700 hover:bg-gray-50';

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => handleNavigate(withEmail('/ali/dashboard'))}
            className="flex items-center gap-2 text-xl font-bold text-gray-900 min-h-[44px] min-w-[44px] md:min-w-0"
            aria-label="Go to ALI Dashboard"
          >
            <OptimizedImage src="/brand/ao-icon.svg" alt="Archetype Original" className="w-6 h-6" loading="eager" width={24} height={24} />
            <span>ALI</span>
          </button>

          <nav className="hidden md:flex items-center gap-6" role="navigation" aria-label="ALI main navigation">
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
                    className="min-h-[44px] w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors flex items-center"
                  >
                    Reports Hub
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleNavigate(withEmail('/ali/reports/mirror'))}
                    className="min-h-[44px] w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors flex items-center"
                  >
                    Leadership Mirror
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleNavigate(withEmail('/ali/reports/zones'))}
                    className="min-h-[44px] w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors flex items-center"
                  >
                    Zones Guide
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => handleNavigate(withEmail('/ali/reports/profile'))}
                    className="min-h-[44px] w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors flex items-center"
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
            <button onClick={() => handleNavigate('/ali/login')} className="min-h-[44px] px-3 py-2 text-gray-600 hover:text-gray-900 rounded">
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
              <button onClick={() => handleNavigate(withEmail('/ali/dashboard'))} className={`min-h-[44px] px-4 py-3 rounded-lg text-left ${mobileTabClass('dashboard')}`}>
                Dashboard
              </button>
              <div className="pt-2 pb-1">
                <span className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Reports</span>
              </div>
              <button onClick={() => handleNavigate(withEmail('/ali/reports'))} className={`min-h-[44px] px-4 py-3 rounded-lg text-left ${mobileTabClass('reports')}`}>
                Reports Hub
              </button>
              <button onClick={() => handleNavigate(withEmail('/ali/reports/mirror'))} className={`min-h-[44px] px-4 py-3 rounded-lg text-left ${mobileTabClass('reports-mirror')}`}>
                Leadership Mirror
              </button>
              <button onClick={() => handleNavigate(withEmail('/ali/reports/zones'))} className={`min-h-[44px] px-4 py-3 rounded-lg text-left ${mobileTabClass('reports-zones')}`}>
                Zones Guide
              </button>
              <button onClick={() => handleNavigate(withEmail('/ali/reports/profile'))} className={`min-h-[44px] px-4 py-3 rounded-lg text-left ${mobileTabClass('reports-profile')}`}>
                Leadership Profile
              </button>
              <button onClick={() => handleNavigate(withEmail('/ali/deploy'))} className={`min-h-[44px] px-4 py-3 rounded-lg text-left ${mobileTabClass('deploy')}`}>
                Deploy
              </button>
              <button onClick={() => handleNavigate(withEmail('/ali/settings'))} className={`min-h-[44px] px-4 py-3 rounded-lg text-left ${mobileTabClass('settings')}`}>
                Settings
              </button>
              <button onClick={() => handleNavigate(withEmail('/ali/billing'))} className={`min-h-[44px] px-4 py-3 rounded-lg text-left ${mobileTabClass('billing')}`}>
                Billing
              </button>
              {isSuperAdminUser && (
                <button onClick={() => handleNavigate(withEmail('/ali/super-admin/overview'))} className={`min-h-[44px] px-4 py-3 rounded-lg text-left ${mobileTabClass('super-admin')}`}>
                  Super Admin
                </button>
              )}
              <button onClick={() => handleNavigate('/ali/login')} className="min-h-[44px] px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-gray-50 border-t border-gray-200 mt-2 pt-2">
                Log Out
              </button>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}

