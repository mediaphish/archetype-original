import React, { useState, useEffect, useCallback } from 'react';
import { Search, ExternalLink } from 'lucide-react';
import SuperAdminNav from '../../components/ali/SuperAdminNav';

function getSuperAdminEmail() {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('email');
  if (fromUrl) return fromUrl.trim();
  try {
    const stored = localStorage.getItem('ali_email');
    if (stored) return stored.trim();
  } catch (_) {}
  return '';
}

const SuperAdminTenants = () => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);

  const fetchTenants = useCallback(async () => {
    const email = getSuperAdminEmail();
    const url = email ? `/api/ali/admin/tenants?email=${encodeURIComponent(email)}` : '/api/ali/admin/tenants';
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(url);
      const result = await response.json();
      if (result.ok) {
        setTenants(result.tenants || []);
      } else {
        setError(result.error || 'Failed to load tenants');
        setTenants([]);
      }
    } catch (e) {
      console.error('Error fetching tenants:', e);
      setError('Failed to load tenants');
      setTenants([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const filteredTenants = tenants.filter((tenant) =>
    (tenant.companyName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString) => {
    if (!dateString) return '–';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const display = (v) => (v != null && v !== '' ? String(v) : '–');

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

        {error && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-[14px] text-amber-800">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-xl border border-black/[0.12] p-8 text-center text-black/[0.6]">
            Loading…
          </div>
        ) : (
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
                {filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-[14px] text-black/[0.6]">
                      No tenants. Sign up or run a wipe to see companies here.
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map((tenant) => (
                    <tr
                      key={tenant.id}
                      className="hover:bg-black/[0.04] transition-colors cursor-pointer"
                      onClick={() => handleViewCompany(tenant.id)}
                    >
                      <td className="px-6 py-4 text-[14px] text-black/[0.87]">{display(tenant.companyName)}</td>
                      <td className="px-6 py-4 text-[14px] text-black/[0.87]">{display(tenant.leaders)}</td>
                      <td className="px-6 py-4 text-[14px] text-black/[0.87]">{display(tenant.surveys)}</td>
                      <td className="px-6 py-4 text-[14px] text-[#fb923c] font-semibold">{display(tenant.aliScore)}</td>
                      <td className="px-6 py-4 text-[14px] text-black/[0.87]">{formatDate(tenant.lastSurvey || tenant.created_at)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${
                          (tenant.status || 'active').toUpperCase() === 'ACTIVE'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {(tenant.status || 'active').toUpperCase()}
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminTenants;

