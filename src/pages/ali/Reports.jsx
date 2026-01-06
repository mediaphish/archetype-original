import React, { useState, useEffect } from 'react';
import { Lightbulb, Scale, Handshake, MessageSquare, Compass, Shield, BarChart3, CheckCircle2, ArrowDown, AlertTriangle, Sparkles, ChevronDown, User, Share2, Send, ExternalLink, HelpCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import DefinitionModal from '../../components/ali/DefinitionModal';
import ChatApp from '../../app/ChatApp';

const ALIReports = () => {
  const [animatedValues, setAnimatedValues] = useState({});
  const [latestDropdownOpen, setLatestDropdownOpen] = useState(false);
  const [openDefinition, setOpenDefinition] = useState(null);
  const [showArchyChat, setShowArchyChat] = useState(false);
  const [archyInitialMessage, setArchyInitialMessage] = useState(null);
  const [patternScrollPositions, setPatternScrollPositions] = useState({});
  const [timeRangeFilter, setTimeRangeFilter] = useState('last-4'); // 'last-4', 'last-8', 'last-year', 'all'

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

  // Definition content for Reports page sections
  const definitions = {
    'pattern-analysis': {
      title: 'Leadership Pattern Analysis',
      content: (
        <div>
          <p className="mb-4">
            Pattern Analysis tracks seven key leadership patterns that influence how your team experiences your leadership over time. This view shows historical progression across multiple survey cycles.
          </p>
          <p className="mb-4">
            Each pattern displays:
          </p>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li><strong>Current Score:</strong> The most recent survey result</li>
            <li><strong>Rolling Average:</strong> Average across the last 4 surveys for trend stability</li>
            <li><strong>Trend:</strong> Percentage change showing improvement or decline</li>
            <li><strong>Historical Bars:</strong> Horizontal progression showing each survey cycle with score and response count</li>
          </ul>
          <p className="text-sm text-gray-600">
            This view scales to show all survey cycles. Use horizontal scrolling to navigate through many surveys, or filter by time range to focus on specific periods.
          </p>
        </div>
      )
    },
    'pattern-clarity': {
      title: 'Clarity',
      content: (
        <div>
          <p className="mb-4">
            Clarity measures how clearly you communicate vision, expectations, and goals. High clarity means your team understands what you mean and why.
          </p>
          <p className="text-sm text-gray-600">
            Clear communication of vision, expectations, and goals.
          </p>
        </div>
      )
    },
    'pattern-consistency': {
      title: 'Consistency',
      content: (
        <div>
          <p className="mb-4">
            Consistency measures reliable patterns in decision-making and follow-through. High consistency means your team can predict and count on your behavior.
          </p>
          <p className="text-sm text-gray-600">
            Reliable patterns in decision-making and follow-through.
          </p>
        </div>
      )
    },
    'pattern-trust': {
      title: 'Trust',
      content: (
        <div>
          <p className="mb-4">
            Trust measures psychological safety and confidence in leadership. High trust means your team feels safe to speak truth and take risks.
          </p>
          <p className="text-sm text-gray-600">
            Psychological safety and confidence in leadership.
          </p>
        </div>
      )
    },
    'pattern-communication': {
      title: 'Communication',
      content: (
        <div>
          <p className="mb-4">
            Communication measures open, transparent, and effective information flow. High communication means information moves freely in both directions.
          </p>
          <p className="text-sm text-gray-600">
            Open, transparent, and effective information flow.
          </p>
        </div>
      )
    },
    'pattern-alignment': {
      title: 'Alignment',
      content: (
        <div>
          <p className="mb-4">
            Alignment measures shared understanding of direction and priorities. High alignment means everyone is moving in the same direction.
          </p>
          <p className="text-sm text-gray-600">
            Shared understanding of direction and priorities.
          </p>
        </div>
      )
    },
    'pattern-stability': {
      title: 'Stability',
      content: (
        <div>
          <p className="mb-4">
            Stability measures a predictable environment that supports sustained performance. High stability means your team can plan and execute with confidence.
          </p>
          <p className="text-sm text-gray-600">
            Predictable environment that supports sustained performance.
          </p>
        </div>
      )
    },
    'pattern-leadership_drift': {
      title: 'Leadership Drift',
      content: (
        <div>
          <p className="mb-4">
            Leadership Drift measures the gap between stated and observed leadership behaviors. Lower drift means your actions match your words.
          </p>
          <p className="text-sm text-gray-600">
            Gap between stated and observed leadership behaviors.
          </p>
        </div>
      )
    },
    'summary': {
      title: 'Summary Metrics',
      content: (
        <div>
          <p className="mb-4">
            The summary cards provide a high-level overview of your leadership trends:
          </p>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li><strong>ALI Overall Improvement:</strong> Percentage change in your overall ALI score over time</li>
            <li><strong>Current ALI Score:</strong> Your most recent overall score and rolling average</li>
            <li><strong>Total Responses:</strong> Total number of survey responses collected across all surveys</li>
          </ul>
          <p className="text-sm text-gray-600">
            These metrics give you a quick snapshot of your leadership environment's trajectory.
          </p>
        </div>
      )
    },
    'insights': {
      title: 'Key Insights & Movement',
      content: (
        <div>
          <p className="mb-4">
            Key Insights & Movement are AI-generated insights from Archy that highlight the most important patterns, trends, and recommendations based on your ALI data.
          </p>
          <p className="mb-4">
            Each insight is clickable—click on any insight to chat with Archy about it. He can:
          </p>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li>Explain what the insight means in plain language</li>
            <li>Help you understand why it matters</li>
            <li>Suggest specific actions you can take</li>
            <li>Answer questions about related patterns or trends</li>
          </ul>
          <p className="text-sm text-gray-600">
            These insights are generated by analyzing your scores, trends, and patterns to surface what's most important for your leadership development.
          </p>
        </div>
      )
    },
    'ali-score': {
      title: 'ALI Overall Score',
      content: (
        <div>
          <p className="mb-4">
            The ALI Overall Score is your most important metric—it's the composite measure of your entire leadership environment. It combines all seven leadership patterns into a single number that shows the health of your leadership culture.
          </p>
          <p className="mb-4">
            The score ranges from 0-100, with zones indicating:
          </p>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li><strong>Green Zone (75+):</strong> Healthy, thriving leadership environment</li>
            <li><strong>Yellow Zone (60-74):</strong> Stable but with room for improvement</li>
            <li><strong>Orange Zone (45-59):</strong> Warning signs of drift and instability</li>
            <li><strong>Red Zone (&lt;45):</strong> Critical issues requiring immediate attention</li>
          </ul>
          <p className="text-sm text-gray-600">
            Your trajectory shows whether you're moving toward or away from healthier leadership patterns. A positive trajectory with an improving score indicates sustainable growth.
          </p>
        </div>
      )
    }
  };

  // Zone background colors and descriptions
  const getZoneInfo = (zone) => {
    const zones = {
      green: {
        color: '#10b981',
        label: 'Green Zone',
        description: 'Healthy, thriving leadership environment. Maintain consistency to sustain this level.'
      },
      yellow: {
        color: '#f59e0b',
        label: 'Yellow Zone',
        description: 'Stable leadership with room for improvement. Focus on strengthening core patterns to move toward Green Zone.'
      },
      orange: {
        color: '#f97316',
        label: 'Orange Zone',
        description: 'Warning signs of drift and instability. Address core patterns to prevent further decline.'
      },
      red: {
        color: '#ef4444',
        label: 'Red Zone',
        description: 'Critical issues requiring immediate attention. Focus on rebuilding trust and clarity.'
      }
    };
    return zones[zone] || zones.yellow;
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
      rolling: 71.8,
      zone: 'yellow',
      history: [
        { period: '2025 Q4', score: 64.3, responses: 18 },
        { period: '2026 Q1', score: 68.5, responses: 23 },
        { period: '2026 Q2', score: 70.2, responses: 21 },
        { period: '2027 Q1', score: 73.7, responses: 24 }
      ]
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
      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
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

        {/* ALI OVERALL SCORE HERO SECTION */}
        <div className="space-y-4 mb-8">
          {/* Panel 1: Score + Chart */}
          <div className="bg-white rounded-lg border border-black/[0.12] p-8">
            <div className="flex items-start justify-between gap-8">
              
              {/* Left: ALI Score */}
              <div className="flex-shrink-0">
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-[15px] font-semibold text-black/[0.6] uppercase tracking-wide">
                    ALI OVERALL SCORE
                  </h2>
                  <button
                    onClick={() => setOpenDefinition('ali-score')}
                    className="text-black/[0.38] hover:text-blue-600 transition-colors"
                    aria-label="Learn about ALI Score"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </div>
                
                <div className="flex items-baseline gap-4">
                  <div className="text-[64px] font-bold leading-none text-[#2563eb]">
                    {mockData.currentALI.score.toFixed(1)}
                  </div>
                  <div className="text-[16px] text-black/[0.6] pb-2">
                    Rolling: <span className="font-semibold text-black/[0.87]">{mockData.currentALI.rolling.toFixed(1)}</span>
                  </div>
                </div>
              </div>

              {/* Right: Trend Chart */}
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-medium text-black/[0.6] uppercase tracking-wide mb-3">
                  4-Quarter Trend
                </div>
                
                {/* SVG Line Chart */}
                <div className="relative h-[140px] w-full">
                  {/* Y-axis labels */}
                  <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-[11px] text-black/[0.38] font-medium pr-2">
                    <span>100</span>
                    <span>75</span>
                    <span>50</span>
                    <span>25</span>
                    <span>0</span>
                  </div>

                  {/* Chart container */}
                  <div className="ml-8 h-full relative">
                    {/* Horizontal grid lines */}
                    <div className="absolute inset-0 flex flex-col justify-between">
                      <div className="h-[1px] bg-black/[0.06]" />
                      <div className="h-[1px] bg-black/[0.12]" /> {/* 75 line - darker */}
                      <div className="h-[1px] bg-black/[0.06]" />
                      <div className="h-[1px] bg-black/[0.06]" />
                      <div className="h-[1px] bg-black/[0.06]" />
                    </div>

                    {/* SVG Chart with line and dots */}
                    <svg 
                      viewBox="0 0 100 100" 
                      preserveAspectRatio="none"
                      className="absolute inset-0 w-full h-full"
                    >
                      {/* Connecting line - Y coordinates inverted (100 - score) */}
                      <polyline
                        points={mockData.currentALI.history.map((point, idx) => {
                          const x = 12.5 + (idx * 25); // 12.5, 37.5, 62.5, 87.5
                          const svgY = 100 - point.score; // Invert Y-axis
                          return `${x},${svgY}`;
                        }).join(' ')}
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth="2.5"
                        vectorEffect="non-scaling-stroke"
                      />
                    </svg>

                    {/* Data points and labels */}
                    <div className="absolute inset-0">
                      {mockData.currentALI.history.map((point, idx) => {
                        const xPercent = 12.5 + (idx * 25); // 12.5%, 37.5%, 62.5%, 87.5%
                        const svgY = 100 - point.score; // Inverted for SVG (top is 0, bottom is 100)
                        const yPercent = svgY; // Position from top
                        return (
                          <div 
                            key={idx} 
                            className="absolute" 
                            style={{ 
                              left: `${xPercent}%`, 
                              top: `${yPercent}%`, 
                              transform: 'translate(-50%, -50%)' 
                            }}
                          >
                            {/* Score label above dot */}
                            <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 text-[12px] font-semibold text-[#2563eb] whitespace-nowrap">
                              {point.score.toFixed(1)}
                            </div>
                            
                            {/* Dot */}
                            <div className="w-2.5 h-2.5 rounded-full bg-[#2563eb] border-2 border-white shadow-sm" />
                            
                            {/* Quarter label below dot */}
                            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 text-[11px] text-black/[0.6] whitespace-nowrap">
                              {point.period}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Panel 2 & 3: Zone + Trajectory Side by Side */}
          <div className="grid grid-cols-2 gap-4">
            
            {/* Panel 2: Current Zone */}
            {(() => {
              const zoneInfo = getZoneInfo(mockData.currentALI.zone);
              return (
                <div 
                  className="rounded-lg border-2 p-6"
                  style={{
                    backgroundColor: `${zoneInfo.color}15`, // 15 = ~8% opacity in hex
                    borderColor: zoneInfo.color
                  }}
                >
                  <div className="text-[11px] font-medium text-black/[0.6] uppercase tracking-wide mb-2">
                    CURRENT ZONE
                  </div>
                  <div 
                    className="text-[22px] font-bold mb-3"
                    style={{ color: zoneInfo.color }}
                  >
                    {zoneInfo.label}
                  </div>
                  <p className="text-[14px] leading-relaxed" style={{ color: zoneInfo.color }}>
                    {zoneInfo.description}
                  </p>
                </div>
              );
            })()}

            {/* Panel 3: Trajectory */}
            <div className="bg-white rounded-lg border border-black/[0.12] p-6">
              <div className="text-[11px] font-medium text-black/[0.6] uppercase tracking-wide mb-2">
                TRAJECTORY
              </div>
              <div className="flex items-center gap-3 mb-2">
                <svg className="w-6 h-6 text-[#10b981]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span className="text-[32px] font-bold text-[#10b981]">
                  +{(mockData.currentALI.history[mockData.currentALI.history.length - 1].score - mockData.currentALI.history[0].score).toFixed(1)}
                </span>
              </div>
              <p className="text-[14px] text-black/[0.6]">
                Total Growth
              </p>
            </div>
          </div>
        </div>

        {/* PRIORITY 2: Key Insights & Movement - Generated by Archy */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-2xl font-semibold text-gray-900">Key Insights & Movement</h2>
            <button
              onClick={() => setOpenDefinition('insights')}
              className="text-gray-400 hover:text-blue-600 transition-colors"
              aria-label="Learn about Key Insights"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="space-y-4">
              {mockData.insights.map((insight, idx) => {
                const Icon = insight.icon;
                return (
                  <div 
                    key={idx}
                    className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all cursor-pointer group"
                    onClick={() => {
                      setArchyInitialMessage(`I'm looking at this insight: "${insight.title}". ${insight.text} Can you help me understand what this means and what I should do about it?`);
                      setShowArchyChat(true);
                    }}
                  >
                    <Icon className={`w-6 h-6 mt-0.5 flex-shrink-0 ${insight.iconColor}`} />
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                        {insight.title}
                      </div>
                      <div className="text-sm text-gray-700 mb-2">{insight.text}</div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setArchyInitialMessage(`Tell me more about: "${insight.title}". ${insight.text}`);
                          setShowArchyChat(true);
                        }}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        <MessageSquare className="w-3 h-3" />
                        Ask Archy about this
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Leadership Pattern Analysis - Horizontal Bar Charts (EXACT IMAGE DESIGN) */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-gray-900">Leadership Pattern Analysis</h2>
              <button
                onClick={() => setOpenDefinition('pattern-analysis')}
                className="text-gray-400 hover:text-blue-600 transition-colors"
                aria-label="Learn about Pattern Analysis"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
            </div>
            {/* Time Range Filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Time Range:</label>
              <select
                value={timeRangeFilter}
                onChange={(e) => setTimeRangeFilter(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="last-4">Last 4 Surveys</option>
                <option value="last-8">Last 8 Surveys</option>
                <option value="last-year">Last Year</option>
                <option value="all">All Time</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {mockData.patterns.map((pattern) => {
              const Icon = pattern.icon;
              const patternColor = getPatternColor(pattern.name);
              const trendColor = pattern.trendDirection === 'up' ? 'text-green-600' : 'text-red-600';
              const maxScore = 100;
              const scrollKey = pattern.name;
              const scrollPosition = patternScrollPositions[scrollKey] || 0;
              
              // Filter quarters based on time range selection
              const getFilteredQuarters = () => {
                const allQuarters = pattern.quarters;
                switch (timeRangeFilter) {
                  case 'last-4':
                    return allQuarters.slice(-4);
                  case 'last-8':
                    return allQuarters.slice(-8);
                  case 'last-year':
                    // Show last 4 quarters (1 year)
                    return allQuarters.slice(-4);
                  case 'all':
                    return allQuarters;
                  default:
                    return allQuarters.slice(-4);
                }
              };
              
              const displayQuarters = getFilteredQuarters();
              const hasMoreQuarters = displayQuarters.length > 4;
              const totalQuarters = pattern.quarters.length;

              return (
                <div key={pattern.name} className="bg-white rounded-lg border border-gray-200 p-6 transition-all duration-200 hover:shadow-lg">
                  {/* Header with Icon, Title, and Subtitle */}
                  <div className="flex items-center gap-3 mb-4">
                    <div 
                      className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${patternColor}20` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: patternColor }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-900 capitalize">{pattern.name.replace('_', ' ')}</h3>
                        <button
                          onClick={() => setOpenDefinition(`pattern-${pattern.name}`)}
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                          aria-label={`Learn about ${pattern.name}`}
                        >
                          <HelpCircle className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500">
                        {displayQuarters.length} of {totalQuarters} survey cycles
                        {timeRangeFilter !== 'all' && totalQuarters > displayQuarters.length && (
                          <span className="text-gray-400"> (filtered)</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Current Score - Large and Prominent */}
                  <div className="mb-2">
                    <div className="text-5xl font-bold mb-1" style={{ color: patternColor }}>
                      {pattern.score.toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-600">Rolling: {pattern.rolling.toFixed(1)}</div>
                  </div>

                  {/* Trend Indicator */}
                  <div className={`flex items-center gap-1 text-sm font-medium mb-6 ${trendColor}`}>
                    {pattern.trendDirection === 'up' ? '↑' : '↓'}
                    <span>{pattern.trend.toFixed(1)}%</span>
                  </div>

                  {/* Horizontal Bar Chart - Scalable Design */}
                  <div className="mb-4">
                    {/* Scrollable container for many quarters */}
                    <div className="relative">
                      {hasMoreQuarters && (
                        <>
                          <button
                            onClick={() => {
                              const container = document.getElementById(`scroll-${scrollKey}`);
                              if (container) {
                                container.scrollLeft -= 200;
                                setPatternScrollPositions({ ...patternScrollPositions, [scrollKey]: container.scrollLeft - 200 });
                              }
                            }}
                            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white border border-gray-300 rounded-full p-1.5 shadow-md hover:bg-gray-50 transition-all"
                            aria-label="Scroll left"
                            style={{ opacity: scrollPosition > 0 ? 1 : 0.3 }}
                          >
                            <ChevronLeft className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => {
                              const container = document.getElementById(`scroll-${scrollKey}`);
                              if (container) {
                                const maxScroll = container.scrollWidth - container.clientWidth;
                                container.scrollLeft += 200;
                                setPatternScrollPositions({ ...patternScrollPositions, [scrollKey]: Math.min(container.scrollLeft, maxScroll) });
                              }
                            }}
                            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white border border-gray-300 rounded-full p-1.5 shadow-md hover:bg-gray-50 transition-all"
                            aria-label="Scroll right"
                            style={{ opacity: scrollPosition < (displayQuarters.length * 100) ? 1 : 0.3 }}
                          >
                            <ChevronRight className="w-4 h-4 text-gray-600" />
                          </button>
                        </>
                      )}
                      
                      <div
                        id={`scroll-${scrollKey}`}
                        className={`overflow-x-auto scrollbar-hide ${hasMoreQuarters ? 'px-8' : ''}`}
                        style={{ scrollBehavior: 'smooth' }}
                        onScroll={(e) => {
                          setPatternScrollPositions({ ...patternScrollPositions, [scrollKey]: e.target.scrollLeft });
                        }}
                      >
                        <div className="flex flex-col gap-3" style={{ minWidth: hasMoreQuarters ? 'max-content' : '100%' }}>
                          {displayQuarters.map((quarter, idx) => {
                            const barWidth = (quarter.score / maxScore) * 100;
                            const animatedWidth = animatedValues[`${pattern.name}_${idx}`] 
                              ? (animatedValues[`${pattern.name}_${idx}`] / maxScore) * 100 
                              : 0;
                            
                            return (
                              <div key={idx} className="flex items-center gap-3" style={{ minWidth: hasMoreQuarters ? '400px' : '100%' }}>
                                {/* Quarter Label */}
                                <div className="w-20 text-xs text-gray-600 font-medium flex-shrink-0">
                                  {quarter.period}
                                </div>
                                
                                {/* Horizontal Bar */}
                                <div className="flex-1 relative h-8 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all duration-1000 ease-out flex items-center justify-end pr-2"
                                    style={{ 
                                      width: `${Math.max(animatedWidth || barWidth, 2)}%`,
                                      backgroundColor: patternColor,
                                      minWidth: quarter.score > 0 ? '40px' : '0'
                                    }}
                                  >
                                    <span className="text-xs font-semibold text-white">
                                      {quarter.score.toFixed(1)}
                                    </span>
                                  </div>
                                </div>
                                
                                {/* Response Count */}
                                <div className="w-24 text-xs text-gray-500 flex-shrink-0 text-right">
                                  {quarter.responses} responses
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    
                    {/* Show indicator if more data available */}
                    {timeRangeFilter !== 'all' && totalQuarters > displayQuarters.length && (
                      <div className="mt-2 text-xs text-gray-500 text-center">
                        Showing {displayQuarters.length} of {totalQuarters} surveys. 
                        <button
                          onClick={() => setTimeRangeFilter('all')}
                          className="text-blue-600 hover:text-blue-700 font-medium ml-1"
                        >
                          Show all →
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Definition Text */}
                  <div className="text-xs text-gray-600 border-t border-gray-100 pt-4 mt-4">
                    {pattern.description}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

      </main>

      {/* Definition Modals */}
      {openDefinition && definitions[openDefinition] && (
        <DefinitionModal
          isOpen={!!openDefinition}
          onClose={() => setOpenDefinition(null)}
          title={definitions[openDefinition].title}
          content={definitions[openDefinition].content}
          sectionKey={openDefinition}
          onOpenArchy={(key) => {
            setOpenDefinition(null);
            setShowArchyChat(true);
          }}
        />
      )}

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
              {/* Header */}
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

              {/* Chat Content */}
              <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                <ChatApp 
                  context="ali-reports" 
                  initialMessage={archyInitialMessage || "I'm looking at my Leadership Trends & Analytics report. Can you help me interpret the patterns, trends, and insights I'm seeing?"}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ALIReports;
