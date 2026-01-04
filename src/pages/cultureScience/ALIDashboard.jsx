import React, { useState } from 'react';

const ALIDashboard = () => {
  // Static mock data for layout review
  const mockData = {
    company: {
      id: '0fb5c648-cf1e-4a31-9df4-8e620e52ab88',
      name: 'Test Company Inc',
      subscription_status: 'active'
    },
    scores: {
      ali: {
        current: 72,
        rolling: 74,
        zone: 'strain'
      },
      anchors: {
        current: 68,
        rolling: 70
      },
      patterns: {
        clarity: { current: 75, rolling: 78 },
        consistency: { current: 70, rolling: 72 },
        trust: { current: 80, rolling: 82 },
        communication: { current: 73, rolling: 75 },
        alignment: { current: 68, rolling: 70 },
        stability: { current: 72, rolling: 74 },
        leadership_drift: { current: 65, rolling: 67 }
      }
    },
    coreScores: {
      alignment: 70,
      stability: 74,
      clarity: 78
    },
    experienceMap: {
      x: 78, // Clarity
      y: 78, // Stability + Trust average
      zone: 'strain'
    },
    leadershipProfile: {
      profile: 'producer_leader',
      honesty: {
        score: 78,
        state: 'strong',
        gap_component_used: false
      },
      clarity: {
        level: 78,
        stddev: 6.2,
        state: 'stable'
      }
    },
    leadershipMirror: {
      gaps: {
        ali: 5,
        alignment: 8,
        stability: 3,
        clarity: 4
      },
      severity: {
        ali: 'moderate',
        alignment: 'moderate',
        stability: 'neutral',
        clarity: 'neutral'
      },
      leaderScores: {
        ali: 79,
        alignment: 78,
        stability: 77,
        clarity: 82
      },
      teamScores: {
        ali: 74,
        alignment: 70,
        stability: 74,
        clarity: 78
      }
    },
    drift: {
      delta_ali: 2,
      drift_index: 1.5
    },
    trajectory: {
      value: 1.5,
      direction: 'improving',
      magnitude: 1.5,
      method: 'drift_index'
    },
    responseCounts: {
      overall: 12,
      leader: 3,
      team_member: 9
    },
    dataQuality: {
      meets_minimum_n: true,
      meets_minimum_n_team: true,
      meets_minimum_n_org: true,
      response_count: 12,
      standard_deviation: 4.2,
      data_quality_banner: false
    },
    surveys: [
      { survey_index: 1, year: 2026, quarter: 'Q1', status: 'completed', response_count: 12, deployed_at: '2026-01-15T00:00:00Z', closes_at: '2026-02-15T00:00:00Z' }
    ],
    historicalTrends: [
      { period: '2026-Q1', ali: 72, alignment: 68, stability: 72, clarity: 75 }
    ]
  };

  const [dashboardData] = useState(mockData);
  const [isConnected] = useState(false); // Will be true when API is connected

  const formatScore = (score) => {
    if (score === null || score === undefined) return 'N/A';
    return Math.round(score);
  };

  const getScoreColor = (score) => {
    if (score === null || score === undefined) return 'text-gray-400';
    if (score >= 75) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getZoneColor = (zone) => {
    if (!zone) return 'bg-gray-200';
    const zones = {
      'harmony': 'bg-green-100 text-green-800 border-green-300',
      'strain': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'stress': 'bg-orange-100 text-orange-800 border-orange-300',
      'hazard': 'bg-red-100 text-red-800 border-red-300'
    };
    return zones[zone.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getTrajectoryDirection = (trajectory) => {
    if (!trajectory || trajectory.direction === 'stable') return '→';
    if (trajectory.direction === 'improving') return '↑';
    if (trajectory.direction === 'declining') return '↓';
    return '→';
  };

  const getTrajectoryColor = (trajectory) => {
    if (!trajectory || trajectory.direction === 'stable') return 'text-gray-600';
    if (trajectory.direction === 'improving') return 'text-green-600';
    if (trajectory.direction === 'declining') return 'text-red-600';
    return 'text-gray-600';
  };

  const { company, scores, coreScores, experienceMap, leadershipProfile, leadershipMirror, drift, trajectory, responseCounts, dataQuality, surveys, historicalTrends } = dashboardData;

  return (
    <main className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-[#1A1A1A] mb-2">ALI Dashboard</h1>
                <p className="text-lg text-gray-600">{company?.name || 'Company Dashboard'}</p>
              </div>
              {!isConnected && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2">
                  <p className="text-sm text-yellow-800">
                    <strong>Preview Mode:</strong> Displaying mock data for layout review
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Data Quality Banner */}
          {dataQuality?.data_quality_banner && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-yellow-800">
                <strong>Limited Data:</strong> You have {dataQuality.response_count} responses. 
                Some features require at least 10 responses for full accuracy.
              </p>
            </div>
          )}

          {!dataQuality?.meets_minimum_n && dataQuality?.response_count < 5 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">
                <strong>Insufficient Data:</strong> You need at least 5 responses to view dashboard data. 
                Current: {dataQuality.response_count} responses.
              </p>
            </div>
          )}

          {/* HEADLINE REALITY - Score Cards Row */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">Headline Reality</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* ALI Overall Score */}
              <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-gray-200 hover:border-[#C85A3C] transition-colors">
                <h3 className="text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide">ALI Overall</h3>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className={`text-5xl font-bold ${getScoreColor(scores?.ali?.rolling || scores?.ali?.current)}`}>
                    {formatScore(scores?.ali?.rolling || scores?.ali?.current)}
                  </span>
                  <span className="text-lg text-gray-500">/ 100</span>
                </div>
                {scores?.ali?.zone && (
                  <div className={`mt-2 inline-block px-3 py-1 rounded-md text-xs font-bold border-2 ${getZoneColor(scores.ali.zone)}`}>
                    {scores.ali.zone.toUpperCase()}
                  </div>
                )}
                <div className="mt-3 text-xs text-gray-500">
                  Rolling: {formatScore(scores?.ali?.rolling)} | Current: {formatScore(scores?.ali?.current)}
                </div>
              </div>

              {/* Alignment */}
              <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-gray-200 hover:border-[#C85A3C] transition-colors">
                <h3 className="text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide">Alignment</h3>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className={`text-5xl font-bold ${getScoreColor(coreScores?.alignment)}`}>
                    {formatScore(coreScores?.alignment)}
                  </span>
                  <span className="text-lg text-gray-500">/ 100</span>
                </div>
                <div className="mt-3 text-xs text-gray-500">Core Pattern Score</div>
              </div>

              {/* Stability */}
              <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-gray-200 hover:border-[#C85A3C] transition-colors">
                <h3 className="text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide">Stability</h3>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className={`text-5xl font-bold ${getScoreColor(coreScores?.stability)}`}>
                    {formatScore(coreScores?.stability)}
                  </span>
                  <span className="text-lg text-gray-500">/ 100</span>
                </div>
                <div className="mt-3 text-xs text-gray-500">Core Pattern Score</div>
              </div>

              {/* Clarity */}
              <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-gray-200 hover:border-[#C85A3C] transition-colors">
                <h3 className="text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide">Clarity</h3>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className={`text-5xl font-bold ${getScoreColor(coreScores?.clarity)}`}>
                    {formatScore(coreScores?.clarity)}
                  </span>
                  <span className="text-lg text-gray-500">/ 100</span>
                </div>
                <div className="mt-3 text-xs text-gray-500">Core Pattern Score</div>
              </div>
            </div>
          </div>

          {/* DIAGNOSIS - Team Experience Map */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">Diagnosis</h2>
            {experienceMap && experienceMap.x !== null && experienceMap.y !== null && (
              <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-gray-200">
                <h3 className="text-xl font-bold text-[#1A1A1A] mb-4">Team Experience Map</h3>
                <div className="relative w-full h-96 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border-4 border-gray-300 overflow-hidden">
                  {/* Quadrant Backgrounds */}
                  <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-green-50/30 border-r-2 border-b-2 border-green-200"></div>
                  <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-yellow-50/30 border-l-2 border-b-2 border-yellow-200"></div>
                  <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-orange-50/30 border-r-2 border-t-2 border-orange-200"></div>
                  <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-red-50/30 border-l-2 border-t-2 border-red-200"></div>
                  
                  {/* Quadrant Labels */}
                  <div className="absolute top-4 left-4 text-sm font-bold text-green-700 bg-green-100/80 px-2 py-1 rounded">Harmony</div>
                  <div className="absolute top-4 right-4 text-sm font-bold text-yellow-700 bg-yellow-100/80 px-2 py-1 rounded">Strain</div>
                  <div className="absolute bottom-4 left-4 text-sm font-bold text-orange-700 bg-orange-100/80 px-2 py-1 rounded">Stress</div>
                  <div className="absolute bottom-4 right-4 text-sm font-bold text-red-700 bg-red-100/80 px-2 py-1 rounded">Hazard</div>
                  
                  {/* Axes */}
                  <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-gray-400 z-10"></div>
                  <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-400 z-10"></div>
                  
                  {/* Axis Labels */}
                  <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-sm font-semibold text-gray-700 bg-white px-2">Clarity</div>
                  <div className="absolute left-2 top-1/2 transform -translate-y-1/2 -rotate-90 text-sm font-semibold text-gray-700 bg-white px-2">Stability + Trust</div>
                  
                  {/* Data Point */}
                  {!dataQuality?.data_quality_banner && (
                    <>
                      <div
                        className="absolute w-6 h-6 bg-[#C85A3C] rounded-full transform -translate-x-1/2 -translate-y-1/2 z-20 shadow-lg border-2 border-white"
                        style={{
                          left: `${(experienceMap.x / 100) * 100}%`,
                          top: `${100 - (experienceMap.y / 100) * 100}%`
                        }}
                      >
                        <div className="absolute inset-0 rounded-full bg-[#C85A3C] animate-ping opacity-20"></div>
                      </div>
                      <div
                        className="absolute transform -translate-x-1/2 -translate-y-full mb-2 z-30"
                        style={{
                          left: `${(experienceMap.x / 100) * 100}%`,
                          top: `${100 - (experienceMap.y / 100) * 100}%`
                        }}
                      >
                        <div className="bg-black text-white px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap shadow-lg">
                          {experienceMap.zone?.toUpperCase() || 'UNKNOWN'}
                          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                            <div className="border-4 border-transparent border-t-black"></div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-gray-600 font-semibold">X-Axis (Clarity)</p>
                    <p className="text-xl font-bold text-[#1A1A1A]">{formatScore(experienceMap.x)}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-gray-600 font-semibold">Y-Axis (Stability + Trust)</p>
                    <p className="text-xl font-bold text-[#1A1A1A]">{formatScore(experienceMap.y)}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-gray-600 font-semibold">Zone</p>
                    <p className={`text-xl font-bold ${getZoneColor(experienceMap.zone).split(' ')[1]}`}>
                      {experienceMap.zone?.toUpperCase() || 'UNKNOWN'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Pattern Scores Grid */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">Pattern Analysis</h2>
            <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-gray-200">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {scores?.patterns && Object.entries(scores.patterns).map(([pattern, data]) => (
                  <div key={pattern} className="border-2 border-gray-200 rounded-lg p-4 hover:border-[#C85A3C] transition-colors">
                    <h3 className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">{pattern.replace('_', ' ')}</h3>
                    <div className={`text-3xl font-bold mb-1 ${getScoreColor(data?.rolling || data?.current)}`}>
                      {formatScore(data?.rolling || data?.current)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Rolling: {formatScore(data?.rolling)}<br/>
                      Current: {formatScore(data?.current)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Leadership Profile */}
          {leadershipProfile && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">Leadership Profile</h2>
              <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="border-2 border-gray-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide">Profile Type</h3>
                    <div className="text-3xl font-bold text-[#1A1A1A] capitalize mb-2">
                      {leadershipProfile.profile?.replace(/_/g, ' ') || 'Forming'}
                    </div>
                    <div className="text-xs text-gray-500">Based on Honesty & Clarity</div>
                  </div>
                  <div className="border-2 border-gray-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide">Honesty Axis</h3>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className={`text-3xl font-bold ${getScoreColor(leadershipProfile.honesty?.score)}`}>
                        {formatScore(leadershipProfile.honesty?.score)}
                      </span>
                      <span className="text-sm text-gray-500">/ 100</span>
                    </div>
                    <div className="text-sm font-semibold text-gray-700 capitalize">
                      {leadershipProfile.honesty?.state || 'N/A'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Trust + Communication + Gap
                    </div>
                  </div>
                  <div className="border-2 border-gray-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide">Clarity State</h3>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className={`text-3xl font-bold ${getScoreColor(leadershipProfile.clarity?.level)}`}>
                        {formatScore(leadershipProfile.clarity?.level)}
                      </span>
                      <span className="text-sm text-gray-500">/ 100</span>
                    </div>
                    <div className="text-sm font-semibold text-gray-700 capitalize mb-1">
                      {leadershipProfile.clarity?.state || 'N/A'}
                    </div>
                    <div className="text-xs text-gray-500">
                      StdDev: {leadershipProfile.clarity?.stddev?.toFixed(1) || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Leadership Mirror */}
          {leadershipMirror && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">Leadership Mirror</h2>
              <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-gray-200">
                <p className="text-sm text-gray-600 mb-4">Perception Gap Analysis: Leader Self-Report vs. Team Experience</p>
                <div className="space-y-4">
                  {['ali', 'alignment', 'stability', 'clarity'].map((metric) => {
                    const gap = leadershipMirror.gaps?.[metric];
                    const severity = leadershipMirror.severity?.[metric];
                    const leaderScore = leadershipMirror.leaderScores?.[metric];
                    const teamScore = leadershipMirror.teamScores?.[metric];
                    
                    return (
                      <div key={metric} className="border-2 border-gray-200 rounded-lg p-4 hover:border-[#C85A3C] transition-colors">
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="text-lg font-bold capitalize">{metric === 'ali' ? 'ALI Overall' : metric}</h3>
                          <span className={`text-xs px-3 py-1 rounded-full font-bold ${
                            severity === 'severe' ? 'bg-red-100 text-red-800 border-2 border-red-300' : 
                            severity === 'moderate' ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-300' : 
                            'bg-green-100 text-green-800 border-2 border-green-300'
                          }`}>
                            {severity?.toUpperCase() || 'NEUTRAL'}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                          <div className="bg-blue-50 p-3 rounded">
                            <p className="text-xs text-gray-600 font-semibold mb-1">Leader</p>
                            <p className="text-2xl font-bold text-blue-700">{formatScore(leaderScore)}</p>
                          </div>
                          <div className="bg-purple-50 p-3 rounded">
                            <p className="text-xs text-gray-600 font-semibold mb-1">Team</p>
                            <p className="text-2xl font-bold text-purple-700">{formatScore(teamScore)}</p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded">
                            <p className="text-xs text-gray-600 font-semibold mb-1">Gap</p>
                            <p className={`text-2xl font-bold ${gap > 0 ? 'text-red-600' : gap < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                              {gap !== null && gap !== undefined ? (gap > 0 ? '+' : '') + formatScore(gap) : 'N/A'}
                            </p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded">
                            <p className="text-xs text-gray-600 font-semibold mb-1">Interpretation</p>
                            <p className="text-sm font-semibold text-gray-700">
                              {gap > 5 ? 'Leader Overestimates' : gap < -5 ? 'Leader Underestimates' : 'Aligned'}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Trajectory & Drift */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">Trajectory</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-gray-200">
                <h3 className="text-lg font-bold text-[#1A1A1A] mb-4">Direction</h3>
                <div className="flex items-center gap-6">
                  <span className={`text-6xl ${getTrajectoryColor(trajectory)}`}>
                    {getTrajectoryDirection(trajectory)}
                  </span>
                  <div>
                    <div className="text-3xl font-bold text-[#1A1A1A] capitalize mb-1">
                      {trajectory.direction || 'stable'}
                    </div>
                    <div className="text-sm text-gray-600">
                      Value: {formatScore(trajectory.value)} | Method: {trajectory.method || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-gray-200">
                <h3 className="text-lg font-bold text-[#1A1A1A] mb-4">Drift Index</h3>
                <div className="flex items-center gap-6">
                  <div className="text-5xl font-bold text-[#1A1A1A]">
                    {formatScore(drift?.drift_index || drift?.delta_ali)}
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>Drift Index: {formatScore(drift?.drift_index)}</p>
                    <p>Delta ALI: {formatScore(drift?.delta_ali)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Response Analytics */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">Response Analytics</h2>
            <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-gray-200">
              <div className="grid grid-cols-3 gap-6">
                <div className="border-2 border-gray-200 rounded-lg p-4 text-center">
                  <h3 className="text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide">Total Responses</h3>
                  <div className="text-5xl font-bold text-[#1A1A1A]">{responseCounts?.overall || 0}</div>
                </div>
                <div className="border-2 border-gray-200 rounded-lg p-4 text-center">
                  <h3 className="text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide">Leaders</h3>
                  <div className="text-5xl font-bold text-blue-600">{responseCounts?.leader || 0}</div>
                </div>
                <div className="border-2 border-gray-200 rounded-lg p-4 text-center">
                  <h3 className="text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide">Team Members</h3>
                  <div className="text-5xl font-bold text-purple-600">{responseCounts?.team_member || 0}</div>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Data Quality: </span>
                    <span className={`font-semibold ${dataQuality?.meets_minimum_n ? 'text-green-600' : 'text-yellow-600'}`}>
                      {dataQuality?.meets_minimum_n ? 'Meets Minimum N' : 'Below Minimum N'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Standard Deviation: </span>
                    <span className="font-semibold">{dataQuality?.standard_deviation?.toFixed(2) || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Surveys List */}
          {surveys && surveys.length > 0 && (
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">Survey History</h2>
              <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-gray-200">
                <div className="space-y-3">
                  {surveys.map((survey, idx) => (
                    <div key={idx} className="border-2 border-gray-200 rounded-lg p-4 hover:border-[#C85A3C] transition-colors">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-lg font-bold text-[#1A1A1A]">Survey {survey.survey_index}</span>
                          <span className="text-sm text-gray-600 ml-3">
                            {survey.year} {survey.quarter}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-sm text-gray-600">
                            <span className="font-semibold">{survey.response_count}</span> responses
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            survey.status === 'completed' ? 'bg-green-100 text-green-800' : 
                            survey.status === 'active' ? 'bg-blue-100 text-blue-800' : 
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {survey.status?.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
};

          {/* Leadership Mirror */}
          {leadershipMirror && (
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 mb-8">
              <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">Leadership Mirror</h2>
              <p className="text-sm text-gray-600 mb-4">Comparison of leader self-perception vs. team experience</p>
              <div className="space-y-3">
                {['ali', 'alignment', 'stability', 'clarity'].map((metric) => {
                  const gap = leadershipMirror.gaps?.[metric];
                  const severity = leadershipMirror.severity?.[metric];
                  const leaderScore = leadershipMirror.leaderScores?.[metric];
                  const teamScore = leadershipMirror.teamScores?.[metric];
                  
                  const severityColors = {
                    'severe': 'bg-red-100 text-red-800 border-red-300',
                    'moderate': 'bg-yellow-100 text-yellow-800 border-yellow-300',
                    'neutral': 'bg-green-100 text-green-800 border-green-300'
                  };
                  
                  return (
                    <div key={metric} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="font-semibold text-lg capitalize">{metric === 'ali' ? 'ALI Overall' : metric}</h3>
                        <span className={`text-xs px-3 py-1 rounded-md font-semibold border ${severityColors[severity] || 'bg-gray-100 text-gray-800'}`}>
                          {severity || 'neutral'}
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600 block mb-1">Leader</span>
                          <span className="text-xl font-bold text-blue-600">{formatScore(leaderScore)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600 block mb-1">Team</span>
                          <span className="text-xl font-bold text-purple-600">{formatScore(teamScore)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600 block mb-1">Gap</span>
                          <span className={`text-xl font-bold ${gap > 0 ? 'text-red-600' : gap < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                            {gap !== null && gap !== undefined ? (gap > 0 ? '+' : '') + formatScore(gap) : 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600 block mb-1">Interpretation</span>
                          <span className="text-xs text-gray-600">
                            {gap > 10 ? 'Leader overestimates' : gap < -10 ? 'Leader underestimates' : 'Aligned'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Trajectory */}
          {trajectory && (
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 mb-8">
              <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">Trajectory</h2>
              <div className="flex items-center gap-6">
                <div className={`text-6xl ${getTrajectoryColor(trajectory)}`}>
                  {getTrajectoryDirection(trajectory)}
                </div>
                <div>
                  <div className="text-3xl font-bold text-[#1A1A1A] capitalize mb-1">{trajectory.direction || 'stable'}</div>
                  <div className="text-sm text-gray-600">
                    Value: {formatScore(trajectory.value)} | Method: {trajectory.method || 'N/A'}
                  </div>
                  {trajectory.magnitude && (
                    <div className="text-xs text-gray-500 mt-1">
                      Magnitude: {trajectory.magnitude.toFixed(1)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Response Counts */}
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 mb-8">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">Response Analytics</h2>
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide">Total Responses</h3>
                <div className="text-4xl font-bold text-[#1A1A1A]">{responseCounts?.overall || 0}</div>
              </div>
              <div className="text-center border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide">Leaders</h3>
                <div className="text-4xl font-bold text-blue-600">{responseCounts?.leader || 0}</div>
              </div>
              <div className="text-center border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide">Team Members</h3>
                <div className="text-4xl font-bold text-purple-600">{responseCounts?.team_member || 0}</div>
              </div>
            </div>
          </div>

          {/* Surveys */}
          {surveys && surveys.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 mb-8">
              <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">Survey History</h2>
              <div className="space-y-2">
                {surveys.map((survey, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4 flex justify-between items-center hover:shadow-md transition-shadow">
                    <div>
                      <span className="font-semibold text-lg">Survey {survey.survey_index}</span>
                      <span className="text-sm text-gray-600 ml-3">
                        {survey.year} {survey.quarter}
                      </span>
                      <span className={`ml-3 text-xs px-2 py-1 rounded ${survey.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {survey.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-semibold">{survey.response_count}</span> responses
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
};

export default ALIDashboard;
