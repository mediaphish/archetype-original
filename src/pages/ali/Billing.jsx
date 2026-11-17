import React, { useEffect } from 'react';
import { getAliSessionEmail, setAliSessionEmail } from '../../lib/magicLinkBrowserSession';

const ALIBilling = () => {
  const handleNavigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Preserve magic-link email across ALI app navigation (used for role-aware links)
  const urlParams = new URLSearchParams(window.location.search);
  const emailParam = urlParams.get('email');
  const email = (emailParam || getAliSessionEmail() || '').toLowerCase().trim();
  const isSuperAdminUser = !!email && email.endsWith('@archetypeoriginal.com');
  const withEmail = (path) => {
    if (!email) return path;
    if (!path || typeof path !== 'string') return path;
    if (path.includes('email=')) return path;
    const joiner = path.includes('?') ? '&' : '?';
    return `${path}${joiner}email=${encodeURIComponent(email)}`;
  };

  useEffect(() => {
    if (!emailParam) return;
    if (email) setAliSessionEmail(email);
  }, [emailParam, email]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="text-xl font-bold text-gray-900">ALI</div>
            <nav className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={() => handleNavigate(withEmail('/ali/dashboard'))}
                className="min-h-[44px] inline-flex items-center justify-center px-3 text-gray-600 hover:text-gray-900"
              >
                Dashboard
              </button>
              <button
                onClick={() => handleNavigate(withEmail('/ali/reports'))}
                className="min-h-[44px] inline-flex items-center justify-center px-3 text-gray-600 hover:text-gray-900"
              >
                Reports
              </button>
              <button
                onClick={() => handleNavigate(withEmail('/ali/deploy'))}
                className="min-h-[44px] inline-flex items-center justify-center px-3 text-gray-600 hover:text-gray-900"
              >
                Deploy
              </button>
              <button
                onClick={() => handleNavigate(withEmail('/ali/settings'))}
                className="min-h-[44px] inline-flex items-center justify-center px-3 text-gray-600 hover:text-gray-900"
              >
                Settings
              </button>
              <button
                onClick={() => handleNavigate(withEmail('/ali/billing'))}
                className="min-h-[44px] inline-flex items-center justify-center px-3 text-blue-600 font-semibold"
              >
                Billing
              </button>
              {isSuperAdminUser && (
                <button
                  onClick={() => handleNavigate(withEmail('/ali/super-admin/overview'))}
                  className="min-h-[44px] inline-flex items-center justify-center px-3 text-[#2563eb] font-semibold hover:text-[#1d4ed8]"
                >
                  Super Admin
                </button>
              )}
              <button
                onClick={() => handleNavigate('/ali')}
                className="min-h-[44px] inline-flex items-center justify-center px-3 text-gray-600 hover:text-gray-800"
              >
                Log Out
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Billing</h1>
        </div>

        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="inline-block px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-700 mb-4">
            Pilot account
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Billing is not set up yet</h2>
          <p className="text-gray-600">
            Your company is part of the ALI pilot. There is no plan, no card on file and nothing to pay.
          </p>
        </section>
      </main>
    </div>
  );
};

export default ALIBilling;

