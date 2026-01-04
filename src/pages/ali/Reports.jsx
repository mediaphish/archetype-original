import React from 'react';

const ALIReports = () => {
  const handleNavigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Mock data for historical analysis
  const mockData = {
    company: {
      id: 'company-123',
      name: 'Acme Corporation'
    },
    historicalTrends: [
      { period: '2025 Q4', ali: 64.3, alignment: 63.5, stability: 68.1, clarity: 65.8 },
      { period: '2026 Q1', ali: 67.2, alignment: 66.8, stability: 70.5, clarity: 68.4 },
      { period: '2026 Q2', ali: 69.5, alignment: 68.9, stability: 72.3, clarity: 70.1 },
      { period: '2027 Q1', ali: 73.7, alignment: 72.9, stability: 74.6, clarity: 75.9 }
    ],
    patternTrends: {
      clarity: [70.0, 72.5, 76.3, 78.8],
      consistency: [62.5, 67.5, 70.0, 72.5],
      trust: [67.5, 70.0, 72.5, 75.0],
      communication: [60.0, 65.0, 68.8, 71.3],
      alignment: [65.0, 68.8, 71.3, 76.3],
      stability: [67.5, 68.8, 70.0, 71.3],
      leadership_drift: [37.5, 32.5, 27.5, 22.5]
    },
    responseCounts: {
      overall: 86,
      quarters: [18, 23, 21, 24]
    }
  };

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
                onClick={() => handleNavigate('/ali/reports')}
                className="text-[#C85A3C] font-semibold"
              >
                Reports
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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#1A1A1A] mb-2">Leadership Trends & Analytics</h1>
            <p className="text-gray-600">Multi-year progression analysis 2025 Q4 - 2027 Q1</p>
          </div>
          <button
            onClick={() => handleNavigate('/ali/dashboard')}
            className="text-sm text-[#C85A3C] hover:text-[#B8492A]"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Summary Cards */}
        <section className="mb-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="text-sm font-medium text-gray-600 mb-2">ALI Overall Improvement</div>
              <div className="text-4xl font-bold text-green-600 mb-1">+14.6%</div>
              <div className="text-sm text-gray-500">from 64.3 to 73.7</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="text-sm font-medium text-gray-600 mb-2">Current ALI Score</div>
              <div className="text-4xl font-bold text-[#1A1A1A] mb-1">73.7</div>
              <div className="text-sm text-gray-500">Rolling: 71.8</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="text-sm font-medium text-gray-600 mb-2">Total Responses</div>
              <div className="text-4xl font-bold text-[#1A1A1A] mb-1">86</div>
              <div className="text-sm text-gray-500">across 4 surveys</div>
            </div>
          </div>
        </section>

        {/* Pattern Analysis with Historical Charts */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-[#1A1A1A] mb-4">Core Patterns</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(mockData.patternTrends).map(([pattern, values]) => {
              const current = values[values.length - 1];
              const previous = values[0];
              const change = ((current - previous) / previous * 100).toFixed(1);
              const maxVal = Math.max(...values, 100);
              const minVal = Math.min(...values, 0);
              const range = maxVal - minVal || 1;

              return (
                <div key={pattern} className="bg-white rounded-lg border border-gray-200 p-6 transition-all duration-200 hover:shadow-lg">
                  <div className="text-sm font-medium text-gray-600 mb-2 capitalize">{pattern.replace('_', ' ')}</div>
                  <div className="text-3xl font-bold text-[#1A1A1A] mb-1">{current.toFixed(1)}</div>
                  <div className="text-xs text-gray-500 mb-4">
                    Rolling: {((values.reduce((a, b) => a + b, 0) / values.length)).toFixed(1)} • ↑ {change}%
                  </div>
                  
                  {/* Historical Bar Chart */}
                  <div className="mb-4">
                    <div className="flex items-end gap-2 h-20">
                      {values.map((value, idx) => {
                        const height = ((value - minVal) / range) * 100;
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center">
                            <div
                              className="w-full bg-[#C85A3C] rounded-t"
                              style={{ height: `${Math.max(height, 5)}%` }}
                              title={`${mockData.historicalTrends[idx].period}: ${value.toFixed(1)}`}
                            ></div>
                            <div className="text-xs text-gray-400 mt-1">{mockData.historicalTrends[idx].period.split(' ')[1]}</div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      {values.map((v, i) => `${v.toFixed(1)} (${mockData.responseCounts.quarters[i]})`).join(' • ')}
                    </div>
                  </div>

                  <div className="text-xs text-gray-400">4 survey cycles</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Key Insights */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-[#1A1A1A] mb-4">Key Insights & Movement</h2>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <ul className="space-y-4 text-sm text-gray-700">
              <li className="flex items-start gap-3">
                <span className="text-green-600 mt-1">✓</span>
                <div>
                  <strong>Sustained Positive Movement:</strong> Consistent improvement across core patterns, with Clarity showing the strongest gains (+12.6%).
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-600 mt-1">↓</span>
                <div>
                  <strong>Leadership Drift Reduction:</strong> 40% decrease in Leadership Drift indicates improved alignment between stated values and actual behaviors.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-yellow-600 mt-1">!</span>
                <div>
                  <strong>Perception Gap Alert: Communication</strong> — Moderate perception gap detected: Leaders: 75.0, Team: 70.0, Gap: 5.0. Consider 360-degree feedback opportunities.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-blue-600 mt-1">💡</span>
                <div>
                  <strong>Recommended Next Steps:</strong> Continue quarterly surveys. ALI Overall Score has reached 73.7 (Yellow Zone). Focus on sustaining gains and addressing the communication perception gap.
                </div>
              </li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ALIReports;
