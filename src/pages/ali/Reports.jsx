import React, { useState, useEffect } from 'react';
import { Lightbulb, Scale, Handshake, MessageSquare, Compass, Shield, BarChart3, CheckCircle2, ArrowDown, AlertTriangle, Sparkles, ChevronDown, User, Share2, Send, ExternalLink } from 'lucide-react';

const ALIReports = () => {
  const [animatedValues, setAnimatedValues] = useState({});
  const [latestDropdownOpen, setLatestDropdownOpen] = useState(false);

  const handleNavigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
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

  // Mock data matching the image exactly
  const mockData = {
    aliImprovement: {
      percent: 14.6,
      from: 64.3,
      to: 73.7
    },
    currentALI: {
      score: 73.7,
      rolling: 71.8
    },
    totalResponses: {
      count: 86,
      surveys: 4
    },
    patterns: [
      {
        name: 'clarity',
        icon: Lightbulb,
        score: 78.8,
        rolling: 75.9,
        trend: 12.6,
        trendDirection: 'up',
        description: 'Clear communication of vision, expectations, and goals.',
        quarters: [
          { period: '2025 Q4', score: 70.0, responses: 18 },
          { period: '2026 Q1', score: 72.5, responses: 23 },
          { period: '2026 Q2', score: 76.3, responses: 21 },
          { period: '2027 Q1', score: 78.8, responses: 24 }
        ]
      },
      {
        name: 'consistency',
        icon: Scale,
        score: 72.5,
        rolling: 70.0,
        trend: 16.0,
        trendDirection: 'up',
        description: 'Reliable patterns in decision-making and follow-through.',
        quarters: [
          { period: '2025 Q4', score: 62.5, responses: 18 },
          { period: '2026 Q1', score: 67.5, responses: 23 },
          { period: '2026 Q2', score: 70.0, responses: 21 },
          { period: '2027 Q1', score: 72.5, responses: 24 }
        ]
      },
      {
        name: 'trust',
        icon: Handshake,
        score: 75.0,
        rolling: 73.4,
        trend: 11.1,
        trendDirection: 'up',
        description: 'Psychological safety and confidence in leadership.',
        quarters: [
          { period: '2025 Q4', score: 67.5, responses: 18 },
          { period: '2026 Q1', score: 70.0, responses: 23 },
          { period: '2026 Q2', score: 72.5, responses: 21 },
          { period: '2027 Q1', score: 75.0, responses: 24 }
        ]
      },
      {
        name: 'communication',
        icon: MessageSquare,
        score: 71.3,
        rolling: 69.3,
        trend: 18.8,
        trendDirection: 'up',
        description: 'Open, transparent, and effective information flow.',
        quarters: [
          { period: '2025 Q4', score: 60.0, responses: 18 },
          { period: '2026 Q1', score: 65.0, responses: 23 },
          { period: '2026 Q2', score: 68.8, responses: 21 },
          { period: '2027 Q1', score: 71.3, responses: 24 }
        ]
      },
      {
        name: 'alignment',
        icon: Compass,
        score: 76.3,
        rolling: 72.9,
        trend: 17.4,
        trendDirection: 'up',
        description: 'Shared understanding of direction and priorities.',
        quarters: [
          { period: '2025 Q4', score: 65.0, responses: 18 },
          { period: '2026 Q1', score: 68.8, responses: 23 },
          { period: '2026 Q2', score: 71.3, responses: 21 },
          { period: '2027 Q1', score: 76.3, responses: 24 }
        ]
      },
      {
        name: 'stability',
        icon: Shield,
        score: 71.3,
        rolling: 70.4,
        trend: 5.6,
        trendDirection: 'up',
        description: 'Predictable environment that supports sustained performance.',
        quarters: [
          { period: '2025 Q4', score: 67.5, responses: 18 },
          { period: '2026 Q1', score: 68.8, responses: 23 },
          { period: '2026 Q2', score: 70.0, responses: 21 },
          { period: '2027 Q1', score: 71.3, responses: 24 }
        ]
      },
      {
        name: 'leadership_drift',
        icon: BarChart3,
        score: 22.5,
        rolling: 28.1,
        trend: 40.0,
        trendDirection: 'down',
        description: 'Gap between stated and observed leadership behaviors.',
        quarters: [
          { period: '2025 Q4', score: 37.5, responses: 18 },
          { period: '2026 Q1', score: 32.5, responses: 23 },
          { period: '2026 Q2', score: 27.5, responses: 21 },
          { period: '2027 Q1', score: 22.5, responses: 24 }
        ]
      }
    ],
    insights: [
      {
        icon: CheckCircle2,
        iconColor: 'text-green-600',
        title: 'Sustained Positive Movement',
        text: 'Consistent improvement across core patterns, with Clarity showing the strongest gains (+12.6%).'
      },
      {
        icon: ArrowDown,
        iconColor: 'text-red-600',
        title: 'Leadership Drift Reduction',
        text: '40% decrease in Leadership Drift indicates improved alignment between stated values and actual behaviors.'
      },
      {
        icon: AlertTriangle,
        iconColor: 'text-yellow-600',
        title: 'Perception Gap Alert: Communication',
        text: 'Moderate perception gap detected: Leaders: 75.0, Team: 70.0, Gap: 5.0. Consider 360-degree feedback opportunities.'
      },
      {
        icon: Sparkles,
        iconColor: 'text-blue-600',
        title: 'Recommended Next Steps',
        text: 'Continue quarterly surveys. ALI Overall Score has reached 73.7 (Yellow Zone). Focus on sustaining gains and addressing the communication perception gap.'
      }
    ]
  };

  // Animation on mount
  useEffect(() => {
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

    setTimeout(() => {
      mockData.patterns.forEach((pattern, idx) => {
        pattern.quarters.forEach((quarter, qIdx) => {
          animateValue(`${pattern.name}_${qIdx}`, 0, quarter.score, 1200 + (idx * 100) + (qIdx * 50));
        });
      });
    }, 100);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Matching Dashboard exactly */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="text-xl font-bold text-gray-900">Archetype Leadership Index</div>
            <nav className="flex items-center gap-6">
              <button
                onClick={() => handleNavigate('/ali/dashboard')}
                className="text-gray-600 hover:text-gray-900"
              >
                Overview
              </button>
              <button
                onClick={() => handleNavigate('/ali/reports')}
                className="text-blue-600 font-semibold"
              >
                Reports
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
              <div className="flex items-center gap-4">
                <button className="text-gray-600 hover:text-gray-900 text-sm">Refer</button>
                <button className="text-gray-600 hover:text-gray-900 text-sm">Share</button>
                <button className="text-gray-600 hover:text-gray-900 text-sm">Publish</button>
                <div className="relative">
                  <button
                    onClick={() => setLatestDropdownOpen(!latestDropdownOpen)}
                    className="flex items-center gap-1 text-gray-600 hover:text-gray-900 text-sm"
                  >
                    Latest
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  {latestDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                      <div className="py-1">
                        <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">2027 Q1</button>
                        <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">2026 Q2</button>
                        <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">2026 Q1</button>
                        <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">2025 Q4</button>
                      </div>
                    </div>
                  )}
                </div>
                <a href="/" className="text-gray-600 hover:text-gray-900 text-sm">Exit to Main Site</a>
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                  JD
                </div>
              </div>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Page Title */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Leadership Trends & Analytics</h1>
            <p className="text-gray-600">Multi-year progression analysis 2025 Q4 - 2027 Q1</p>
          </div>
          <button
            onClick={() => handleNavigate('/ali/dashboard')}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Summary Scorecards */}
        <section className="mb-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* ALI Overall Improvement */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 transition-all duration-200 hover:shadow-lg">
              <div className="text-sm font-medium text-gray-600 mb-2">ALI Overall Improvement</div>
              <div className="text-4xl font-bold text-green-600 mb-1">+{mockData.aliImprovement.percent.toFixed(1)}%</div>
              <div className="text-sm text-gray-500">from {mockData.aliImprovement.from.toFixed(1)} to {mockData.aliImprovement.to.toFixed(1)}</div>
            </div>

            {/* Current ALI Score */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 transition-all duration-200 hover:shadow-lg">
              <div className="text-sm font-medium text-gray-600 mb-2">Current ALI Score</div>
              <div className="text-4xl font-bold text-gray-900 mb-1">{mockData.currentALI.score.toFixed(1)}</div>
              <div className="text-sm text-gray-500">Rolling: {mockData.currentALI.rolling.toFixed(1)}</div>
            </div>

            {/* Total Responses */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 transition-all duration-200 hover:shadow-lg">
              <div className="text-sm font-medium text-gray-600 mb-2">Total Responses</div>
              <div className="text-4xl font-bold text-gray-900 mb-1">{mockData.totalResponses.count}</div>
              <div className="text-sm text-gray-500">across {mockData.totalResponses.surveys} surveys</div>
            </div>
          </div>
        </section>

        {/* Leadership Pattern Analysis - 7 cards in grid */}
        <section className="mb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {mockData.patterns.map((pattern) => {
              const Icon = pattern.icon;
              const patternColor = getPatternColor(pattern.name);
              const trendColor = pattern.trendDirection === 'up' ? 'text-green-600' : 'text-red-600';
              const maxScore = Math.max(...pattern.quarters.map(q => q.score), 100);
              const minScore = Math.min(...pattern.quarters.map(q => q.score), 0);
              const range = maxScore - minScore || 1;

              return (
                <div key={pattern.name} className="bg-white rounded-lg border border-gray-200 p-6 transition-all duration-200 hover:shadow-lg">
                  {/* Icon and Pattern Name */}
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="w-5 h-5" style={{ color: patternColor }} />
                    <div className="text-sm font-semibold text-gray-900 capitalize">{pattern.name.replace('_', ' ')}</div>
                  </div>

                  {/* Large Score */}
                  <div className="text-3xl font-bold mb-1" style={{ color: patternColor }}>
                    {pattern.score.toFixed(1)}
                  </div>

                  {/* Rolling Score and Trend */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-xs text-gray-500">Rolling: {pattern.rolling.toFixed(1)}</div>
                    <div className={`flex items-center gap-1 text-sm font-medium ${trendColor}`}>
                      {pattern.trendDirection === 'up' ? '↑' : '↓'}
                      <span>{pattern.trend.toFixed(1)}%</span>
                    </div>
                  </div>

                  {/* Historical Bar Chart */}
                  <div className="mb-4">
                    <div className="flex items-end gap-2 h-24 mb-2">
                      {pattern.quarters.map((quarter, idx) => {
                        const height = ((quarter.score - minScore) / range) * 100;
                        const animatedHeight = animatedValues[`${pattern.name}_${idx}`] 
                          ? ((animatedValues[`${pattern.name}_${idx}`] - minScore) / range) * 100 
                          : 0;
                        
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center">
                            <div className="w-full relative">
                              <div
                                className="w-full rounded-t transition-all duration-1000 ease-out"
                                style={{ 
                                  height: `${Math.max(animatedHeight || height, 5)}%`,
                                  backgroundColor: patternColor,
                                  minHeight: '4px'
                                }}
                                title={`${quarter.period}: ${quarter.score.toFixed(1)} (${quarter.responses} responses)`}
                              ></div>
                            </div>
                            <div className="text-xs text-gray-400 mt-1">{quarter.period.split(' ')[1]}</div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Quarter scores and responses */}
                    <div className="text-xs text-gray-500 space-y-1">
                      {pattern.quarters.map((quarter, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span>{quarter.period}:</span>
                          <span className="font-medium">{quarter.score.toFixed(1)} ({quarter.responses})</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="text-xs text-gray-600 border-t border-gray-100 pt-3 mt-3">
                    {pattern.description}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Key Insights & Movement */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Key Insights & Movement</h2>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="space-y-4">
              {mockData.insights.map((insight, idx) => {
                const Icon = insight.icon;
                return (
                  <div key={idx} className="flex items-start gap-3">
                    <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${insight.iconColor}`} />
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">{insight.title}</div>
                      <div className="text-sm text-gray-700">{insight.text}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ALIReports;
