import React, { useState, useEffect } from 'react';
import { Search, ExternalLink } from 'lucide-react';
import SuperAdminNav from '../../components/ali/SuperAdminNav';

const SuperAdminTenants = () => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/ali/admin/tenants');
        const result = await response.json();
        if (result.ok) {
          setTenants(result.tenants || []);
        }
      } catch (error) {
        console.error('Error fetching tenants:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Mock data matching the screenshot
  const mockData = [
    {
      id: 'ten_001',
      companyName: 'Acme Corp',
      leaders: 12,
      surveys: 24,
      aliScore: 73.5,
      lastSurvey: '2026-01-02',
      status: 'ACTIVE'
    },
    {
      id: 'ten_002',
      companyName: 'TechStart Inc',
      leaders: 8,
      surveys: 16,
      aliScore: 68.2,
      lastSurvey: '2025-12-27',
      status: 'ACTIVE'
    },
    {
      id: 'ten_003',
      companyName: 'Global Industries',
      leaders: 24,
      surveys: 48,
      aliScore: 76.8,
      lastSurvey: '2026-01-04',
      status: 'ACTIVE'
    }
  ];

  const displayTenants = tenants.length > 0 ? tenants : mockData;

  const filteredTenants = displayTenants.filter(tenant =>
    tenant.companyName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleViewCompany = (companyId) => {
    window.history.pushState({}, '', `/ali/super-admin/tenants/${companyId}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <div className="min-h-screen bg-[#fafafa] ali-system">
      <SuperAdminNav activeTab="tenants" />
      
      <div className="pt-8 pb-12 px-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-[28px] font-semibold text-black/[0.87] mb-1">Tenants Management</h1>
          <p className="text-[14px] text-black/[0.6]">Browse companies and manage tenant configurations</p>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-black/[0.38]" />
          <input
            type="text"
            placeholder="Search companies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-black/[0.12] rounded-lg text-[14px] text-black/[0.87] placeholder:text-black/[0.38] focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-black/[0.12] overflow-hidden">
          <table className="w-full">
            <thead className="bg-black/[0.04]">
              <tr>
                <th className="px-6 py-3 text-left text-[13px] font-semibold text-black/[0.6] uppercase tracking-wide">Company</th>
                <th className="px-6 py-3 text-left text-[13px] font-semibold text-black/[0.6] uppercase tracking-wide">Leaders</th>
                <th className="px-6 py-3 text-left text-[13px] font-semibold text-black/[0.6] uppercase tracking-wide">Surveys</th>
                <th className="px-6 py-3 text-left text-[13px] font-semibold text-black/[0.6] uppercase tracking-wide">ALI Score</th>
                <th className="px-6 py-3 text-left text-[13px] font-semibold text-black/[0.6] uppercase tracking-wide">Last Survey</th>
                <th className="px-6 py-3 text-left text-[13px] font-semibold text-black/[0.6] uppercase tracking-wide">Status</th>
                <th className="px-6 py-3 text-left text-[13px] font-semibold text-black/[0.6] uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.12]">
              {filteredTenants.map((tenant) => (
                <tr
                  key={tenant.id}
                  className="hover:bg-black/[0.04] transition-colors cursor-pointer"
                  onClick={() => handleViewCompany(tenant.id)}
                >
                  <td className="px-6 py-4 text-[14px] text-black/[0.87]">{tenant.companyName}</td>
                  <td className="px-6 py-4 text-[14px] text-black/[0.87]">{tenant.leaders}</td>
                  <td className="px-6 py-4 text-[14px] text-black/[0.87]">{tenant.surveys}</td>
                  <td className="px-6 py-4 text-[14px] text-[#fb923c] font-semibold">{tenant.aliScore}</td>
                  <td className="px-6 py-4 text-[14px] text-black/[0.87]">{formatDate(tenant.lastSurvey)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${
                      tenant.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {tenant.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewCompany(tenant.id);
                      }}
                      className="text-black/[0.6] hover:text-black/[0.87] transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminTenants;

