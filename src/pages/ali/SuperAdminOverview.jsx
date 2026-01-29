import React, { useState, useEffect } from 'react';
import { Users, Crown, ClipboardCheck, TrendingUp } from 'lucide-react';
import SuperAdminNav from '../../components/ali/SuperAdminNav';

const SuperAdminOverview = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/ali/super-admin/overview');
        const result = await response.json();
        console.log('Super Admin Overview API response:', result);
        if (result.ok && result.overview) {
          setData(result.overview);
        } else {
          console.error('API returned error or missing data:', result);
        }
      } catch (error) {
        console.error('Error fetching overview:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getZoneColor = (zone) => {
    const colors = {
      green: { text: '#10b981', bg: '#ecfdf5', border: '#10b981' },
      yellow: { text: '#f59e0b', bg: '#fffbeb', border: '#f59e0b' },
      orange: { text: '#fb923c', bg: '#fff7ed', border: '#fb923c' },
      red: { text: '#ef4444', bg: '#fef2f2', border: '#ef4444' }
    };
    return colors[zone] || colors.yellow;
  };

  const getResponseRateColor = (rate) => {
    if (rate >= 80) return '#10b981';
    if (rate >= 70) return '#f59e0b';
    if (rate >= 60) return '#fb923c';
    return '#ef4444';
  };

  const fmt1 = (v) => (typeof v === 'number' && Number.isFinite(v) ? v.toFixed(1) : '—');
  const fmt0 = (v) => (typeof v === 'number' && Number.isFinite(v) ? String(Math.round(v)) : '—');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] ali-system">
        <SuperAdminNav activeTab="overview" />
        <div className="pt-8 pb-12 px-6 max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="text-[14px] text-black/[0.6]">Loading platform overview...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#fafafa] ali-system">
        <SuperAdminNav activeTab="overview" />
        <div className="pt-8 pb-12 px-6 max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="text-[14px] text-black/[0.6]">No data available</div>
          </div>
        </div>
      </div>
    );
  }

  const hasNoData = (data.metrics.companies?.total ?? 0) === 0 && (data.metrics.respondents?.total ?? 0) === 0 && (data.metrics.surveys?.total ?? 0) === 0;

  return (
    <div className="min-h-screen bg-[#fafafa] ali-system">
      <SuperAdminNav activeTab="overview" />
      
      <div className="pt-8 pb-12 px-6 max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-[28px] font-semibold text-black/[0.87] mb-1">Platform Overview</h1>
        </div>

        {/* Empty state when no platform data */}
        {hasNoData && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6" role="status">
            <h2 className="text-[18px] font-semibold text-amber-900 mb-2">No data yet</h2>
            <p className="text-[14px] text-amber-800 mb-3">
              Platform metrics will appear here once companies deploy surveys and collect responses.
            </p>
            <p className="text-[13px] text-amber-700">
              Next steps: deploy a survey from Deploy, share the link with respondents, and ensure at least one company has completed responses.
            </p>
          </div>
        )}

        {/* HERO: Platform Avg ALI (25%) + Platform Health (75%) */}
        <div className="bg-white rounded-lg border border-black/[0.12] p-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Left: Platform Average ALI Score (25%) */}
            <div className="lg:col-span-1">
              <div className="text-[18px] font-semibold text-black/[0.87] mb-4">Platform Avg ALI</div>
              <div className="bg-[#2563eb]/5 rounded-lg border-2 border-[#2563eb]/20 p-6">
                <div className="text-[64px] font-bold leading-none text-[#2563eb] mb-2">
                  {fmt1(data.metrics.avgALIScore)}
                </div>
                <div className="text-[13px] text-black/[0.6]">0–100 (higher is healthier)</div>
              </div>
            </div>

            {/* Right: Platform Health Panel (75%) */}
            <div className="lg:col-span-3">
              <div className="text-[18px] font-semibold text-black/[0.87] mb-4">Platform Health</div>
              
              <div className="bg-white rounded-lg border border-black/[0.12] p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Companies */}
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-[#2563eb]/10 flex items-center justify-center">
                        <Users className="w-5 h-5 text-[#2563eb]" />
                      </div>
                      <span className="text-[13px] font-semibold text-black/[0.6]">Companies</span>
                    </div>
                    <div className="text-[36px] font-bold text-black/[0.87] leading-none mb-2">
                      {data.metrics.companies.total}
                    </div>
                    <div className="text-[13px] text-black/[0.6]">
                      Total companies on the platform
                    </div>
                  </div>

                  {/* Surveys */}
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-[#10b981]/10 flex items-center justify-center">
                        <ClipboardCheck className="w-5 h-5 text-[#10b981]" />
                      </div>
                      <span className="text-[13px] font-semibold text-black/[0.6]">Surveys</span>
                    </div>
                    <div className="text-[36px] font-bold text-black/[0.87] leading-none mb-2">
                      {data.metrics.surveys.total}
                    </div>
                    <div className="text-[13px] text-black/[0.6]">
                      Total surveys sent out
                    </div>
                  </div>

                  {/* Respondents */}
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-[#8b5cf6]/10 flex items-center justify-center">
                        <Users className="w-5 h-5 text-[#8b5cf6]" />
                      </div>
                      <span className="text-[13px] font-semibold text-black/[0.6]">Respondents</span>
                    </div>
                    <div className="text-[36px] font-bold text-black/[0.87] leading-none mb-2">
                      {data.metrics.respondents?.total || 0}
                    </div>
                    <div className="text-[13px] text-black/[0.6]">
                      Total completed surveys
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECOND ROW: Zone Distribution + Engagement Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Zone Distribution */}
          <div className="bg-white rounded-xl border border-black/[0.12] p-8 shadow-sm">
            <h2 className="text-[22px] font-semibold text-black/[0.87] mb-6">Score Distribution by Zone</h2>
            <div className="grid grid-cols-2 gap-4">
              {data.zoneDistribution.map((zone) => {
                const colors = getZoneColor(zone.zone);
                return (
                  <div
                    key={zone.zone}
                    className="rounded-lg p-5 border-2"
                    style={{ 
                      backgroundColor: colors.bg, 
                      borderColor: colors.border
                    }}
                  >
                    <div className="text-[14px] font-semibold mb-2" style={{ color: colors.text }}>
                      {zone.zone.charAt(0).toUpperCase() + zone.zone.slice(1)} Zone
                    </div>
                    <div className="text-[13px] text-black/[0.6] mb-1">{zone.range}</div>
                    <div className="text-[24px] font-bold mb-1" style={{ color: colors.text }}>
                      {zone.count}
                    </div>
                    <div className="text-[13px] text-black/[0.6] mb-3">{fmt1(zone.percent)}%</div>
                    <div className="w-full h-2 bg-white/50 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${zone.percent}%`, backgroundColor: colors.text }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Engagement Metrics */}
          <div className="bg-white rounded-xl border border-black/[0.12] p-8 shadow-sm">
            <h3 className="text-[18px] font-semibold text-black/[0.87] mb-6">Engagement Metrics</h3>
            <div className="space-y-4">
              <div>
                <div className="text-[13px] text-black/[0.6] mb-1">Response Rate</div>
                <div 
                  className="text-[20px] font-semibold"
                  style={{ color: getResponseRateColor(data.engagement.responseRate) }}
                >
                  {fmt1(data.engagement.responseRate)}%
                </div>
              </div>
              <div>
                <div className="text-[13px] text-black/[0.6] mb-1">Completion Time</div>
                <div className="text-[20px] font-semibold text-black/[0.87]">{fmt1(data.engagement.completionTime)} min</div>
              </div>
              <div>
                <div className="text-[13px] text-black/[0.6] mb-1">Surveys/Company</div>
                <div className="text-[20px] font-semibold text-black/[0.87]">{fmt1(data.engagement.surveysPerCompany)}</div>
              </div>
              <div>
                <div className="text-[13px] text-black/[0.6] mb-1">Responses/Survey</div>
                <div className="text-[20px] font-semibold text-black/[0.87]">{fmt1(data.engagement.responsesPerSurvey)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* THIRD ROW: Quarterly Trends */}
        <div className="bg-white rounded-xl border border-black/[0.12] p-8 shadow-sm">
          <h2 className="text-[22px] font-semibold text-black/[0.87] mb-6">Quarterly Growth Trends</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-black/[0.04]">
                <tr>
                  <th className="px-6 py-3 text-left text-[13px] font-semibold text-black/[0.6] uppercase tracking-wide">Quarter</th>
                  <th className="px-6 py-3 text-left text-[13px] font-semibold text-black/[0.6] uppercase tracking-wide">Companies</th>
                  <th className="px-6 py-3 text-left text-[13px] font-semibold text-black/[0.6] uppercase tracking-wide">Leaders</th>
                  <th className="px-6 py-3 text-left text-[13px] font-semibold text-black/[0.6] uppercase tracking-wide">Avg Score</th>
                  <th className="px-6 py-3 text-left text-[13px] font-semibold text-black/[0.6] uppercase tracking-wide">Responses</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.12]">
                {data.quarterlyTrends.map((trend, idx) => (
                  <tr key={idx} className="hover:bg-black/[0.04] transition-colors">
                    <td className="px-6 py-4 text-[14px] text-black/[0.87]">{trend.quarter}</td>
                    <td className="px-6 py-4 text-[14px] text-black/[0.87]">
                      {trend.companies}
                      {trend.changes?.companies && (
                        <span className="text-[#10b981] ml-2">+{trend.changes.companies}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-[14px] text-black/[0.87]">
                      {trend.leaders}
                      {trend.changes?.leaders && (
                        <span className="text-[#10b981] ml-2">+{trend.changes.leaders}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-[14px] text-[#f59e0b] font-semibold">{fmt1(trend.avgScore)}</td>
                    <td className="px-6 py-4 text-[14px] text-black/[0.87]">{trend.responses.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FOURTH ROW: Pattern Analysis */}
        <div className="bg-white rounded-xl border border-black/[0.12] p-8 shadow-sm">
          <h2 className="text-[22px] font-semibold text-black/[0.87] mb-6">Pattern Analysis Across Platform</h2>
          <div className="space-y-4">
            {data.patterns.map((pattern) => (
              <div key={pattern.name} className="pb-4 border-b border-black/[0.12] last:border-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-[16px] font-semibold text-black/[0.87]">{pattern.name}</span>
                    <span className="text-[16px] font-bold text-[#f59e0b]">{fmt1(pattern.score)}</span>
                    {pattern.change !== 0 && (
                      <div className="flex items-center gap-1 text-[#10b981]">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-[14px] font-semibold">+{fmt1(pattern.change)}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="w-full h-2 bg-black/[0.08] rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-[#2563eb] rounded-full"
                    style={{ width: `${Math.min(100, Math.max(0, pattern.score))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FIFTH ROW: Top Performing Companies */}
        <div className="bg-white rounded-xl border border-black/[0.12] p-8 shadow-sm">
          <h2 className="text-[22px] font-semibold text-black/[0.87] mb-6">Top Performing Companies</h2>
          <div className="space-y-4">
            {data.topCompanies.map((company, idx) => {
              const zoneColors = getZoneColor(company.zone);
              return (
                <div key={idx} className="flex items-center justify-between p-4 rounded-lg border border-black/[0.12]">
                  <div>
                    <div className="text-[16px] font-semibold text-black/[0.87] mb-1">{company.name}</div>
                    <div className="text-[13px] text-black/[0.6]">{company.leaders} leaders • {company.surveys} surveys</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-[20px] font-bold" style={{ color: zoneColors.text }}>{fmt1(company.score)}</div>
                    <span 
                      className="px-2.5 py-1 rounded-full text-[11px] font-medium"
                      style={{ 
                        backgroundColor: zoneColors.bg, 
                        color: zoneColors.text 
                      }}
                    >
                      {company.zone.toUpperCase()} ZONE
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SIXTH ROW: Leadership Mirror */}
        {data.leadershipMirror && (
          <div className="bg-white rounded-xl border border-black/[0.12] p-8 shadow-sm">
            <h2 className="text-[22px] font-semibold text-black/[0.87] mb-6">Platform Leadership Mirror</h2>
            <p className="text-[13px] text-black/[0.6] mb-6">
              Leader vs Team perception gaps across the platform
            </p>
            <div className="space-y-4">
              {(() => {
                const mirror = data.leadershipMirror;
                const gaps = mirror.gaps || {};
                const leaderScores = mirror.leaderScores || {};
                const teamScores = mirror.teamScores || {};
                const severity = mirror.severity || {};
                
                const mirrorRows = [
                  { key: 'ali', label: 'ALI Overall' },
                  { key: 'alignment', label: 'Alignment' },
                  { key: 'stability', label: 'Stability' },
                  { key: 'clarity', label: 'Clarity' },
                  { key: 'trust', label: 'Trust' }
                ].filter(row => 
                  (typeof leaderScores[row.key] === 'number' || typeof teamScores[row.key] === 'number')
                );
                
                const severityToBadge = (sev) => {
                  const badges = {
                    critical: { cls: 'bg-red-50 border-red-200 text-red-700', label: 'Critical Gap' },
                    significant: { cls: 'bg-orange-50 border-orange-200 text-orange-700', label: 'Significant Gap' },
                    moderate: { cls: 'bg-yellow-50 border-yellow-200 text-yellow-700', label: 'Moderate Gap' },
                    neutral: { cls: 'bg-gray-50 border-gray-200 text-gray-700', label: 'Neutral' }
                  };
                  return badges[sev] || badges.neutral;
                };
                
                return mirrorRows.map((row) => {
                  const leaderScore = leaderScores[row.key] ?? null;
                  const teamScore = teamScores[row.key] ?? null;
                  const gap = gaps[row.key] ?? null;
                  const sev = severity[row.key] || 'neutral';
                  const maxScore = Math.max(leaderScore ?? 0, teamScore ?? 0, 100);
                  const badge = severityToBadge(sev);
                  
                  return (
                    <div key={row.key} className="border-b border-black/[0.12] pb-4 last:border-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0">
                          <div className="text-[14px] font-semibold text-black/[0.87]">{row.label}</div>
                          <div className="text-[12px] text-black/[0.6] mt-0.5">
                            Gap (leader − team):{' '}
                            <span className="font-semibold text-black/[0.87]">
                              {gap === null ? '—' : `${gap >= 0 ? '+' : ''}${fmt1(gap)}`}pt
                            </span>
                          </div>
                        </div>
                        <span className={`shrink-0 inline-flex items-center px-2 py-1 rounded-full border text-[11px] font-semibold ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="text-[11px] text-black/[0.6] mb-1">Leader</div>
                          <div
                            className="h-6 bg-[#10b981] rounded flex items-center justify-end pr-2 transition-all duration-700 ease-out"
                            style={{ width: `${(((leaderScore ?? 0) / maxScore) * 100)}%` }}
                          >
                            {leaderScore !== null && (
                              <span className="text-[11px] font-semibold text-white">
                                {fmt1(leaderScore)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="text-[11px] text-black/[0.6] mb-1">Team</div>
                          <div
                            className="h-6 bg-[#f59e0b] rounded flex items-center justify-end pr-2 transition-all duration-700 ease-out"
                            style={{ width: `${(((teamScore ?? 0) / maxScore) * 100)}%` }}
                          >
                            {teamScore !== null && (
                              <span className="text-[11px] font-semibold text-white">
                                {fmt1(teamScore)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {/* SEVENTH ROW: Team Experience Map */}
        {data.experienceMap && (
          <div className="bg-white rounded-xl border border-black/[0.12] p-8 shadow-sm">
            <h2 className="text-[22px] font-semibold text-black/[0.87] mb-6">Platform Team Experience Map</h2>
            <p className="text-[13px] text-black/[0.6] mb-6">
              Aggregate team experience across all companies
            </p>
            <div className="relative w-full aspect-square max-w-[600px] mx-auto">
              {/* Quadrant backgrounds */}
              <div className="absolute top-0 right-0 w-1/2 h-1/2" style={{ backgroundColor: "rgba(16, 185, 129, 0.08)" }} />
              <div className="absolute top-0 left-0 w-1/2 h-1/2" style={{ backgroundColor: "rgba(245, 158, 11, 0.08)" }} />
              <div className="absolute bottom-0 left-0 w-1/2 h-1/2" style={{ backgroundColor: "rgba(251, 146, 60, 0.08)" }} />
              <div className="absolute bottom-0 right-0 w-1/2 h-1/2" style={{ backgroundColor: "rgba(239, 68, 68, 0.08)" }} />
              
              {/* Grid lines */}
              <div className="absolute inset-0 border-2 border-black/[0.12] rounded-lg">
                <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-black/[0.12] -translate-y-1/2" />
                <div className="absolute left-1/2 top-0 bottom-0 w-[2px] bg-black/[0.12] -translate-x-1/2" />
              </div>
              
              {/* Axis labels */}
              <div className="absolute left-0 right-0 text-center" style={{ bottom: "0.3rem" }}>
                <span className="text-[13px] font-medium text-black/[0.6]">Clarity (Low → High)</span>
              </div>
              <div 
                className="absolute top-1/2 origin-center"
                style={{ left: "-3rem", transform: "translateY(-50%) rotate(-90deg)" }}
              >
                <span className="text-[13px] font-medium text-black/[0.6] whitespace-nowrap">
                  (Stability + Trust) / 2
                </span>
              </div>
              
              {/* Threshold markers */}
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
              
              {/* Current position */}
              {typeof data.experienceMap.x === 'number' && typeof data.experienceMap.y === 'number' && data.experienceMap.zone ? (
                <div
                  className="absolute w-8 h-8 rounded-full shadow-lg z-10 flex items-center justify-center"
                  style={{
                    left: `${data.experienceMap.x}%`,
                    bottom: `${data.experienceMap.y}%`,
                    transform: "translate(-50%, 50%)",
                    backgroundColor: getZoneColor(data.experienceMap.zone).text,
                  }}
                >
                  <div className="w-4 h-4 rounded-full bg-white" />
                </div>
              ) : null}
              
              {/* Zone labels */}
              <div className="absolute text-[14px] font-bold" style={{ top: "25%", right: "25%", transform: "translate(50%, -50%)", color: "#10b981" }}>
                Harmony
              </div>
              <div className="absolute text-[14px] font-bold" style={{ top: "25%", left: "25%", transform: "translate(-50%, -50%)", color: "#f59e0b" }}>
                Strain
              </div>
              <div className="absolute text-[14px] font-bold" style={{ bottom: "25%", left: "25%", transform: "translate(-50%, 50%)", color: "#fb923c" }}>
                Stress
              </div>
              <div className="absolute text-[14px] font-bold" style={{ bottom: "25%", right: "25%", transform: "translate(50%, 50%)", color: "#ef4444" }}>
                Hazard
              </div>
            </div>
            
            {data.experienceMap.zone && (
              <div className="mt-6 text-center">
                <div className="text-[14px] font-semibold text-black/[0.87] mb-1">
                  Current Zone: {data.experienceMap.zone.charAt(0).toUpperCase() + data.experienceMap.zone.slice(1)}
                </div>
                <div className="text-[13px] text-black/[0.6]">
                  Clarity: {fmt1(data.experienceMap.x)} • Stability/Trust: {fmt1(data.experienceMap.y)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminOverview;
