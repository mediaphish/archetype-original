import React, { useState } from 'react';

const ALIDeploy = () => {
  const [selectedDivision, setSelectedDivision] = useState('all');
  const [generatedToken, setGeneratedToken] = useState(null);

  const handleNavigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Mock data
  const nextSurvey = {
    index: 'S2',
    availableOn: '2024-04-15',
    baselineDate: '2024-01-15'
  };

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

  const handleGenerateLink = () => {
    // Fake generation
    const fakeToken = 'survey-' + Math.random().toString(36).substr(2, 9);
    setGeneratedToken(fakeToken);
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/ali/survey/${generatedToken}`;
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="text-xl font-bold text-[#1A1A1A]">ALI</div>
            <nav className="flex items-center gap-6">
              <button
                onClick={() => handleNavigate('/ali/dashboard')}
                className="text-gray-600 hover:text-[#1A1A1A]"
              >
                Dashboard
              </button>
              <button
                onClick={() => handleNavigate('/ali/deploy')}
                className="text-[#C85A3C] font-semibold"
              >
                Deploy
              </button>
              <button
                onClick={() => handleNavigate('/ali/settings')}
                className="text-gray-600 hover:text-[#1A1A1A]"
              >
                Settings
              </button>
              <button
                onClick={() => handleNavigate('/ali/billing')}
                className="text-gray-600 hover:text-[#1A1A1A]"
              >
                Billing
              </button>
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
          <h1 className="text-3xl font-bold text-[#1A1A1A] mb-2">Deploy Survey</h1>
          <p className="text-gray-600">Deploy surveys to your team on quarterly cadence</p>
        </div>

        {/* Deploy New Survey Section */}
        <section className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-[#1A1A1A] mb-4">Deploy New Survey</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Next Survey
              </label>
              <input
                type="text"
                value={nextSurvey.index}
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
                value={nextSurvey.availableOn}
                readOnly
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
              />
              <p className="text-xs text-gray-500 mt-1">Auto-calculated from baseline date ({nextSurvey.baselineDate})</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Division (Optional)
              </label>
              <select
                value={selectedDivision}
                onChange={(e) => setSelectedDivision(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C85A3C] focus:border-transparent"
              >
                <option value="all">Company-wide</option>
                <option value="sales">Sales</option>
                <option value="engineering">Engineering</option>
                <option value="operations">Operations</option>
              </select>
            </div>

            <button
              onClick={handleGenerateLink}
              className="w-full bg-[#C85A3C] text-white py-3 rounded-lg font-semibold hover:bg-[#B8492A]"
            >
              Generate Deployment Link
            </button>
          </div>
        </section>

        {/* Generated Link Display */}
        {generatedToken && (
          <section className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-green-800 mb-4">Deployment Link Generated</h3>
            <div className="bg-white rounded border border-green-300 p-4 mb-4">
              <div className="text-sm text-gray-600 mb-2">Survey URL:</div>
              <div className="font-mono text-sm break-all text-[#1A1A1A]">
                {window.location.origin}/ali/survey/{generatedToken}
              </div>
            </div>
            <div className="flex gap-4">
              <button
                onClick={handleCopyLink}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700"
              >
                Copy Link
              </button>
              <button
                onClick={() => alert('QR code generation - coming soon')}
                className="flex-1 bg-white border border-green-600 text-green-600 py-2 rounded-lg font-semibold hover:bg-green-50"
              >
                Download QR Code
              </button>
            </div>
          </section>
        )}

        {/* Active Deployments List */}
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-[#1A1A1A] mb-4">Active Deployments</h2>
          
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
                      <td className="py-3 px-4 text-sm text-[#1A1A1A]">{deployment.surveyIndex}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                          deployment.status === 'active' ? 'bg-green-100 text-green-700' :
                          deployment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {deployment.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-[#1A1A1A]">
                        {deployment.responses} / {deployment.minimum}
                        {deployment.responses >= deployment.minimum && (
                          <span className="ml-2 text-green-600 text-xs">✓</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{deployment.opensAt}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{deployment.closesAt}</td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => alert('View link - coming soon')}
                          className="text-sm text-[#C85A3C] hover:underline"
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

