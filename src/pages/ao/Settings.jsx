import React, { useState, useEffect, useCallback } from 'react';
import AOHeader from '../../components/ao/AOHeader';

export default function Settings() {
  const [email, setEmail] = useState('');

  const handleNavigate = useCallback((path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  useEffect(() => {
    const e = new URLSearchParams(window.location.search).get('email') || localStorage.getItem('ao_email') || '';
    setEmail(e);
  }, []);

  const maskedEmail = email ? `${email.slice(0, 2)}***@${email.split('@')[1] || '***'}` : '—';

  return (
    <div className="min-h-screen bg-gray-50">
      <AOHeader active="settings" email={email} onNavigate={handleNavigate} />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600 mb-8">Owner console and configuration.</p>

        <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Owner</h2>
          <p className="text-gray-600">Allowed email: <span className="font-mono">{maskedEmail}</span></p>
          <p className="text-sm text-gray-500 mt-2">Single-owner console. Only the configured owner can sign in via magic link.</p>
        </section>

        <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Scan configuration</h2>
          <p className="text-gray-500 text-sm">Internal and external scan frequency and sources will be configurable here when the scan backend is connected.</p>
        </section>

        <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Publishing defaults</h2>
          <p className="text-gray-500 text-sm">Default platforms and schedule time can be set here. See <a href="https://github.com/mediaphish/archetype-original/blob/main/notes/SOCIAL_VERCEL_ENV.md" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">notes/SOCIAL_VERCEL_ENV.md</a> for environment variables.</p>
        </section>

        <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Security</h2>
          <p className="text-gray-500 text-sm">Magic links expire after 15 minutes. There is no public signup; only the owner email can request a link.</p>
        </section>
      </main>
    </div>
  );
}
