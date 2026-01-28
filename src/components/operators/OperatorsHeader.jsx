import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { handleKeyDown } from '../../lib/operators/accessibility';

export default function OperatorsHeader({ active = 'events', email = '', userRoles = [], onNavigate }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavigate = (path) => {
    setMobileMenuOpen(false); // Close mobile menu on navigation
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

  const mobileTabClass = (key) =>
    key === active ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700 hover:bg-gray-50';

  const isSA = userRoles.includes('super_admin');
  const isCO = userRoles.includes('chief_operator');

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => handleNavigate(withEmail('/operators/events'))}
            onKeyDown={handleKeyDown(() => handleNavigate(withEmail('/operators/events')))}
            className="flex items-center gap-2 text-xl font-bold text-gray-900"
            aria-label="Go to Operators Events"
          >
            <img src="/brand/ao-icon.svg" alt="Archetype Original" className="w-6 h-6" aria-hidden="true" />
            <span className="hidden sm:inline">The Operators</span>
            <span className="sm:hidden">Operators</span>
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6" role="navigation" aria-label="Main navigation">
            <button 
              onClick={() => handleNavigate(withEmail('/operators/events'))} 
              onKeyDown={handleKeyDown(() => handleNavigate(withEmail('/operators/events')))}
              className={tabClass('events')}
              aria-label="Navigate to Events"
              aria-current={active === 'events' ? 'page' : undefined}
            >
              Events
            </button>
            <button 
              onClick={() => handleNavigate(withEmail('/operators/dashboard'))} 
              onKeyDown={handleKeyDown(() => handleNavigate(withEmail('/operators/dashboard')))}
              className={tabClass('dashboard')}
              aria-label="Navigate to Dashboard"
              aria-current={active === 'dashboard' ? 'page' : undefined}
            >
              Dashboard
            </button>
            <button 
              onClick={() => handleNavigate(withEmail('/operators/profile'))} 
              onKeyDown={handleKeyDown(() => handleNavigate(withEmail('/operators/profile')))}
              className={tabClass('profile')}
              aria-label="Navigate to Profile"
              aria-current={active === 'profile' ? 'page' : undefined}
            >
              Profile
            </button>
            {isCO && (
              <button 
                onClick={() => handleNavigate(withEmail('/operators/candidates'))} 
                onKeyDown={handleKeyDown(() => handleNavigate(withEmail('/operators/candidates')))}
                className={tabClass('candidates')}
                aria-label="Navigate to Candidates"
                aria-current={active === 'candidates' ? 'page' : undefined}
              >
                Candidates
              </button>
            )}
            {isSA && (
              <button 
                onClick={() => handleNavigate(withEmail('/operators/admin'))} 
                onKeyDown={handleKeyDown(() => handleNavigate(withEmail('/operators/admin')))}
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
          </nav>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            onKeyDown={handleKeyDown(() => setMobileMenuOpen(!mobileMenuOpen))}
            className="md:hidden p-2 text-gray-600 hover:text-gray-900"
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
                onClick={() => handleNavigate(withEmail('/operators/events'))}
                onKeyDown={handleKeyDown(() => handleNavigate(withEmail('/operators/events')))}
                className={`px-4 py-2 rounded-lg text-left ${mobileTabClass('events')}`}
                aria-label="Navigate to Events"
                aria-current={active === 'events' ? 'page' : undefined}
              >
                Events
              </button>
              <button
                onClick={() => handleNavigate(withEmail('/operators/dashboard'))}
                onKeyDown={handleKeyDown(() => handleNavigate(withEmail('/operators/dashboard')))}
                className={`px-4 py-2 rounded-lg text-left ${mobileTabClass('dashboard')}`}
                aria-label="Navigate to Dashboard"
                aria-current={active === 'dashboard' ? 'page' : undefined}
              >
                Dashboard
              </button>
              <button
                onClick={() => handleNavigate(withEmail('/operators/profile'))}
                onKeyDown={handleKeyDown(() => handleNavigate(withEmail('/operators/profile')))}
                className={`px-4 py-2 rounded-lg text-left ${mobileTabClass('profile')}`}
                aria-label="Navigate to Profile"
                aria-current={active === 'profile' ? 'page' : undefined}
              >
                Profile
              </button>
              {isCO && (
                <button
                  onClick={() => handleNavigate(withEmail('/operators/candidates'))}
                  onKeyDown={handleKeyDown(() => handleNavigate(withEmail('/operators/candidates')))}
                  className={`px-4 py-2 rounded-lg text-left ${mobileTabClass('candidates')}`}
                  aria-label="Navigate to Candidates"
                  aria-current={active === 'candidates' ? 'page' : undefined}
                >
                  Candidates
                </button>
              )}
              {isSA && (
                <button
                  onClick={() => handleNavigate(withEmail('/operators/admin'))}
                  onKeyDown={handleKeyDown(() => handleNavigate(withEmail('/operators/admin')))}
                  className={`px-4 py-2 rounded-lg text-left ${mobileTabClass('admin')}`}
                  aria-label="Navigate to Admin"
                  aria-current={active === 'admin' ? 'page' : undefined}
                >
                  Admin
                </button>
              )}
              {email && (
                <div className="px-4 py-2 text-sm text-gray-500 border-t border-gray-200 mt-2 pt-2" aria-label={`Logged in as ${email}`}>
                  {email}
                </div>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
