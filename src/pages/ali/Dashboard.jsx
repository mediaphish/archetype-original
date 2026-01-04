import React, { useState } from 'react';

const ALIDashboard = () => {
  const [expandedZone, setExpandedZone] = useState(null);
  const [expandedProfile, setExpandedProfile] = useState(false);

  const handleNavigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Mock data matching the API structure
  const mockData = {
    company: {
      id: 'company-123',
      name: 'Acme Corporation',
      subscription_status: 'active'
    },
    scores: {
      ali: { current: 71.2, rolling: 69.5, zone: 'yellow' },
      anchors: { current: 74.0, rolling: 72.8 },
      patterns: {
        clarity: { current: 68.0, rolling: 70.1 },
        consistency: { current: 72.4, rolling: 71.3 },
        trust: { current: 65.2, rolling: 66.0 },
        communication: { current: 73.1, rolling: 72.5 },
        alignment: { current: 69.8, rolling: 68.9 },
        stability: { current: 75.0, rolling: 73.6 },
        leadership_drift: { current: 62.5, rolling: 64.0 }
      }
    },
    coreScores: {
      alignment: 68.9,
      stability: 73.6,
      clarity: 70.1
    },
    experienceMap: {
      x: 70.1,
      y: 69.6,
      zone: 'harmony'
    },
    leadershipProfile: {
      profile: 'guardian',
      honesty: { score: 72.5, state: 'courageous' },
      clarity: { level: 70.1, stddev: 5.2, state: 'high' }
    },
    leadershipMirror: {
      gaps: { ali: 12.3, alignment: 8.4, stability: 5.2, clarity: 10.1 },
      severity: { ali: 'caution', alignment: 'neutral', stability: 'neutral', clarity: 'caution' },
      leaderScores: { ali: 75.0, alignment: 72.0, stability: 78.0, clarity: 75.0 },
      teamScores: { ali: 62.7, alignment: 63.6, stability: 72.8, clarity: 64.9 }
    },
    trajectory: {
      value: -0.8,
      direction: 'declining',
      magnitude: 0.8,
      method: 'drift_index'
    },
    responseCounts: {
      overall: 42,
      leader: 8,
      team_member: 34
    },
    dataQuality: {
      meets_minimum_n: true,
      meets_minimum_n_team: true,
      meets_minimum_n_org: true,
      response_count: 42,
      data_quality_banner: false
    }
  };

  // Pattern color mapping for charts ONLY
  const getPatternColor = (pattern) => {
    const colors = {
      clarity: '#2563eb',
      consistency: '#14b8a6',
      trust: '#8b5cf6',
      communication: '#f59e0b',
      alignment: '#10b981',
      stability: '#6366f1',
      leadership_drift: '#ef4444'
    };
    return colors[pattern] || '#2563eb';
  };

  // Zone colors for score displays ONLY
  const getScoreColor = (score) => {
    if (score >= 75) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 45) return 'text-orange-500';
    return 'text-red-500';
  };

  const profileNames = {
    guardian: 'Guardian',
    aspirer: 'Aspirer',
    protector: 'Protector',
    producer_leader: 'Producer-Leader',
    stabilizer: 'Stabilizer',
    operator: 'Operator',
    profile_forming: 'Profile Forming'
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="text-xl font-bold text-gray-900">ALI</div>
            <nav className="flex items-center gap-6">
              <button
                onClick={() => handleNavigate('/ali/dashboard')}
                className="text-blue-600 font-semibold"
              >
                Dashboard
              </button>
              <button
                onClick={() => handleNavigate('/ali/deploy')}
                className="text-gray-600 hover:text-gray-900"
              >
                Deploy
              </button>
              <button
                onClick={() => handleNavigate('/ali/settings')}
                className="text-gray-600 hover:text-gray-900"
              >
                Settings
              </button>
              <button
                onClick={() => handleNavigate('/ali/billing')}
                className="text-gray-600 hover:text-gray-900"
              >
                Billing
              </button>
              <button
                onClick={() => handleNavigate('/ali')}
                className="text-gray-600 hover:text-gray-900"
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">{mockData.company.name}</p>
        </div>

        {/* Section 1: Four Core Score Cards */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">HEADLINE REALITY</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Alignment Score Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 transition-all duration-200 hover:transform hover:-translate-y-1 hover:shadow-lg">
              <div className="text-sm font-medium text-gray-600 mb-2">Alignment</div>
              <div className={`text-4xl font-bold mb-2 ${getScoreColor(mockData.coreScores.alignment)}`}>
                {Math.round(mockData.coreScores.alignment)}
              </div>
              <div className="text-xs text-gray-500">Rolling Score</div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">Trend:</span>
                  <span className="text-gray-600">→ Stable</span>
                </div>
              </div>
            </div>

            {/* Stability Score Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 transition-all duration-200 hover:transform hover:-translate-y-1 hover:shadow-lg">
              <div className="text-sm font-medium text-gray-600 mb-2">Stability</div>
              <div className={`text-4xl font-bold mb-2 ${getScoreColor(mockData.coreScores.stability)}`}>
                {Math.round(mockData.coreScores.stability)}
              </div>
              <div className="text-xs text-gray-500">Rolling Score</div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">Trend:</span>
                  <span className="text-gray-600">↑ Improving</span>
                </div>
              </div>
            </div>

            {/* Clarity Score Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 transition-all duration-200 hover:transform hover:-translate-y-1 hover:shadow-lg">
              <div className="text-sm font-medium text-gray-600 mb-2">Clarity</div>
              <div className={`text-4xl font-bold mb-2 ${getScoreColor(mockData.coreScores.clarity)}`}>
                {Math.round(mockData.coreScores.clarity)}
              </div>
              <div className="text-xs text-gray-500">Rolling Score</div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">Trend:</span>
                  <span className="text-gray-600">→ Stable</span>
                </div>
              </div>
            </div>

            {/* Trajectory Score Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 transition-all duration-200 hover:transform hover:-translate-y-1 hover:shadow-lg">
              <div className="text-sm font-medium text-gray-600 mb-2">Trajectory</div>
              <div className="flex items-center gap-2 mb-2">
                {mockData.trajectory.direction === 'improving' ? (
                  <span className="text-4xl text-gray-900">↑</span>
                ) : mockData.trajectory.direction === 'declining' ? (
                  <span className="text-4xl text-gray-900">↓</span>
                ) : (
                  <span className="text-4xl text-gray-900">→</span>
                )}
                <span className={`text-4xl font-bold ${getScoreColor(Math.abs(mockData.trajectory.value) * 100)}`}>
                  {Math.abs(mockData.trajectory.value).toFixed(1)}
                </span>
              </div>
              <div className="text-xs text-gray-500 capitalize">{mockData.trajectory.direction}</div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-500">Method: {mockData.trajectory.method === 'drift_index' ? 'Drift Index' : 'QoQ Delta'}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Team Experience Map */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Team Experience Map</h2>
            <button
              onClick={() => setExpandedZone(expandedZone === 'map' ? null : 'map')}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {expandedZone === 'map' ? 'Hide explanation' : 'What does this mean?'}
            </button>
          </div>
          
          {expandedZone === 'map' && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-700 mb-2">
                The Team Experience Map visualizes your team's experience across two dimensions: <strong>Clarity</strong> (how clearly expectations are communicated) and <strong>Stability + Trust</strong> (how predictable and safe the environment feels).
              </p>
              <p className="text-xs text-gray-600">
                The map is divided into four zones that represent different team experiences. Your current position shows where your team is right now.
              </p>
            </div>
          )}

          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <div className="relative w-full h-96 border border-gray-300 bg-gray-50">
              {/* Equal Quadrants - 50/50 split - NO colored backgrounds */}
              <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                <div className="border-r border-b border-gray-200"></div>
                <div className="border-b border-gray-200"></div>
                <div className="border-r border-gray-200"></div>
                <div></div>
              </div>

              {/* Zone Boundaries (dashed lines at 50%) */}
              <div className="absolute top-0 bottom-0 left-1/2 w-px border-l-2 border-dashed border-gray-400"></div>
              <div className="absolute left-0 right-0 top-1/2 h-px border-t-2 border-dashed border-gray-400"></div>

              {/* Zone Labels */}
              <div className="absolute top-4 left-4 text-gray-900 font-semibold">Strain</div>
              <div className="absolute top-4 right-4 text-gray-900 font-semibold">Harmony</div>
              <div className="absolute bottom-4 left-4 text-gray-900 font-semibold">Stress</div>
              <div className="absolute bottom-4 right-4 text-gray-900 font-semibold">Hazard</div>

              {/* Axes Labels */}
              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs text-gray-600 font-medium">
                Clarity (Low) ← → Clarity (High)
              </div>
              <div className="absolute left-2 top-1/2 transform -translate-y-1/2 -rotate-90 origin-center text-xs text-gray-600 font-medium whitespace-nowrap">
                Stability + Trust (Low) ← → Stability + Trust (High)
              </div>
              <div className="absolute left-2 top-2 text-xs text-gray-500">High</div>
              <div className="absolute left-2 bottom-2 text-xs text-gray-500">Low</div>

              {/* Current Position Dot */}
              <div
                className="absolute w-4 h-4 bg-blue-600 rounded-full border-2 border-white transform -translate-x-1/2 -translate-y-1/2 shadow-lg z-10"
                style={{
                  left: `${mockData.experienceMap.x}%`,
                  top: `${100 - mockData.experienceMap.y}%`
                }}
              >
                <div className="absolute top-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-gray-900 text-white text-xs px-2 py-1 rounded">
                  Current Position
                </div>
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-600">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <strong>X-axis (Clarity):</strong> {mockData.experienceMap.x.toFixed(1)}
                </div>
                <div>
                  <strong>Y-axis (Stability + Trust):</strong> {mockData.experienceMap.y.toFixed(1)}
                </div>
                <div>
                  <strong>Zone:</strong> <span className="capitalize font-semibold text-gray-900">{mockData.experienceMap.zone}</span>
                </div>
              </div>

              {/* Zone Descriptions - Expandable */}
              <div className="border-t border-gray-200 pt-4">
                <button
                  onClick={() => setExpandedZone(expandedZone === 'zones' ? null : 'zones')}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 mb-2"
                >
                  {expandedZone === 'zones' ? '▼' : '▶'} Zone Descriptions
                </button>
                {expandedZone === 'zones' && (
                  <div className="mt-2 space-y-3 text-xs text-gray-600">
                    <div>
                      <strong className="text-gray-900">Harmony Zone (Top-Right):</strong> High Clarity and High Stability + Trust. Teams experience clear expectations and a safe, predictable environment.
                    </div>
                    <div>
                      <strong className="text-gray-900">Strain Zone (Top-Left):</strong> Low Clarity but High Stability + Trust. Teams feel safe but confused about priorities and expectations.
                    </div>
                    <div>
                      <strong className="text-gray-900">Stress Zone (Bottom-Left):</strong> Low Clarity and Low Stability + Trust. Teams experience confusion and unpredictability.
                    </div>
                    <div>
                      <strong className="text-gray-900">Hazard Zone (Bottom-Right):</strong> High Clarity but Low Stability + Trust. Teams understand expectations but lack trust and stability.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Pattern Analysis */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">DIAGNOSIS - Pattern Analysis</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(mockData.scores.patterns).map(([pattern, scores]) => {
              // Mock historical data for mini chart (4 quarters)
              const historicalData = [
                scores.rolling - 5,
                scores.rolling - 2,
                scores.rolling + 1,
                scores.rolling
              ];
              const maxVal = Math.max(...historicalData, 100);
              const minVal = Math.min(...historicalData, 0);
              const range = maxVal - minVal || 1;
              const patternColor = getPatternColor(pattern);

              return (
                <div key={pattern} className="bg-white rounded-lg border border-gray-200 p-4 transition-all duration-200 hover:transform hover:-translate-y-1 hover:shadow-lg">
                  <div className="text-sm font-medium text-gray-600 mb-2 capitalize">{pattern.replace('_', ' ')}</div>
                  <div className={`text-3xl font-bold mb-2 ${getScoreColor(scores.rolling)}`}>
                    {Math.round(scores.rolling)}
                  </div>
                  <div className="text-xs text-gray-500 mb-3">Rolling: {scores.rolling.toFixed(1)}</div>
                  
                  {/* Mini Trend Chart - uses pattern color */}
                  <div className="mb-3">
                    <div className="flex items-end gap-1 h-12">
                      {historicalData.map((value, idx) => {
                        const height = ((value - minVal) / range) * 100;
                        return (
                          <div
                            key={idx}
                            className="flex-1 rounded-t opacity-60"
                            style={{ 
                              height: `${Math.max(height, 5)}%`,
                              backgroundColor: patternColor
                            }}
                            title={`Q${idx + 1}: ${value.toFixed(1)}`}
                          ></div>
                        );
                      })}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">Last 4 quarters</div>
                  </div>

                  <div className="text-xs text-gray-400">Status: Stable</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 4: Leadership Profile */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Leadership Profile</h2>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="text-2xl font-bold text-gray-900 mb-4 capitalize">
              {profileNames[mockData.leadershipProfile.profile]}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-sm font-medium text-gray-600 mb-2">Honesty Axis</div>
                <div className="text-lg font-semibold text-gray-900 mb-1">
                  Score: {mockData.leadershipProfile.honesty.score.toFixed(1)}
                </div>
                <div className="text-sm text-gray-600 capitalize">
                  State: {mockData.leadershipProfile.honesty.state}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600 mb-2">Clarity Axis</div>
                <div className="text-lg font-semibold text-gray-900 mb-1">
                  Level: {mockData.leadershipProfile.clarity.level.toFixed(1)}
                </div>
                <div className="text-sm text-gray-600 capitalize">
                  State: {mockData.leadershipProfile.clarity.state}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Std Dev: {mockData.leadershipProfile.clarity.stddev.toFixed(1)}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5: Leadership Mirror */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Leadership Mirror</h2>
          <div className="bg-white rounded-lg border border-gray-200 p-6 transition-all duration-200 hover:shadow-lg">
            <div className="space-y-6">
              {(['ali', 'alignment', 'stability', 'clarity']).map((metric) => {
                const gap = mockData.leadershipMirror.gaps[metric];
                const severity = mockData.leadershipMirror.severity[metric];
                const leaderScore = mockData.leadershipMirror.leaderScores[metric];
                const teamScore = mockData.leadershipMirror.teamScores[metric];
                const maxScore = Math.max(leaderScore, teamScore, 100);

                return (
                  <div key={metric} className="border-b border-gray-200 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium text-gray-900 capitalize">{metric === 'ali' ? 'ALI Overall' : metric}</div>
                      <div className="text-sm font-semibold text-gray-600 capitalize">
                        Gap: {gap.toFixed(1)} ({severity})
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="text-xs text-gray-500 mb-1">Leader</div>
                        <div className="h-8 bg-blue-100 rounded flex items-center justify-end pr-2" style={{ width: `${(leaderScore / maxScore) * 100}%` }}>
                          <span className="text-xs font-semibold text-blue-700">{leaderScore.toFixed(1)}</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-gray-500 mb-1">Team</div>
                        <div className="h-8 bg-gray-100 rounded flex items-center justify-end pr-2" style={{ width: `${(teamScore / maxScore) * 100}%` }}>
                          <span className="text-xs font-semibold text-gray-700">{teamScore.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Section 6: Historical Trends */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Historical Trends</h2>
            <button
              onClick={() => handleNavigate('/ali/reports')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View Full Report →
            </button>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6 transition-all duration-200 hover:shadow-lg">
            {/* Multi-Metric Overlay Chart */}
            <div className="mb-4">
              <div className="text-sm text-gray-600 mb-4">Rolling Scores (4-survey average)</div>
              <div className="h-64 relative border-b border-l border-gray-300">
                {/* Y-axis labels */}
                <div className="absolute -left-10 top-0 text-xs text-gray-500">100</div>
                <div className="absolute -left-10 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">50</div>
                <div className="absolute -left-10 bottom-0 text-xs text-gray-500">0</div>
                
                {/* Chart lines - using pattern colors */}
                <svg className="absolute inset-0 w-full h-full" style={{ padding: '10px' }}>
                  <polyline
                    points="20,180 120,170 220,160 320,150"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2"
                  />
                  <polyline
                    points="20,190 120,175 220,165 320,155"
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="2"
                  />
                  <polyline
                    points="20,185 120,172 220,162 320,152"
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="2"
                  />
                </svg>
                
                {/* X-axis labels */}
                <div className="absolute bottom-0 left-0 right-0 flex justify-around pt-2">
                  <div className="text-xs text-gray-600">Q4 2025</div>
                  <div className="text-xs text-gray-600">Q1 2026</div>
                  <div className="text-xs text-gray-600">Q2 2026</div>
                  <div className="text-xs text-gray-600">Q1 2027</div>
                </div>
              </div>
              
              {/* Legend */}
              <div className="flex gap-6 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5" style={{ backgroundColor: '#10b981' }}></div>
                  <span className="text-gray-600">Alignment</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5" style={{ backgroundColor: '#6366f1' }}></div>
                  <span className="text-gray-600">Stability</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5" style={{ backgroundColor: '#2563eb' }}></div>
                  <span className="text-gray-600">Clarity</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 7: Response Analytics */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Response Analytics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-6 transition-all duration-200 hover:transform hover:-translate-y-1 hover:shadow-lg">
              <div className="text-sm font-medium text-gray-600 mb-2">Total Responses</div>
              <div className="text-4xl font-bold text-gray-900">{mockData.responseCounts.overall}</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6 transition-all duration-200 hover:transform hover:-translate-y-1 hover:shadow-lg">
              <div className="text-sm font-medium text-gray-600 mb-2">This Quarter</div>
              <div className="text-4xl font-bold text-gray-900">{Math.floor(mockData.responseCounts.overall * 0.6)}</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6 transition-all duration-200 hover:transform hover:-translate-y-1 hover:shadow-lg">
              <div className="text-sm font-medium text-gray-600 mb-2">Avg. Completion</div>
              <div className="text-4xl font-bold text-gray-900">4.2</div>
              <div className="text-xs text-gray-500 mt-1">min</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6 transition-all duration-200 hover:transform hover:-translate-y-1 hover:shadow-lg">
              <div className="text-sm font-medium text-gray-600 mb-2">Response Rate</div>
              <div className="text-4xl font-bold text-gray-900">92</div>
              <div className="text-xs text-gray-500 mt-1">%</div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ALIDashboard;
