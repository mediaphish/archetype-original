import React, { useEffect, useState } from 'react';
import ChatApp from '../../app/ChatApp';
import AliHeader from '../../components/ali/AliHeader';
import AliFooter from '../../components/ali/AliFooter';

const ReportsHub = () => {
  const [showArchyChat, setShowArchyChat] = useState(false);
  const [archyInitialMessage, setArchyInitialMessage] = useState(null);

  const handleNavigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const urlParams = new URLSearchParams(window.location.search);
  const emailParam = urlParams.get('email');
  const email = emailParam ? emailParam.toLowerCase().trim() : '';
  const isSuperAdminUser = !!email && email.endsWith('@archetypeoriginal.com');
  const withEmail = (path) => {
    if (!email) return path;
    if (!path || typeof path !== 'string') return path;
    if (path.includes('email=')) return path;
    const joiner = path.includes('?') ? '&' : '?';
    return `${path}${joiner}email=${encodeURIComponent(email)}`;
  };

  // Persist email so /ali/reports works without query params after first login
  useEffect(() => {
    if (!emailParam) return;
    try {
      if (email) localStorage.setItem('ali_email', email);
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailParam]);

  const Card = ({ title, description, onClick, disabled }) => (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      className={[
        'text-left w-full rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all',
        disabled ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-md hover:border-gray-300'
      ].join(' ')}
    >
      <div className="text-lg font-semibold text-gray-900">{title}</div>
      <div className="text-sm text-gray-600 mt-2">{description}</div>
      {!disabled ? (
        <div className="text-sm font-semibold text-blue-600 mt-4">Open →</div>
      ) : (
        <div className="text-sm font-semibold text-gray-500 mt-4">Coming soon</div>
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <AliHeader active="reports" email={email} isSuperAdminUser={isSuperAdminUser} onNavigate={handleNavigate} />

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <nav className="text-sm text-gray-500 mb-1" aria-label="Breadcrumb">
              <button onClick={() => handleNavigate(withEmail('/ali/dashboard'))} className="hover:text-gray-900">Dashboard</button>
              <span className="mx-1">→</span>
              <span className="text-gray-900 font-medium">Reports</span>
            </nav>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports</h1>
            <p className="text-gray-600">Choose a deep-dive view. Each report focuses on one concept.</p>
          </div>
          <button
            onClick={() => handleNavigate(withEmail('/ali/dashboard'))}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Dashboard
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card
            title="Zones"
            description="Understand your current zone, why it was assigned, and what to do next."
            onClick={() => handleNavigate(withEmail('/ali/reports/zones'))}
          />
          <Card
            title="Patterns"
            description="Explore the seven leadership patterns (clarity, consistency, trust, etc.) with trend charts. Coming soon."
            disabled
          />
          <Card
            title="Leadership Mirror"
            description="See where leader and team experience differ most—and how to close the gap."
            onClick={() => handleNavigate(withEmail('/ali/reports/mirror'))}
          />
          <Card
            title="Leadership Profile"
            description="Explore your leadership archetype (Honesty & Clarity) and growth opportunities."
            onClick={() => handleNavigate(withEmail('/ali/reports/profile'))}
          />
          <Card
            title="Trajectory"
            description="Track movement across survey cycles and understand what changed. Coming soon."
            disabled
          />
        </div>
      </main>
      <AliFooter />

      {/* Archy Chat Floating Button */}
      <button
        onClick={() => {
          setArchyInitialMessage(null);
          setShowArchyChat(!showArchyChat);
        }}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 h-14 w-14 sm:h-20 sm:w-20 rounded-full bg-[#FF6B35] shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center overflow-hidden"
        aria-label="Chat with Archy about your reports"
      >
        <img
          src="/images/archy-avatar.png"
          alt="Archy"
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
      </button>

      {/* Archy Chat Overlay */}
      {showArchyChat && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-end p-4 md:p-8 pointer-events-none">
          <div className="w-full max-w-xl h-[85vh] max-h-[700px] pointer-events-auto flex flex-col">
            <div className="bg-white rounded-2xl shadow-2xl h-full flex flex-col overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10">
                    <img
                      src="/images/archy-avatar.png"
                      alt="Archy"
                      className="w-10 h-10 rounded-full border-0"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">Archy</h3>
                    <p className="text-xs text-gray-500">AI Leadership Assistant</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowArchyChat(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-2"
                  aria-label="Close chat"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                <ChatApp
                  context="ali-reports-hub"
                  initialMessage={
                    archyInitialMessage ||
                    "I'm on the ALI Reports hub. Help me choose which report to open, and explain what each report is best for."
                  }
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsHub;

