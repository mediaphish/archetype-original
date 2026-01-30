import React, { useState, memo, useMemo, useCallback } from 'react';
import { Menu, X, LogOut } from 'lucide-react';
import { handleKeyDown } from '../../lib/operators/accessibility';
import { useUser } from '../../contexts/UserContext';
import SkipLink from './SkipLink';
import { OptimizedImage } from '../OptimizedImage';

function OperatorsHeader({ active = 'events', onNavigate }) {
  const { email, userRoles, logout } = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavigate = useCallback((path) => {
    setMobileMenuOpen(false); // Close mobile menu on navigation
    if (typeof onNavigate === 'function') return onNavigate(path);
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [onNavigate]);

  const handleLogout = useCallback(() => {
    logout();
    handleNavigate('/operators/login');
  }, [logout, handleNavigate]);

  const tabClass = useCallback((key) =>
    key === active ? 'text-blue-600 font-semibold' : 'text-gray-600 hover:text-gray-900', [active]);

  const mobileTabClass = useCallback((key) =>
    key === active ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700 hover:bg-gray-50', [active]);

  const isSA = useMemo(() => userRoles.includes('super_admin'), [userRoles]);
  const isCO = useMemo(() => userRoles.includes('chief_operator'), [userRoles]);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <SkipLink />
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => handleNavigate('/operators/events')}
            onKeyDown={handleKeyDown(() => handleNavigate('/operators/events'))}
            className="flex items-center text-gray-900"
            aria-label="Go to Operators Events"
          >
            <OptimizedImage src="/brand/the-operators-logo.svg" alt="The Operators" className="h-8 w-auto max-w-[180px] sm:max-w-[220px]" aria-hidden="true" loading="eager" decoding="async" />
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6" role="navigation" aria-label="Main navigation">
            <button 
              onClick={() => handleNavigate('/operators/events')} 
              onKeyDown={handleKeyDown(() => handleNavigate('/operators/events'))}
              className={tabClass('events')}
              aria-label="Navigate to Events"
              aria-current={active === 'events' ? 'page' : undefined}
            >
              Events
            </button>
            <button 
              onClick={() => handleNavigate('/operators/dashboard')} 
              onKeyDown={handleKeyDown(() => handleNavigate('/operators/dashboard'))}
              className={tabClass('dashboard')}
              aria-label="Navigate to Dashboard"
              aria-current={active === 'dashboard' ? 'page' : undefined}
            >
              Dashboard
            </button>
            <button 
              onClick={() => handleNavigate('/operators/profile')} 
              onKeyDown={handleKeyDown(() => handleNavigate('/operators/profile'))}
              className={tabClass('profile')}
              aria-label="Navigate to Profile"
              aria-current={active === 'profile' ? 'page' : undefined}
            >
              Profile
            </button>
            {isCO && (
              <button 
                onClick={() => handleNavigate('/operators/candidates')} 
                onKeyDown={handleKeyDown(() => handleNavigate('/operators/candidates'))}
                className={tabClass('candidates')}
                aria-label="Navigate to Candidates"
                aria-current={active === 'candidates' ? 'page' : undefined}
              >
                Candidates
              </button>
            )}
            {isSA && (
              <button 
                onClick={() => handleNavigate('/operators/admin')} 
                onKeyDown={handleKeyDown(() => handleNavigate('/operators/admin'))}
                className={tabClass('admin')}
                aria-label="Navigate to Admin"
                aria-current={active === 'admin' ? 'page' : undefined}
              >
                Admin
              </button>
            )}
            {email && (
              <span className="text-sm text-gray-500 hidden lg:inline" aria-label={`Logged in as ${email}`}>{email}</span>
            )}
            <button
              onClick={handleLogout}
              onKeyDown={handleKeyDown(handleLogout)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 min-h-[44px] min-w-[44px] px-3 py-2 rounded hover:bg-gray-100 justify-center"
              aria-label="Log out"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              <span className="hidden xl:inline">Log Out</span>
            </button>
          </nav>

          {/* Mobile Menu Button - min 44x44px touch target */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            onKeyDown={handleKeyDown(() => setMobileMenuOpen(!mobileMenuOpen))}
            className="md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" aria-hidden="true" /> : <Menu className="w-6 h-6" aria-hidden="true" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav id="mobile-navigation" className="md:hidden mt-4 pb-4 border-t border-gray-200 pt-4" role="navigation" aria-label="Mobile navigation">
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleNavigate('/operators/events')}
                onKeyDown={handleKeyDown(() => handleNavigate('/operators/events'))}
                className={`min-h-[44px] px-4 py-3 rounded-lg text-left ${mobileTabClass('events')}`}
                aria-label="Navigate to Events"
                aria-current={active === 'events' ? 'page' : undefined}
              >
                Events
              </button>
              <button
                onClick={() => handleNavigate('/operators/dashboard')}
                onKeyDown={handleKeyDown(() => handleNavigate('/operators/dashboard'))}
                className={`min-h-[44px] px-4 py-3 rounded-lg text-left ${mobileTabClass('dashboard')}`}
                aria-label="Navigate to Dashboard"
                aria-current={active === 'dashboard' ? 'page' : undefined}
              >
                Dashboard
              </button>
              <button
                onClick={() => handleNavigate('/operators/profile')}
                onKeyDown={handleKeyDown(() => handleNavigate('/operators/profile'))}
                className={`min-h-[44px] px-4 py-3 rounded-lg text-left ${mobileTabClass('profile')}`}
                aria-label="Navigate to Profile"
                aria-current={active === 'profile' ? 'page' : undefined}
              >
                Profile
              </button>
              {isCO && (
                <button
                  onClick={() => handleNavigate('/operators/candidates')}
                  onKeyDown={handleKeyDown(() => handleNavigate('/operators/candidates'))}
                  className={`min-h-[44px] px-4 py-3 rounded-lg text-left ${mobileTabClass('candidates')}`}
                  aria-label="Navigate to Candidates"
                  aria-current={active === 'candidates' ? 'page' : undefined}
                >
                  Candidates
                </button>
              )}
              {isSA && (
                <button
                  onClick={() => handleNavigate('/operators/admin')}
                  onKeyDown={handleKeyDown(() => handleNavigate('/operators/admin'))}
                  className={`min-h-[44px] px-4 py-3 rounded-lg text-left ${mobileTabClass('admin')}`}
                  aria-label="Navigate to Admin"
                  aria-current={active === 'admin' ? 'page' : undefined}
                >
                  Admin
                </button>
              )}
              {email && (
                <div className="px-4 py-3 text-sm text-gray-500 border-t border-gray-200 mt-2 pt-2" aria-label={`Logged in as ${email}`}>
                  {email}
                </div>
              )}
              <button
                onClick={handleLogout}
                onKeyDown={handleKeyDown(handleLogout)}
                className="min-h-[44px] flex items-center gap-2 px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-gray-50 border-t border-gray-200 mt-2 pt-2"
                aria-label="Log out"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
                Log Out
              </button>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}

export default memo(OperatorsHeader);
