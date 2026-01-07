import React, { useState, useEffect } from 'react';
import { Filter, Download } from 'lucide-react';
import SuperAdminNav from '../../components/ali/SuperAdminNav';

const SuperAdminAuditLog = () => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // This endpoint would need to be created
        // const response = await fetch('/api/ali/super-admin/audit-log');
        // const result = await response.json();
        // if (result.ok) {
        //   setAuditLogs(result.logs || []);
        // }
      } catch (error) {
        console.error('Error fetching audit log:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Mock data matching the screenshot
  const mockData = [
    {
      id: 'log_001',
      timestamp: '2026-01-05T08:32:15Z',
      admin: 'admin@archetypeoriginal.com',
      action: 'intelligence_prompt_copy',
      resource: 'int_001',
      details: 'Copied prompt for Acme Corp leadership challenge'
    },
    {
      id: 'log_002',
      timestamp: '2026-01-05T05:20:42Z',
      admin: 'admin@archetypeoriginal.com',
      action: 'tenant_view',
      resource: 'ten_003',
      details: 'Viewed Global Industries tenant details'
    },
    {
      id: 'log_003',
      timestamp: '2026-01-04T10:45:30Z',
      admin: 'superadmin@archetypeoriginal.com',
      action: 'deletion_dryrun',
      resource: 'sur_042',
      details: 'Ran dry-run for survey deletion (15 responses would be deleted)'
    }
  ];

  const displayLogs = auditLogs.length > 0 ? auditLogs : mockData;

  const formatTimestamp = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const handleExportCSV = () => {
    const csv = [
      ['Timestamp', 'Admin', 'Action', 'Resource', 'Details'],
      ...displayLogs.map(log => [
        formatTimestamp(log.timestamp),
        log.admin,
        log.action,
        log.resource,
        log.details
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ali-audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#fafafa] ali-system">
      <SuperAdminNav activeTab="audit-log" />
      
      <div className="pt-8 pb-12 px-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[28px] font-semibold text-black/[0.87] mb-1">Audit Log</h1>
            <p className="text-[14px] text-black/[0.6]">Track all super admin actions with detailed filtering and export</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 border border-black/[0.12] bg-white text-black/[0.87] rounded-lg text-[14px] font-semibold hover:bg-black/[0.04] transition-colors flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filter
            </button>
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-[#2563eb] text-white rounded-lg text-[14px] font-semibold hover:bg-[#1d4ed8] transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-black/[0.12] overflow-hidden">
          <table className="w-full">
            <thead className="bg-black/[0.04]">
              <tr>
                <th className="px-6 py-3 text-left text-[13px] font-semibold text-black/[0.6] uppercase tracking-wide">Timestamp</th>
                <th className="px-6 py-3 text-left text-[13px] font-semibold text-black/[0.6] uppercase tracking-wide">Admin</th>
                <th className="px-6 py-3 text-left text-[13px] font-semibold text-black/[0.6] uppercase tracking-wide">Action</th>
                <th className="px-6 py-3 text-left text-[13px] font-semibold text-black/[0.6] uppercase tracking-wide">Resource</th>
                <th className="px-6 py-3 text-left text-[13px] font-semibold text-black/[0.6] uppercase tracking-wide">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.12]">
              {displayLogs.map((log) => (
                <tr key={log.id} className="hover:bg-black/[0.04] transition-colors">
                  <td className="px-6 py-4 text-[14px] text-black/[0.87]">{formatTimestamp(log.timestamp)}</td>
                  <td className="px-6 py-4 text-[14px] text-black/[0.87]">{log.admin}</td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-black/[0.08] text-black/[0.87]">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[14px] text-black/[0.87]">{log.resource}</td>
                  <td className="px-6 py-4 text-[14px] text-black/[0.6]">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminAuditLog;

