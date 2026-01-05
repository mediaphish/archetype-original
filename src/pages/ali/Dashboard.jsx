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
      alignment: { rolling: 72.9, current: 76.3, trend: 9.3 },
      stability: { rolling: 70.4, current: 71.3, trend: 4.1 },
      clarity: { rolling: 75.9, current: 78.8, trend: 5.9 }
    },
    trajectory: {
      value: 2.8,
      direction: 'improving',
      magnitude: 2.8,
      method: 'drift_index'
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
    responseCounts: {
      overall: 86,
      thisQuarter: 24,
      leader: 8,
      team_member: 34,
      avgCompletion: 4.2,
      responseRate: 92
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

  // Progress bar colors (background) for score displays
  const getProgressBarColor = (score) => {
    if (score >= 75) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 45) return 'bg-orange-500';
    return 'bg-red-500';
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Leadership Dashboard</h1>
          <p className="text-gray-600">24 responses this quarter • Rolling scores (4-survey average)</p>
        </div>

        {/* Section 1: Four Core Score Cards */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Leadership Dashboard</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Alignment Score Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 transition-all duration-200 hover:transform hover:-translate-y-1 hover:shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-600">Alignment</div>
                <div className="flex items-center gap-1 text-sm text-green-600">
                  <span>↑</span>
                  <span>+{mockData.coreScores.alignment.trend.toFixed(1)}</span>
                </div>
              </div>
              <div className="text-4xl font-bold mb-2 text-orange-500">
                {mockData.coreScores.alignment.rolling.toFixed(1)}
              </div>
              <div className="mb-3">
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500"
                    style={{ width: `${Math.min(Math.max(mockData.coreScores.alignment.rolling, 0), 100)}%` }}
                  ></div>
                </div>
              </div>
              <div className="text-xs text-gray-500">Current: {mockData.coreScores.alignment.current.toFixed(1)}</div>
            </div>

            {/* Stability Score Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 transition-all duration-200 hover:transform hover:-translate-y-1 hover:shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-600">Stability</div>
                <div className="flex items-center gap-1 text-sm text-green-600">
                  <span>↑</span>
                  <span>+{mockData.coreScores.stability.trend.toFixed(1)}</span>
                </div>
              </div>
              <div className="text-4xl font-bold mb-2 text-yellow-500">
                {mockData.coreScores.stability.rolling.toFixed(1)}
              </div>
              <div className="mb-3">
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-500"
                    style={{ width: `${Math.min(Math.max(mockData.coreScores.stability.rolling, 0), 100)}%` }}
                  ></div>
                </div>
              </div>
              <div className="text-xs text-gray-500">Current: {mockData.coreScores.stability.current.toFixed(1)}</div>
            </div>

            {/* Clarity Score Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 transition-all duration-200 hover:transform hover:-translate-y-1 hover:shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-600">Clarity</div>
                <div className="flex items-center gap-1 text-sm text-green-600">
                  <span>↑</span>
                  <span>+{mockData.coreScores.clarity.trend.toFixed(1)}</span>
                </div>
              </div>
              <div className="text-4xl font-bold mb-2 text-green-500">
                {mockData.coreScores.clarity.rolling.toFixed(1)}
              </div>
              <div className="mb-3">
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500"
                    style={{ width: `${Math.min(Math.max(mockData.coreScores.clarity.rolling, 0), 100)}%` }}
                  ></div>
                </div>
              </div>
              <div className="text-xs text-gray-500">Current: {mockData.coreScores.clarity.current.toFixed(1)}</div>
            </div>

            {/* Trajectory Score Card */}
            <div className="bg-green-50 rounded-lg border border-green-200 p-6 transition-all duration-200 hover:transform hover:-translate-y-1 hover:shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-600">Trajectory</div>
                <div className="text-xs text-gray-500">DRIFTINDEX</div>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-4xl text-green-600">↑</span>
                <span className="text-4xl font-bold text-green-600">+{mockData.trajectory.value.toFixed(1)}</span>
              </div>
              <div className="text-sm font-medium text-green-600">Improving Momentum</div>
            </div>
          </div>
        </section>

        {/* Section 2: Team Experience Map */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Team Experience Map</h2>
              <p className="text-sm text-gray-600 mt-1">Current position in Harmony Zone</p>
            </div>
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

          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 lg:p-8">
            <div className="relative w-full border border-gray-300 bg-gray-50 rounded" style={{ paddingLeft: '48px', paddingRight: '16px', paddingTop: '16px', paddingBottom: '32px' }}>
              {/* Chart Container - Square aspect ratio */}
              <div className="relative" style={{ paddingBottom: '100%' }}>
                <div className="absolute inset-0">
                  {/* Equal Quadrants - 50/50 split with colors */}
                  <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                    <div className="border-r border-b border-gray-200 bg-orange-50"></div>
                    <div className="border-b border-gray-200 bg-green-50"></div>
                    <div className="border-r border-gray-200 bg-yellow-50"></div>
                    <div className="bg-red-50"></div>
                  </div>

                  {/* Zone Boundaries (dashed lines at 50%) */}
                  <div className="absolute top-0 bottom-0 left-1/2 w-px border-l-2 border-dashed border-gray-400"></div>
                  <div className="absolute left-0 right-0 top-1/2 h-px border-t-2 border-dashed border-gray-400"></div>

                  {/* Zone Labels */}
                  <div className="absolute top-4 left-4 text-gray-900 font-semibold text-sm sm:text-base">High Strain</div>
                  <div className="absolute top-4 right-4 text-gray-900 font-semibold text-sm sm:text-base">Harmony</div>
                  <div className="absolute bottom-4 left-4 text-gray-900 font-semibold text-sm sm:text-base">
                    <div>Stress</div>
                    <div className="text-xs font-normal text-gray-600">Low</div>
                  </div>
                  <div className="absolute bottom-4 right-4 text-gray-900 font-semibold text-sm sm:text-base">Hazard</div>

                  {/* Trailing Dots */}
                  <div
                    className="absolute w-2 h-2 bg-gray-400 rounded-full transform -translate-x-1/2 -translate-y-1/2 z-5"
                    style={{
                      left: `${Math.max(mockData.experienceMap.x - 5, 0)}%`,
                      top: `${100 - Math.max(mockData.experienceMap.y - 3, 0)}%`
                    }}
                  ></div>
                  <div
                    className="absolute w-2 h-2 bg-gray-400 rounded-full transform -translate-x-1/2 -translate-y-1/2 z-5"
                    style={{
                      left: `${Math.max(mockData.experienceMap.x - 3, 0)}%`,
                      top: `${100 - Math.max(mockData.experienceMap.y - 2, 0)}%`
                    }}
                  ></div>
                  <div
                    className="absolute w-2 h-2 bg-gray-400 rounded-full transform -translate-x-1/2 -translate-y-1/2 z-5"
                    style={{
                      left: `${Math.max(mockData.experienceMap.x - 1.5, 0)}%`,
                      top: `${100 - Math.max(mockData.experienceMap.y - 1, 0)}%`
                    }}
                  ></div>
                  {/* Current Position Dot */}
                  <div
                    className="absolute w-4 h-4 bg-blue-600 rounded-full border-2 border-white transform -translate-x-1/2 -translate-y-1/2 shadow-lg z-10"
                    style={{
                      left: `${mockData.experienceMap.x}%`,
                      top: `${100 - mockData.experienceMap.y}%`
                    }}
                  >
                    <div className="absolute top-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-gray-900 text-white text-xs px-2 py-1 rounded z-20">
                      Current Position
                    </div>
                  </div>
                </div>
              </div>

              {/* Y-axis Label (Vertical) - Outside chart area */}
              <div className="absolute" style={{ top: '50%', left: '8px', transform: 'translateY(-50%) rotate(-90deg)', transformOrigin: 'center', whiteSpace: 'nowrap' }}>
                <span className="text-xs text-gray-600 font-medium">Stability + Trust (Low) ← → Stability + Trust (High)</span>
              </div>
              <div className="absolute" style={{ left: '20px', top: '16px' }}>
                <span className="text-xs text-gray-500">High</span>
              </div>
              <div className="absolute" style={{ left: '20px', bottom: '32px' }}>
                <span className="text-xs text-gray-500">Low</span>
              </div>

              {/* X-axis Label (Horizontal) - At bottom center of chart area */}
              <div className="absolute" style={{ bottom: '8px', left: '48px', right: '16px', textAlign: 'center' }}>
                <span className="text-xs text-gray-600 font-medium">Clarity (Low) ← → Clarity (High)</span>
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-600">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.entries(mockData.scores.patterns).map(([pattern, scores]) => {
              const trendChange = scores.current - scores.rolling;
              const trendDirection = trendChange > 0 ? '↑' : trendChange < 0 ? '↓' : '→';
              const trendDisplay = trendChange > 0 ? `+${trendChange.toFixed(1)}` : trendChange < 0 ? trendChange.toFixed(1) : '0.0';
              const progressPercentage = Math.min(Math.max(scores.rolling, 0), 100);
              const patternColor = getPatternColor(pattern);

              return (
                <div key={pattern} className="bg-white rounded-lg border border-gray-200 p-6 transition-all duration-200 hover:transform hover:-translate-y-1 hover:shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-gray-600 capitalize">{pattern.replace('_', ' ')}</div>
                    <div className="flex items-center gap-1 text-sm text-green-600">
                      <span>{trendDirection}</span>
                      <span>{trendDisplay}</span>
                    </div>
                  </div>
                  <div className="text-4xl font-bold mb-3" style={{ color: patternColor }}>
                    {Math.round(scores.rolling)}
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full"
                        style={{ width: `${progressPercentage}%`, backgroundColor: patternColor }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500">Current: {scores.current.toFixed(1)}</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 4: Leadership Profile */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Leadership Profile</h2>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="text-2xl font-bold text-gray-900 mb-2 capitalize">
              {profileNames[mockData.leadershipProfile.profile]}
            </div>
            <div className="text-sm text-gray-600 mb-6">Based on 4 completed surveys</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Honesty Card */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-600 mb-2">Honesty</div>
                    <div className="text-4xl font-bold text-gray-900">
                      {mockData.leadershipProfile.honesty.score.toFixed(1)}
                    </div>
                  </div>
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-sm font-medium capitalize">
                    {mockData.leadershipProfile.honesty.state}
                  </div>
                </div>
              </div>
              {/* Clarity Card */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-600 mb-2">Clarity</div>
                    <div className="text-4xl font-bold text-gray-900">
                      {mockData.leadershipProfile.clarity.level.toFixed(1)}
                    </div>
                  </div>
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-sm font-medium capitalize">
                    {mockData.leadershipProfile.clarity.state}
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Stddev: {mockData.leadershipProfile.clarity.stddev.toFixed(1)}
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
              <div className="text-4xl font-bold text-gray-900">{mockData.responseCounts.thisQuarter}</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6 transition-all duration-200 hover:transform hover:-translate-y-1 hover:shadow-lg">
              <div className="text-sm font-medium text-gray-600 mb-2">Avg. Completion</div>
              <div className="text-4xl font-bold text-gray-900">{mockData.responseCounts.avgCompletion}</div>
              <div className="text-xs text-gray-500 mt-1">min</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-6 transition-all duration-200 hover:transform hover:-translate-y-1 hover:shadow-lg">
              <div className="text-sm font-medium text-gray-600 mb-2">Response Rate</div>
              <div className="text-4xl font-bold text-gray-900">{mockData.responseCounts.responseRate}</div>
              <div className="text-xs text-gray-500 mt-1">%</div>
            </div>
          </div>
        </section>

        {/* Section 8: Multi-Year Trends */}
        <section className="mb-12">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Multi-Year Trends & Insights</h2>
                <p className="text-sm text-gray-600">View comprehensive analysis with historical comparisons and pattern evolution</p>
              </div>
              <button
                onClick={() => handleNavigate('/ali/reports')}
                className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
              >
                View Full Report &gt;
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ALIDashboard;
