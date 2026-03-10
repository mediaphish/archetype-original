import React, { useState, useEffect, useCallback } from 'react';
import AOHeader from '../../components/ao/AOHeader';

export default function Writing() {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <AOHeader active="writing" email={email} onNavigate={handleNavigate} />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Writing</h1>
        <p className="text-gray-600 mb-8">Approved topics, drafting queue, and ready-for-site content.</p>

        <div className="space-y-6">
          <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Approved topics</h2>
            <p className="text-gray-500 text-sm">Will appear when journal topics are approved and sent to the writing queue.</p>
          </section>
          <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Drafting queue</h2>
            <p className="text-gray-500 text-sm">In-progress drafts will appear here when the writing pipeline is connected.</p>
          </section>
          <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Ready for site</h2>
            <p className="text-gray-500 text-sm">Content marked ready to publish will appear here.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
