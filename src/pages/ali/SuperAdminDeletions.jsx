import React, { useState, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';
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

const SuperAdminDeletions = () => {
  const [companyId, setCompanyId] = useState('');
  const [surveyId, setSurveyId] = useState('');
  const [loading, setLoading] = useState(false);
  const [dryRunResult, setDryRunResult] = useState(null);
  const [wipeAllConfirm, setWipeAllConfirm] = useState(false);

  const requireEmail = useCallback(() => {
    const email = getSuperAdminEmail();
    if (!email) {
      alert('Super admin email required. Open this page from a magic-link sign-in (URL has ?email=...) or ensure ali_email is in localStorage.');
      return null;
    }
    return email;
  }, []);

  const handleDryRun = async (type, id) => {
    if ((type === 'company' || type === 'survey') && !id) {
      alert('Please enter an ID');
      return;
    }
    const email = requireEmail();
    if (!email) return;

    setLoading(true);
    try {
      const body = { resource_type: type, email };
      if (id) body.resource_id = id;
      const response = await fetch('/api/ali/admin/deletions/dry-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const text = await response.text();
      let result;
      try {
        result = text ? JSON.parse(text) : {};
      } catch (_) {
        alert(`Dry-run failed: server returned an error (status ${response.status}). Check the browser console for details.`);
        setLoading(false);
        return;
      }
      if (result.ok) {
        setDryRunResult(result.summary);
      } else {
        alert(result.error || 'Dry-run failed');
      }
    } catch (error) {
      console.error('Error running dry-run:', error);
      const msg = error?.message || String(error);
      alert(`Dry-run failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInitiateDeletion = async (type, id, opts = {}) => {
    if ((type === 'company' || type === 'survey') && !id) {
      alert('Please enter an ID');
      return;
    }
    if (type === 'wipe_all' && !opts.confirmWipeAll) {
      alert('Check "I understand this deletes all ALI data" to enable Execute wipe all.');
      return;
    }
    const email = requireEmail();
    if (!email) return;

    if (!confirm('Are you sure you want to initiate this deletion? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      const body = {
        resource_type: type,
        email,
        reason: 'Manual deletion by Super Admin'
      };
      if (id) body.resource_id = id;
      if (type === 'wipe_all') body.confirm_wipe_all = true;
      const response = await fetch('/api/ali/admin/deletions/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const text = await response.text();
      let result;
      try {
        result = text ? JSON.parse(text) : {};
      } catch (_) {
        alert(`Deletion failed: server returned an error (status ${response.status}). Check the browser console.`);
        setLoading(false);
        return;
      }
      if (result.ok) {
        alert('Deletion initiated successfully');
        if (type === 'company') setCompanyId('');
        if (type === 'survey') setSurveyId('');
        setDryRunResult(null);
      } else {
        alert(result.error || 'Deletion initiation failed');
      }
    } catch (error) {
      console.error('Error initiating deletion:', error);
      const msg = error?.message || String(error);
      alert(`Deletion failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa] ali-system">
      <SuperAdminNav activeTab="deletions" />
      
      <div className="pt-8 pb-12 px-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-[28px] font-semibold text-black/[0.87] mb-1">Deletion Console</h1>
          <p className="text-[14px] text-black/[0.6]">Safely delete companies, surveys, and related data with dry-run testing</p>
        </div>

        {/* Warning Box */}
        <div className="bg-red-50 border-l-4 border-[#ef4444] rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#ef4444] mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-[14px] font-semibold text-red-800 mb-1">Destructive Operation</h3>
              <p className="text-[13px] text-red-700">
                Deletions are permanent and cannot be undone. Always run a dry-run first to verify the scope of deletion before executing. All actions are logged and require confirmation.
              </p>
            </div>
          </div>
        </div>

        {/* Delete Company Section */}
        <div className="bg-white rounded-xl border border-black/[0.12] p-6 shadow-sm">
          <h3 className="text-[18px] font-semibold text-black/[0.87] mb-4">Delete Company</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-black/[0.6] mb-2">
                Company ID
              </label>
              <input
                type="text"
                placeholder="company UUID..."
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="w-full px-4 py-2 border border-black/[0.12] rounded-lg text-[14px] text-black/[0.87] placeholder:text-black/[0.38] focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleDryRun('company', companyId)}
                disabled={loading || !companyId}
                className="px-4 py-2 border border-black/[0.12] bg-white text-black/[0.87] rounded-lg text-[14px] font-semibold hover:bg-black/[0.04] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Run Dry-Run
              </button>
              <button
                onClick={() => handleInitiateDeletion('company', companyId)}
                disabled={loading || !companyId}
                className="px-4 py-2 bg-[#ef4444] text-white rounded-lg text-[14px] font-semibold hover:bg-[#dc2626] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Initiate Deletion
              </button>
            </div>
          </div>
        </div>

        {/* Delete Survey Section */}
        <div className="bg-white rounded-xl border border-black/[0.12] p-6 shadow-sm">
          <h3 className="text-[18px] font-semibold text-black/[0.87] mb-4">Delete Survey</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-black/[0.6] mb-2">
                Survey ID (deployment UUID)
              </label>
              <input
                type="text"
                placeholder="deployment UUID..."
                value={surveyId}
                onChange={(e) => setSurveyId(e.target.value)}
                className="w-full px-4 py-2 border border-black/[0.12] rounded-lg text-[14px] text-black/[0.87] placeholder:text-black/[0.38] focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleDryRun('survey', surveyId)}
                disabled={loading || !surveyId}
                className="px-4 py-2 border border-black/[0.12] bg-white text-black/[0.87] rounded-lg text-[14px] font-semibold hover:bg-black/[0.04] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Run Dry-Run
              </button>
              <button
                onClick={() => handleInitiateDeletion('survey', surveyId)}
                disabled={loading || !surveyId}
                className="px-4 py-2 bg-[#ef4444] text-white rounded-lg text-[14px] font-semibold hover:bg-[#dc2626] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Initiate Deletion
              </button>
            </div>
          </div>
        </div>

        {/* Wipe test data */}
        <div className="bg-white rounded-xl border border-black/[0.12] p-6 shadow-sm">
          <h3 className="text-[18px] font-semibold text-black/[0.87] mb-2">Wipe test data</h3>
          <p className="text-[13px] text-black/[0.6] mb-4">
            Wipe list: companies matching ALI_WIPE_IDS or ALI_WIPE_NAMES (env). Wipe all: every company and related data.
          </p>
          <div className="flex flex-wrap gap-3 items-center">
            <button
              onClick={() => handleDryRun('wipe_list')}
              disabled={loading}
              className="px-4 py-2 border border-black/[0.12] bg-white text-black/[0.87] rounded-lg text-[14px] font-semibold hover:bg-black/[0.04] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Dry-run wipe list
            </button>
            <button
              onClick={() => handleInitiateDeletion('wipe_list')}
              disabled={loading}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg text-[14px] font-semibold hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Execute wipe list
            </button>
            <span className="text-black/[0.38]">|</span>
            <button
              onClick={() => handleDryRun('wipe_all')}
              disabled={loading}
              className="px-4 py-2 border border-black/[0.12] bg-white text-black/[0.87] rounded-lg text-[14px] font-semibold hover:bg-black/[0.04] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Dry-run wipe all
            </button>
            <label className="flex items-center gap-2 text-[13px] text-black/[0.87]">
              <input
                type="checkbox"
                checked={wipeAllConfirm}
                onChange={(e) => setWipeAllConfirm(e.target.checked)}
                className="rounded border-black/[0.24]"
              />
              I understand this deletes all ALI data
            </label>
            <button
              onClick={() => handleInitiateDeletion('wipe_all', undefined, { confirmWipeAll: wipeAllConfirm })}
              disabled={loading || !wipeAllConfirm}
              className="px-4 py-2 bg-[#ef4444] text-white rounded-lg text-[14px] font-semibold hover:bg-[#dc2626] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Execute wipe all
            </button>
          </div>
        </div>

        {/* Dry Run Results */}
        {dryRunResult && (
          <div className="bg-white rounded-xl border border-black/[0.12] p-6 shadow-sm">
            <h3 className="text-[18px] font-semibold text-black/[0.87] mb-4">Dry-Run Results</h3>
            <pre className="text-[13px] text-black/[0.6] whitespace-pre-wrap">
              {JSON.stringify(dryRunResult, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminDeletions;

