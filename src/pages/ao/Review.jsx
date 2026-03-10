import React, { useState, useEffect, useCallback } from 'react';
import AOHeader from '../../components/ao/AOHeader';

const TABS = [
  { key: 'social', label: 'Social Review Queue' },
  { key: 'journal', label: 'Journal Review Queue' },
  { key: 'expandable', label: 'Expandable Ideas Queue' },
];

export default function Review() {
  const [email, setEmail] = useState('');
  const [activeTab, setActiveTab] = useState('social');

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
      <AOHeader active="review" email={email} onNavigate={handleNavigate} />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Review</h1>
        <p className="text-gray-600 mb-8">Approve, reject, or hold candidates for social and journal.</p>

        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2 -mb-px font-medium border-b-2 ${activeTab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8">
          {activeTab === 'social' && (
            <p className="text-gray-500">Social Review Queue: quote cards with Approve / Approve with edits / Reject will appear here when the quote queue and API are connected.</p>
          )}
          {activeTab === 'journal' && (
            <p className="text-gray-500">Journal Review Queue: topic cards with Approve / Reject / Hold will appear here when the journal topic queue is connected.</p>
          )}
          {activeTab === 'expandable' && (
            <p className="text-gray-500">Expandable Ideas Queue: Expand / Hold / Reject will appear here when the expandable-ideas flow is connected.</p>
          )}
        </div>
      </main>
    </div>
  );
}
