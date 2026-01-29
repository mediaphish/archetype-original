import React, { useEffect } from 'react';
import { getSuperAdminEmail } from '../../lib/ali-super-admin-email';

const SuperAdminNav = ({ activeTab }) => {
  useEffect(() => {
    const email = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('email') : null;
    if (!email || typeof email !== 'string') return;
    const trimmed = email.trim();
    if (!trimmed) return;
    try {
      localStorage.setItem('ali_email', trimmed);
    } catch (_) {}
  }, []);

  const handleNavigate = (path) => {
    const email = getSuperAdminEmail();
    const url = email ? `${path}${path.includes('?') ? '&' : '?'}email=${encodeURIComponent(email)}` : path;
    window.history.pushState({}, '', url);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const tabs = [
    { id: 'overview', label: 'Overview', path: '/ali/super-admin/overview' },
    { id: 'intelligence', label: 'Intelligence', path: '/ali/super-admin/intelligence' },
    { id: 'tenants', label: 'Tenants', path: '/ali/super-admin/tenants' },
    { id: 'deletions', label: 'Deletions', path: '/ali/super-admin/deletions' },
    { id: 'audit-log', label: 'Audit Log', path: '/ali/super-admin/audit-log' }
  ];

  return (
    <nav className="bg-white border-b border-black/[0.12] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/brand/ao-logo.svg" alt="Archetype Original" className="w-8 h-8" />
            <span className="text-[18px] font-semibold text-black/[0.87]">ALI Super Admin</span>
          </div>
          <div className="flex items-center gap-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleNavigate(tab.path)}
                className={`text-[14px] transition-colors ${
                  activeTab === tab.id
                    ? 'text-black/[0.87] font-semibold bg-black/[0.06] px-4 py-2 rounded-lg'
                    : 'text-black/[0.6] hover:text-black/[0.87]'
                }`}
              >
                {tab.label}
              </button>
            ))}
            <a
              href="/ali/dashboard"
              onClick={(e) => {
                e.preventDefault();
                const email = getSuperAdminEmail();
                const dashboardUrl = email ? `/ali/dashboard?email=${encodeURIComponent(email)}` : '/ali/dashboard';
                handleNavigate(dashboardUrl);
              }}
              className="text-[14px] text-[#2563eb] font-semibold hover:text-[#1d4ed8] transition-colors"
            >
              View as Client
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default SuperAdminNav;

