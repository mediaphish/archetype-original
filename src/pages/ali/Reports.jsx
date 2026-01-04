import React from 'react';

const ALIReports = () => {
  const handleNavigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Mock data
  const reports = [
    {
      id: '1',
      period: '2024-Q1',
      ali: 68.2,
      alignment: 67.5,
      stability: 72.1,
      clarity: 69.8,
      responses: 38
    },
    {
      id: '2',
      period: '2024-Q2',
      ali: 69.5,
      alignment: 68.9,
      stability: 73.6,
      clarity: 70.1,
      responses: 42
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="text-xl font-bold text-[#1A1A1A]">ALI</div>
            <nav className="flex items-center gap-6">
              <button
                onClick={() => handleNavigate('/ali/dashboard')}
                className="text-gray-600 hover:text-[#1A1A1A]"
              >
                Dashboard
              </button>
              <button
                onClick={() => handleNavigate('/ali/deploy')}
                className="text-gray-600 hover:text-[#1A1A1A]"
              >
                Deploy
              </button>
              <button
                onClick={() => handleNavigate('/ali/settings')}
                className="text-gray-600 hover:text-[#1A1A1A]"
              >
                Settings
              </button>
              <button
                onClick={() => handleNavigate('/ali/billing')}
                className="text-gray-600 hover:text-[#1A1A1A]"
              >
                Billing
              </button>
              <button
                onClick={() => handleNavigate('/ali')}
                className="text-gray-600 hover:text-gray-800"
              >
                Log Out
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1A1A1A] mb-2">Reports</h1>
          <p className="text-gray-600">Historical reports and detailed analysis</p>
        </div>

        {/* Reports List */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-[#1A1A1A] mb-6">Quarterly Reports</h2>
          
          {reports.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No reports available yet
            </div>
          ) : (
            <div className="space-y-6">
              {reports.map((report) => (
                <div key={report.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-[#1A1A1A]">{report.period}</h3>
                      <p className="text-sm text-gray-600">{report.responses} responses</p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => alert('View report - coming soon')}
                        className="bg-[#C85A3C] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[#B8492A] text-sm"
                      >
                        View Report
                      </button>
                      <button
                        onClick={() => alert('Export PDF - coming soon')}
                        className="bg-white border border-gray-300 text-[#1A1A1A] px-4 py-2 rounded-lg font-semibold hover:bg-gray-50 text-sm"
                      >
                        Export PDF
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded p-4">
                      <div className="text-sm font-medium text-gray-600 mb-1">ALI Score</div>
                      <div className="text-2xl font-bold text-[#1A1A1A]">{report.ali.toFixed(1)}</div>
                    </div>
                    <div className="bg-gray-50 rounded p-4">
                      <div className="text-sm font-medium text-gray-600 mb-1">Alignment</div>
                      <div className="text-2xl font-bold text-[#1A1A1A]">{report.alignment.toFixed(1)}</div>
                    </div>
                    <div className="bg-gray-50 rounded p-4">
                      <div className="text-sm font-medium text-gray-600 mb-1">Stability</div>
                      <div className="text-2xl font-bold text-[#1A1A1A]">{report.stability.toFixed(1)}</div>
                    </div>
                    <div className="bg-gray-50 rounded p-4">
                      <div className="text-sm font-medium text-gray-600 mb-1">Clarity</div>
                      <div className="text-2xl font-bold text-[#1A1A1A]">{report.clarity.toFixed(1)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default ALIReports;

