import React, { useState, useEffect, useRef } from 'react';
import { Lightbulb, Scale, Handshake, MessageSquare, Compass, Shield, BarChart3, Info, HelpCircle, CheckCircle2, ArrowDown, AlertTriangle, Sparkles, MessageSquare as MessageSquareIcon, Bell, Zap, Activity, TrendingUp, Send, Share2, Calendar, Clock } from 'lucide-react';
import DefinitionModal from '../../components/ali/DefinitionModal';
import ChatApp from '../../app/ChatApp';
import AliHeader from '../../components/ali/AliHeader';
import AliFooter from '../../components/ali/AliFooter';

const ALIDashboard = () => {
  const [expandedZone, setExpandedZone] = useState(null);
  const [expandedProfile, setExpandedProfile] = useState(false);
  const [mirrorShowAll, setMirrorShowAll] = useState(false);
  const [hoveredPattern, setHoveredPattern] = useState(null);
  const [hoveredMetric, setHoveredMetric] = useState(null);
  const [hoveredChartPoint, setHoveredChartPoint] = useState(null);
  const [animatedValues, setAnimatedValues] = useState({});
  const [chartAnimated, setChartAnimated] = useState(false);
  const [openDefinition, setOpenDefinition] = useState(null);
  const [showArchyChat, setShowArchyChat] = useState(false);
  const [archyInitialMessage, setArchyInitialMessage] = useState(null);
  const [liveDashboard, setLiveDashboard] = useState(null);
  const [liveDashboardError, setLiveDashboardError] = useState(null);
  const [liveDashboardLoadedOnce, setLiveDashboardLoadedOnce] = useState(false);
  // Zone modal removed (Zones page is the single source of truth)
  const chartRef = useRef(null);

  const handleNavigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Preserve magic-link email across ALI app navigation (used for role-aware links)
  const urlParams = new URLSearchParams(window.location.search);
  const emailParam = urlParams.get('email');
  const storedEmail = (() => {
    try {
      return localStorage.getItem('ali_email') || '';
    } catch {
      return '';
    }
  })();
  const emailRaw = (emailParam || storedEmail || '').toString();
  const email = emailRaw ? emailRaw.toLowerCase().trim() : '';
  const isSuperAdminUser = !!email && email.endsWith('@archetypeoriginal.com');
  const withEmail = (path) => {
    if (!email) return path;
    if (!path || typeof path !== 'string') return path;
    if (path.includes('email=')) return path;
    const joiner = path.includes('?') ? '&' : '?';
    return `${path}${joiner}email=${encodeURIComponent(email)}`;
  };

  // Persist email so deep-links like /ali/dashboard (without query params) still load live data
  useEffect(() => {
    if (!emailParam) return;
    try {
      if (email) localStorage.setItem('ali_email', email);
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailParam]);

  // Fallback counts (match the embedded mock data below) so we can safely compute
  // display values before the big mock object is initialized.
  const FALLBACK_RESPONSE_COUNTS = {
    overall: 86,
    thisQuarter: 24
  };

  const pickNumber = (value, fallback) => {
    return (typeof value === 'number' && Number.isFinite(value)) ? value : fallback;
  };

  // Leadership Mirror helpers (keep consistent with /ali/reports/mirror and Zones naming)
  const mirrorKeyToLabel = (k) => {
    if (!k) return '—';
    if (k === 'leadership_drift') return 'Leadership Alignment';
    if (k === 'ali') return 'ALI Overall';
    const words = String(k)
      .replace(/_/g, ' ')
      .split(' ')
      .filter(Boolean);
    return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const MIRROR_METRIC_ORDER = ['ali', 'clarity', 'consistency', 'trust', 'communication', 'alignment', 'stability', 'leadership_drift'];

  // Lightweight number animation helper (used when live data loads)
  const animateNumber = (key, start, end, duration = 800) => {
    const startTime = performance.now();
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const current = start + (end - start) * easeOutQuart;
      setAnimatedValues(prev => ({ ...prev, [key]: current }));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  };

  // Fetch live dashboard data (fallback to mock if email is missing or API errors)
  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      if (!email) return;
      try {
        setLiveDashboardError(null);
        const resp = await fetch(`/api/ali/dashboard?email=${encodeURIComponent(email)}`);
        const json = await resp.json();
        if (!resp.ok) {
          throw new Error(json?.error || 'Failed to load dashboard');
        }
        if (!isMounted) return;
        setLiveDashboard(json);
        setLiveDashboardLoadedOnce(true);
      } catch (err) {
        if (!isMounted) return;
        setLiveDashboard(null);
        setLiveDashboardError(err?.message || 'Failed to load dashboard');
        setLiveDashboardLoadedOnce(true);
      }
    };
    run();
    return () => {
      isMounted = false;
    };
  }, [email]);

  // Derive live counts (what the user is currently validating)
  const getQuarterFromDate = (d) => {
    const month = d.getMonth() + 1;
    if (month >= 1 && month <= 3) return 'Q1';
    if (month >= 4 && month <= 6) return 'Q2';
    if (month >= 7 && month <= 9) return 'Q3';
    return 'Q4';
  };

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentQuarter = getQuarterFromDate(now);

  const liveThisQuarterResponses = (() => {
    const surveys = liveDashboard?.surveys;
    if (!Array.isArray(surveys)) return null;
    return surveys
      .filter(s => s?.year === currentYear && s?.quarter === currentQuarter)
      .reduce((sum, s) => sum + (Number(s?.response_count) || 0), 0);
  })();

  const responseOverallTarget = liveDashboard?.responseCounts?.overall ?? FALLBACK_RESPONSE_COUNTS.overall;
  const responseThisQuarterTarget = liveThisQuarterResponses ?? FALLBACK_RESPONSE_COUNTS.thisQuarter;

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
        // For Leadership Drift, reverse the scale (100 - drift = alignment)
        const displayValue = key === 'leadership_drift' ? (100 - value.rolling) : value.rolling;
        animateValue(`pattern_${key}`, 0, displayValue, 1200);
      });

      // Trajectory is only meaningful after more than one survey cycle.
      // We'll animate it only if live data provides a value; otherwise leave as "—".
      if (typeof dashboardData?.trajectory?.value === 'number') {
        animateValue('trajectory', 0, dashboardData.trajectory.value, 1000);
      }
      animateValue('honesty', 0, mockData.leadershipProfile.honesty.score, 1000);
      animateValue('clarity_level', 0, mockData.leadershipProfile.clarity.level, 1000);
      animateValue('response_overall', 0, responseOverallTarget, 800);
      animateValue('response_quarter', 0, responseThisQuarterTarget, 800);
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

  // When live counts arrive, re-animate the response counters to the real values
  useEffect(() => {
    if (!liveDashboard) return;
    const currentOverall = Number(animatedValues.response_overall ?? FALLBACK_RESPONSE_COUNTS.overall);
    const currentQuarterCount = Number(animatedValues.response_quarter ?? FALLBACK_RESPONSE_COUNTS.thisQuarter);
    animateNumber('response_overall', currentOverall, Number(responseOverallTarget), 700);
    animateNumber('response_quarter', currentQuarterCount, Number(responseThisQuarterTarget), 700);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveDashboard, responseOverallTarget, responseThisQuarterTarget]);

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
            The Team Experience Map is a quick lens. It uses two high-signal ingredients to answer one question:
            <span className="font-semibold"> “What kind of environment is my team experiencing right now?”</span>
          </p>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li>
              <strong>X-axis (Clarity):</strong> Do people know what matters, what “good” looks like, and what to do next?
            </li>
            <li>
              <strong>Y-axis ((Stability + Trust) / 2):</strong> Does it feel safe and steady enough to operate without second-guessing or self-protection?
            </li>
          </ul>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li><strong>Why these axes:</strong> Clarity + (Stability/Trust) are the fastest way to tell whether work feels aligned and safe, or strained and fragile.</li>
            <li><strong>What it is not:</strong> It is not the full 7-test “system picture.” It’s a quick read on the lived environment.</li>
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
    'leadership-system-map': {
      title: 'Leadership System Map',
      content: (
        <div>
          <p className="mb-4">
            The Leadership System Map shows the full 7-test picture. It’s designed to be diagnostic, not decorative.
          </p>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li><strong>Radar (System Profile):</strong> A summary shape of the system across all 7 tests (Leader vs Team vs Overall).</li>
            <li><strong>Heatmap (Diagnostic truth):</strong> Individual responses across all 7 tests so you can see spread, clusters, and mismatches.</li>
          </ul>
          <p className="text-sm text-gray-600">
            Note: “Leadership Alignment” is shown as <span className="font-semibold">100 − drift</span> so higher always means healthier across all tests.
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
            <li><strong>Leadership Alignment:</strong> How well actions match stated values (higher is better, displayed as 100 - drift)</li>
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
      }
    ],
    alerts: [
      {
        id: 'alert-1',
        type: 'warning',
        title: 'Response Rate Below Target',
        message: 'Current response rate is 92%. Consider sending a reminder to increase participation.',
        action: 'Send Reminder',
        priority: 'medium'
      }
    ],
    recentActivity: [
      { id: 'act-1', type: 'survey_completed', message: 'Q1 2027 survey completed', timestamp: '2 days ago', scoreChange: '+1.7' },
      { id: 'act-2', type: 'score_improvement', message: 'ALI score improved to 71.2', timestamp: '5 days ago', scoreChange: '+2.1' },
      { id: 'act-3', type: 'survey_deployed', message: 'Q1 2027 survey deployed', timestamp: '1 week ago', scoreChange: null },
      { id: 'act-4', type: 'insight_generated', message: 'New insight: Sustained Positive Movement', timestamp: '1 week ago', scoreChange: null }
    ],
    lastQuarterComparison: {
      ali: { current: 71.2, previous: 69.2, change: 2.0 },
      alignment: { current: 76.3, previous: 72.1, change: 4.2 },
      stability: { current: 71.3, previous: 68.5, change: 2.8 },
      clarity: { current: 78.8, previous: 73.2, change: 5.6 }
    }
  };

  // Live dashboard overlay
  // IMPORTANT: When live data is present but incomplete (e.g., first survey / <10 org responses),
  // we should NOT show fake historical metrics. In that case we prefer showing "—" / neutral states.
  const dashboardData = (() => {
    if (!liveDashboard) return mockData;

    const liveScores = liveDashboard.scores || {};
    const liveALI = liveScores.ali || {};
    const liveAnchors = liveScores.anchors || {};
    const livePatterns = liveScores.patterns || {};
    const liveDataQuality = liveDashboard.dataQuality || {};

    const liveMode = true;
    const dqOrgOk = !!liveDataQuality.meets_minimum_n_org;

    const getPattern = (key) => {
      const lp = livePatterns[key] || {};
      return {
        current: liveMode ? (typeof lp.current === 'number' ? lp.current : null) : pickNumber(lp.current, mockData.scores.patterns[key]?.current),
        rolling: liveMode ? (typeof lp.rolling === 'number' ? lp.rolling : null) : pickNumber(lp.rolling, mockData.scores.patterns[key]?.rolling)
      };
    };

    const aliCurrent = liveMode ? (typeof liveALI.current === 'number' ? liveALI.current : null) : pickNumber(liveALI.current, mockData.scores.ali.current);
    const aliRolling = liveMode ? (typeof liveALI.rolling === 'number' ? liveALI.rolling : null) : pickNumber(liveALI.rolling, mockData.scores.ali.rolling);
    const aliZone = liveMode ? (liveALI.zone || null) : (liveALI.zone || mockData.scores.ali.zone);

    const history = Array.isArray(liveDashboard.historicalTrends) && liveDashboard.historicalTrends.length > 0
      ? liveDashboard.historicalTrends
          .filter(p => !!p?.period)
          .map((p) => ({
            period: String(p.period).replace('-', ' '),
            score: (typeof p.ali === 'number' ? p.ali : (aliCurrent ?? 0)),
            responses: 0
          }))
      : (liveMode ? [] : mockData.scores.ali.history);

    const liveCore = liveDashboard.coreScores || {};
    const coreAlignmentRolling = liveMode ? (typeof liveCore.alignment === 'number' ? liveCore.alignment : null) : pickNumber(liveCore.alignment, mockData.coreScores.alignment.rolling);
    const coreStabilityRolling = liveMode ? (typeof liveCore.stability === 'number' ? liveCore.stability : null) : pickNumber(liveCore.stability, mockData.coreScores.stability.rolling);
    const coreClarityRolling = liveMode ? (typeof liveCore.clarity === 'number' ? liveCore.clarity : null) : pickNumber(liveCore.clarity, mockData.coreScores.clarity.rolling);

    const patternAlignment = getPattern('alignment');
    const patternStability = getPattern('stability');
    const patternClarity = getPattern('clarity');

    const exp = liveDashboard.experienceMap || null;
    const expCurrent = exp && typeof exp === 'object'
      ? {
          x: (typeof exp.x === 'number' ? exp.x : null),
          y: (typeof exp.y === 'number' ? exp.y : null),
          zone: exp.zone || null
        }
      : (liveMode ? { x: null, y: null, zone: null } : mockData.experienceMap.current);

    const lp = liveDashboard.leadershipProfile || {};
    const lm = liveDashboard.leadershipMirror || {};
    const trajectory = liveDashboard.trajectory || {};

    return {
      ...mockData,
      company: {
        ...mockData.company,
        id: liveDashboard.company?.id || mockData.company.id,
        name: liveDashboard.company?.name || mockData.company.name,
        subscription_status: liveDashboard.company?.subscription_status || mockData.company.subscription_status
      },
      scores: {
        ...mockData.scores,
        ali: {
          ...mockData.scores.ali,
          current: aliCurrent,
          rolling: aliRolling,
          zone: aliZone,
          history
        },
        anchors: {
          ...mockData.scores.anchors,
          current: (typeof liveAnchors.current === 'number' ? liveAnchors.current : null),
          rolling: (typeof liveAnchors.rolling === 'number' ? liveAnchors.rolling : null)
        },
        patterns: {
          ...mockData.scores.patterns,
          clarity: getPattern('clarity'),
          consistency: getPattern('consistency'),
          trust: getPattern('trust'),
          communication: getPattern('communication'),
          alignment: getPattern('alignment'),
          stability: getPattern('stability'),
          leadership_drift: getPattern('leadership_drift')
        }
      },
      coreScores: {
        ...mockData.coreScores,
        alignment: {
          rolling: coreAlignmentRolling,
          current: patternAlignment.current,
          trend: (typeof patternAlignment.current === 'number' && typeof coreAlignmentRolling === 'number')
            ? (patternAlignment.current - coreAlignmentRolling)
            : null
        },
        stability: {
          rolling: coreStabilityRolling,
          current: patternStability.current,
          trend: (typeof patternStability.current === 'number' && typeof coreStabilityRolling === 'number')
            ? (patternStability.current - coreStabilityRolling)
            : null
        },
        clarity: {
          rolling: coreClarityRolling,
          current: patternClarity.current,
          trend: (typeof patternClarity.current === 'number' && typeof coreClarityRolling === 'number')
            ? (patternClarity.current - coreClarityRolling)
            : null
        }
      },
      trajectory: {
        ...mockData.trajectory,
        value: (typeof trajectory.value === 'number' ? trajectory.value : null),
        direction: trajectory.direction || null,
        magnitude: (typeof trajectory.magnitude === 'number' ? trajectory.magnitude : null),
        method: trajectory.method || null
      },
      experienceMap: {
        ...mockData.experienceMap,
        current: expCurrent,
        previous: []
      },
      leadershipProfile: {
        ...mockData.leadershipProfile,
        profile: lp.profile || 'profile_forming',
        honesty: {
          score: (typeof lp?.honesty?.score === 'number' ? lp.honesty.score : null),
          state: lp?.honesty?.state || null
        },
        clarity: {
          level: (typeof lp?.clarity?.level === 'number' ? lp.clarity.level : null),
          stddev: (typeof lp?.clarity?.stddev === 'number' ? lp.clarity.stddev : null),
          state: lp?.clarity?.state || null
        }
      },
      leadershipMirror: {
        ...mockData.leadershipMirror,
        gaps: lm.gaps || {},
        severity: lm.severity || {},
        leaderScores: lm.leaderScores || {},
        teamScores: lm.teamScores || {}
      },
      responseCounts: {
        ...mockData.responseCounts,
        overall: typeof liveDashboard?.responseCounts?.overall === 'number' ? liveDashboard.responseCounts.overall : null,
        // For pilots (single deployment), "this quarter" is equivalent to overall responses returned by the API.
        thisQuarter: typeof liveDashboard?.responseCounts?.overall === 'number' ? liveDashboard.responseCounts.overall : null,
        leader: typeof liveDashboard?.responseCounts?.leader === 'number' ? liveDashboard.responseCounts.leader : null,
        team_member: typeof liveDashboard?.responseCounts?.team_member === 'number' ? liveDashboard.responseCounts.team_member : null,
        avgCompletion: null,
        responseRate: null
      },
      dataQuality: {
        ...mockData.dataQuality,
        meets_minimum_n_org: dqOrgOk,
        meets_minimum_n_team: !!liveDataQuality.meets_minimum_n_team,
        meets_minimum_n: !!liveDataQuality.meets_minimum_n,
        response_count: typeof liveDataQuality.response_count === 'number' ? liveDataQuality.response_count : null,
        data_quality_banner: !!liveDataQuality.data_quality_banner
      }
    };
  })();

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

  // Leadership System Map (7-test capstone)
  const SYSTEM_KEYS = ['clarity', 'consistency', 'trust', 'communication', 'alignment', 'stability', 'leadership_drift'];
  const systemKeyToLabel = (k) => {
    if (!k) return '—';
    if (k === 'leadership_drift') return 'Leadership Alignment';
    const words = String(k).replace(/_/g, ' ').split(' ').filter(Boolean);
    return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
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

  const profileDescriptions = {
    guardian: 'High Honesty • High Clarity. The healthiest leadership model—stable, safe, aligned.',
    aspirer: 'High Honesty • Unstable Clarity. Well-intentioned but clarity slips under stress.',
    protector: 'Selective Honesty • High Clarity. Communicates well but edits truth to protect.',
    producer_leader: 'Courageous Honesty • Ambiguous Clarity. Works hard, tells truth, but vague due to overload.',
    stabilizer: 'Selective Honesty • Unstable Clarity. Keeps peace but unintentionally confuses team.',
    operator: 'Protective Honesty • Ambiguous Clarity. Well-meaning but exhausted and unequipped.',
    profile_forming: 'Profile still forming. Complete more surveys to see your leadership archetype.'
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
  const currentZone = dashboardData.experienceMap.current.zone;
  const fmt1 = (v) => (typeof v === 'number' && Number.isFinite(v) ? v.toFixed(1) : '—');
  const fmtSigned1 = (v) => (typeof v === 'number' && Number.isFinite(v) ? `${v >= 0 ? '+' : ''}${v.toFixed(1)}` : '—');

  // If trajectory is not available in live mode (Survey 1), ensure we don't show a stale animated value.
  useEffect(() => {
    if (!liveDashboard) return;
    if (typeof dashboardData?.trajectory?.value === 'number') return;
    setAnimatedValues(prev => ({ ...prev, trajectory: undefined }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveDashboard]);

  // Fetch Archy-generated recommended first move for the current zone (corpus-aware)
  // Zone modal removed — recommendations live on the Zones report page.

  // Stop the confusing “demo data flash”:
  // If email is present, we wait for the live fetch before rendering the full dashboard.
  const isLoadingLive = !!email && !liveDashboardLoadedOnce;

  // If email is missing entirely, do not show demo/sample dashboard.
  // Prompt user to log in via magic link.
  if (!email) {
    return (
      <div className="min-h-screen bg-white">
        <AliHeader active="dashboard" email="" isSuperAdminUser={false} onNavigate={handleNavigate} />
        <main className="container mx-auto px-4 py-10 max-w-2xl">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Leadership Dashboard</h1>
          <p className="text-gray-600 mb-6">Please log in via magic link to view your live dashboard.</p>
          <button
            onClick={() => handleNavigate('/ali/login')}
            className="inline-flex items-center justify-center px-5 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </button>
        </main>
        <AliFooter />
      </div>
    );
  }

  if (isLoadingLive) {
    return (
      <div className="min-h-screen bg-white">
        <AliHeader active="dashboard" email={email} isSuperAdminUser={isSuperAdminUser} onNavigate={handleNavigate} />

        <main className="container mx-auto px-4 py-10 max-w-7xl">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Leadership Dashboard</h1>
          <p className="text-gray-600">Loading your live dashboard…</p>
        </main>
        <AliFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
      <AliHeader active="dashboard" email={email} isSuperAdminUser={isSuperAdminUser} onNavigate={handleNavigate} />

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Leadership Dashboard</h1>
          <p className="text-gray-600">
            {Math.round(animatedValues.response_quarter ?? responseThisQuarterTarget)} responses this quarter • Rolling scores (4-survey average)
            {liveDashboardError ? (
              <span className="ml-2 text-xs text-red-600">(live data unavailable: {liveDashboardError})</span>
            ) : liveDashboard ? (
              <span className="ml-2 text-xs text-green-600">(live)</span>
            ) : null}
          </p>
        </div>

        {/* ALI OVERALL SCORE HERO SECTION - 3 Columns */}
        <div className="mb-8">
          <div className="grid grid-cols-3 gap-4 mb-4">
            
            {/* Column 1: ALI Score */}
            <div 
              className="bg-white rounded-lg border border-black/[0.12] p-6 cursor-pointer hover:shadow-lg transition-all"
              onClick={() => {
                handleNavigate(withEmail('/ali/reports'));
                // Scroll to multi-year progression after navigation
                setTimeout(() => {
                  const element = document.getElementById('multi-year-progression');
                  if (element) element.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-[15px] font-semibold text-black/[0.6] uppercase tracking-wide">
                  ALI OVERALL SCORE
                </h2>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenDefinition('ali-score');
                  }}
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
                  {fmt1(dashboardData.scores.ali.current)}
                </div>
                <div className="text-[16px] text-black/[0.6] pb-2">
                  Rolling: <span className="font-semibold text-black/[0.87]">{fmt1(dashboardData.scores.ali.rolling)}</span>
                </div>
              </div>
            </div>

            {/* Column 2: Current Zone */}
            {(() => {
              const zoneInfo = dashboardData.scores.ali.zone ? getZoneInfo(dashboardData.scores.ali.zone) : null;
              return (
                <div 
                  className="rounded-lg border-2 p-6 cursor-pointer hover:shadow-lg transition-all"
                  style={{
                    backgroundColor: zoneInfo ? `${zoneInfo.color}15` : 'rgba(0,0,0,0.04)',
                    borderColor: zoneInfo ? zoneInfo.color : 'rgba(0,0,0,0.12)'
                  }}
                  onClick={() => {
                    handleNavigate(withEmail('/ali/reports/zones'));
                  }}
                >
                  <div className="text-[11px] font-medium text-black/[0.6] uppercase tracking-wide mb-2">
                    CURRENT ZONE
                  </div>
                  <div 
                    className="text-[22px] font-bold mb-3"
                    style={{ color: zoneInfo ? zoneInfo.color : 'rgba(0,0,0,0.6)' }}
                  >
                    {zoneInfo ? zoneInfo.label : '—'}
                  </div>
                  <p className="text-[14px] leading-relaxed" style={{ color: zoneInfo ? zoneInfo.color : 'rgba(0,0,0,0.6)' }}>
                    {zoneInfo ? zoneInfo.description : 'Zone will appear once enough data is available.'}
                  </p>
                  <div className="mt-3 text-[12px] font-semibold text-[#2563eb]">
                    Open Zones guide →
                  </div>
                </div>
              );
            })()}

            {/* Column 3: Trajectory */}
            <div 
              className="bg-white rounded-lg border border-black/[0.12] p-6 cursor-pointer hover:shadow-lg transition-all"
              onClick={() => {
                handleNavigate(withEmail('/ali/reports'));
                setTimeout(() => {
                  const element = document.getElementById('multi-year-progression');
                  if (element) element.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
            >
              <div className="text-[11px] font-medium text-black/[0.6] uppercase tracking-wide mb-2">
                TRAJECTORY
              </div>
              <div className="flex items-center gap-3 mb-2">
                <svg className="w-6 h-6 text-[#10b981]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span className="text-[32px] font-bold text-[#10b981]">
                  {fmtSigned1(dashboardData.trajectory.value)}
                </span>
              </div>
              <p className="text-[14px] text-black/[0.6]">
                {dashboardData.trajectory.direction ? (dashboardData.trajectory.direction === 'improving' ? 'Improving' : dashboardData.trajectory.direction === 'declining' ? 'Declining' : 'Stable') : '—'} Momentum
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
              {(liveDashboard?.insights && liveDashboard.insights.length > 0) ? liveDashboard.insights.map((insight) => {
                const title = insight.title || 'Insight';
                const text = insight.text || '';
                return (
                  <div
                    key={insight.id || title}
                    className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all cursor-pointer group"
                    onClick={() => {
                      setArchyInitialMessage(`I'm looking at this insight: "${title}". ${text} Can you help me understand what this means and what I should do about it?`);
                      setShowArchyChat(true);
                    }}
                  >
                    <div className="w-2 h-2 rounded-full bg-blue-600 mt-2 flex-shrink-0"></div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 mb-1">
                        {title}
                      </div>
                      <div className="text-sm text-gray-700">
                        {text}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setArchyInitialMessage(`Tell me more about: "${title}". ${text}`);
                          setShowArchyChat(true);
                        }}
                        className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        <MessageSquareIcon className="w-3 h-3" />
                        Ask Archy about this
                      </button>
                    </div>
                  </div>
                );
              }) : null}

              {!liveDashboard ? mockData.insights.map((insight) => {
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
              }) : null}
            </div>
          </div>
        </section>

        {/* Status Alert Panel */}
        {!liveDashboard && mockData.alerts && mockData.alerts.length > 0 && (
          <section className="mb-8">
            <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-lg p-4">
              <div className="flex items-start">
                <Bell className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-yellow-800 mb-1">
                    {mockData.alerts[0].title}
                  </h3>
                  <p className="text-sm text-yellow-700 mb-3">
                    {mockData.alerts[0].message}
                  </p>
                  <button className="text-sm font-medium text-yellow-800 hover:text-yellow-900 underline">
                    {mockData.alerts[0].action} →
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Section 1: Four Core Score Cards - MOVED UP */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Core Scores</h2>
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
                  <span>{fmtSigned1(dashboardData.coreScores.alignment.trend)}</span>
                </div>
              </div>
              <div className="text-4xl font-bold mb-2 text-orange-500 transition-all duration-300">
                {fmt1(animatedValues.core_alignment ?? dashboardData.coreScores.alignment.rolling)}
              </div>
              <div className="mb-3">
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 transition-all duration-1000 ease-out"
                    style={{ width: `${Math.min(Math.max(animatedValues.core_alignment ?? 0, 0), 100)}%` }}
                  ></div>
                </div>
              </div>
              <div className="text-xs text-gray-500">Current: {fmt1(dashboardData.coreScores.alignment.current)}</div>
              {hoveredMetric === 'alignment' && (
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg z-[100] whitespace-nowrap">
                  Rolling: {fmt1(dashboardData.coreScores.alignment.rolling)}<br/>
                  Current: {fmt1(dashboardData.coreScores.alignment.current)}<br/>
                  Trend: {fmtSigned1(dashboardData.coreScores.alignment.trend)}
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
                  <span>{fmtSigned1(dashboardData.coreScores.stability.trend)}</span>
                </div>
              </div>
              <div className="text-4xl font-bold mb-2 text-yellow-500 transition-all duration-300">
                {fmt1(animatedValues.core_stability ?? dashboardData.coreScores.stability.rolling)}
              </div>
              <div className="mb-3">
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-500 transition-all duration-1000 ease-out"
                    style={{ width: `${Math.min(Math.max(animatedValues.core_stability ?? 0, 0), 100)}%` }}
                  ></div>
                </div>
              </div>
              <div className="text-xs text-gray-500">Current: {fmt1(dashboardData.coreScores.stability.current)}</div>
              {hoveredMetric === 'stability' && (
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg z-[100] whitespace-nowrap">
                  Rolling: {fmt1(dashboardData.coreScores.stability.rolling)}<br/>
                  Current: {fmt1(dashboardData.coreScores.stability.current)}<br/>
                  Trend: {fmtSigned1(dashboardData.coreScores.stability.trend)}
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
                  <span>{fmtSigned1(dashboardData.coreScores.clarity.trend)}</span>
                </div>
              </div>
              <div className="text-4xl font-bold mb-2 text-green-500 transition-all duration-300">
                {fmt1(animatedValues.core_clarity ?? dashboardData.coreScores.clarity.rolling)}
              </div>
              <div className="mb-3">
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-1000 ease-out"
                    style={{ width: `${Math.min(Math.max(animatedValues.core_clarity ?? 0, 0), 100)}%` }}
                  ></div>
                </div>
              </div>
              <div className="text-xs text-gray-500">Current: {fmt1(dashboardData.coreScores.clarity.current)}</div>
              {hoveredMetric === 'clarity' && (
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg z-[100] whitespace-nowrap">
                  Rolling: {fmt1(dashboardData.coreScores.clarity.rolling)}<br/>
                  Current: {fmt1(dashboardData.coreScores.clarity.current)}<br/>
                  Trend: {fmtSigned1(dashboardData.coreScores.clarity.trend)}
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
                  {fmtSigned1(dashboardData.trajectory.value)}
                </span>
              </div>
              <div className="text-sm font-medium text-green-600">
                {dashboardData.trajectory.direction ? (dashboardData.trajectory.direction === 'improving' ? 'Improving Momentum' : dashboardData.trajectory.direction === 'declining' ? 'Declining Momentum' : 'Stable') : '—'}
              </div>
              {hoveredMetric === 'trajectory' && (
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg z-[100] whitespace-nowrap">
                  Value: {fmtSigned1(dashboardData.trajectory.value)}<br/>
                  Direction: {dashboardData.trajectory.direction || '—'}<br/>
                  Method: {dashboardData.trajectory.method || '—'}
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Section 2: Leadership System Map (capstone) */}
        <section className="mb-12">
          <div className="bg-white rounded-lg border border-black/[0.12] p-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-[22px] font-semibold text-black/[0.87]">Leadership System Map</h2>
                  <button
                    onClick={() => setOpenDefinition('leadership-system-map')}
                    className="text-gray-400 hover:text-blue-600 transition-colors"
                    aria-label="Learn about Leadership System Map"
                  >
                    <HelpCircle className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-[13px] text-black/[0.6]">
                  The full 7-test diagnostic view (summary shape + individual response pattern).
                </p>
              </div>
              {!dashboardData.dataQuality?.meets_minimum_n_org && (
                <div className="px-3 py-1.5 bg-[#f59e0b]/10 rounded-md text-[12px] font-medium text-[#f59e0b]">
                  Early signal: &lt;10 responses
                </div>
              )}
            </div>

            {(() => {
              const liveSystem = liveDashboard?.systemMap || null;
              const summary = liveSystem?.summary || null;
              const respondents = Array.isArray(liveSystem?.respondents) ? liveSystem.respondents : [];

              const fallbackSummary = {
                overall: {
                  clarity: dashboardData.scores.patterns.clarity?.current ?? null,
                  consistency: dashboardData.scores.patterns.consistency?.current ?? null,
                  trust: dashboardData.scores.patterns.trust?.current ?? null,
                  communication: dashboardData.scores.patterns.communication?.current ?? null,
                  alignment: dashboardData.scores.patterns.alignment?.current ?? null,
                  stability: dashboardData.scores.patterns.stability?.current ?? null,
                  leadership_drift: (typeof dashboardData.scores.patterns.leadership_drift?.current === 'number')
                    ? (100 - dashboardData.scores.patterns.leadership_drift.current)
                    : null
                },
                leader: null,
                team_member: null
              };

              const s = summary || fallbackSummary;
              const overall = s?.overall || {};
              const leader = s?.leader || {};
              const team = s?.team_member || {};

              // --- Radar geometry ---
              const W = 320;
              const H = 260;
              const cx = 160;
              const cy = 130;
              const rMax = 95;
              const toPoint = (idx, value) => {
                const angle = (-Math.PI / 2) + (idx * (2 * Math.PI / SYSTEM_KEYS.length));
                const v = (typeof value === 'number' && Number.isFinite(value)) ? Math.max(0, Math.min(100, value)) : 0;
                const rr = (v / 100) * rMax;
                return { x: cx + rr * Math.cos(angle), y: cy + rr * Math.sin(angle) };
              };
              const toAxis = (idx, rr) => {
                const angle = (-Math.PI / 2) + (idx * (2 * Math.PI / SYSTEM_KEYS.length));
                return { x: cx + rr * Math.cos(angle), y: cy + rr * Math.sin(angle) };
              };
              const polyPoints = (obj) => SYSTEM_KEYS.map((k, i) => {
                const p = toPoint(i, obj?.[k]);
                return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
              }).join(' ');

              const hasLeaderTeam = SYSTEM_KEYS.some((k) => typeof leader?.[k] === 'number') && SYSTEM_KEYS.some((k) => typeof team?.[k] === 'number');

              // --- Heatmap rows ---
              const leaderRows = respondents.filter((r) => r?.role === 'leader');
              const teamRows = respondents.filter((r) => r?.role === 'team_member');
              const makeRowLabel = (role, idx) => (role === 'leader' ? `Leader ${idx + 1}` : `Team ${idx + 1}`);

              const fmt0 = (v) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : null);

              return (
                <div className="grid grid-cols-1 gap-6">
                  {/* Radar summary */}
                  <div className="bg-white rounded-lg border border-black/[0.12] p-6">
                    <div className="flex items-end justify-between gap-4 mb-4">
                      <div>
                        <div className="text-[16px] font-semibold text-black/[0.87]">7‑Test Snapshot</div>
                        <div className="text-[13px] text-black/[0.6] mt-1">Overall vs Leader vs Team (0–100; higher is healthier).</div>
                      </div>
                      <div className="text-[11px] text-black/[0.38]">Center = 0 • Outer ring = 100</div>
                    </div>

                    <div className="flex items-center justify-center">
                      <svg className="w-full max-w-[560px] h-auto" viewBox={`0 0 ${W} ${H}`}>
                        {/* Rings */}
                        {[20, 40, 60, 80, 100].map((t) => (
                          <circle
                            key={t}
                            cx={cx}
                            cy={cy}
                            r={(t / 100) * rMax}
                            fill="none"
                            stroke="rgba(0,0,0,0.14)"
                            strokeWidth="1.5"
                          />
                        ))}

                        {/* Axes + labels */}
                        {SYSTEM_KEYS.map((k, i) => {
                          const end = toAxis(i, rMax + 18);
                          const axisEnd = toAxis(i, rMax);
                          const label = systemKeyToLabel(k);
                          const textAnchor = end.x < cx - 20 ? 'end' : end.x > cx + 20 ? 'start' : 'middle';
                          const dy = end.y < cy - 20 ? -4 : end.y > cy + 20 ? 12 : 4;
                          // Prevent label clipping (e.g., "Leadership Alignment" on the far-left).
                          const safeX =
                            textAnchor === 'end' ? Math.max(16, end.x) : textAnchor === 'start' ? Math.min(W - 16, end.x) : end.x;
                          const safeY = Math.max(14, Math.min(H - 10, end.y + dy));
                          return (
                            <g key={k}>
                              <line
                                x1={cx}
                                y1={cy}
                                x2={axisEnd.x}
                                y2={axisEnd.y}
                                stroke="rgba(0,0,0,0.16)"
                                strokeWidth="1.5"
                              />
                              <text
                                x={safeX}
                                y={safeY}
                                fontSize="12"
                                fill="rgba(0,0,0,0.72)"
                                textAnchor={textAnchor}
                              >
                                {label === 'Leadership Alignment' ? (
                                  <>
                                    <tspan x={safeX} dy="0">Leadership</tspan>
                                    <tspan x={safeX} dy="12">Alignment</tspan>
                                  </>
                                ) : (
                                  label
                                )}
                              </text>
                            </g>
                          );
                        })}

                        {/* Polygons */}
                        {/* Overall */}
                        <polygon
                          points={polyPoints(overall)}
                          fill="rgba(37, 99, 235, 0.14)"
                          stroke="#2563eb"
                          strokeWidth="2.5"
                        />

                        {hasLeaderTeam ? (
                          <>
                            {/* Leader */}
                            <polygon
                              points={polyPoints(leader)}
                              fill="rgba(16, 185, 129, 0.10)"
                              stroke="#10b981"
                              strokeWidth="2.5"
                            />
                            {/* Team */}
                            <polygon
                              points={polyPoints(team)}
                              fill="rgba(245, 158, 11, 0.10)"
                              stroke="#f59e0b"
                              strokeWidth="2.5"
                            />
                          </>
                        ) : null}
                      </svg>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[12px] text-black/[0.6]">
                      <div className="inline-flex items-center gap-2">
                        <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(37,99,235,0.25)', border: '2px solid #2563eb' }} />
                        Overall
                      </div>
                      <div className="inline-flex items-center gap-2">
                        <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(16,185,129,0.20)', border: '2px solid #10b981' }} />
                        Leader
                      </div>
                      <div className="inline-flex items-center gap-2">
                        <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(245,158,11,0.22)', border: '2px solid #f59e0b' }} />
                        Team
                      </div>
                      <div className="text-[12px] text-black/[0.6]">
                        Further out = healthier
                      </div>
                    </div>

                    {/* Quick numeric readout so users don't have to decode the radar */}
                    <div className="mt-4 rounded-lg border border-black/[0.12] bg-black/[0.02] p-4">
                      <div className="text-[12px] font-semibold text-black/[0.87] mb-2">Quick read (this snapshot)</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {SYSTEM_KEYS.map((k) => {
                          const o = fmt0(overall?.[k]);
                          const l = fmt0(leader?.[k]);
                          const t = fmt0(team?.[k]);
                          return (
                            <div key={`snap-${k}`} className="flex items-center justify-between gap-3">
                              <div className="text-[12px] text-black/[0.6]">{systemKeyToLabel(k)}</div>
                              <div className="text-[12px] text-black/[0.87] font-semibold whitespace-nowrap">
                                <span className="text-[#2563eb]">O</span> {o ?? '—'}
                                <span className="text-black/[0.38]">  </span>
                                <span className="text-[#10b981]">L</span> {l ?? '—'}
                                <span className="text-black/[0.38]">  </span>
                                <span className="text-[#f59e0b]">T</span> {t ?? '—'}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Diagnostic: distributions (scales to hundreds, no table scroll) */}
                  <div className="bg-white rounded-lg border border-black/[0.12] p-6">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <div className="text-[16px] font-semibold text-black/[0.87]">Leader vs Team: Response Spread</div>
                        <div className="text-[13px] text-black/[0.6] mt-1">
                          Each dot is a response. Colored ticks are group averages. Blue dashed tick is the overall average.
                        </div>
                      </div>
                      <div className="text-[11px] text-black/[0.38]">0–100 (higher is healthier)</div>
                    </div>

                    {respondents.length ? (
                      <div className="rounded-xl border border-black/[0.12] bg-black/[0.02] p-4">
                        {(() => {
                          const mean = (arr) => {
                            if (!arr.length) return null;
                            return arr.reduce((a, b) => a + b, 0) / arr.length;
                          };

                          // Deterministic jitter in [-1,1] based on index (stable across renders)
                          const jitter01 = (idx) => {
                            const x = Math.sin((idx + 1) * 9973) * 10000;
                            return (x - Math.floor(x)) * 2 - 1;
                          };

                          // Use the saturated ALI palette (these are used across ALI)
                          const leaderColor = '#10b981'; // green
                          const teamColor = '#f59e0b'; // yellow
                          const overallColor = '#2563eb'; // blue

                          const leaderN = leaderRows.length;
                          const teamN = teamRows.length;

                          const W = 820;
                          const padLeft = 120;
                          // Reserve space for per-lane summaries on the right
                          const padRight = 160;
                          const padTop = 16;
                          const padBottom = 28;
                          const laneH = 52; // more visual weight + more touch-friendly on mobile
                          const H = padTop + padBottom + SYSTEM_KEYS.length * laneH;
                          const plotW = W - padLeft - padRight;

                          const xForScore = (v) => {
                            const vv = Math.max(0, Math.min(100, v));
                            return padLeft + (vv / 100) * plotW;
                          };

                          const laneY = (i) => padTop + i * laneH + laneH / 2;
                          const leaderY = (i) => laneY(i) - 10;
                          const teamY = (i) => laneY(i) + 10;

                          const healthyFrom = 70;
                          const healthyX = xForScore(healthyFrom);

                          const perKey = SYSTEM_KEYS.map((k) => {
                            const leaderVals = leaderRows
                              .map((r) => r?.scores?.[k])
                              .filter((v) => typeof v === 'number' && Number.isFinite(v));
                            const teamVals = teamRows
                              .map((r) => r?.scores?.[k])
                              .filter((v) => typeof v === 'number' && Number.isFinite(v));
                            const allVals = [...leaderVals, ...teamVals];
                            return {
                              key: k,
                              leaderVals,
                              teamVals,
                              leaderMean: mean(leaderVals),
                              teamMean: mean(teamVals),
                              overallMean: mean(allVals),
                            };
                          });

                          const spread = (arr) => {
                            if (!arr.length) return 0;
                            const sorted = [...arr].sort((a, b) => a - b);
                            const lo = sorted[Math.floor(sorted.length * 0.2)];
                            const hi = sorted[Math.floor(sorted.length * 0.8)];
                            return (typeof hi === 'number' && typeof lo === 'number') ? (hi - lo) : 0;
                          };

                          const rowsWithSignals = perKey.map((row) => {
                            const gap = (typeof row.leaderMean === 'number' && typeof row.teamMean === 'number') ? (row.leaderMean - row.teamMean) : null;
                            const allVals = [...row.leaderVals, ...row.teamVals];
                            return {
                              ...row,
                              gap,
                              spread80: spread(allVals),
                            };
                          });

                          const biggestGapRow = rowsWithSignals
                            .filter((r) => typeof r.gap === 'number')
                            .sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap))[0] || null;
                          const lowestTeamRow = rowsWithSignals
                            .filter((r) => typeof r.teamMean === 'number')
                            .sort((a, b) => (a.teamMean ?? 999) - (b.teamMean ?? 999))[0] || null;
                          const widestSpreadRow = rowsWithSignals
                            .slice()
                            .sort((a, b) => (b.spread80 ?? 0) - (a.spread80 ?? 0))[0] || null;

                          return (
                            <div>
                              <div className="flex items-start justify-between gap-6">
                                <div className="text-[12px] text-black/[0.6]">
                                  <div className="font-semibold text-black/[0.87] text-[13px]">What this shows (in your data)</div>
                                  <div className="mt-2 space-y-1">
                                    <div>
                                      <span className="font-semibold text-black/[0.87]">Biggest leader/team difference:</span>{' '}
                                      {biggestGapRow ? (
                                        <>
                                          {systemKeyToLabel(biggestGapRow.key)} ({Math.round(biggestGapRow.leaderMean ?? 0)} vs {Math.round(biggestGapRow.teamMean ?? 0)}; Δ {Math.round(biggestGapRow.gap ?? 0)})
                                        </>
                                      ) : (
                                        '—'
                                      )}
                                    </div>
                                    <div>
                                      <span className="font-semibold text-black/[0.87]">Lowest team signal:</span>{' '}
                                      {lowestTeamRow ? (
                                        <>
                                          {systemKeyToLabel(lowestTeamRow.key)} (team avg {Math.round(lowestTeamRow.teamMean ?? 0)})
                                        </>
                                      ) : (
                                        '—'
                                      )}
                                    </div>
                                    <div>
                                      <span className="font-semibold text-black/[0.87]">Most mixed experiences (widest spread):</span>{' '}
                                      {widestSpreadRow ? (
                                        <>
                                          {systemKeyToLabel(widestSpreadRow.key)} (spread ~{Math.round(widestSpreadRow.spread80)}pts)
                                        </>
                                      ) : (
                                        '—'
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-[12px] text-black/[0.6]">
                                  <div className="inline-flex items-center gap-2">
                                    <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: leaderColor }} />
                                    Leader (n={leaderN})
                                  </div>
                                  <div className="inline-flex items-center gap-2">
                                    <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: teamColor }} />
                                    Team (n={teamN})
                                  </div>
                                  <div className="inline-flex items-center gap-2">
                                    <span className="w-8 h-[3px]" style={{ backgroundColor: overallColor }} />
                                    Overall mean
                                  </div>
                                  <div className="inline-flex items-center gap-2">
                                    <span className="w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: 'rgba(16,185,129,0.14)', border: '2px solid rgba(16,185,129,0.35)' }} />
                                    Healthy band (70–100)
                                  </div>
                                </div>
                              </div>

                              <div className="mt-4">
                                <svg className="w-full h-[520px] md:h-[580px]" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="System Spread (7 lanes)">
                                  {/* Healthy band */}
                                  <rect
                                    x={healthyX}
                                    y={padTop - 6}
                                    width={W - padRight - healthyX}
                                    height={H - padTop - padBottom + 12}
                                    fill="rgba(16,185,129,0.14)"
                                    stroke="rgba(16,185,129,0.35)"
                                    strokeWidth="2"
                                    rx="8"
                                    vectorEffect="non-scaling-stroke"
                                  />

                                  {/* X grid + labels */}
                                  {[0, 50, 70, 100].map((t) => {
                                    const x = xForScore(t);
                                    const is70 = t === 70;
                                    return (
                                      <g key={`x-${t}`}>
                                        <line
                                          x1={x}
                                          x2={x}
                                          y1={padTop - 6}
                                          y2={H - padBottom + 6}
                                          stroke={is70 ? 'rgba(16,185,129,0.55)' : 'rgba(0,0,0,0.12)'}
                                          strokeWidth={is70 ? '3' : '1.5'}
                                          vectorEffect="non-scaling-stroke"
                                        />
                                        <text
                                          x={x}
                                          y={H - 8}
                                          fontSize="12"
                                          fill={is70 ? '#10b981' : 'rgba(0,0,0,0.55)'}
                                          textAnchor="middle"
                                        >
                                          {t}
                                        </text>
                                      </g>
                                    );
                                  })}

                                  {/* Lanes */}
                                  {perKey.map((row, i) => {
                                    const yMid = laneY(i);
                                    const yL = leaderY(i);
                                    const yT = teamY(i);
                                    const leaderSummary = typeof row.leaderMean === 'number' ? Math.round(row.leaderMean) : null;
                                    const teamSummary = typeof row.teamMean === 'number' ? Math.round(row.teamMean) : null;

                                    return (
                                      <g key={`lane-${row.key}`}>
                                        {/* lane baseline */}
                                        <line
                                          x1={padLeft}
                                          x2={W - padRight}
                                          y1={yMid}
                                          y2={yMid}
                                          stroke="rgba(0,0,0,0.18)"
                                          strokeWidth="1.5"
                                          vectorEffect="non-scaling-stroke"
                                        />

                                        {/* lane label */}
                                        <text x={padLeft - 10} y={yMid + 5} fontSize="13" fill="rgba(0,0,0,0.78)" textAnchor="end">
                                          {systemKeyToLabel(row.key)}
                                        </text>

                                        {/* overall mean marker (dashed tick) */}
                                        {typeof row.overallMean === 'number' ? (
                                          <line
                                            x1={xForScore(row.overallMean)}
                                            x2={xForScore(row.overallMean)}
                                            y1={yMid - 12}
                                            y2={yMid + 12}
                                            stroke={overallColor}
                                            strokeWidth="3"
                                            strokeDasharray="7 6"
                                            vectorEffect="non-scaling-stroke"
                                          />
                                        ) : null}

                                        {/* leader mean marker */}
                                        {typeof row.leaderMean === 'number' ? (
                                          <line
                                            x1={xForScore(row.leaderMean)}
                                            x2={xForScore(row.leaderMean)}
                                            y1={yL - 10}
                                            y2={yL + 10}
                                            stroke={leaderColor}
                                            strokeWidth="4"
                                            strokeLinecap="round"
                                            vectorEffect="non-scaling-stroke"
                                          />
                                        ) : null}

                                        {/* team mean marker */}
                                        {typeof row.teamMean === 'number' ? (
                                          <line
                                            x1={xForScore(row.teamMean)}
                                            x2={xForScore(row.teamMean)}
                                            y1={yT - 10}
                                            y2={yT + 10}
                                            stroke={teamColor}
                                            strokeWidth="4"
                                            strokeLinecap="round"
                                            vectorEffect="non-scaling-stroke"
                                          />
                                        ) : null}

                                        {/* leader dots */}
                                        {row.leaderVals.map((v, idx) => (
                                          <circle
                                            key={`l-${row.key}-${idx}`}
                                            cx={xForScore(v)}
                                            cy={yL + jitter01(idx) * 5}
                                            r="4.5"
                                            fill={leaderColor}
                                            fillOpacity="0.9"
                                            stroke="white"
                                            strokeWidth="1"
                                            vectorEffect="non-scaling-stroke"
                                          />
                                        ))}

                                        {/* team dots */}
                                        {row.teamVals.map((v, idx) => (
                                          <circle
                                            key={`t-${row.key}-${idx}`}
                                            cx={xForScore(v)}
                                            cy={yT + jitter01(idx + 1000) * 5}
                                            r="4.5"
                                            fill={teamColor}
                                            fillOpacity="0.9"
                                            stroke="white"
                                            strokeWidth="1"
                                            vectorEffect="non-scaling-stroke"
                                          />
                                        ))}

                                        {/* per-lane summaries */}
                                        <text x={W - padRight + 18} y={yMid + 5} fontSize="12" fill="rgba(0,0,0,0.60)">
                                          <tspan fill={leaderColor} fontWeight="700">L</tspan>
                                          <tspan fill="rgba(0,0,0,0.60)">{leaderSummary !== null ? ` ${leaderSummary}` : ' —'}</tspan>
                                          <tspan fill="rgba(0,0,0,0.38)">  </tspan>
                                          <tspan fill={teamColor} fontWeight="700">T</tspan>
                                          <tspan fill="rgba(0,0,0,0.60)">{teamSummary !== null ? ` ${teamSummary}` : ' —'}</tspan>
                                        </text>
                                      </g>
                                    );
                                  })}

                                  {/* Axis label */}
                                  <text x={(padLeft + (W - padRight)) / 2} y={H - 8} fontSize="11" fill="rgba(0,0,0,0.38)" textAnchor="middle">
                                    Score (0–100)
                                  </text>
                                </svg>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="text-[13px] text-black/[0.6]">
                        This diagnostic view appears once responses are available.
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </section>

        {/* Section 3: Team Experience Map - EXACT V0 SPECIFICATION */}
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
                <p className="text-[13px] text-black/[0.6]">
                  {dashboardData.dataQuality?.meets_minimum_n_org && currentZone
                    ? `Current position in ${ZONES[currentZone]?.label || '—'} Zone`
                    : 'Neutral view: not enough responses yet'}
                </p>
              </div>
              {!dashboardData.dataQuality?.meets_minimum_n_org && (
                <div className="px-3 py-1.5 bg-[#f59e0b]/10 rounded-md text-[12px] font-medium text-[#f59e0b]">
                  Neutral view: &lt;10 responses
                </div>
              )}
            </div>

            {/* Experience Map Visualization - EXACT POSITIONING */}
            <div className="relative w-full aspect-square max-w-[600px] mx-auto">
              
              {/* Quadrant backgrounds - EXACT COLORS AND POSITIONS */}
              {/* Always show quadrant backgrounds; this is useful even in pilot */}
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

              {/* Previous positions (trail) - only for demo mode */}
              {!liveDashboard && mockData.experienceMap.previous.map((point, idx) => (
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
                    // SVG "points" expects raw numbers; % signs will crash rendering.
                    ...(!liveDashboard ? mockData.experienceMap.previous.map((p) => `${p.x},${100 - p.y}`) : []),
                    `${dashboardData.experienceMap.current.x},${100 - dashboardData.experienceMap.current.y}`,
                  ].join(" ")}
                  fill="none"
                  stroke="rgba(0,0,0,0.15)"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />
              </svg>

              {/* Current position - LARGE DOT WITH ZONE COLOR */}
              {/* Individual respondent points (pilot “heat map”) */}
              {Array.isArray(liveDashboard?.experienceMapPoints) && liveDashboard.experienceMapPoints.map((p, idx) => {
                if (typeof p?.x !== 'number' || typeof p?.y !== 'number') return null;
                const color = p.role === 'leader' ? '#2563eb' : '#10b981';
                return (
                  <div
                    key={`p-${idx}`}
                    className="absolute w-2.5 h-2.5 rounded-full"
                    style={{
                      left: `${p.x}%`,
                      bottom: `${p.y}%`,
                      transform: "translate(-50%, 50%)",
                      backgroundColor: color,
                      opacity: 0.28
                    }}
                    title={`${p.role || 'respondent'}: (${p.x.toFixed(1)}, ${p.y.toFixed(1)})`}
                  />
                );
              })}

              {/* Current (aggregate) position dot */}
              {typeof dashboardData.experienceMap.current.x === 'number' && typeof dashboardData.experienceMap.current.y === 'number' && currentZone ? (
                <div
                  className="absolute w-6 h-6 rounded-full shadow-lg z-10 flex items-center justify-center"
                  style={{
                    left: `${dashboardData.experienceMap.current.x}%`,
                    bottom: `${dashboardData.experienceMap.current.y}%`,
                    transform: "translate(-50%, 50%)",
                    backgroundColor: ZONES[currentZone].color,
                  }}
                >
                  {/* White center dot */}
                  <div className="w-3 h-3 rounded-full bg-white" />
                </div>
              ) : null}

              {/* Zone labels - POSITIONED IN EACH QUADRANT CENTER */}
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
            </div>

            {/* Coordinates display below map */}
            <div className="mt-6 flex items-center justify-center gap-8 text-[13px] text-black/[0.6]">
              <div>
                Clarity: <span className="font-bold text-black/[0.87]">{fmt1(dashboardData.experienceMap.current.x)}</span>
              </div>
              <div>
                (Stability + Trust) / 2: <span className="font-bold text-black/[0.87]">{fmt1(dashboardData.experienceMap.current.y)}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: View Full Analytics - Link to Reports */}
        <section className="mb-12">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200 p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Deep Dive Analytics Available</h2>
            <p className="text-gray-600 mb-6">Explore detailed pattern analysis, comparative insights, root cause analysis, and predictive analytics</p>
            <button
              onClick={() => handleNavigate('/ali/reports')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              View Full Analytics →
            </button>
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
                  {profileNames[dashboardData.leadershipProfile.profile]}
                </div>
                <div className="text-sm text-gray-600 mb-6">Based on 4 completed surveys</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Honesty Card */}
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-600 mb-2">Honesty</div>
                        <div className="text-4xl font-bold text-gray-900 transition-all duration-500">
                          {fmt1(animatedValues.honesty ?? dashboardData.leadershipProfile.honesty.score)}
                        </div>
                      </div>
                      <div className="inline-flex items-center px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-sm font-medium capitalize">
                        {dashboardData.leadershipProfile.honesty.state}
                      </div>
                    </div>
                  </div>
                  {/* Clarity Card */}
                  <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-600 mb-2">Clarity</div>
                        <div className="text-4xl font-bold text-gray-900 transition-all duration-500">
                          {fmt1(animatedValues.clarity_level ?? dashboardData.leadershipProfile.clarity.level)}
                        </div>
                      </div>
                      <div className="inline-flex items-center px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-sm font-medium capitalize">
                        {dashboardData.leadershipProfile.clarity.state}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      Stddev: {fmt1(dashboardData.leadershipProfile.clarity.stddev)}
                    </div>
                  </div>
                </div>
                
                {/* Profile Description */}
                <div className="mt-6 pt-6 border-t border-purple-200">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {profileDescriptions[dashboardData.leadershipProfile.profile]}
                  </p>
                </div>
              </div>
            </div>

            {/* Leadership Mirror - No pale colors */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center justify-between w-full">
                  <h2 className="text-xl font-semibold text-gray-900">Leadership Mirror</h2>
                  <button
                    onClick={() => handleNavigate(withEmail('/ali/reports/mirror'))}
                    className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors whitespace-nowrap"
                  >
                    Open Mirror →
                  </button>
                </div>
                <button
                  onClick={() => setOpenDefinition('leadership-mirror')}
                  className="text-gray-400 hover:text-blue-600 transition-colors"
                  aria-label="Learn about Leadership Mirror"
                >
                  <HelpCircle className="w-5 h-5" />
                </button>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-6 transition-all duration-200 hover:shadow-lg">
                {(() => {
                  const mirror = dashboardData?.leadershipMirror || {};
                  const gaps = mirror?.gaps || {};
                  const leaderScores = mirror?.leaderScores || {};
                  const teamScores = mirror?.teamScores || {};
                  const severity = mirror?.severity || {};
                  const counts = (liveDashboard && liveDashboard.responseCounts) ? liveDashboard.responseCounts : (dashboardData?.responseCounts || {});
                  const leaderN = typeof counts?.leader === 'number' ? counts.leader : null;
                  const teamN = typeof counts?.team_member === 'number' ? counts.team_member : null;

                  const severityToBadge = (sev) => {
                    const s = String(sev || '').toLowerCase();
                    if (s === 'critical') return { label: 'Critical', cls: 'bg-red-50 border-red-200 text-red-800' };
                    if (s === 'caution') return { label: 'Caution', cls: 'bg-orange-50 border-orange-200 text-orange-800' };
                    if (s === 'neutral') return { label: 'Neutral', cls: 'bg-gray-50 border-gray-200 text-gray-700' };
                    return { label: '—', cls: 'bg-gray-50 border-gray-200 text-gray-700' };
                  };

                  const orderedKeys = MIRROR_METRIC_ORDER.filter((k) => (
                    Object.prototype.hasOwnProperty.call(gaps, k) ||
                    Object.prototype.hasOwnProperty.call(leaderScores, k) ||
                    Object.prototype.hasOwnProperty.call(teamScores, k)
                  ));

                  const rows = orderedKeys.map((k) => {
                    const gap = (typeof gaps?.[k] === 'number' && Number.isFinite(gaps[k])) ? gaps[k] : null;
                    const leaderScore = (typeof leaderScores?.[k] === 'number' && Number.isFinite(leaderScores[k])) ? leaderScores[k] : null;
                    const teamScore = (typeof teamScores?.[k] === 'number' && Number.isFinite(teamScores[k])) ? teamScores[k] : null;
                    return {
                      key: k,
                      label: mirrorKeyToLabel(k),
                      gap,
                      abs: gap === null ? null : Math.abs(gap),
                      severity: severity?.[k],
                      leaderScore,
                      teamScore
                    };
                  });

                  const sortable = rows.filter((r) => r.abs !== null);
                  const topByGap = [...sortable].sort((a, b) => (b.abs ?? 0) - (a.abs ?? 0)).slice(0, 3);
                  const visibleRows = mirrorShowAll ? rows : (topByGap.length ? topByGap : rows.slice(0, 3));
                  const hasAny = rows.some((r) => r.leaderScore !== null || r.teamScore !== null || r.gap !== null);

                  return (
                    <div className="space-y-5">
                      {(leaderN !== null || teamN !== null) ? (
                        <div className="text-xs text-gray-600 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-gray-400" />
                          Based on {leaderN ?? '—'} leader response(s) and {teamN ?? '—'} team response(s).
                        </div>
                      ) : null}

                      {!hasAny ? (
                        <div className="text-sm text-gray-600">
                          Mirror data will appear once both a leader and team members have responded.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {visibleRows.map((row) => {
                            const maxScore = Math.max(row.leaderScore ?? 0, row.teamScore ?? 0, 100);
                            const badge = severityToBadge(row.severity);
                            return (
                              <div key={row.key} className="border-b border-gray-200 pb-4 last:border-0 last:pb-0">
                                <div className="flex items-start justify-between gap-3 mb-2">
                                  <div className="min-w-0">
                                    <div className="text-sm font-medium text-gray-900">{row.label}</div>
                                    <div className="text-xs text-gray-500 mt-0.5">
                                      Gap (leader − team):{' '}
                                      <span className="font-semibold text-gray-700">{row.gap === null ? '—' : row.gap.toFixed(1)}</span>pt
                                    </div>
                                  </div>
                                  <span className={`shrink-0 inline-flex items-center px-2 py-1 rounded-full border text-xs font-semibold ${badge.cls}`}>
                                    {badge.label}
                                  </span>
                                </div>

                                <div className="flex items-center gap-4">
                                  <div className="flex-1">
                                    <div className="text-xs text-gray-500 mb-1">Leader</div>
                                    <div
                                      className="h-7 bg-blue-600 rounded flex items-center justify-end pr-2 transition-all duration-700 ease-out"
                                      style={{ width: `${(((row.leaderScore ?? 0) / maxScore) * 100)}%` }}
                                    >
                                      <span className="text-xs font-semibold text-white">
                                        {row.leaderScore === null ? '—' : row.leaderScore.toFixed(1)}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-xs text-gray-500 mb-1">Team</div>
                                    <div
                                      className="h-7 bg-green-600 rounded flex items-center justify-end pr-2 transition-all duration-700 ease-out"
                                      style={{ width: `${(((row.teamScore ?? 0) / maxScore) * 100)}%` }}
                                    >
                                      <span className="text-xs font-semibold text-white">
                                        {row.teamScore === null ? '—' : row.teamScore.toFixed(1)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          <div className="flex items-center justify-between pt-2">
                            <button
                              type="button"
                              onClick={() => setMirrorShowAll((v) => !v)}
                              className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                            >
                              {mirrorShowAll ? 'Show top gaps' : 'Show all metrics'}
                            </button>
                            <div className="text-xs text-gray-500">
                              {mirrorShowAll ? 'All 7 tests + ALI overall' : 'Top 3 gaps'}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
          </div>
          </div>
        </section>

        {/* Quick Actions & Recent Activity - MOVED DOWN */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          {/* Quick Actions */}
          <section>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => handleNavigate('/ali/deploy')}
                  className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Send className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-gray-900">Deploy Survey</span>
                  </div>
                  <ArrowDown className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transform -rotate-90" />
                </button>
                <button
                  onClick={() => {}}
                  className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Share2 className="w-5 h-5 text-gray-600" />
                    <span className="font-medium text-gray-900">Share Report</span>
                  </div>
                  <ArrowDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transform -rotate-90" />
                </button>
                <button
                  onClick={() => {}}
                  className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-gray-600" />
                    <span className="font-medium text-gray-900">Schedule Review</span>
                  </div>
                  <ArrowDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transform -rotate-90" />
                </button>
              </div>
            </div>
          </section>

          {/* Recent Activity Feed */}
          <section>
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
              </div>
              <div className="space-y-3">
                {liveDashboard ? (
                  <div className="text-sm text-gray-600">
                    Recent Activity will populate as surveys are deployed and completed over time.
                  </div>
                ) : mockData.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                    <div className="w-2 h-2 rounded-full bg-blue-600 mt-2 flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{activity.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500">{activity.timestamp}</span>
                        {activity.scoreChange && (
                          <span className="text-xs font-medium text-green-600">+{activity.scoreChange}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4 transition-all duration-200 hover:shadow-lg">
                <div className="text-sm font-medium text-gray-600 mb-2">This Quarter</div>
                <div className="text-4xl font-bold text-gray-900 transition-all duration-500">
                  {Math.round(animatedValues.response_quarter ?? responseThisQuarterTarget)}
                </div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4 transition-all duration-200 hover:shadow-lg">
                <div className="text-sm font-medium text-gray-600 mb-2">Avg. Completion</div>
                <div className="text-4xl font-bold text-gray-900 transition-all duration-500">
                  {liveDashboard ? '—' : (animatedValues.response_completion ?? mockData.responseCounts.avgCompletion).toFixed(1)}
                </div>
                <div className="text-xs text-gray-500 mt-1">min</div>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4 transition-all duration-200 hover:shadow-lg">
                <div className="text-sm font-medium text-gray-600 mb-2">Response Rate</div>
                <div className="text-4xl font-bold text-gray-900 transition-all duration-500">
                  {liveDashboard ? '—' : Math.round(animatedValues.response_rate ?? mockData.responseCounts.responseRate)}
                </div>
                <div className="text-xs text-gray-500 mt-1">%</div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer Footnote: Total Responses & View Full Analytics Link */}
        <div className="mt-12 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div>
              Total Responses: <span className="font-semibold text-gray-700">{Math.round(animatedValues.response_overall ?? responseOverallTarget)}</span> across all surveys
            </div>
            <button
              onClick={() => handleNavigate(withEmail('/ali/reports'))}
              className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              View Full Analytics →
            </button>
          </div>
        </div>
      </main>
      <AliFooter />

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

      {/* Zone modal removed — the Zones page is the single source of truth */}
    </div>
  );
};

export default ALIDashboard;
