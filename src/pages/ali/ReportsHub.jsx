import React from 'react';

const ReportsHub = () => {
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
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="text-xl font-bold text-gray-900">ALI</div>
            <nav className="flex items-center gap-6">
              <button onClick={() => handleNavigate(withEmail('/ali/dashboard'))} className="text-gray-600 hover:text-gray-900">
                Dashboard
              </button>
              <button onClick={() => handleNavigate(withEmail('/ali/reports'))} className="text-blue-600 font-semibold">
                Reports
              </button>
              <button onClick={() => handleNavigate(withEmail('/ali/deploy'))} className="text-gray-600 hover:text-gray-900">
                Deploy
              </button>
              <button onClick={() => handleNavigate(withEmail('/ali/settings'))} className="text-gray-600 hover:text-gray-900">
                Settings
              </button>
              <button onClick={() => handleNavigate(withEmail('/ali/billing'))} className="text-gray-600 hover:text-gray-900">
                Billing
              </button>
              {isSuperAdminUser && (
                <button
                  onClick={() => handleNavigate(withEmail('/ali/super-admin/overview'))}
                  className="text-[#2563eb] font-semibold hover:text-[#1d4ed8]"
                >
                  Super Admin
                </button>
              )}
              <button onClick={() => handleNavigate('/ali/login')} className="text-gray-600 hover:text-gray-900">
                Log Out
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
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
            description="Explore the seven leadership patterns (clarity, consistency, trust, etc.) with trend charts."
            disabled
          />
          <Card
            title="Perception Gaps"
            description="See where leaders and team experience differ most—and how to close the gap."
            disabled
          />
          <Card
            title="Trajectory"
            description="Track movement across survey cycles and understand what changed."
            disabled
          />
        </div>
      </main>
    </div>
  );
};

export default ReportsHub;

