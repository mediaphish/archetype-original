import React, { useState, useEffect, useCallback } from 'react';
import AOHeader from '../../components/ao/AOHeader';

const TABS = [
  { key: 'internal', label: 'Internal corpus discoveries' },
  { key: 'external', label: 'External discoveries' },
  { key: 'corpus', label: 'Corpus relationship analysis' },
];

export default function Insights() {
  const [email, setEmail] = useState('');
  const [activeTab, setActiveTab] = useState('internal');

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
      <AOHeader active="insights" email={email} onNavigate={handleNavigate} />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Insights</h1>
        <p className="text-gray-600 mb-8">Discoveries from internal and external scans, and corpus relationship analysis.</p>

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
          {activeTab === 'internal' && (
            <p className="text-gray-500">Internal corpus discoveries (Accidental CEO, AO Journal, Devotionals, doctrine) will appear here when the internal scanner and intelligence layer are connected.</p>
          )}
          {activeTab === 'external' && (
            <p className="text-gray-500">External leadership discoveries will appear here when the external scanner is connected.</p>
          )}
          {activeTab === 'corpus' && (
            <p className="text-gray-500">Corpus relationship analysis (Extension, Reinforcement, Contradiction, etc.) will appear here when the comparison layer is connected.</p>
          )}
        </div>
      </main>
    </div>
  );
}
