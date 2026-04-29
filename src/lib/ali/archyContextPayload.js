/**
 * Trimmed JSON snapshots for Archy on ALI pages (POST /api/chat contextPayload).
 * No PII beyond what the page already shows (company name, scores).
 */

export function buildSuperAdminOverviewSnapshot(overview) {
  if (!overview || typeof overview !== 'object') return null;
  const m = overview.metrics || {};
  return {
    type: 'ali-super-admin-overview',
    metrics: {
      companies: m.companies,
      leaders: m.leaders,
      surveys: m.surveys,
      respondents: m.respondents,
      avgALIScore: m.avgALIScore,
    },
    zoneDistribution: Array.isArray(overview.zoneDistribution)
      ? overview.zoneDistribution.slice(0, 24)
      : undefined,
    engagement: overview.engagement,
    platformALITrend: Array.isArray(overview.platformALITrend)
      ? overview.platformALITrend.slice(0, 16)
      : undefined,
    leadershipMirror: overview.leadershipMirror
      ? {
          leaderScores: overview.leadershipMirror.leaderScores,
          teamScores: overview.leadershipMirror.teamScores,
        }
      : undefined,
    patterns: Array.isArray(overview.patterns) ? overview.patterns.slice(0, 40) : undefined,
    quarterly: overview.quarterly,
    contentSignals: overview.contentSignals,
    segmentsSample: Array.isArray(overview.segments) ? overview.segments.slice(0, 12) : undefined,
  };
}

export function buildAliDashboardSnapshot(dashboardData, liveDashboard, extra = {}) {
  if (!dashboardData || typeof dashboardData !== 'object') return null;
  const patterns = dashboardData.scores?.patterns || {};
  const patternCompact = {};
  for (const [k, v] of Object.entries(patterns)) {
    patternCompact[k] =
      v && typeof v === 'object' ? { current: v.current, rolling: v.rolling } : v;
  }
  const insights =
    extra.metricInsights && typeof extra.metricInsights === 'object'
      ? Object.entries(extra.metricInsights)
          .slice(0, 12)
          .map(([key, val]) => ({
            metric: key,
            insight: typeof val === 'string' ? val.slice(0, 400) : val,
          }))
      : undefined;

  return {
    type: 'ali-dashboard',
    dataSource: liveDashboard ? 'live' : 'demo',
    company: dashboardData.company?.name,
    ali: dashboardData.scores?.ali,
    zone: dashboardData.scores?.ali?.zone,
    patterns: patternCompact,
    coreScores: dashboardData.coreScores,
    experienceMap: dashboardData.experienceMap?.current,
    leadershipProfile: dashboardData.leadershipProfile
      ? {
          profile: dashboardData.leadershipProfile.profile,
          honestyScore: dashboardData.leadershipProfile.honesty?.score,
          clarityLevel: dashboardData.leadershipProfile.clarity?.level,
        }
      : undefined,
    leadershipMirror: dashboardData.leadershipMirror
      ? {
          gaps: dashboardData.leadershipMirror.gaps,
          severity: dashboardData.leadershipMirror.severity,
          leaderScores: dashboardData.leadershipMirror.leaderScores,
          teamScores: dashboardData.leadershipMirror.teamScores,
        }
      : undefined,
    trajectory: dashboardData.trajectory,
    dataQuality: dashboardData.dataQuality,
    responseCounts: dashboardData.responseCounts,
    liveInsights: Array.isArray(liveDashboard?.insights)
      ? liveDashboard.insights.slice(0, 8).map((i) => ({
          title: i.title,
          text: typeof i.text === 'string' ? i.text.slice(0, 320) : i.text,
        }))
      : undefined,
    metricInsights: insights,
  };
}

export function buildAliMirrorSnapshot(liveSummary) {
  if (!liveSummary || typeof liveSummary !== 'object') {
    return { type: 'ali-reports-mirror', hasData: false };
  }
  return {
    type: 'ali-reports-mirror',
    leadershipMirror: liveSummary.leadershipMirror,
    responseCounts: liveSummary.responseCounts,
    scores: liveSummary.scores ? { ali: liveSummary.scores.ali, patterns: liveSummary.scores.patterns } : undefined,
  };
}

export function buildAliZonesSnapshot(liveDashboardSummary) {
  if (!liveDashboardSummary || typeof liveDashboardSummary !== 'object') {
    return { type: 'ali-reports-zones', hasData: false };
  }
  return {
    type: 'ali-reports-zones',
    scores: liveDashboardSummary.scores,
    leadershipMirror: liveDashboardSummary.leadershipMirror,
    zone: liveDashboardSummary.scores?.ali?.zone,
  };
}

export function buildAliProfileSnapshot(liveSummary) {
  if (!liveSummary || typeof liveSummary !== 'object') {
    return { type: 'ali-reports-profile', hasData: false };
  }
  return {
    type: 'ali-reports-profile',
    leadershipProfile: liveSummary.leadershipProfile,
    scores: liveSummary.scores ? { ali: liveSummary.scores.ali } : undefined,
  };
}

export function buildAliReportsSnapshot(liveReports, liveDashboardSummary) {
  const out = {
    type: 'ali-reports',
    hasLiveReports: !!liveReports,
    hasDashboardSummary: !!liveDashboardSummary,
  };
  if (liveDashboardSummary?.scores) {
    out.dashboardScores = {
      ali: liveDashboardSummary.scores?.ali,
      patterns: liveDashboardSummary.scores?.patterns,
    };
  }
  if (liveReports && typeof liveReports === 'object') {
    out.reportsKeys = Object.keys(liveReports).filter((k) => k !== 'error').slice(0, 30);
    if (liveReports.summary && typeof liveReports.summary === 'object') {
      out.summary = liveReports.summary;
    }
  }
  return out;
}
