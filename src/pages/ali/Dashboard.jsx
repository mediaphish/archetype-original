import React from 'react';

const ALIDashboard = () => {
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

  const getScoreColor = (score) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    if (score >= 30) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score) => {
    if (score >= 70) return 'bg-green-50 border-green-200';
    if (score >= 50) return 'bg-yellow-50 border-yellow-200';
    if (score >= 30) return 'bg-orange-50 border-orange-200';
    return 'bg-red-50 border-red-200';
  };

  const getSeverityColor = (severity) => {
    if (severity === 'critical') return 'text-red-600';
    if (severity === 'caution') return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getZoneColor = (zone) => {
    const colors = {
      harmony: 'bg-green-100 border-green-400',
      strain: 'bg-yellow-100 border-yellow-400',
      stress: 'bg-orange-100 border-orange-400',
      hazard: 'bg-red-100 border-red-400'
    };
    return colors[zone] || 'bg-gray-100 border-gray-400';
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
            <div className="text-xl font-bold text-[#1A1A1A]">ALI</div>
            <nav className="flex items-center gap-6">
              <button
                onClick={() => handleNavigate('/ali/dashboard')}
                className="text-[#C85A3C] font-semibold"
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
          <h1 className="text-3xl font-bold text-[#1A1A1A] mb-2">Dashboard</h1>
          <p className="text-gray-600">{mockData.company.name}</p>
        </div>

        {/* Section 1: Four Core Score Cards */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-[#1A1A1A] mb-4">HEADLINE REALITY</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Alignment Score Card */}
            <div className={`bg-white rounded-lg border-2 p-6 ${getScoreBgColor(mockData.coreScores.alignment)}`}>
              <div className="text-sm font-medium text-gray-600 mb-2">Alignment</div>
              <div className={`text-4xl font-bold mb-2 ${getScoreColor(mockData.coreScores.alignment)}`}>
                {Math.round(mockData.coreScores.alignment)}
              </div>
              <div className="text-xs text-gray-500">Rolling Score</div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">Trend:</span>
                  <span className="text-yellow-600">→ Stable</span>
                </div>
              </div>
            </div>

            {/* Stability Score Card */}
            <div className={`bg-white rounded-lg border-2 p-6 ${getScoreBgColor(mockData.coreScores.stability)}`}>
              <div className="text-sm font-medium text-gray-600 mb-2">Stability</div>
              <div className={`text-4xl font-bold mb-2 ${getScoreColor(mockData.coreScores.stability)}`}>
                {Math.round(mockData.coreScores.stability)}
              </div>
              <div className="text-xs text-gray-500">Rolling Score</div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">Trend:</span>
                  <span className="text-green-600">↑ Improving</span>
                </div>
              </div>
            </div>

            {/* Clarity Score Card */}
            <div className={`bg-white rounded-lg border-2 p-6 ${getScoreBgColor(mockData.coreScores.clarity)}`}>
              <div className="text-sm font-medium text-gray-600 mb-2">Clarity</div>
              <div className={`text-4xl font-bold mb-2 ${getScoreColor(mockData.coreScores.clarity)}`}>
                {Math.round(mockData.coreScores.clarity)}
              </div>
              <div className="text-xs text-gray-500">Rolling Score</div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">Trend:</span>
                  <span className="text-yellow-600">→ Stable</span>
                </div>
              </div>
            </div>

            {/* Trajectory Score Card */}
            <div className={`bg-white rounded-lg border-2 p-6 ${mockData.trajectory.direction === 'improving' ? 'bg-green-50 border-green-200' : mockData.trajectory.direction === 'declining' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
              <div className="text-sm font-medium text-gray-600 mb-2">Trajectory</div>
              <div className="flex items-center gap-2 mb-2">
                {mockData.trajectory.direction === 'improving' ? (
                  <span className="text-4xl">↑</span>
                ) : mockData.trajectory.direction === 'declining' ? (
                  <span className="text-4xl">↓</span>
                ) : (
                  <span className="text-4xl">→</span>
                )}
                <span className={`text-4xl font-bold ${mockData.trajectory.direction === 'improving' ? 'text-green-600' : mockData.trajectory.direction === 'declining' ? 'text-red-600' : 'text-yellow-600'}`}>
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
          <h2 className="text-xl font-semibold text-[#1A1A1A] mb-4">Team Experience Map</h2>
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <div className="relative w-full h-96 border border-gray-300 bg-gray-50">
              {/* Zone Labels */}
              <div className="absolute top-4 left-4 text-green-700 font-semibold">Harmony</div>
              <div className="absolute top-4 right-4 text-yellow-700 font-semibold">Strain</div>
              <div className="absolute bottom-4 left-4 text-orange-700 font-semibold">Stress</div>
              <div className="absolute bottom-4 right-4 text-red-700 font-semibold">Hazard</div>

              {/* Zone Boundaries (dashed lines at 70) */}
              <div className="absolute top-0 left-1/2 bottom-0 w-px bg-gray-400 border-dashed transform -translate-x-1/2" style={{ left: '70%' }}></div>
              <div className="absolute left-0 right-0 top-1/2 h-px bg-gray-400 border-dashed transform -translate-y-1/2" style={{ top: '30%' }}></div>

              {/* Zone Colors */}
              <div className="absolute top-0 right-0 w-[30%] h-[30%] bg-green-100 opacity-30"></div>
              <div className="absolute top-0 left-0 w-[70%] h-[30%] bg-yellow-100 opacity-30"></div>
              <div className="absolute bottom-0 left-0 w-[70%] h-[70%] bg-orange-100 opacity-30"></div>
              <div className="absolute bottom-0 right-0 w-[30%] h-[70%] bg-red-100 opacity-30"></div>

              {/* Axes Labels */}
              <div className="absolute bottom-2 left-2 text-xs text-gray-600">Clarity (Low)</div>
              <div className="absolute bottom-2 right-2 text-xs text-gray-600">Clarity (High)</div>
              <div className="absolute top-2 left-2 text-xs text-gray-600 transform -rotate-90 origin-left">Stability + Trust (High)</div>
              <div className="absolute bottom-2 left-2 text-xs text-gray-600 transform -rotate-90 origin-left">Stability + Trust (Low)</div>

              {/* Current Position Dot */}
              <div
                className="absolute w-4 h-4 bg-[#C85A3C] rounded-full border-2 border-white transform -translate-x-1/2 -translate-y-1/2 shadow-lg"
                style={{
                  left: `${mockData.experienceMap.x}%`,
                  top: `${100 - mockData.experienceMap.y}%`
                }}
              >
                <div className="absolute top-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-[#1A1A1A] text-white text-xs px-2 py-1 rounded">
                  Current Position
                </div>
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-600">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>X-axis (Clarity):</strong> {mockData.experienceMap.x.toFixed(1)}
                </div>
                <div>
                  <strong>Y-axis (Stability + Trust):</strong> {mockData.experienceMap.y.toFixed(1)}
                </div>
                <div>
                  <strong>Zone:</strong> <span className="capitalize font-semibold">{mockData.experienceMap.zone}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Pattern Analysis */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-[#1A1A1A] mb-4">DIAGNOSIS - Pattern Analysis</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(mockData.scores.patterns).map(([pattern, scores]) => (
              <div key={pattern} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="text-sm font-medium text-gray-600 mb-2 capitalize">{pattern.replace('_', ' ')}</div>
                <div className={`text-3xl font-bold mb-2 ${getScoreColor(scores.rolling)}`}>
                  {Math.round(scores.rolling)}
                </div>
                <div className="text-xs text-gray-500 mb-2">Rolling: {scores.rolling.toFixed(1)}</div>
                <div className="text-xs text-gray-400">Status: Stable</div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 4: Leadership Profile */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-[#1A1A1A] mb-4">Leadership Profile</h2>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="text-2xl font-bold text-[#1A1A1A] mb-4 capitalize">
              {profileNames[mockData.leadershipProfile.profile]}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-sm font-medium text-gray-600 mb-2">Honesty Axis</div>
                <div className="text-lg font-semibold text-[#1A1A1A] mb-1">
                  Score: {mockData.leadershipProfile.honesty.score.toFixed(1)}
                </div>
                <div className="text-sm text-gray-600 capitalize">
                  State: {mockData.leadershipProfile.honesty.state}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-600 mb-2">Clarity Axis</div>
                <div className="text-lg font-semibold text-[#1A1A1A] mb-1">
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
          <h2 className="text-xl font-semibold text-[#1A1A1A] mb-4">Leadership Mirror</h2>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
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
                      <div className="text-sm font-medium text-gray-700 capitalize">{metric === 'ali' ? 'ALI Overall' : metric}</div>
                      <div className={`text-sm font-semibold ${getSeverityColor(severity)} capitalize`}>
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

        {/* Section 6: Response Analytics */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-[#1A1A1A] mb-4">Response Analytics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-sm font-medium text-gray-600 mb-1">Total Responses</div>
              <div className="text-3xl font-bold text-[#1A1A1A]">{mockData.responseCounts.overall}</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-sm font-medium text-gray-600 mb-1">Leader Responses</div>
              <div className="text-3xl font-bold text-[#1A1A1A]">{mockData.responseCounts.leader}</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-sm font-medium text-gray-600 mb-1">Team Member Responses</div>
              <div className="text-3xl font-bold text-[#1A1A1A]">{mockData.responseCounts.team_member}</div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-600">
              <strong>Data Quality:</strong> {mockData.dataQuality.meets_minimum_n_org ? 'Full dashboard enabled' : mockData.dataQuality.meets_minimum_n ? 'Limited features (5-9 responses)' : 'Insufficient data (<5 responses)'}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ALIDashboard;

