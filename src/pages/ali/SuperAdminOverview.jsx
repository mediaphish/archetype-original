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
        if (result.ok) {
          setData(result.overview);
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

  return (
    <div className="min-h-screen bg-[#fafafa] ali-system">
      <SuperAdminNav activeTab="overview" />
      
      <div className="pt-8 pb-12 px-6 max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-[28px] font-semibold text-black/[0.87] mb-1">Platform Overview</h1>
        </div>

        {/* HERO: Platform-wide Average ALI Score + Breakdown */}
        <div className="bg-white rounded-lg border border-black/[0.12] p-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Left: Platform Average ALI Score (25%) */}
            <div className="lg:col-span-1">
              <div className="bg-[#2563eb]/5 rounded-lg border-2 border-[#2563eb]/20 p-6">
                <div className="text-[13px] text-black/[0.6] uppercase tracking-wide mb-2">Platform Avg ALI</div>
                <div className="text-[64px] font-bold leading-none text-[#2563eb] mb-2">
                  {fmt1(data.metrics.avgALIScore)}
                </div>
                <div className="text-[13px] text-black/[0.6]">0–100 (higher is healthier)</div>
              </div>
            </div>

            {/* Right: Platform Metrics Breakdown (75%) */}
            <div className="lg:col-span-3">
              <div className="mb-6">
                <div className="text-[18px] font-semibold text-black/[0.87] mb-1">Platform Health</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Companies */}
                <div className="bg-white rounded-lg border border-black/[0.12] p-4">
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
                    {data.metrics.companies.active} active • {data.metrics.companies.inactive} inactive
                  </div>
                </div>

                {/* Leaders */}
                <div className="bg-white rounded-lg border border-black/[0.12] p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-[#8b5cf6]/10 flex items-center justify-center">
                      <Crown className="w-5 h-5 text-[#8b5cf6]" />
                    </div>
                    <span className="text-[13px] font-semibold text-black/[0.6]">Leaders</span>
                  </div>
                  <div className="text-[36px] font-bold text-black/[0.87] leading-none mb-2">
                    {data.metrics.leaders.total}
                  </div>
                  <div className="text-[13px] text-black/[0.6]">
                    {data.metrics.leaders.active} active ({fmt1(data.metrics.leaders.activePercent)}%)
                  </div>
                </div>

                {/* Surveys */}
                <div className="bg-white rounded-lg border border-black/[0.12] p-4">
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
                    {data.metrics.surveys.thisMonth} this month • {data.metrics.surveys.thisQuarter} this quarter
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
      </div>
    </div>
  );
};

export default SuperAdminOverview;
