import React, { useEffect, useState } from 'react';

const ALIDeploy = () => {
  const [selectedDivision, setSelectedDivision] = useState('all');
  const [generatedToken, setGeneratedToken] = useState(null);
  const [generatedSurveyUrl, setGeneratedSurveyUrl] = useState(null);
  const [nextSurvey, setNextSurvey] = useState({
    index: '—',
    availableOn: '—',
    baselineDate: '—',
    canDeploy: false,
    reason: null
  });
  const [loadingNext, setLoadingNext] = useState(true);
  const [deploying, setDeploying] = useState(false);
  const [deployError, setDeployError] = useState('');

  const handleNavigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Preserve magic-link email across ALI app navigation (used for role-aware links)
  const urlParams = new URLSearchParams(window.location.search);
  const emailParam = urlParams.get('email');
  const email = emailParam ? emailParam.toLowerCase().trim() : '';
  const isSuperAdminUser = !!email && email.endsWith('@archetypeoriginal.com');
  const withEmail = (path) => {
    if (!email) return path;
    if (!path || typeof path !== 'string') return path;
    if (path.includes('email=')) return path;
    const joiner = path.includes('?') ? '&' : '?';
    return `${path}${joiner}email=${encodeURIComponent(email)}`;
  };

  useEffect(() => {
    async function loadNext() {
      setLoadingNext(true);
      setDeployError('');

      if (!email) {
        setNextSurvey({
          index: '—',
          availableOn: '—',
          baselineDate: '—',
          canDeploy: false,
          reason: 'Missing email in URL. Please re-login via magic link.'
        });
        setLoadingNext(false);
        return;
      }

      try {
        const r = await fetch(`/api/ali/deploy/next?email=${encodeURIComponent(email)}`);
        const j = await r.json().catch(() => ({}));
        if (!r.ok) {
          setNextSurvey({
            index: '—',
            availableOn: '—',
            baselineDate: '—',
            canDeploy: false,
            reason: j?.error || 'Failed to load next survey info.'
          });
          setLoadingNext(false);
          return;
        }

        setNextSurvey({
          index: j.next_survey_index || '—',
          availableOn: j.available_on || '—',
          baselineDate: j.baseline_date || '—',
          canDeploy: !!j.can_deploy,
          reason: j.reason || null
        });
      } catch (e) {
        setNextSurvey({
          index: '—',
          availableOn: '—',
          baselineDate: '—',
          canDeploy: false,
          reason: e?.message || 'Failed to load next survey info.'
        });
      } finally {
        setLoadingNext(false);
      }
    }

    loadNext();
  }, [email]);

  const activeDeployments = [
    {
      id: 'deploy-1',
      surveyIndex: 'S1',
      status: 'active',
      responses: 42,
      minimum: 5,
      opensAt: '2024-01-15',
      closesAt: '2024-02-15'
    }
  ];

  const handleGenerateLink = async () => {
    setDeployError('');
    setDeploying(true);
    setGeneratedToken(null);
    setGeneratedSurveyUrl(null);

    try {
      const r = await fetch('/api/ali/deploy-survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          instrumentVersion: 'v1.0',
          // Division support is coming soon. For now, only company-wide.
          divisionId: null,
          minimumResponses: 5
        })
      });
      const j = await r.json().catch(() => ({}));

      if (!r.ok) {
        setDeployError(j?.error || j?.details || 'Failed to create deployment.');
        setDeploying(false);
        return;
      }

      const surveyUrl = j?.deployment?.surveyUrl || null;
      setGeneratedSurveyUrl(surveyUrl);

      // Extract token from URL for display/back-compat
      const tokenMatch = typeof surveyUrl === 'string' ? surveyUrl.split('/').pop() : null;
      setGeneratedToken(tokenMatch || null);
    } catch (e) {
      setDeployError(e?.message || 'Failed to create deployment.');
    } finally {
      setDeploying(false);
    }
  };

  const handleCopyLink = () => {
    const url = generatedSurveyUrl || `${window.location.origin}/ali/survey/${generatedToken}`;
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="text-xl font-bold text-gray-900">ALI</div>
            <nav className="flex items-center gap-6">
              <button
                onClick={() => handleNavigate(withEmail('/ali/dashboard'))}
                className="text-gray-600 hover:text-gray-900"
              >
                Dashboard
              </button>
              <button
                onClick={() => handleNavigate(withEmail('/ali/reports'))}
                className="text-gray-600 hover:text-gray-900"
              >
                Reports
              </button>
              <button
                onClick={() => handleNavigate(withEmail('/ali/deploy'))}
                className="text-blue-600 font-semibold"
              >
                Deploy
              </button>
              <button
                onClick={() => handleNavigate(withEmail('/ali/settings'))}
                className="text-gray-600 hover:text-gray-900"
              >
                Settings
              </button>
              <button
                onClick={() => handleNavigate(withEmail('/ali/billing'))}
                className="text-gray-600 hover:text-gray-900"
              >
                Billing
              </button>
              {isSuperAdminUser && (
                <button
                  onClick={() => handleNavigate(withEmail('/ali/super-admin/overview'))}
                  className="text-[#2563eb] font-semibold hover:text-[#1d4ed8]"
                >
                  Super Admin
                </button>
              )}
              <button
                onClick={() => handleNavigate('/ali')}
                className="text-gray-600 hover:text-gray-800"
              >
                Log Out
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Deploy Survey</h1>
          <p className="text-gray-600">Deploy surveys to your team on quarterly cadence</p>
        </div>

        {/* Deploy New Survey Section */}
        <section className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Deploy New Survey</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Next Survey
              </label>
              <input
                type="text"
                value={loadingNext ? 'Loading…' : nextSurvey.index}
                readOnly
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
              />
              <p className="text-xs text-gray-500 mt-1">Auto-calculated from cadence</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Available On
              </label>
              <input
                type="text"
                value={loadingNext ? 'Loading…' : nextSurvey.availableOn}
                readOnly
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
              />
              <p className="text-xs text-gray-500 mt-1">Auto-calculated from baseline date ({loadingNext ? '…' : nextSurvey.baselineDate})</p>
              {!loadingNext && nextSurvey.reason && (
                <p className="text-xs text-gray-500 mt-1">{nextSurvey.reason}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Division (Optional)
              </label>
              <select
                value={selectedDivision}
                onChange={(e) => setSelectedDivision(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                disabled
              >
                <option value="all">Company-wide</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Division targeting will be enabled once divisions are connected to real data.</p>
            </div>

            <button
              onClick={handleGenerateLink}
              disabled={deploying || loadingNext || !nextSurvey.canDeploy}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deploying ? 'Generating…' : 'Generate Deployment Link'}
            </button>

            {deployError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {deployError}
              </div>
            )}
          </div>
        </section>

        {/* Generated Link Display */}
        {generatedSurveyUrl && (
          <section className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Deployment Link Generated</h3>
            <div className="bg-white rounded border border-gray-200 p-4 mb-4">
              <div className="text-sm text-gray-600 mb-2">Survey URL:</div>
              <div className="font-mono text-sm break-all text-gray-900">
                {generatedSurveyUrl}
              </div>
            </div>
            <div className="flex gap-4">
              <button
                onClick={handleCopyLink}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700"
              >
                Copy Link
              </button>
              <button
                onClick={() => alert('QR code generation - coming soon')}
                className="flex-1 bg-white border border-gray-200 text-gray-900 py-2 rounded-lg font-semibold hover:bg-gray-50"
              >
                Download QR Code
              </button>
            </div>
          </section>
        )}

        {/* Active Deployments List */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Deployments</h2>
          
          {activeDeployments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No active deployments
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Survey</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Responses</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Opens</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Closes</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeDeployments.map((deployment) => (
                    <tr key={deployment.id} className="border-b border-gray-100">
                      <td className="py-3 px-4 text-sm text-gray-900">{deployment.surveyIndex}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                          deployment.status === 'active' ? 'bg-blue-100 text-blue-700' :
                          deployment.status === 'pending' ? 'bg-gray-100 text-gray-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {deployment.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {deployment.responses} / {deployment.minimum}
                        {deployment.responses >= deployment.minimum && (
                          <span className="ml-2 text-blue-600 text-xs">✓</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{deployment.opensAt}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{deployment.closesAt}</td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => alert('View link - coming soon')}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          View Link
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default ALIDeploy;

