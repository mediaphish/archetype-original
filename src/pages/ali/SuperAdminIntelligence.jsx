import React, { useState, useEffect } from 'react';
import { Copy, ExternalLink } from 'lucide-react';
import SuperAdminNav from '../../components/ali/SuperAdminNav';

const SuperAdminIntelligence = () => {
  const [intelligenceItems, setIntelligenceItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/ali/super-admin/intelligence');
        const result = await response.json();
        if (result.ok) {
          setIntelligenceItems(result.items || []);
        }
      } catch (error) {
        console.error('Error fetching intelligence:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Mock data matching the screenshot
  const mockData = [
    {
      id: 'int_001',
      companyName: 'Acme Corp',
      leaderName: 'Sarah Johnson',
      timestamp: '2026-01-05T04:30:00Z',
      priority: 'HIGH',
      type: 'leadership challenge',
      metrics: {
        aliScore: 68.5,
        pattern: 'Communication',
        gap: 15
      },
      description: 'Based on the leadership assessment data showing a 15-point gap between leader self-perception (85) and team reality (70) in the area of Communication Clarity, I recommend focusing on:',
      recommendations: [
        'Weekly team check-ins with structured agenda',
        'Implementing a feedback loop system',
        'Documenting decisions and sharing context proactively'
      ],
      conclusion: 'The data indicates this gap has widened over the last 2 surveys, suggesting an urgent need for intervention.'
    },
    {
      id: 'int_002',
      companyName: 'TechStart Inc',
      leaderName: 'Michael Chen',
      timestamp: '2026-01-04T09:45:00Z',
      priority: 'MEDIUM',
      type: 'deployment feedback',
      description: 'Deployment feedback indicates the leader is struggling with the initial survey setup. Recommended actions:',
      recommendations: [
        'Schedule a 30-minute onboarding call to walk through the survey deployment process',
        'Provide the deployment checklist and timeline template',
        'Address concerns about team response rates'
      ],
      conclusion: 'The leader expressed uncertainty about survey timing and whether to announce it in advance.'
    }
  ];

  const displayItems = intelligenceItems.length > 0 ? intelligenceItems : mockData;
  const pendingCount = displayItems.filter(item => !item.dismissed_at).length;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getPriorityBadge = (priority) => {
    const styles = {
      HIGH: 'bg-red-100 text-red-700',
      MEDIUM: 'bg-yellow-100 text-yellow-700',
      LOW: 'bg-gray-100 text-gray-700'
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${styles[priority] || styles.LOW}`}>
        {priority}
      </span>
    );
  };

  const handleCopyPrompt = async (item) => {
    const promptText = `${item.description}\n\n${item.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}\n\n${item.conclusion}`;
    await navigator.clipboard.writeText(promptText);
    // Log action
    try {
      await fetch(`/api/ali/super-admin/intelligence/${item.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'prompt_copied' })
      });
    } catch (error) {
      console.error('Error logging action:', error);
    }
  };

  const handleViewCompany = (companyName) => {
    window.history.pushState({}, '', `/ali/super-admin/tenants`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleMarkResolved = async (itemId) => {
    try {
      await fetch(`/api/ali/super-admin/intelligence/${itemId}/dismiss`, {
        method: 'POST'
      });
      setIntelligenceItems(items => items.filter(item => item.id !== itemId));
    } catch (error) {
      console.error('Error dismissing item:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] ali-system">
      <SuperAdminNav activeTab="intelligence" />
      
      <div className="pt-8 pb-12 px-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[28px] font-semibold text-black/[0.87] mb-1">Intelligence Inbox</h1>
            <p className="text-[14px] text-black/[0.6]">AI-generated prompts from leadership challenges and deployment feedback</p>
          </div>
          <span className="px-3 py-1.5 rounded-full text-[13px] font-medium bg-blue-100 text-blue-700">
            {pendingCount} Pending
          </span>
        </div>

        {/* Intelligence Cards */}
        <div className="space-y-4">
          {displayItems.map((item) => (
            <div key={item.id} className="bg-white rounded-xl border border-black/[0.12] p-6 shadow-sm">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[18px] font-semibold text-black/[0.87]">{item.companyName}</h3>
                <div className="flex items-center gap-2">
                  {getPriorityBadge(item.priority)}
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700">
                    {item.type}
                  </span>
                </div>
              </div>

              {/* Details */}
              <p className="text-[13px] text-black/[0.6] mb-4">
                Leader: {item.leaderName} • {formatDate(item.timestamp)}
              </p>

              {/* Metrics */}
              {item.metrics && (
                <div className="flex items-center gap-2 mb-4">
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-100 text-blue-700">
                    ALI: {item.metrics.aliScore}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-purple-100 text-purple-700">
                    {item.metrics.pattern}
                  </span>
                  {item.metrics.gap && (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-red-100 text-red-700">
                      Gap: {item.metrics.gap} pts
                    </span>
                  )}
                </div>
              )}

              {/* Description */}
              <p className="text-[14px] text-black/[0.87] mb-4">
                {item.description}
              </p>

              {/* Recommendations */}
              {item.recommendations && item.recommendations.length > 0 && (
                <ol className="list-decimal list-inside space-y-2 mb-4 text-[14px] text-black/[0.87]">
                  {item.recommendations.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ol>
              )}

              {/* Conclusion */}
              <p className="text-[14px] text-black/[0.87] mb-4">
                {item.conclusion}
              </p>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4 border-t border-black/[0.12]">
                <button
                  onClick={() => handleCopyPrompt(item)}
                  className="px-4 py-2 bg-[#2563eb] text-white rounded-lg text-[14px] font-semibold hover:bg-[#1d4ed8] transition-colors flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy Prompt
                </button>
                <button
                  onClick={() => handleViewCompany(item.companyName)}
                  className="px-4 py-2 border border-black/[0.12] bg-white text-black/[0.87] rounded-lg text-[14px] font-semibold hover:bg-black/[0.04] transition-colors flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Company
                </button>
                <button
                  onClick={() => handleMarkResolved(item.id)}
                  className="text-[14px] text-black/[0.6] hover:text-black/[0.87] transition-colors"
                >
                  Mark as Resolved
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SuperAdminIntelligence;

