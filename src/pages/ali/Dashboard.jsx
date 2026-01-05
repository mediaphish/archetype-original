import React, { useState, useEffect, useRef } from 'react';
import { Lightbulb, Scale, Handshake, MessageSquare, Compass, Shield, BarChart3 } from 'lucide-react';

const ALIDashboard = () => {
  const [expandedZone, setExpandedZone] = useState(null);
  const [expandedProfile, setExpandedProfile] = useState(false);
  const [hoveredPattern, setHoveredPattern] = useState(null);
  const [hoveredMetric, setHoveredMetric] = useState(null);
  const [hoveredChartPoint, setHoveredChartPoint] = useState(null);
  const [animatedValues, setAnimatedValues] = useState({});
  const [chartAnimated, setChartAnimated] = useState(false);
  const chartRef = useRef(null);

  const handleNavigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Animation on mount
  useEffect(() => {
    // Animate progress bars and numbers
    const animateValue = (key, start, end, duration = 1000) => {
      const startTime = performance.now();
      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const current = start + (end - start) * easeOutQuart;
        
        setAnimatedValues(prev => ({ ...prev, [key]: current }));
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      requestAnimationFrame(animate);
    };

    // Animate all numeric values
    setTimeout(() => {
      Object.entries(mockData.coreScores).forEach(([key, value]) => {
        animateValue(`core_${key}`, 0, value.rolling, 1200);
      });
      
      Object.entries(mockData.scores.patterns).forEach(([key, value]) => {
        animateValue(`pattern_${key}`, 0, value.rolling, 1200);
      });

      animateValue('trajectory', 0, mockData.trajectory.value, 1000);
      animateValue('honesty', 0, mockData.leadershipProfile.honesty.score, 1000);
      animateValue('clarity_level', 0, mockData.leadershipProfile.clarity.level, 1000);
      animateValue('response_overall', 0, mockData.responseCounts.overall, 800);
      animateValue('response_quarter', 0, mockData.responseCounts.thisQuarter, 800);
      animateValue('response_completion', 0, mockData.responseCounts.avgCompletion, 800);
      animateValue('response_rate', 0, mockData.responseCounts.responseRate, 800);
    }, 100);

    // Animate chart lines
    setTimeout(() => {
      setChartAnimated(true);
    }, 300);
  }, []);

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
      gaps: { ali: 5.2, alignment: 7.0, stability: 3.5, clarity: 6.0 },
      severity: { ali: 'neutral', alignment: 'neutral', stability: 'neutral', clarity: 'neutral' },
      leaderScores: { ali: 76.2, alignment: 78.5, stability: 73.0, clarity: 80.5 },
      teamScores: { ali: 71.0, alignment: 71.5, stability: 69.5, clarity: 74.5 }
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

  // Profile background colors
  const getProfileColor = (profile) => {
    const colors = {
      guardian: 'bg-purple-50 border-purple-200',
      aspirer: 'bg-blue-50 border-blue-200',
      protector: 'bg-green-50 border-green-200',
      producer_leader: 'bg-orange-50 border-orange-200',
      stabilizer: 'bg-teal-50 border-teal-200',
      operator: 'bg-gray-50 border-gray-200',
      profile_forming: 'bg-yellow-50 border-yellow-200'
    };
    return colors[profile] || 'bg-gray-50 border-gray-200';
  };

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
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
            <div 
              className="bg-white rounded-lg border border-gray-200 p-6 transition-all duration-200 hover:transform hover:-translate-y-1 hover:shadow-lg relative"
              onMouseEnter={() => setHoveredMetric('alignment')}
              onMouseLeave={() => setHoveredMetric(null)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-600">Alignment</div>
                <div className="flex items-center gap-1 text-sm text-green-600">
                  <span>↑</span>
                  <span>+{mockData.coreScores.alignment.trend.toFixed(1)}</span>
                </div>
              </div>
              <div className="text-4xl font-bold mb-2 text-orange-500 transition-all duration-300">
                {(animatedValues.core_alignment ?? mockData.coreScores.alignment.rolling).toFixed(1)}
              </div>
              <div className="mb-3">
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 transition-all duration-1000 ease-out"
                    style={{ width: `${Math.min(Math.max(animatedValues.core_alignment ?? 0, 0), 100)}%` }}
                  ></div>
                </div>
              </div>
              <div className="text-xs text-gray-500">Current: {mockData.coreScores.alignment.current.toFixed(1)}</div>
              {hoveredMetric === 'alignment' && (
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg z-[100] whitespace-nowrap">
                  Rolling: {mockData.coreScores.alignment.rolling.toFixed(1)}<br/>
                  Current: {mockData.coreScores.alignment.current.toFixed(1)}<br/>
                  Trend: +{mockData.coreScores.alignment.trend.toFixed(1)}
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                </div>
              )}
            </div>

            {/* Stability Score Card */}
            <div 
              className="bg-white rounded-lg border border-gray-200 p-6 transition-all duration-200 hover:transform hover:-translate-y-1 hover:shadow-lg relative"
              onMouseEnter={() => setHoveredMetric('stability')}
              onMouseLeave={() => setHoveredMetric(null)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-600">Stability</div>
                <div className="flex items-center gap-1 text-sm text-green-600">
                  <span>↑</span>
                  <span>+{mockData.coreScores.stability.trend.toFixed(1)}</span>
                </div>
              </div>
              <div className="text-4xl font-bold mb-2 text-yellow-500 transition-all duration-300">
                {(animatedValues.core_stability ?? mockData.coreScores.stability.rolling).toFixed(1)}
              </div>
              <div className="mb-3">
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-500 transition-all duration-1000 ease-out"
                    style={{ width: `${Math.min(Math.max(animatedValues.core_stability ?? 0, 0), 100)}%` }}
                  ></div>
                </div>
              </div>
              <div className="text-xs text-gray-500">Current: {mockData.coreScores.stability.current.toFixed(1)}</div>
              {hoveredMetric === 'stability' && (
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg z-[100] whitespace-nowrap">
                  Rolling: {mockData.coreScores.stability.rolling.toFixed(1)}<br/>
                  Current: {mockData.coreScores.stability.current.toFixed(1)}<br/>
                  Trend: +{mockData.coreScores.stability.trend.toFixed(1)}
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                </div>
              )}
            </div>

            {/* Clarity Score Card */}
            <div 
              className="bg-white rounded-lg border border-gray-200 p-6 transition-all duration-200 hover:transform hover:-translate-y-1 hover:shadow-lg relative"
              onMouseEnter={() => setHoveredMetric('clarity')}
              onMouseLeave={() => setHoveredMetric(null)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-600">Clarity</div>
                <div className="flex items-center gap-1 text-sm text-green-600">
                  <span>↑</span>
                  <span>+{mockData.coreScores.clarity.trend.toFixed(1)}</span>
                </div>
              </div>
              <div className="text-4xl font-bold mb-2 text-green-500 transition-all duration-300">
                {(animatedValues.core_clarity ?? mockData.coreScores.clarity.rolling).toFixed(1)}
              </div>
              <div className="mb-3">
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-1000 ease-out"
                    style={{ width: `${Math.min(Math.max(animatedValues.core_clarity ?? 0, 0), 100)}%` }}
                  ></div>
                </div>
              </div>
              <div className="text-xs text-gray-500">Current: {mockData.coreScores.clarity.current.toFixed(1)}</div>
              {hoveredMetric === 'clarity' && (
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg z-[100] whitespace-nowrap">
                  Rolling: {mockData.coreScores.clarity.rolling.toFixed(1)}<br/>
                  Current: {mockData.coreScores.clarity.current.toFixed(1)}<br/>
                  Trend: +{mockData.coreScores.clarity.trend.toFixed(1)}
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                </div>
              )}
            </div>

            {/* Trajectory Score Card */}
            <div 
              className="bg-green-50 rounded-lg border border-green-200 p-6 transition-all duration-200 hover:transform hover:-translate-y-1 hover:shadow-lg relative"
              onMouseEnter={() => setHoveredMetric('trajectory')}
              onMouseLeave={() => setHoveredMetric(null)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-600">Trajectory</div>
                <div className="text-xs text-gray-500">DRIFTINDEX</div>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-4xl text-green-600 transition-transform duration-300 hover:scale-110">↑</span>
                <span className="text-4xl font-bold text-green-600 transition-all duration-300">
                  +{(animatedValues.trajectory ?? mockData.trajectory.value).toFixed(1)}
                </span>
              </div>
              <div className="text-sm font-medium text-green-600">Improving Momentum</div>
              {hoveredMetric === 'trajectory' && (
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg z-[100] whitespace-nowrap">
                  Value: +{mockData.trajectory.value.toFixed(1)}<br/>
                  Direction: {mockData.trajectory.direction}<br/>
                  Method: {mockData.trajectory.method}
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Section 2: Team Experience Map */}
        <section className="mb-12">
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 lg:p-8">
            {/* Title and subtitle INSIDE the panel */}
            <div className="flex items-center justify-between mb-4">
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
            <div className="relative w-full max-w-md mx-auto border border-gray-300 bg-gray-50 rounded" style={{ paddingLeft: '48px', paddingRight: '16px', paddingTop: '16px', paddingBottom: '32px' }}>
              {/* Chart Container - Square aspect ratio, compact size */}
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
                    className="absolute w-4 h-4 bg-blue-600 rounded-full border-2 border-white transform -translate-x-1/2 -translate-y-1/2 shadow-lg z-10 transition-all duration-1000 ease-out cursor-pointer hover:scale-125 hover:shadow-xl"
                    style={{
                      left: `${mockData.experienceMap.x}%`,
                      top: `${100 - mockData.experienceMap.y}%`,
                      animation: 'pulse 2s ease-in-out infinite'
                    }}
                    onMouseEnter={() => setHoveredMetric('experienceMap')}
                    onMouseLeave={() => setHoveredMetric(null)}
                  >
                    {hoveredMetric === 'experienceMap' && (
                      <div className="absolute top-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-gray-900 text-white text-xs px-2 py-1 rounded z-20">
                        X: {mockData.experienceMap.x.toFixed(1)}<br/>
                        Y: {mockData.experienceMap.y.toFixed(1)}<br/>
                        Zone: {mockData.experienceMap.zone}
                      </div>
                    )}
                    {hoveredMetric !== 'experienceMap' && (
                      <div className="absolute top-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-gray-900 text-white text-xs px-2 py-1 rounded z-20 opacity-0 hover:opacity-100 transition-opacity">
                        Current Position
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Y-axis Label (Vertical) - Rotated 90 degrees on left edge */}
              <div className="absolute" style={{ top: '50%', left: '0px', transform: 'translateY(-50%) rotate(-90deg)', transformOrigin: 'center', whiteSpace: 'nowrap' }}>
                <span className="text-xs text-gray-600 font-medium">Stability + Trust (Low) ← → Stability + Trust (High)</span>
              </div>

              {/* X-axis Label (Horizontal) - Bottom edge, same syntax */}
              <div className="absolute" style={{ bottom: '0px', left: '48px', right: '16px', textAlign: 'center' }}>
                <span className="text-xs text-gray-600 font-medium">Clarity (Low) ← → Clarity (High)</span>
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-600">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <strong>Clarity:</strong> <span className="font-bold">{mockData.experienceMap.x.toFixed(1)}</span>
                </div>
                <div>
                  <strong>(Stability + Trust) / 2:</strong> <span className="font-bold">{mockData.experienceMap.y.toFixed(1)}</span>
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
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Pattern Analysis</h2>
              <p className="text-sm text-gray-600">7 leadership patterns • Rolling scores (4-survey average)</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(mockData.scores.patterns).map(([pattern, scores]) => {
                const trendChange = scores.current - scores.rolling;
                const trendDirection = trendChange > 0 ? '↑' : trendChange < 0 ? '↓' : '→';
                const isPositive = trendChange > 0;
                const isLeadershipDrift = pattern === 'leadership_drift';
                // For Leadership Drift, decrease is good (lower drift = better)
                const trendIsGood = isLeadershipDrift ? trendChange < 0 : trendChange > 0;
                const trendColor = trendIsGood ? 'text-green-600' : 'text-orange-600';
                
                let trendDisplay;
                if (isLeadershipDrift && trendChange < 0) {
                  trendDisplay = `${Math.abs(trendChange).toFixed(1)} lower`;
                } else {
                  trendDisplay = isPositive ? `+${trendChange.toFixed(1)}` : trendChange.toFixed(1);
                }
                
                const progressPercentage = Math.min(Math.max(scores.rolling, 0), 100);
                const patternColor = getPatternColor(pattern);

                // Icon mapping
                const iconMap = {
                  clarity: Lightbulb,
                  consistency: Scale,
                  trust: Handshake,
                  communication: MessageSquare,
                  alignment: Compass,
                  stability: Shield,
                  leadership_drift: BarChart3
                };
                const Icon = iconMap[pattern] || Lightbulb;

                return (
                  <div 
                    key={pattern} 
                    className="bg-white rounded-lg border border-gray-200 p-4 transition-all duration-200 hover:transform hover:-translate-y-1 hover:shadow-lg relative"
                    onMouseEnter={() => setHoveredPattern(pattern)}
                    onMouseLeave={() => setHoveredPattern(null)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 transition-transform duration-200 hover:scale-110" style={{ color: patternColor }} />
                        <div className="text-sm font-medium text-gray-600 capitalize">{pattern.replace('_', ' ')}</div>
                      </div>
                      <div className={`flex items-center gap-1 text-sm ${trendColor}`}>
                        <span>{trendDirection}</span>
                        <span>{trendDisplay}</span>
                      </div>
                    </div>
                    <div className="text-4xl font-bold mb-3 transition-all duration-300" style={{ color: patternColor }}>
                      {(animatedValues[`pattern_${pattern}`] ?? scores.rolling).toFixed(1)}
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full transition-all duration-1000 ease-out"
                          style={{ 
                            width: `${Math.min(Math.max(animatedValues[`pattern_${pattern}`] ?? 0, 0), 100)}%`, 
                            backgroundColor: patternColor 
                          }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-500">Current: {scores.current.toFixed(1)}</div>
                    {hoveredPattern === pattern && (
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg z-[100] whitespace-nowrap">
                        Rolling: {scores.rolling.toFixed(1)}<br/>
                        Current: {scores.current.toFixed(1)}<br/>
                        Change: {trendDisplay}
                        <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Section 4 & 5: Leadership Profile and Mirror - Side by Side */}
        <section className="mb-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Leadership Profile - Full purple background */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Leadership Profile</h2>
              <div className="bg-purple-100 rounded-lg border border-purple-200 p-6">
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
                        <div className="text-4xl font-bold text-gray-900 transition-all duration-500">
                          {(animatedValues.honesty ?? mockData.leadershipProfile.honesty.score).toFixed(1)}
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
                        <div className="text-4xl font-bold text-gray-900 transition-all duration-500">
                          {(animatedValues.clarity_level ?? mockData.leadershipProfile.clarity.level).toFixed(1)}
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
            </div>

            {/* Leadership Mirror - No pale colors */}
            <div>
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
                        <div className="h-8 bg-blue-600 rounded flex items-center justify-end pr-2 transition-all duration-1000 ease-out" style={{ width: `${(leaderScore / maxScore) * 100}%` }}>
                          <span className="text-xs font-semibold text-white">{leaderScore.toFixed(1)}</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-gray-500 mb-1">Team</div>
                        <div className="h-8 bg-green-600 rounded flex items-center justify-end pr-2 transition-all duration-1000 ease-out" style={{ width: `${(teamScore / maxScore) * 100}%` }}>
                          <span className="text-xs font-semibold text-white">{teamScore.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
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
                
                {/* Chart lines - all 7 patterns */}
                <svg className="absolute inset-0 w-full h-full" style={{ padding: '10px' }} ref={chartRef}>
                  {/* Clarity - Blue */}
                  <polyline
                    points="20,185 120,172 220,162 320,152"
                    fill="none"
                    stroke="#2563eb"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredChartPoint('clarity')}
                    onMouseLeave={() => setHoveredChartPoint(null)}
                    style={{ 
                      strokeDasharray: chartAnimated ? "0" : "1000",
                      strokeDashoffset: chartAnimated ? "0" : "1000",
                      strokeWidth: hoveredChartPoint === 'clarity' ? 3 : 2,
                      transition: 'stroke-dashoffset 1.5s ease-out, stroke-width 0.2s'
                    }}
                  />
                  {/* Consistency - Teal */}
                  <polyline
                    points="20,190 120,178 220,168 320,158"
                    fill="none"
                    stroke="#14b8a6"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredChartPoint('consistency')}
                    onMouseLeave={() => setHoveredChartPoint(null)}
                    style={{ 
                      strokeDasharray: chartAnimated ? "0" : "1000",
                      strokeDashoffset: chartAnimated ? "0" : "1000",
                      strokeWidth: hoveredChartPoint === 'consistency' ? 3 : 2,
                      transition: 'stroke-dashoffset 1.5s ease-out 0.1s, stroke-width 0.2s'
                    }}
                  />
                  {/* Trust - Purple */}
                  <polyline
                    points="20,195 120,185 220,175 320,165"
                    fill="none"
                    stroke="#8b5cf6"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredChartPoint('trust')}
                    onMouseLeave={() => setHoveredChartPoint(null)}
                    style={{ 
                      strokeDasharray: chartAnimated ? "0" : "1000",
                      strokeDashoffset: chartAnimated ? "0" : "1000",
                      strokeWidth: hoveredChartPoint === 'trust' ? 3 : 2,
                      transition: 'stroke-dashoffset 1.5s ease-out 0.2s, stroke-width 0.2s'
                    }}
                  />
                  {/* Communication - Orange */}
                  <polyline
                    points="20,200 120,188 220,178 320,168"
                    fill="none"
                    stroke="#f59e0b"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredChartPoint('communication')}
                    onMouseLeave={() => setHoveredChartPoint(null)}
                    style={{ 
                      strokeDasharray: chartAnimated ? "0" : "1000",
                      strokeDashoffset: chartAnimated ? "0" : "1000",
                      strokeWidth: hoveredChartPoint === 'communication' ? 3 : 2,
                      transition: 'stroke-dashoffset 1.5s ease-out 0.3s, stroke-width 0.2s'
                    }}
                  />
                  {/* Alignment - Green */}
                  <polyline
                    points="20,180 120,170 220,160 320,150"
                    fill="none"
                    stroke="#10b981"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredChartPoint('alignment')}
                    onMouseLeave={() => setHoveredChartPoint(null)}
                    style={{ 
                      strokeDasharray: chartAnimated ? "0" : "1000",
                      strokeDashoffset: chartAnimated ? "0" : "1000",
                      strokeWidth: hoveredChartPoint === 'alignment' ? 3 : 2,
                      transition: 'stroke-dashoffset 1.5s ease-out 0.4s, stroke-width 0.2s'
                    }}
                  />
                  {/* Stability - Indigo */}
                  <polyline
                    points="20,192 120,180 220,170 320,160"
                    fill="none"
                    stroke="#6366f1"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredChartPoint('stability')}
                    onMouseLeave={() => setHoveredChartPoint(null)}
                    style={{ 
                      strokeDasharray: chartAnimated ? "0" : "1000",
                      strokeDashoffset: chartAnimated ? "0" : "1000",
                      strokeWidth: hoveredChartPoint === 'stability' ? 3 : 2,
                      transition: 'stroke-dashoffset 1.5s ease-out 0.5s, stroke-width 0.2s'
                    }}
                  />
                  {/* Leadership Drift - Red */}
                  <polyline
                    points="20,205 120,195 220,185 320,175"
                    fill="none"
                    stroke="#ef4444"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredChartPoint('leadership_drift')}
                    onMouseLeave={() => setHoveredChartPoint(null)}
                    style={{ 
                      strokeDasharray: chartAnimated ? "0" : "1000",
                      strokeDashoffset: chartAnimated ? "0" : "1000",
                      strokeWidth: hoveredChartPoint === 'leadership_drift' ? 3 : 2,
                      transition: 'stroke-dashoffset 1.5s ease-out 0.6s, stroke-width 0.2s'
                    }}
                  />
                </svg>
                {hoveredChartPoint && (
                  <div className="absolute top-4 right-4 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg z-50">
                    {hoveredChartPoint.replace('_', ' ').charAt(0).toUpperCase() + hoveredChartPoint.replace('_', ' ').slice(1)}
                  </div>
                )}
                
                {/* X-axis labels */}
                <div className="absolute bottom-0 left-0 right-0 flex justify-around pt-2">
                  <div className="text-xs text-gray-600">Q4 2025</div>
                  <div className="text-xs text-gray-600">Q1 2026</div>
                  <div className="text-xs text-gray-600">Q2 2026</div>
                  <div className="text-xs text-gray-600">Q1 2027</div>
                </div>
              </div>
              
              {/* Legend - All 7 patterns */}
              <div className="flex flex-wrap gap-4 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5" style={{ backgroundColor: '#2563eb' }}></div>
                  <span className="text-gray-600">Clarity</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5" style={{ backgroundColor: '#14b8a6' }}></div>
                  <span className="text-gray-600">Consistency</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5" style={{ backgroundColor: '#8b5cf6' }}></div>
                  <span className="text-gray-600">Trust</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5" style={{ backgroundColor: '#f59e0b' }}></div>
                  <span className="text-gray-600">Communication</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5" style={{ backgroundColor: '#10b981' }}></div>
                  <span className="text-gray-600">Alignment</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5" style={{ backgroundColor: '#6366f1' }}></div>
                  <span className="text-gray-600">Stability</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5" style={{ backgroundColor: '#ef4444' }}></div>
                  <span className="text-gray-600">Leadership Drift</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 7: Response Analytics */}
        <section className="mb-12">
          <div className="bg-white rounded-lg border border-gray-200 p-6 transition-all duration-200 hover:shadow-lg">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Response Analytics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4 transition-all duration-200 hover:shadow-lg">
                <div className="text-sm font-medium text-gray-600 mb-2">Total Responses</div>
                <div className="text-4xl font-bold text-gray-900 transition-all duration-500">
                  {Math.round(animatedValues.response_overall ?? mockData.responseCounts.overall)}
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4 transition-all duration-200 hover:shadow-lg">
                <div className="text-sm font-medium text-gray-600 mb-2">This Quarter</div>
                <div className="text-4xl font-bold text-gray-900 transition-all duration-500">
                  {Math.round(animatedValues.response_quarter ?? mockData.responseCounts.thisQuarter)}
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4 transition-all duration-200 hover:shadow-lg">
                <div className="text-sm font-medium text-gray-600 mb-2">Avg. Completion</div>
                <div className="text-4xl font-bold text-gray-900 transition-all duration-500">
                  {(animatedValues.response_completion ?? mockData.responseCounts.avgCompletion).toFixed(1)}
                </div>
                <div className="text-xs text-gray-500 mt-1">min</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4 transition-all duration-200 hover:shadow-lg">
                <div className="text-sm font-medium text-gray-600 mb-2">Response Rate</div>
                <div className="text-4xl font-bold text-gray-900 transition-all duration-500">
                  {Math.round(animatedValues.response_rate ?? mockData.responseCounts.responseRate)}
                </div>
                <div className="text-xs text-gray-500 mt-1">%</div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 8: Multi-Year Trends */}
        <section className="mb-12">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Multi-Year Trends & Insights</h2>
                <p className="text-sm text-gray-600">View comprehensive analysis with historical comparisons and pattern evolution</p>
              </div>
              <button
                onClick={() => handleNavigate('/ali/reports')}
                className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 whitespace-nowrap"
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
