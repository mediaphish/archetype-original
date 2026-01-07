import React, { useState, useEffect } from 'react';
import { Users, Crown, ClipboardCheck, TrendingUp } from 'lucide-react';
import SuperAdminNav from '../../components/ali/SuperAdminNav';

const SuperAdminOverview = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch data from API
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

  // Mock data matching the screenshot exactly
  const mockData = {
    metrics: {
      companies: { total: 47, active: 42, inactive: 5 },
      leaders: { total: 156, active: 142, activePercent: 91.0 },
      surveys: { total: 312, thisMonth: 18, thisQuarter: 56 },
      avgALIScore: 71.4
    },
    zoneDistribution: [
      { zone: 'green', range: '75-100', count: 18, percent: 42.9 },
      { zone: 'yellow', range: '60-74', count: 16, percent: 38.1 },
      { zone: 'orange', range: '45-59', count: 6, percent: 14.3 },
      { zone: 'red', range: '0-44', count: 2, percent: 4.8 }
    ],
    quarterlyTrends: [
      { quarter: '2025 Q2', companies: 38, leaders: 128, avgScore: 68.2, responses: 1842, changes: {} },
      { quarter: '2025 Q3', companies: 41, leaders: 139, avgScore: 69.5, responses: 2156, changes: { companies: 3, leaders: 11 } },
      { quarter: '2025 Q4', companies: 44, leaders: 148, avgScore: 70.3, responses: 2398, changes: { companies: 3, leaders: 9 } },
      { quarter: '2026 Q1', companies: 47, leaders: 156, avgScore: 71.4, responses: 2036, changes: { companies: 3, leaders: 8 } }
    ],
    engagement: {
      responseRate: 87.3,
      completionTime: 4.8,
      surveysPerCompany: 6.6,
      responsesPerSurvey: 27
    },
    completion: {
      byDevice: [
        { device: 'Desktop', percent: 68 },
        { device: 'Mobile', percent: 28 },
        { device: 'Tablet', percent: 4 }
      ],
      dropoutRate: 8.7,
      mostCommon: 'Question 18 (Leadership Drift)'
    },
    patterns: [
      { name: 'Clarity', score: 73.8, change: 5.2, distribution: { high: 45, medium: 42, low: 13 } },
      { name: 'Consistency', score: 71.2, change: 3.8, distribution: { high: 42, medium: 45, low: 13 } },
      { name: 'Trust', score: 69.5, change: 4.1, distribution: { high: 38, medium: 48, low: 14 } },
      { name: 'Communication', score: 72.4, change: 5.6, distribution: { high: 44, medium: 43, low: 13 } },
      { name: 'Alignment', score: 70.8, change: 3.2, distribution: { high: 40, medium: 46, low: 14 } },
      { name: 'Stability', score: 68.9, change: 2.9, distribution: { high: 36, medium: 49, low: 15 } }
    ],
    byCompanySize: [
      { size: '1-5 leaders', count: 12, avgScore: 68.5, responseRate: 84.2 },
      { size: '6-10 leaders', count: 18, avgScore: 71.2, responseRate: 88.6 },
      { size: '11-20 leaders', count: 9, avgScore: 73.4, responseRate: 91.3 },
      { size: '21+ leaders', count: 3, avgScore: 75.8, responseRate: 93.7 }
    ],
    byTenure: [
      { tenure: '0-3 months', count: 8, avgScore: 66.4, completion: 78.3 },
      { tenure: '3-6 months', count: 14, avgScore: 69.8, completion: 85.9 },
      { tenure: '6-12 months', count: 12, avgScore: 72.5, completion: 91.2 },
      { tenure: '12+ months', count: 8, avgScore: 74.9, completion: 94.8 }
    ],
    topCompanies: [
      { name: 'Company A', leaders: 24, surveys: 12, score: 82.4, zone: 'green' },
      { name: 'Company B', leaders: 18, surveys: 10, score: 79.8, zone: 'green' },
      { name: 'Company C', leaders: 15, surveys: 8, score: 77.2, zone: 'green' }
    ]
  };

  const displayData = data || mockData;

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
    // Color scale: < 60% red, 60-70% orange, 70-80% yellow, >= 80% green
    if (rate >= 80) return '#10b981'; // green - excellent
    if (rate >= 70) return '#f59e0b'; // yellow - good
    if (rate >= 60) return '#fb923c'; // orange - fair
    return '#ef4444'; // red - poor
  };

  return (
    <div className="min-h-screen bg-[#fafafa] ali-system">
      <SuperAdminNav activeTab="overview" />
      
      <div className="pt-8 pb-12 px-6 max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-[28px] font-semibold text-black/[0.87] mb-1">Platform Overview</h1>
          <p className="text-[14px] text-black/[0.6]">System-wide metrics, growth analytics, and deployment insights</p>
        </div>

        {/* Section 1: Platform Overview Metrics (4 cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Companies Card - Blue icon */}
          <div className="bg-white rounded-xl border border-black/[0.12] p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-[#2563eb]/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-[#2563eb]" />
              </div>
              <span className="text-[13px] font-semibold text-black/[0.6]">Companies</span>
            </div>
            <div className="text-[42px] font-bold text-black/[0.87] leading-none mb-2">
              {displayData.metrics.companies.total}
            </div>
            <div className="text-[13px] text-black/[0.6]">
              {displayData.metrics.companies.active} active • {displayData.metrics.companies.inactive} inactive
            </div>
          </div>

          {/* Leaders Card - Purple icon */}
          <div className="bg-white rounded-xl border border-black/[0.12] p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-[#8b5cf6]/10 flex items-center justify-center">
                <Crown className="w-5 h-5 text-[#8b5cf6]" />
              </div>
              <span className="text-[13px] font-semibold text-black/[0.6]">Leaders</span>
            </div>
            <div className="text-[42px] font-bold text-black/[0.87] leading-none mb-2">
              {displayData.metrics.leaders.total}
            </div>
            <div className="text-[13px] text-black/[0.6]">
              {displayData.metrics.leaders.active} active ({displayData.metrics.leaders.activePercent}%)
            </div>
          </div>

          {/* Surveys Card - Green icon */}
          <div className="bg-white rounded-xl border border-black/[0.12] p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-[#10b981]/10 flex items-center justify-center">
                <ClipboardCheck className="w-5 h-5 text-[#10b981]" />
              </div>
              <span className="text-[13px] font-semibold text-black/[0.6]">Surveys</span>
            </div>
            <div className="text-[42px] font-bold text-black/[0.87] leading-none mb-2">
              {displayData.metrics.surveys.total}
            </div>
            <div className="text-[13px] text-black/[0.6]">
              {displayData.metrics.surveys.thisMonth} this month • {displayData.metrics.surveys.thisQuarter} this quarter
            </div>
          </div>

          {/* Avg ALI Score Card - Yellow icon */}
          <div className="bg-white rounded-xl border border-black/[0.12] p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-[#f59e0b]/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#f59e0b]" />
              </div>
              <span className="text-[13px] font-semibold text-black/[0.6]">Avg ALI Score</span>
            </div>
            <div className="text-[42px] font-bold text-black/[0.87] leading-none mb-2">
              {displayData.metrics.avgALIScore}
            </div>
            <div className="text-[13px] text-black/[0.6]">
              Platform-wide average
            </div>
          </div>
        </div>

        {/* Section 2: Score Distribution by Zone */}
        <div className="bg-white rounded-xl border border-black/[0.12] p-8 shadow-sm">
          <h2 className="text-[22px] font-semibold text-black/[0.87] mb-6">Score Distribution by Zone</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {displayData.zoneDistribution.map((zone) => {
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
                  <div className="text-[13px] text-black/[0.6] mb-3">{zone.percent}%</div>
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

        {/* Section 3: Quarterly Growth Trends */}
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
                {displayData.quarterlyTrends.map((trend, idx) => (
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
                    <td className="px-6 py-4 text-[14px] text-[#f59e0b] font-semibold">{trend.avgScore}</td>
                    <td className="px-6 py-4 text-[14px] text-black/[0.87]">{trend.responses.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 4 & 5: Engagement Metrics & Completion Insights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Engagement Metrics */}
          <div className="bg-white rounded-xl border border-black/[0.12] p-8 shadow-sm">
            <h3 className="text-[18px] font-semibold text-black/[0.87] mb-6">Engagement Metrics</h3>
            <div className="space-y-4">
              <div>
                <div className="text-[13px] text-black/[0.6] mb-1">Response Rate</div>
                <div 
                  className="text-[20px] font-semibold"
                  style={{ color: getResponseRateColor(displayData.engagement.responseRate) }}
                >
                  {displayData.engagement.responseRate}%
                </div>
              </div>
              <div>
                <div className="text-[13px] text-black/[0.6] mb-1">Completion Time</div>
                <div className="text-[20px] font-semibold text-black/[0.87]">{displayData.engagement.completionTime} min</div>
              </div>
              <div>
                <div className="text-[13px] text-black/[0.6] mb-1">Surveys/Company</div>
                <div className="text-[20px] font-semibold text-black/[0.87]">{displayData.engagement.surveysPerCompany}</div>
              </div>
              <div>
                <div className="text-[13px] text-black/[0.6] mb-1">Responses/Survey</div>
                <div className="text-[20px] font-semibold text-black/[0.87]">{displayData.engagement.responsesPerSurvey}</div>
              </div>
            </div>
          </div>

          {/* Completion Insights */}
          <div className="bg-white rounded-xl border border-black/[0.12] p-8 shadow-sm">
            <h3 className="text-[18px] font-semibold text-black/[0.87] mb-6">Completion Insights</h3>
            <div className="space-y-4 mb-4">
              {displayData.completion.byDevice.map((device) => (
                <div key={device.device}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[13px] text-black/[0.6]">{device.device}</span>
                    <span className="text-[13px] font-semibold text-black/[0.87]">{device.percent}%</span>
                  </div>
                  <div className="w-full h-3 bg-black/[0.08] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#2563eb] rounded-full"
                      style={{ width: `${device.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-4 border-t border-black/[0.12]">
              <div className="text-[13px] text-black/[0.6] mb-1">Dropout Rate</div>
              <div className="text-[20px] font-semibold text-black/[0.87]">{displayData.completion.dropoutRate}%</div>
              <div className="text-[13px] text-black/[0.6] mt-2">Most common: {displayData.completion.mostCommon}</div>
            </div>
          </div>
        </div>

        {/* Section 6: Pattern Analysis Across Platform */}
        <div className="bg-white rounded-xl border border-black/[0.12] p-8 shadow-sm">
          <h2 className="text-[22px] font-semibold text-black/[0.87] mb-6">Pattern Analysis Across Platform</h2>
          <div className="space-y-4">
            {displayData.patterns.map((pattern) => (
              <div key={pattern.name} className="pb-4 border-b border-black/[0.12] last:border-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-[16px] font-semibold text-black/[0.87]">{pattern.name}</span>
                    <span className="text-[16px] font-bold text-[#f59e0b]">{pattern.score}</span>
                    <div className="flex items-center gap-1 text-[#10b981]">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-[14px] font-semibold">+{pattern.change}</span>
                    </div>
                  </div>
                </div>
                <div className="w-full h-2 bg-black/[0.08] rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-[#2563eb] rounded-full"
                    style={{ width: `${pattern.score}%` }}
                  />
                </div>
                <div className="text-[13px] text-black/[0.6]">
                  {pattern.distribution.high}% high - {pattern.distribution.medium}% medium - {pattern.distribution.low}% low
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 7 & 8: By Company Size & By Customer Tenure */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* By Company Size */}
          <div className="bg-white rounded-xl border border-black/[0.12] p-8 shadow-sm">
            <h3 className="text-[18px] font-semibold text-black/[0.87] mb-6">By Company Size</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-black/[0.04]">
                  <tr>
                    <th className="px-4 py-2 text-left text-[13px] font-semibold text-black/[0.6] uppercase tracking-wide">Size</th>
                    <th className="px-4 py-2 text-left text-[13px] font-semibold text-black/[0.6] uppercase tracking-wide">Count</th>
                    <th className="px-4 py-2 text-left text-[13px] font-semibold text-black/[0.6] uppercase tracking-wide">Avg Score</th>
                    <th className="px-4 py-2 text-left text-[13px] font-semibold text-black/[0.6] uppercase tracking-wide">Response Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.12]">
                  {displayData.byCompanySize.map((item, idx) => (
                    <tr key={idx} className="hover:bg-black/[0.04] transition-colors">
                      <td className="px-4 py-3 text-[14px] text-black/[0.87]">{item.size}</td>
                      <td className="px-4 py-3 text-[14px] text-black/[0.87]">{item.count}</td>
                      <td className="px-4 py-3 text-[14px] text-[#f59e0b] font-semibold">{item.avgScore}</td>
                      <td className="px-4 py-3 text-[14px] text-[#10b981] font-semibold">{item.responseRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* By Customer Tenure */}
          <div className="bg-white rounded-xl border border-black/[0.12] p-8 shadow-sm">
            <h3 className="text-[18px] font-semibold text-black/[0.87] mb-6">By Customer Tenure</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-black/[0.04]">
                  <tr>
                    <th className="px-4 py-2 text-left text-[13px] font-semibold text-black/[0.6] uppercase tracking-wide">Tenure</th>
                    <th className="px-4 py-2 text-left text-[13px] font-semibold text-black/[0.6] uppercase tracking-wide">Count</th>
                    <th className="px-4 py-2 text-left text-[13px] font-semibold text-black/[0.6] uppercase tracking-wide">Avg Score</th>
                    <th className="px-4 py-2 text-left text-[13px] font-semibold text-black/[0.6] uppercase tracking-wide">Completion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.12]">
                  {displayData.byTenure.map((item, idx) => (
                    <tr key={idx} className="hover:bg-black/[0.04] transition-colors">
                      <td className="px-4 py-3 text-[14px] text-black/[0.87]">{item.tenure}</td>
                      <td className="px-4 py-3 text-[14px] text-black/[0.87]">{item.count}</td>
                      <td className="px-4 py-3 text-[14px] text-[#f59e0b] font-semibold">{item.avgScore}</td>
                      <td className="px-4 py-3 text-[14px] text-[#10b981] font-semibold">{item.completion}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Section 9: Top Performing Companies */}
        <div className="bg-white rounded-xl border border-black/[0.12] p-8 shadow-sm">
          <h2 className="text-[22px] font-semibold text-black/[0.87] mb-6">Top Performing Companies</h2>
          <div className="space-y-4">
            {displayData.topCompanies.map((company, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 rounded-lg border border-black/[0.12]">
                <div>
                  <div className="text-[16px] font-semibold text-black/[0.87] mb-1">{company.name}</div>
                  <div className="text-[13px] text-black/[0.6]">{company.leaders} leaders • {company.surveys} surveys</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-[20px] font-bold text-[#10b981]">{company.score}</div>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-green-100 text-green-700">
                    GREEN ZONE
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminOverview;

