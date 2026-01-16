import React, { useState, useEffect } from 'react';
import { Lightbulb, Scale, Handshake, MessageSquare, Compass, Shield, BarChart3, CheckCircle2, ArrowDown, AlertTriangle, Sparkles, ChevronDown, User, Share2, Send, ExternalLink, HelpCircle, ChevronLeft, ChevronRight, TrendingUp, GitBranch, Target, Download, FileText, Calendar, Filter } from 'lucide-react';
import DefinitionModal from '../../components/ali/DefinitionModal';
import ChatApp from '../../app/ChatApp';

const ALIReports = () => {
  const [animatedValues, setAnimatedValues] = useState({});
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

  // Preserve magic-link email across ALI app navigation (used for role-aware links)
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

  // Helper function to convert Leadership Drift to Leadership Alignment (reversed scale)
  // Drift: 0 = perfect, 100 = worst → Alignment: 100 = perfect, 0 = worst
  const getDriftAsAlignment = (driftScore) => {
    return 100 - driftScore;
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
      leadership_drift: '#ec4899' // Pink - unique color for Leadership Alignment
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
            Leadership Alignment measures how well your actions match your stated values. Higher alignment means your actions match your words. (Displayed as 100 - drift score, where drift measures the gap between stated and observed behaviors.)
          </p>
          <p className="text-sm text-gray-600">
            Alignment between stated and observed leadership behaviors.
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
    },
    'comparative-analysis': {
      title: 'Comparative Analysis',
      content: (
        <div>
          <p className="mb-4">
            Comparative Analysis helps you understand how your leadership environment has changed over time by comparing different periods.
          </p>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li><strong>Period Comparison:</strong> Compare any two time periods side-by-side</li>
            <li><strong>Year-over-Year:</strong> See how the same quarter compares across years</li>
            <li><strong>Trend Analysis:</strong> Identify acceleration or deceleration in improvements</li>
          </ul>
          <p className="text-sm text-gray-600">
            Use comparisons to identify what's working and what needs attention.
          </p>
        </div>
      )
    },
    'root-cause': {
      title: 'Root Cause Analysis',
      content: (
        <div>
          <p className="mb-4">
            Root Cause Analysis reveals which leadership patterns influence each other, helping you understand why scores are changing.
          </p>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li><strong>Pattern Correlations:</strong> See which patterns move together (positive correlation) or in opposite directions (negative correlation)</li>
            <li><strong>Strong Relationships:</strong> Patterns that consistently move together suggest shared underlying factors</li>
            <li><strong>Inverse Relationships:</strong> Patterns that move in opposite directions help identify trade-offs or competing priorities</li>
          </ul>
          <p className="text-sm text-gray-600">
            Understanding correlations helps you prioritize which patterns to focus on for maximum impact.
          </p>
        </div>
      )
    },
    'predictive': {
      title: 'Predictive Analytics',
      content: (
        <div>
          <p className="mb-4">
            Predictive Analytics uses your historical data to project where your leadership environment is heading.
          </p>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li><strong>Projections:</strong> Forecasted scores based on current trends</li>
            <li><strong>Scenario Modeling:</strong> See how different improvement rates would affect your overall score</li>
            <li><strong>Risk Indicators:</strong> Early warning signals for potential score declines</li>
          </ul>
          <p className="text-sm text-gray-600">
            Use predictions to set realistic targets and identify risks before they become problems.
          </p>
        </div>
      )
    },
    'action-planning': {
      title: 'Action Planning',
      content: (
        <div>
          <p className="mb-4">
            Action Planning provides prioritized recommendations based on your data analysis.
          </p>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li><strong>Prioritized Recommendations:</strong> Actions ranked by impact and effort required</li>
            <li><strong>Quick Wins:</strong> Low-effort actions with immediate positive impact</li>
            <li><strong>Impact Estimation:</strong> Understand how each action might affect your scores</li>
          </ul>
          <p className="text-sm text-gray-600">
            Click any action to chat with Archy about implementation strategies.
          </p>
        </div>
      )
    },
    'multi-year-progression': {
      title: 'Multi-Year Score Progression',
      content: (
        <div>
          <p className="mb-4">
            The Multi-Year Score Progression chart shows your complete leadership journey across all survey periods, not just the last four quarters.
          </p>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li><strong>Complete History:</strong> See every survey result in one view</li>
            <li><strong>Zone Transitions:</strong> Visual markers show when you moved between zones</li>
            <li><strong>Year-over-Year:</strong> Dashed lines show average performance by year</li>
            <li><strong>Event Correlation:</strong> Link score changes to organizational initiatives</li>
          </ul>
          <p className="text-sm text-gray-600">
            This view helps you understand long-term trends and the impact of specific actions over time.
          </p>
        </div>
      )
    },
    'pattern-health': {
      title: 'Pattern Health Matrix',
      content: (
        <div>
          <p className="mb-4">
            The Pattern Health Matrix provides a quick visual assessment of all seven leadership patterns at a glance.
          </p>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li><strong>Health Status:</strong> Color-coded indicators (Green/Yellow/Orange/Red) show current health</li>
            <li><strong>Trend Indicators:</strong> Arrows show whether each pattern is improving, declining, or stable</li>
            <li><strong>Click to Drill:</strong> Click any pattern to jump to detailed analysis</li>
          </ul>
          <p className="text-sm text-gray-600">
            Use this matrix to quickly identify which patterns need attention and which are performing well.
          </p>
        </div>
      )
    },
    'risk-indicators': {
      title: 'Risk Indicators & Opportunities',
      content: (
        <div>
          <p className="mb-4">
            Risk Indicators & Opportunities provide early warning signals and highlight quick wins based on your data.
          </p>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li><strong>Early Warnings:</strong> Identify patterns showing volatility or decline before they become critical</li>
            <li><strong>Quick Wins:</strong> Low-effort actions with high potential impact</li>
            <li><strong>Impact Estimates:</strong> Understand the potential score improvement from each action</li>
          </ul>
          <p className="text-sm text-gray-600">
            This section helps you prioritize actions and address issues before they escalate.
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
      ],
      multiYearComparison: {
        year1: { avg: 66.4, range: '2025 Q4 - 2026 Q1' },
        year2: { avg: 71.1, range: '2026 Q2 - 2027 Q1' },
        improvement: 4.7
      }
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
        title: 'Leadership Alignment Improvement',
        text: '40% increase in Leadership Alignment indicates improved consistency between stated values and actual behaviors.'
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
        text: 'Continue quarterly surveys. ALI Overall Score has reached 73.7 (Yellow Zone). Focus on sustaining gains and addressing the communication perception gap.',
        date: '2027-01-03',
        category: 'recommendation'
      }
    ],
    historicalInsights: [
      {
        icon: CheckCircle2,
        iconColor: 'text-green-600',
        title: 'Q4 2026: Strong Quarter Finish',
        text: 'All core patterns showed improvement in Q4, with Alignment leading gains.',
        date: '2026-12-15',
        category: 'trend'
      },
      {
        icon: AlertTriangle,
        iconColor: 'text-yellow-600',
        title: 'Q3 2026: Stability Dip Detected',
        text: 'Stability score decreased by 3.2 points. Review recent organizational changes.',
        date: '2026-09-20',
        category: 'alert'
      }
    ],
    patternCorrelations: {
      strongest: [
        { pattern1: 'clarity', pattern2: 'alignment', correlation: 0.87 },
        { pattern1: 'consistency', pattern2: 'stability', correlation: 0.82 },
        { pattern1: 'trust', pattern2: 'communication', correlation: 0.79 }
      ],
      weakest: [
        { pattern1: 'leadership_drift', pattern2: 'clarity', correlation: -0.65 }
      ]
    },
    predictiveInsights: {
      projection: {
        nextQuarter: 75.2,
        confidence: 'high',
        factors: ['Sustained Clarity gains', 'Improved Alignment trend']
      },
      scenarios: [
        { name: 'Optimistic', score: 78.5, conditions: 'All patterns improve by 5%' },
        { name: 'Realistic', score: 75.2, conditions: 'Current trends continue' },
        { name: 'Conservative', score: 72.0, conditions: 'Some patterns plateau' }
      ],
      risks: [
        { pattern: 'Stability', risk: 'medium', reason: 'Recent volatility in scores' }
      ]
    },
    actionPlan: {
      priority: [
        { action: 'Maintain Clarity momentum', impact: 'High', effort: 'Low', pattern: 'clarity' },
        { action: 'Address Communication gap', impact: 'High', effort: 'Medium', pattern: 'communication' },
        { action: 'Strengthen Stability foundation', impact: 'Medium', effort: 'High', pattern: 'stability' }
      ],
      quickWins: [
        { action: 'Send quarterly survey reminder', impact: '+2-3 points', timeframe: '1 week' },
        { action: 'Share Clarity improvement insights', impact: 'Reinforce positive behavior', timeframe: '3 days' }
      ]
    }
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
        const isLeadershipDrift = pattern.name === 'leadership_drift';
        pattern.quarters.forEach((quarter, qIdx) => {
          // For Leadership Drift, reverse the scale (100 - drift = alignment)
          const displayScore = isLeadershipDrift ? getDriftAsAlignment(quarter.score) : quarter.score;
          animateValue(`${pattern.name}_${qIdx}`, 0, displayScore, 1200 + (idx * 100) + (qIdx * 50));
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
            <div className="text-xl font-bold text-gray-900">ALI</div>
            <nav className="flex items-center gap-6">
              <button
                onClick={() => handleNavigate(withEmail('/ali/dashboard'))}
                className="text-gray-600 hover:text-gray-900"
              >
                Dashboard
              </button>
              <button
                onClick={() => handleNavigate(withEmail('/ali/reports'))}
                className="text-blue-600 font-semibold"
              >
                Reports
              </button>
              <button
                onClick={() => handleNavigate(withEmail('/ali/deploy'))}
                className="text-gray-600 hover:text-gray-900"
              >
                Deploy
              </button>
              <button
                onClick={() => handleNavigate(withEmail('/ali/settings'))}
                className="text-gray-600 hover:text-gray-900"
              >
                Settings
              </button>
              <button
                onClick={() => handleNavigate(withEmail('/ali/billing'))}
                className="text-gray-600 hover:text-gray-900"
              >
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
              <button
                onClick={() => handleNavigate('/ali/login')}
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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Leadership Trends & Analytics</h1>
            <p className="text-gray-600">Multi-year progression analysis 2025 Q4 - 2027 Q1</p>
          </div>
          <button
            onClick={() => handleNavigate(withEmail('/ali/dashboard'))}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* MULTI-YEAR SCORE PROGRESSION - Above the Fold */}
        <section id="multi-year-progression" className="mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <div className="flex items-center gap-2 mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">Multi-Year Score Progression</h2>
              <button
                onClick={() => setOpenDefinition('multi-year-progression')}
                className="text-gray-400 hover:text-blue-600 transition-colors"
                aria-label="Learn about Multi-Year Progression"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
            </div>
            
            {/* Large Multi-Year Chart */}
            <div className="relative h-[320px] mb-6">
              {/* Y-axis labels */}
              <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-500 font-medium pr-3">
                <span>100</span>
                <span>75</span>
                <span>50</span>
                <span>25</span>
                <span>0</span>
              </div>

              {/* Chart container */}
              <div className="ml-12 h-full relative">
                {/* Zone background bands */}
                <div className="absolute inset-0">
                  <div className="absolute top-0 left-0 right-0 h-[25%] bg-green-50/30 border-b border-green-200/50"></div>
                  <div className="absolute top-[25%] left-0 right-0 h-[15%] bg-yellow-50/30 border-b border-yellow-200/50"></div>
                  <div className="absolute top-[40%] left-0 right-0 h-[15%] bg-orange-50/30 border-b border-orange-200/50"></div>
                  <div className="absolute bottom-0 left-0 right-0 h-[45%] bg-red-50/30"></div>
                </div>

                {/* Horizontal grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between">
                  {[0, 25, 50, 75, 100].map((val) => (
                    <div key={val} className={`h-[1px] ${val === 75 ? 'bg-gray-400' : 'bg-gray-200'}`}></div>
                  ))}
                </div>

                {/* SVG Chart - All quarters */}
                <svg 
                  viewBox="0 0 100 100" 
                  preserveAspectRatio="none"
                  className="absolute inset-0 w-full h-full"
                >
                  {/* Main progression line */}
                  <polyline
                    points={mockData.currentALI.history.map((point, idx) => {
                      const x = (idx / (mockData.currentALI.history.length - 1)) * 90 + 5; // Spread across width
                      const svgY = 100 - point.score; // Invert Y-axis
                      return `${x},${svgY}`;
                    }).join(' ')}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="3"
                    vectorEffect="non-scaling-stroke"
                  />
                  
                  {/* Year 1 average line */}
                  {mockData.currentALI.multiYearComparison && (
                    <line
                      x1="5"
                      y1={100 - mockData.currentALI.multiYearComparison.year1.avg}
                      x2="50"
                      y2={100 - mockData.currentALI.multiYearComparison.year1.avg}
                      stroke="#94a3b8"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                  
                  {/* Year 2 average line */}
                  {mockData.currentALI.multiYearComparison && (
                    <line
                      x1="50"
                      y1={100 - mockData.currentALI.multiYearComparison.year2.avg}
                      x2="95"
                      y2={100 - mockData.currentALI.multiYearComparison.year2.avg}
                      stroke="#10b981"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                      vectorEffect="non-scaling-stroke"
                    />
                  )}
                </svg>

                {/* Data points */}
                <div className="absolute inset-0">
                  {mockData.currentALI.history.map((point, idx) => {
                    const xPercent = (idx / (mockData.currentALI.history.length - 1)) * 90 + 5;
                    const svgY = 100 - point.score;
                    const yPercent = svgY;
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
                        <div className="w-3 h-3 rounded-full bg-[#2563eb] border-2 border-white shadow-md"></div>
                      </div>
                    );
                  })}
                </div>

                {/* X-axis labels */}
                <div className="absolute bottom-0 left-0 right-0 flex justify-between pt-2">
                  {mockData.currentALI.history.map((point, idx) => (
                    <div key={idx} className="text-xs text-gray-600">
                      {point.period}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Key Metrics Row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-6 border-t border-gray-200">
              <div>
                <div className="text-xs text-gray-500 mb-1">Current</div>
                <div className="text-xl font-bold text-gray-900">{mockData.currentALI.score.toFixed(1)}</div>
              </div>
              {mockData.currentALI.multiYearComparison && (
                <>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Year 1 Avg</div>
                    <div className="text-xl font-bold text-gray-700">{mockData.currentALI.multiYearComparison.year1.avg.toFixed(1)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Year 2 Avg</div>
                    <div className="text-xl font-bold text-green-600">{mockData.currentALI.multiYearComparison.year2.avg.toFixed(1)}</div>
                  </div>
                </>
              )}
              <div>
                <div className="text-xs text-gray-500 mb-1">Total Improvement</div>
                <div className="text-xl font-bold text-green-600">+{mockData.aliImprovement.percent.toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Best Quarter</div>
                <div className="text-xl font-bold text-gray-900">{mockData.currentALI.history[mockData.currentALI.history.length - 1].period}</div>
              </div>
            </div>
          </div>
        </section>

        {/* PRIORITY 2: Key Insights & Movement - Generated by Archy */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-semibold text-gray-900">Key Insights & Movement</h2>
              <button
                onClick={() => setOpenDefinition('insights')}
                className="text-gray-400 hover:text-blue-600 transition-colors"
                aria-label="Learn about Key Insights"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
            </div>
            {mockData.historicalInsights && mockData.historicalInsights.length > 0 && (
              <div className="text-sm text-gray-600">
                Showing {mockData.insights.length} current • <button className="text-blue-600 hover:text-blue-700 font-medium" onClick={() => {/* Toggle historical view */}}>View Archive ({mockData.historicalInsights.length})</button>
              </div>
            )}
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
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {insight.title}
                        </div>
                        {insight.date && (
                          <span className="text-xs text-gray-400">{insight.date}</span>
                        )}
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

        {/* PATTERN ANALYSIS - All Pattern Content Together */}
        <section id="pattern-analysis-section" className="mb-12">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Pattern Analysis</h2>
            <p className="text-gray-600">Comprehensive analysis of all seven leadership patterns</p>
          </div>

          {/* Pattern Health Matrix */}
          <div className="mb-8">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Pattern Health Matrix</h3>
                <button
                  onClick={() => setOpenDefinition('pattern-health')}
                  className="text-gray-400 hover:text-blue-600 transition-colors"
                  aria-label="Learn about Pattern Health"
                >
                  <HelpCircle className="w-5 h-5" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {mockData.patterns.map((pattern) => {
                  const isLeadershipDrift = pattern.name === 'leadership_drift';
                  const displayScore = isLeadershipDrift ? getDriftAsAlignment(pattern.score) : pattern.score;
                  const displayRolling = isLeadershipDrift ? getDriftAsAlignment(pattern.rolling) : pattern.rolling;
                  
                  // Determine health status
                  let healthStatus = 'green';
                  let healthLabel = 'Healthy';
                  if (displayRolling < 45) {
                    healthStatus = 'red';
                    healthLabel = 'Critical';
                  } else if (displayRolling < 60) {
                    healthStatus = 'orange';
                    healthLabel = 'Warning';
                  } else if (displayRolling < 75) {
                    healthStatus = 'yellow';
                    healthLabel = 'Stable';
                  }
                  
                  const healthColors = {
                    green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', dot: 'bg-green-500' },
                    yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', dot: 'bg-yellow-500' },
                    orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', dot: 'bg-orange-500' },
                    red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', dot: 'bg-red-500' }
                  };
                  
                  const colors = healthColors[healthStatus];
                  const trendIcon = pattern.trendDirection === 'up' ? '↑' : pattern.trendDirection === 'down' ? '↓' : '→';
                  const trendColor = pattern.trendDirection === 'up' ? 'text-green-600' : pattern.trendDirection === 'down' ? 'text-red-600' : 'text-gray-600';
                  
                  return (
                    <div 
                      key={pattern.name}
                      className={`p-3 rounded-lg border ${colors.bg} ${colors.border} cursor-pointer hover:shadow-md transition-all`}
                      onClick={() => {
                        // Scroll to detailed pattern analysis
                        const element = document.getElementById(`pattern-detail-${pattern.name}`);
                        if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${colors.dot}`}></div>
                          <div>
                            <div className="font-semibold text-gray-900 capitalize text-sm">
                              {pattern.name === 'leadership_drift' ? 'Leadership Alignment' : pattern.name.replace('_', ' ')}
                            </div>
                            <div className="text-xs text-gray-600">{healthLabel}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold ${colors.text}`}>
                            {displayRolling.toFixed(1)}
                          </div>
                          <div className={`text-xs ${trendColor} font-medium`}>
                            {trendIcon} {pattern.trend > 0 ? '+' : ''}{pattern.trend.toFixed(1)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Leadership Pattern Analysis - Detailed Charts */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-semibold text-gray-900">Detailed Pattern Analysis</h3>
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
              const isLeadershipDrift = pattern.name === 'leadership_drift';
              
              // For Leadership Drift, convert to Alignment (reversed scale)
              const displayScore = isLeadershipDrift ? getDriftAsAlignment(pattern.score) : pattern.score;
              const displayRolling = isLeadershipDrift ? getDriftAsAlignment(pattern.rolling) : pattern.rolling;
              
              // For drift, trendDirection 'down' means drift decreased = alignment increased = good
              // So we reverse the trend color logic for drift
              const trendColor = isLeadershipDrift 
                ? (pattern.trendDirection === 'down' ? 'text-green-600' : 'text-red-600')
                : (pattern.trendDirection === 'up' ? 'text-green-600' : 'text-red-600');
              
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
                <div id={`pattern-detail-${pattern.name}`} key={pattern.name} className="bg-white rounded-lg border border-gray-200 p-6 transition-all duration-200 hover:shadow-lg">
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
                        <h3 className="text-lg font-semibold text-gray-900 capitalize">
                          {pattern.name === 'leadership_drift' ? 'Leadership Alignment' : pattern.name.replace('_', ' ')}
                        </h3>
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
                      {displayScore.toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-600">Rolling: {displayRolling.toFixed(1)}</div>
                  </div>

                  {/* Trend Indicator */}
                  <div className={`flex items-center gap-1 text-sm font-medium mb-6 ${trendColor}`}>
                    {isLeadershipDrift 
                      ? (pattern.trendDirection === 'down' ? '↑' : '↓') // Down drift = up alignment
                      : (pattern.trendDirection === 'up' ? '↑' : '↓')}
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
                            // For Leadership Drift, convert to Alignment (reversed scale)
                            const displayQuarterScore = isLeadershipDrift ? getDriftAsAlignment(quarter.score) : quarter.score;
                            const barWidth = (displayQuarterScore / maxScore) * 100;
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
                                      {displayQuarterScore.toFixed(1)}
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
          </div>

          {/* Root Cause Analysis - Pattern Correlations */}
          <div className="mb-8">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Root Cause Analysis</h3>
                <button
                  onClick={() => setOpenDefinition('root-cause')}
                  className="text-gray-400 hover:text-blue-600 transition-colors"
                  aria-label="Learn about Root Cause Analysis"
                >
                  <HelpCircle className="w-5 h-5" />
                </button>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Pattern Correlations</h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Strongest Correlations */}
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-3">Strongest Relationships</h5>
                  <div className="space-y-2">
                    {mockData.patternCorrelations?.strongest.map((corr, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-green-50 rounded">
                        <span className="text-sm text-gray-700 capitalize">
                          {corr.pattern1.replace('_', ' ')} ↔ {corr.pattern2.replace('_', ' ')}
                        </span>
                        <span className="text-sm font-semibold text-green-700">{corr.correlation.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Weakest/Inverse Correlations */}
                <div>
                  <h5 className="text-sm font-medium text-gray-700 mb-3">Inverse Relationships</h5>
                  <div className="space-y-2">
                    {mockData.patternCorrelations?.weakest.map((corr, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-orange-50 rounded">
                        <span className="text-sm text-gray-700 capitalize">
                          {corr.pattern1.replace('_', ' ')} ↔ {corr.pattern2.replace('_', ' ')}
                        </span>
                        <span className="text-sm font-semibold text-orange-700">{corr.correlation.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>Key Insight:</strong> Clarity and Alignment show the strongest positive correlation (0.87), suggesting that improving communication clarity directly enhances team alignment. Leadership Alignment (reversed drift) has an inverse relationship with Clarity, indicating that as clarity improves, drift decreases.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Comparative Analysis Section */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Comparative Analysis</h2>
            <button
              onClick={() => setOpenDefinition('comparative-analysis')}
              className="text-gray-400 hover:text-blue-600 transition-colors"
              aria-label="Learn about Comparative Analysis"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Period Comparison */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Period Comparison</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">2025 Q4 vs 2027 Q1</span>
                    <span className="text-lg font-bold text-green-600">+{mockData.aliImprovement.percent.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Year 1 vs Year 2</span>
                    <span className="text-lg font-bold text-green-600">+{mockData.currentALI.multiYearComparison?.improvement.toFixed(1) || '4.7'} pts</span>
                  </div>
                </div>
              </div>
              
              {/* Year-over-Year */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Year-over-Year</h3>
                <div className="space-y-3">
                  {mockData.currentALI.multiYearComparison && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Year 1 Average</span>
                        <span className="font-semibold text-gray-900">{mockData.currentALI.multiYearComparison.year1.avg.toFixed(1)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Year 2 Average</span>
                        <span className="font-semibold text-green-600">{mockData.currentALI.multiYearComparison.year2.avg.toFixed(1)}</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-600 rounded-full"
                          style={{ width: `${(mockData.currentALI.multiYearComparison.year2.avg / 100) * 100}%` }}
                        ></div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Predictive Analytics Section */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Predictive Analytics</h2>
            <button
              onClick={() => setOpenDefinition('predictive')}
              className="text-gray-400 hover:text-blue-600 transition-colors"
              aria-label="Learn about Predictive Analytics"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Projection */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Next Quarter Projection</h3>
                {mockData.predictiveInsights?.projection && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600 mb-2">
                      {mockData.predictiveInsights.projection.nextQuarter.toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      Confidence: <span className="font-semibold text-green-600 capitalize">{mockData.predictiveInsights.projection.confidence}</span>
                    </div>
                    <div className="text-xs text-gray-600">
                      <strong>Key Factors:</strong> {mockData.predictiveInsights.projection.factors.join(', ')}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Scenarios */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Scenario Modeling</h3>
                <div className="space-y-3">
                  {mockData.predictiveInsights?.scenarios.map((scenario, idx) => (
                    <div key={idx} className="p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-gray-900">{scenario.name}</span>
                        <span className="text-lg font-bold text-blue-600">{scenario.score.toFixed(1)}</span>
                      </div>
                      <div className="text-xs text-gray-600">{scenario.conditions}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Risk Indicators - Moved to Predictive Analytics */}
          </div>
        </section>

        {/* Action Planning Section */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Action Planning</h2>
            <button
              onClick={() => setOpenDefinition('action-planning')}
              className="text-gray-400 hover:text-blue-600 transition-colors"
              aria-label="Learn about Action Planning"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Priority Actions */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Prioritized Recommendations</h3>
                <div className="space-y-3">
                  {mockData.actionPlan?.priority.map((action, idx) => (
                    <div key={idx} className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900 mb-1">{action.action}</div>
                          <div className="text-xs text-gray-600 capitalize">
                            Pattern: {action.pattern.replace('_', ' ')} • Impact: {action.impact} • Effort: {action.effort}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setArchyInitialMessage(`Tell me more about this action: "${action.action}". How should I implement it?`);
                            setShowArchyChat(true);
                          }}
                          className="ml-2 text-blue-600 hover:text-blue-700"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Quick Wins */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Wins</h3>
                <div className="space-y-3">
                  {mockData.actionPlan?.quickWins.map((win, idx) => (
                    <div key={idx} className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="font-semibold text-gray-900 mb-1">{win.action}</div>
                      <div className="text-sm text-gray-700 mb-1">
                        <strong>Impact:</strong> {win.impact}
                      </div>
                      <div className="text-xs text-gray-600">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        {win.timeframe}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Export & Sharing Section */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <Download className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Export & Share</h2>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors">
                <FileText className="w-5 h-5 text-blue-600" />
                <div className="text-left">
                  <div className="font-semibold text-gray-900">Export PDF</div>
                  <div className="text-xs text-gray-600">Full report</div>
                </div>
              </button>
              <button className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors">
                <Download className="w-5 h-5 text-blue-600" />
                <div className="text-left">
                  <div className="font-semibold text-gray-900">Export Data</div>
                  <div className="text-xs text-gray-600">CSV/Excel</div>
                </div>
              </button>
              <button className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors">
                <Share2 className="w-5 h-5 text-blue-600" />
                <div className="text-left">
                  <div className="font-semibold text-gray-900">Share Report</div>
                  <div className="text-xs text-gray-600">Generate link</div>
                </div>
              </button>
            </div>
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
