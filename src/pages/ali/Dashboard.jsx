import React, { useState, useEffect, useRef } from 'react';
import { Lightbulb, Scale, Handshake, MessageSquare, Compass, Shield, BarChart3, Info, HelpCircle, CheckCircle2, ArrowDown, AlertTriangle, Sparkles, MessageSquare as MessageSquareIcon } from 'lucide-react';
import DefinitionModal from '../../components/ali/DefinitionModal';
import ChatApp from '../../app/ChatApp';

const ALIDashboard = () => {
  const [expandedZone, setExpandedZone] = useState(null);
  const [expandedProfile, setExpandedProfile] = useState(false);
  const [hoveredPattern, setHoveredPattern] = useState(null);
  const [hoveredMetric, setHoveredMetric] = useState(null);
  const [hoveredChartPoint, setHoveredChartPoint] = useState(null);
  const [animatedValues, setAnimatedValues] = useState({});
  const [chartAnimated, setChartAnimated] = useState(false);
  const [openDefinition, setOpenDefinition] = useState(null);
  const [showArchyChat, setShowArchyChat] = useState(false);
  const [archyInitialMessage, setArchyInitialMessage] = useState(null);
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

    // Animate ALI score line chart
    if (mockData.scores.ali.history) {
      mockData.scores.ali.history.forEach((point, idx) => {
        animateValue(`ali_score_${idx}`, 0, point.score, 1200 + (idx * 100));
      });
    }

    // Animate chart lines
    setTimeout(() => {
      setChartAnimated(true);
    }, 300);
  }, []);

  // Definition content for each section
  const definitions = {
    'core-scores': {
      title: 'Core Scores',
      content: (
        <div>
          <p className="mb-4">
            The Core Scores measure three fundamental leadership conditions that determine how your team experiences your leadership:
          </p>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li><strong>Alignment:</strong> How well your team understands and follows your direction. High alignment means expectations are clear and people know what to do.</li>
            <li><strong>Stability:</strong> How predictable and steady your leadership feels. High stability means your team can count on consistent behavior and decisions.</li>
            <li><strong>Clarity:</strong> How well you communicate expectations, priorities, and decisions. High clarity means people understand what you mean and why.</li>
          </ul>
          <p className="text-sm text-gray-600">
            These scores are rolling averages from your last 4 surveys, showing trends over time rather than just a single snapshot.
          </p>
        </div>
      )
    },
    'trajectory': {
      title: 'Trajectory',
      content: (
        <div>
          <p className="mb-4">
            Trajectory measures the overall direction of your leadership environment. It's calculated using the Drift Index method, which tracks how conditions are changing over time.
          </p>
          <p className="mb-4">
            A positive trajectory (improving momentum) means your leadership conditions are getting stronger. A negative trajectory means drift is increasing and conditions are weakening.
          </p>
          <p className="text-sm text-gray-600">
            This metric helps you see the big picture: are you moving toward healthier leadership patterns, or away from them?
          </p>
        </div>
      )
    },
    'team-experience-map': {
      title: 'Team Experience Map',
      content: (
        <div>
          <p className="mb-4">
            The Team Experience Map transforms ALI data into a visual representation of how your leadership is landing with your team. It shows:
          </p>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li>How leadership is landing</li>
            <li>How the team is interpreting behavior</li>
            <li>How clarity and trust interact</li>
            <li>Where communication is working</li>
            <li>Where instability is forming</li>
            <li>How all of this changes quarter after quarter</li>
          </ul>
          <p className="mb-4 font-semibold">The Four Zones:</p>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li><strong>Harmony Zone:</strong> Clarity high, trust high, stability strong. This is where teams thrive with intentional, consistent leadership.</li>
            <li><strong>Strain Zone:</strong> Clarity is breaking down, but trust still holds. This is the earliest warning sign of cultural drift.</li>
            <li><strong>Stress Zone:</strong> Stability is eroding, communication is inconsistent. Teams can still recover quickly if leadership acknowledges the instability.</li>
            <li><strong>Hazard Zone:</strong> Trust fractured, clarity unclear, leadership unpredictable. This is where culture breaks.</li>
          </ul>
          <p className="text-sm text-gray-600">
            The map is not about judgment—it's about awareness. It shows you where your team actually is, not where you assume they are.
          </p>
        </div>
      )
    },
    'pattern-analysis': {
      title: 'Pattern Analysis',
      content: (
        <div>
          <p className="mb-4">
            Pattern Analysis tracks seven key leadership patterns that influence how your team experiences your leadership:
          </p>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li><strong>Clarity:</strong> How clearly you communicate expectations and decisions</li>
            <li><strong>Consistency:</strong> How predictable and steady your behavior is</li>
            <li><strong>Trust:</strong> How safe your team feels to speak truth</li>
            <li><strong>Communication:</strong> How well information flows in both directions</li>
            <li><strong>Alignment:</strong> How well your team understands and follows direction</li>
            <li><strong>Stability:</strong> How steady and reliable your leadership feels</li>
            <li><strong>Leadership Drift:</strong> How much conditions are shifting over time (lower is better)</li>
          </ul>
          <p className="text-sm text-gray-600">
            These patterns are rolling averages from your last 4 surveys, showing trends over time. Each pattern tells part of the story of how your leadership is experienced.
          </p>
        </div>
      )
    },
    'leadership-profile': {
      title: 'Leadership Profile',
      content: (
        <div>
          <p className="mb-4">
            Your Leadership Profile reveals the archetype of how you lead, measured across two fundamental axes:
          </p>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li><strong>Honesty:</strong> Your relationship with truth—ranging from Protective (avoids truth) to Courageous (faces truth directly)</li>
            <li><strong>Clarity:</strong> Your relationship with communication—ranging from Ambiguous (leaves people guessing) to Consistent (predictably clear)</li>
          </ul>
          <p className="mb-4 font-semibold">The Six Leadership Profiles:</p>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li><strong>Guardian:</strong> High Honesty • High Clarity. The healthiest leadership model—stable, safe, aligned.</li>
            <li><strong>Aspirer:</strong> High Honesty • Unstable Clarity. Well-intentioned but clarity slips under stress.</li>
            <li><strong>Protector:</strong> Selective Honesty • High Clarity. Communicates well but edits truth to protect.</li>
            <li><strong>Producer-Leader:</strong> Courageous Honesty • Ambiguous Clarity. Works hard, tells truth, but vague due to overload.</li>
            <li><strong>Stabilizer:</strong> Selective Honesty • Unstable Clarity. Keeps peace but unintentionally confuses team.</li>
            <li><strong>Operator:</strong> Protective Honesty • Ambiguous Clarity. Well-meaning but exhausted and unequipped.</li>
          </ul>
          <p className="text-sm text-gray-600">
            These profiles are not moral judgments—they're behavioral patterns that reveal where to grow. Once you see your profile, you understand your drift patterns and what needs to be strengthened.
          </p>
        </div>
      )
    },
    'leadership-mirror': {
      title: 'Leadership Mirror',
      content: (
        <div>
          <p className="mb-4">
            The Leadership Mirror compares how you see yourself as a leader versus how your team actually experiences you. Every leader carries two versions:
          </p>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li><strong>What Leaders See:</strong> Intent, motivation, work ethic, vision, strategic reasoning, pressure, sacrifices, context</li>
            <li><strong>What Teams See:</strong> Behavior, tone, emotional regulation, communication patterns, stability, predictability, fairness, clarity, follow-through</li>
          </ul>
          <p className="mb-4">
            The Mirror compares leader intention with team experience across:
          </p>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li>Stability under pressure</li>
            <li>Predictability vs. reactivity</li>
            <li>Trust signals</li>
            <li>Clarity signals</li>
          </ul>
          <p className="mb-4">
            The Mirror is not a verdict—it's a calibration tool. It helps you see what your team sees so you can lead with precision. When teams feel heard, leaders gain influence, not resistance.
          </p>
          <p className="text-sm text-gray-600">
            This creates shared reality—the foundation of healthy, aligned cultures.
          </p>
        </div>
      )
    },
    'response-analytics': {
      title: 'Response Analytics',
      content: (
        <div>
          <p className="mb-4">
            Response Analytics tracks participation and engagement with your ALI surveys:
          </p>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li><strong>Total Responses:</strong> All survey responses collected since you started using ALI</li>
            <li><strong>This Quarter:</strong> Responses collected in the current quarter</li>
            <li><strong>Avg. Completion:</strong> Average time it takes team members to complete a survey</li>
            <li><strong>Response Rate:</strong> Percentage of invited team members who completed the survey</li>
          </ul>
          <p className="text-sm text-gray-600">
            Higher response rates and consistent participation give you more accurate data about how your leadership is experienced. Low response rates may indicate trust issues or survey fatigue.
          </p>
        </div>
      )
    },
    'historical-trends': {
      title: 'Historical Trends',
      content: (
        <div>
          <p className="mb-4">
            Historical Trends shows how all seven leadership patterns have changed over time. This view helps you:
          </p>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li>See long-term patterns and trends</li>
            <li>Identify which patterns are improving or declining</li>
            <li>Understand how patterns relate to each other</li>
            <li>Spot early warning signs of drift</li>
            <li>Track the impact of leadership changes</li>
          </ul>
          <p className="text-sm text-gray-600">
            Each line represents one of the seven patterns tracked by ALI. Trends over multiple quarters reveal whether your leadership environment is strengthening or weakening.
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
    }
  };

  // Mock data matching the API structure
  const mockData = {
    company: {
      id: 'company-123',
      name: 'Acme Corporation',
      subscription_status: 'active'
    },
    scores: {
      ali: { 
        current: 71.2, 
        rolling: 69.5, 
        zone: 'yellow',
        history: [
          { period: '2025 Q4', score: 64.3, responses: 18 },
          { period: '2026 Q1', score: 67.8, responses: 23 },
          { period: '2026 Q2', score: 69.2, responses: 21 },
          { period: '2027 Q1', score: 71.2, responses: 24 }
        ]
      },
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
      current: {
        x: 70.1,
        y: 69.6,
        zone: 'harmony'
      },
      previous: [
        { x: 68.5, y: 67.2, period: 'Q4 2025' },
        { x: 69.0, y: 68.0, period: 'Q1 2026' },
        { x: 69.5, y: 68.8, period: 'Q2 2026' }
      ]
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
    },
    insights: [
      {
        id: 'insight-1',
        icon: CheckCircle2,
        iconColor: 'text-green-600',
        title: 'Sustained Positive Movement',
        text: 'Consistent improvement across core patterns, with Clarity showing the strongest gains (+5.9%). Your leadership environment is strengthening.',
        priority: 'high'
      },
      {
        id: 'insight-2',
        icon: ArrowDown,
        iconColor: 'text-green-600',
        title: 'Trajectory Improving',
        text: 'Your leadership trajectory shows +2.8 improvement momentum. Conditions are moving in a positive direction across multiple dimensions.',
        priority: 'high'
      },
      {
        id: 'insight-3',
        icon: AlertTriangle,
        iconColor: 'text-yellow-600',
        title: 'Team Experience in Harmony Zone',
        text: 'Your team is experiencing leadership in the Harmony Zone—high clarity and trust. Maintain consistency to sustain this healthy state.',
        priority: 'medium'
      },
      {
        id: 'insight-4',
        icon: Sparkles,
        iconColor: 'text-blue-600',
        title: 'Guardian Profile Detected',
        text: 'Your leadership profile shows Guardian characteristics—high honesty and clarity. This is the healthiest leadership model for sustainable team performance.',
        priority: 'medium'
      }
    ]
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

  // Zone background colors and descriptions
  const getZoneInfo = (zone) => {
    const zones = {
      green: {
        bg: 'bg-green-100',
        border: 'border-green-300',
        text: 'text-green-800',
        label: 'Green Zone',
        description: 'Healthy, thriving leadership environment. Maintain consistency to sustain this level.'
      },
      yellow: {
        bg: 'bg-yellow-100',
        border: 'border-yellow-300',
        text: 'text-yellow-800',
        label: 'Yellow Zone',
        description: 'Stable but with room for improvement. Focus on strengthening core patterns to move toward Green Zone.'
      },
      orange: {
        bg: 'bg-orange-100',
        border: 'border-orange-300',
        text: 'text-orange-800',
        label: 'Orange Zone',
        description: 'Warning signs of drift and instability. Address core patterns to prevent further decline.'
      },
      red: {
        bg: 'bg-red-100',
        border: 'border-red-300',
        text: 'text-red-800',
        label: 'Red Zone',
        description: 'Critical issues requiring immediate attention. Focus on rebuilding trust and clarity.'
      }
    };
    return zones[zone] || zones.yellow;
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

  // Zone definitions for Team Experience Map
  const ZONES = {
    harmony: { label: 'Harmony', color: '#10b981' },
    strain: { label: 'Strain', color: '#f59e0b' },
    stress: { label: 'Stress', color: '#fb923c' },
    hazard: { label: 'Hazard', color: '#ef4444' }
  };
  const currentZone = mockData.experienceMap.current.zone;

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

        {/* PRIORITY 1: ALI Score - Standalone Hero Panel */}
        <section className="mb-8">
          <div className="bg-white rounded-lg border-2 border-gray-200 p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-gray-900">ALI Overall Score</h2>
                <button
                  onClick={() => setOpenDefinition('ali-score')}
                  className="text-gray-400 hover:text-blue-600 transition-colors"
                  aria-label="Learn about ALI Score"
                >
                  <HelpCircle className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Hero Score Display */}
            <div className="mb-6">
              <div className="flex items-baseline gap-4 mb-2">
                <div className="text-7xl font-bold text-blue-600">
                  {mockData.scores.ali.current.toFixed(1)}
                </div>
                <div className="text-xl text-gray-600 pt-2">
                  Rolling: {mockData.scores.ali.rolling.toFixed(1)}
                </div>
              </div>
            </div>

            {/* Score Progression Line Chart */}
            <div className="mb-6">
              <div className="h-64 relative bg-gray-50 rounded-lg p-4">
                <div className="absolute inset-0 p-4">
                  <svg className="w-full h-full" viewBox="0 0 400 160" preserveAspectRatio="none">
                    {/* Y-axis labels */}
                    <text x="5" y="20" className="text-xs fill-gray-500" fontSize="9">100</text>
                    <text x="5" y="60" className="text-xs fill-gray-500" fontSize="9">75</text>
                    <text x="5" y="100" className="text-xs fill-gray-500" fontSize="9">50</text>
                    <text x="5" y="140" className="text-xs fill-gray-500" fontSize="9">25</text>
                    <text x="5" y="160" className="text-xs fill-gray-500" fontSize="9">0</text>
                    
                    {/* Grid lines */}
                    <line x1="30" y1="20" x2="400" y2="20" stroke="#e5e7eb" strokeWidth="1" />
                    <line x1="30" y1="60" x2="400" y2="60" stroke="#e5e7eb" strokeWidth="1" />
                    <line x1="30" y1="100" x2="400" y2="100" stroke="#e5e7eb" strokeWidth="1" />
                    <line x1="30" y1="140" x2="400" y2="140" stroke="#e5e7eb" strokeWidth="1" />
                    
                    {/* Score line with animation */}
                    <polyline
                      points={mockData.scores.ali.history.map((point, idx) => {
                        const x = 40 + (idx * (360 / (mockData.scores.ali.history.length - 1)));
                        const animatedScore = animatedValues[`ali_score_${idx}`] ?? point.score;
                        const y = 160 - ((animatedScore / 100) * 140);
                        return `${x},${y}`;
                      }).join(' ')}
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        strokeDasharray: chartAnimated ? 'none' : '1000',
                        strokeDashoffset: chartAnimated ? '0' : '1000',
                        transition: 'stroke-dashoffset 1.5s ease-out'
                      }}
                    />
                    
                    {/* Data points */}
                    {mockData.scores.ali.history.map((point, idx) => {
                      const x = 40 + (idx * (360 / (mockData.scores.ali.history.length - 1)));
                      const animatedScore = animatedValues[`ali_score_${idx}`] ?? point.score;
                      const y = 160 - ((animatedScore / 100) * 140);
                      return (
                        <g key={idx}>
                          <circle
                            cx={x}
                            cy={y}
                            r="5"
                            fill="#2563eb"
                            stroke="white"
                            strokeWidth="2"
                            className="transition-all duration-1000"
                          />
                          {/* Score label */}
                          <text
                            x={x}
                            y={y - 10}
                            textAnchor="middle"
                            className="text-xs font-semibold fill-blue-600"
                            fontSize="11"
                          >
                            {animatedScore.toFixed(1)}
                          </text>
                        </g>
                      );
                    })}
                    
                    {/* Period labels */}
                    {mockData.scores.ali.history.map((point, idx) => {
                      const x = 40 + (idx * (360 / (mockData.scores.ali.history.length - 1)));
                      return (
                        <text
                          key={idx}
                          x={x}
                          y="175"
                          textAnchor="middle"
                          className="text-xs fill-gray-600 font-medium"
                          fontSize="10"
                        >
                          {point.period}
                        </text>
                      );
                    })}
                  </svg>
                </div>
              </div>
            </div>

            {/* Zone Indicator with Colored Background */}
            {(() => {
              const zoneInfo = getZoneInfo(mockData.scores.ali.zone);
              return (
                <div className={`${zoneInfo.bg} ${zoneInfo.border} rounded-lg border-2 p-6`}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-sm font-medium text-gray-600 mb-1">Current Zone</div>
                      <div className={`text-3xl font-bold ${zoneInfo.text} capitalize mb-2`}>
                        {zoneInfo.label}
                      </div>
                    </div>
                  </div>
                  <div className={`text-sm ${zoneInfo.text} leading-relaxed`}>
                    {zoneInfo.description}
                  </div>
                </div>
              );
            })()}
          </div>
        </section>

        {/* Supporting Metrics */}
        <section className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Trajectory */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="text-sm font-medium text-gray-600 mb-2">Trajectory</div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-4xl text-green-600">↑</span>
                <span className="text-4xl font-bold text-green-600">
                  +{mockData.trajectory.value.toFixed(1)}
                </span>
              </div>
              <div className="text-sm text-gray-500">Improving Momentum</div>
            </div>
          </div>
        </section>

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
              {mockData.insights.map((insight) => {
                const Icon = insight.icon;
                return (
                  <div 
                    key={insight.id}
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
                        <MessageSquareIcon className="w-3 h-3" />
                        Ask Archy about this
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Section 1: Four Core Score Cards */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Leadership Dashboard</h2>
            <button
              onClick={() => setOpenDefinition('core-scores')}
              className="text-gray-400 hover:text-blue-600 transition-colors"
              aria-label="Learn about Core Scores"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>
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
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium text-gray-600">Trajectory</div>
                  <button
                    onClick={() => setOpenDefinition('trajectory')}
                    className="text-gray-400 hover:text-blue-600 transition-colors"
                    aria-label="Learn about Trajectory"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </div>
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

        {/* Section 2: Team Experience Map - EXACT V0 SPECIFICATION */}
        <section className="mb-12">
          <div className="bg-white rounded-lg border border-black/[0.12] p-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-[22px] font-semibold text-black/[0.87]">Team Experience Map</h2>
                  <button
                    onClick={() => setOpenDefinition('team-experience-map')}
                    className="text-gray-400 hover:text-blue-600 transition-colors"
                    aria-label="Learn about Team Experience Map"
                  >
                    <HelpCircle className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-[13px] text-black/[0.6]">Current position in {ZONES[currentZone].label} Zone</p>
              </div>
              {!mockData.dataQuality.meets_minimum_n_org && (
                <div className="px-3 py-1.5 bg-[#f59e0b]/10 rounded-md text-[12px] font-medium text-[#f59e0b]">
                  Neutral view: &lt;10 responses
                </div>
              )}
            </div>

            {/* Experience Map Visualization - EXACT POSITIONING */}
            <div className="relative w-full aspect-square max-w-[600px] mx-auto">
              
              {/* Quadrant backgrounds - EXACT COLORS AND POSITIONS */}
              {mockData.dataQuality.meets_minimum_n_org && (
                <>
                  {/* Top-right: Harmony - Light teal */}
                  <div
                    className="absolute top-0 right-0 w-1/2 h-1/2"
                    style={{ backgroundColor: "rgba(16, 185, 129, 0.08)" }}
                  />
                  {/* Top-left: Strain - Light beige/tan */}
                  <div
                    className="absolute top-0 left-0 w-1/2 h-1/2"
                    style={{ backgroundColor: "rgba(245, 158, 11, 0.08)" }}
                  />
                  {/* Bottom-left: Stress - Light beige/tan */}
                  <div
                    className="absolute bottom-0 left-0 w-1/2 h-1/2"
                    style={{ backgroundColor: "rgba(251, 146, 60, 0.08)" }}
                  />
                  {/* Bottom-right: Hazard - Light pink/red */}
                  <div
                    className="absolute bottom-0 right-0 w-1/2 h-1/2"
                    style={{ backgroundColor: "rgba(239, 68, 68, 0.08)" }}
                  />
                </>
              )}

              {/* Grid lines - EXACT BORDER WIDTH AND COLOR */}
              <div className="absolute inset-0 border-2 border-black/[0.12] rounded-lg">
                {/* Horizontal center line */}
                <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-black/[0.12] -translate-y-1/2" />
                {/* Vertical center line */}
                <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-black/[0.12] -translate-x-1/2" />
              </div>

              {/* X-AXIS LABEL - BELOW CHART, CENTERED, OUTSIDE BORDER */}
              <div className="absolute left-0 right-0 text-center" style={{ bottom: "0.3rem" }}>
                <span className="text-[13px] font-medium text-black/[0.6]">
                  Clarity (Low → High)
                </span>
              </div>

              {/* Y-AXIS LABEL - LEFT OF CHART, CENTERED VERTICALLY, ROTATED 90° CCW, INSIDE BORDER */}
              <div 
                className="absolute top-1/2 origin-center"
                style={{ left: "-3rem", transform: "translateY(-50%) rotate(-90deg)" }}
              >
                <span className="text-[13px] font-medium text-black/[0.6] whitespace-nowrap">
                  (Stability + Trust) / 2
                </span>
              </div>

              {/* Threshold markers - EXACT POSITIONING AT 70/70 CROSSHAIRS */}
              <div 
                className="absolute text-[11px] text-black/[0.38] font-medium"
                style={{ bottom: "50%", left: "-24px", transform: "translateY(50%)" }}
              >
                70
              </div>
              <div 
                className="absolute text-[11px] text-black/[0.38] font-medium"
                style={{ left: "50%", bottom: "-20px", transform: "translateX(-50%)" }}
              >
                70
              </div>

              {/* Previous positions (trail) - SMALL GRAY DOTS */}
              {mockData.experienceMap.previous.map((point, idx) => (
                <div
                  key={idx}
                  className="absolute w-3 h-3 rounded-full bg-black/[0.2]"
                  style={{
                    left: `${point.x}%`,
                    bottom: `${point.y}%`,
                    transform: "translate(-50%, 50%)",
                  }}
                  title={`${point.period}: (${point.x}, ${point.y})`}
                />
              ))}

              {/* Connection line - DASHED LINE CONNECTING DOTS */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <polyline
                  points={[
                    ...mockData.experienceMap.previous.map((p) => `${p.x}%,${100 - p.y}%`),
                    `${mockData.experienceMap.current.x}%,${100 - mockData.experienceMap.current.y}%`,
                  ].join(" ")}
                  fill="none"
                  stroke="rgba(0,0,0,0.15)"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
              </svg>

              {/* Current position - LARGE DOT WITH ZONE COLOR */}
              <div
                className="absolute w-6 h-6 rounded-full shadow-lg z-10 flex items-center justify-center"
                style={{
                  left: `${mockData.experienceMap.current.x}%`,
                  bottom: `${mockData.experienceMap.current.y}%`,
                  transform: "translate(-50%, 50%)",
                  backgroundColor: ZONES[currentZone].color,
                }}
              >
                {/* White center dot */}
                <div className="w-3 h-3 rounded-full bg-white" />
              </div>

              {/* Zone labels - POSITIONED IN EACH QUADRANT CENTER */}
              {mockData.dataQuality.meets_minimum_n_org && (
                <>
                  {/* Harmony - Top-right quadrant */}
                  <div
                    className="absolute text-[14px] font-bold"
                    style={{ 
                      top: "25%", 
                      right: "25%", 
                      transform: "translate(50%, -50%)",
                      color: "#10b981"
                    }}
                  >
                    Harmony
                  </div>
                  {/* Strain - Top-left quadrant */}
                  <div
                    className="absolute text-[14px] font-bold"
                    style={{ 
                      top: "25%", 
                      left: "25%",
                      transform: "translate(-50%, -50%)",
                      color: "#f59e0b"
                    }}
                  >
                    Strain
                  </div>
                  {/* Stress - Bottom-left quadrant */}
                  <div
                    className="absolute text-[14px] font-bold"
                    style={{ 
                      bottom: "25%", 
                      left: "25%",
                      transform: "translate(-50%, 50%)",
                      color: "#fb923c"
                    }}
                  >
                    Stress
                  </div>
                  {/* Hazard - Bottom-right quadrant */}
                  <div
                    className="absolute text-[14px] font-bold"
                    style={{ 
                      bottom: "25%", 
                      right: "25%",
                      transform: "translate(50%, 50%)",
                      color: "#ef4444"
                    }}
                  >
                    Hazard
                  </div>
                </>
              )}
            </div>

            {/* Coordinates display below map */}
            <div className="mt-6 flex items-center justify-center gap-8 text-[13px] text-black/[0.6]">
              <div>
                Clarity: <span className="font-bold text-black/[0.87]">{mockData.experienceMap.current.x.toFixed(1)}</span>
              </div>
              <div>
                (Stability + Trust) / 2: <span className="font-bold text-black/[0.87]">{mockData.experienceMap.current.y.toFixed(1)}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Pattern Analysis */}
        <section className="mb-12">
          <div className="bg-white rounded-lg border border-gray-200 p-6 relative overflow-visible">
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-semibold text-gray-900">Pattern Analysis</h2>
                <button
                  onClick={() => setOpenDefinition('pattern-analysis')}
                  className="text-gray-400 hover:text-blue-600 transition-colors"
                  aria-label="Learn about Pattern Analysis"
                >
                  <HelpCircle className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-gray-600">7 leadership patterns • Rolling scores (4-survey average)</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative overflow-visible">
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
                    className="bg-white rounded-lg border border-gray-200 p-4 transition-all duration-200 hover:transform hover:-translate-y-1 hover:shadow-lg relative overflow-visible"
                    style={{ zIndex: hoveredPattern === pattern ? 50 : 1 }}
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
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg z-[9999] whitespace-nowrap pointer-events-none">
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
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Leadership Profile</h2>
                <button
                  onClick={() => setOpenDefinition('leadership-profile')}
                  className="text-gray-400 hover:text-blue-600 transition-colors"
                  aria-label="Learn about Leadership Profile"
                >
                  <HelpCircle className="w-5 h-5" />
                </button>
              </div>
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
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Leadership Mirror</h2>
                <button
                  onClick={() => setOpenDefinition('leadership-mirror')}
                  className="text-gray-400 hover:text-blue-600 transition-colors"
                  aria-label="Learn about Leadership Mirror"
                >
                  <HelpCircle className="w-5 h-5" />
                </button>
              </div>
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
          </div>
        </section>

        {/* Section 6: Historical Trends */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-gray-900">Historical Trends</h2>
              <button
                onClick={() => setOpenDefinition('historical-trends')}
                className="text-gray-400 hover:text-blue-600 transition-colors"
                aria-label="Learn about Historical Trends"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
            </div>
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
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Response Analytics</h2>
              <button
                onClick={() => setOpenDefinition('response-analytics')}
                className="text-gray-400 hover:text-blue-600 transition-colors"
                aria-label="Learn about Response Analytics"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
            </div>
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
        aria-label="Chat with Archy about your dashboard"
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
                  context="ali-dashboard" 
                  initialMessage={archyInitialMessage || "I'm looking at my ALI dashboard. Can you help me interpret what I'm seeing and answer questions about my leadership data?"}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ALIDashboard;
