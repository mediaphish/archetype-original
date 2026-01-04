import React, { useState } from 'react';

const ALISettings = () => {
  const [activeTab, setActiveTab] = useState('company');

  const handleNavigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Mock data
  const [companyData, setCompanyData] = useState({
    name: 'Acme Corporation',
    size: '51-100',
    industry: 'Technology',
    website: 'https://acme.com'
  });

  const [contacts, setContacts] = useState([
    { id: '1', name: 'John Doe', email: 'john@acme.com', role: 'CEO', permission: 'account_owner' },
    { id: '2', name: 'Jane Smith', email: 'jane@acme.com', role: 'HR Director', permission: 'view_only' }
  ]);

  const handleCompanySave = (e) => {
    e.preventDefault();
    alert('Company profile saved!');
  };

  const handleAddContact = () => {
    alert('Add contact form - coming soon');
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
                className="text-gray-600 hover:text-[#1A1A1A]"
              >
                Deploy
              </button>
              <button
                onClick={() => handleNavigate('/ali/settings')}
                className="text-[#C85A3C] font-semibold"
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
          <h1 className="text-3xl font-bold text-[#1A1A1A] mb-2">Account Settings</h1>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-6">
            <button
              onClick={() => setActiveTab('company')}
              className={`py-3 px-1 border-b-2 font-semibold ${
                activeTab === 'company' ? 'border-[#C85A3C] text-[#C85A3C]' : 'border-transparent text-gray-600 hover:text-[#1A1A1A]'
              }`}
            >
              Company Profile
            </button>
            <button
              onClick={() => setActiveTab('contacts')}
              className={`py-3 px-1 border-b-2 font-semibold ${
                activeTab === 'contacts' ? 'border-[#C85A3C] text-[#C85A3C]' : 'border-transparent text-gray-600 hover:text-[#1A1A1A]'
              }`}
            >
              Contacts
            </button>
          </nav>
        </div>

        {/* Company Profile Tab */}
        {activeTab === 'company' && (
          <section className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-[#1A1A1A] mb-6">Company Profile</h2>
            
            <form onSubmit={handleCompanySave} className="space-y-6">
              <div>
                <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  id="companyName"
                  value={companyData.name}
                  onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C85A3C] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="companySize" className="block text-sm font-medium text-gray-700 mb-2">
                  Company Size
                </label>
                <select
                  id="companySize"
                  value={companyData.size}
                  onChange={(e) => setCompanyData({ ...companyData, size: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C85A3C] focus:border-transparent"
                >
                  <option value="1-10">1-10 employees</option>
                  <option value="11-50">11-50 employees</option>
                  <option value="51-100">51-100 employees</option>
                  <option value="101-250">101-250 employees</option>
                  <option value="251-500">251-500 employees</option>
                  <option value="500+">500+ employees</option>
                </select>
              </div>

              <div>
                <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-2">
                  Industry
                </label>
                <input
                  type="text"
                  id="industry"
                  value={companyData.industry}
                  onChange={(e) => setCompanyData({ ...companyData, industry: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C85A3C] focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-2">
                  Website
                </label>
                <input
                  type="url"
                  id="website"
                  value={companyData.website}
                  onChange={(e) => setCompanyData({ ...companyData, website: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C85A3C] focus:border-transparent"
                />
              </div>

              <div className="pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  className="bg-[#C85A3C] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#B8492A]"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Contacts Tab */}
        {activeTab === 'contacts' && (
          <section className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-[#1A1A1A]">Contacts</h2>
              <button
                onClick={handleAddContact}
                className="bg-[#C85A3C] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[#B8492A] text-sm"
              >
                Add Contact
              </button>
            </div>

            {contacts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No contacts added yet
              </div>
            ) : (
              <div className="space-y-4">
                {contacts.map((contact) => (
                  <div key={contact.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="text-lg font-semibold text-[#1A1A1A]">{contact.name}</div>
                          <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                            contact.permission === 'account_owner' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {contact.permission === 'account_owner' ? 'Account Owner' : 'View Only'}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">{contact.email}</div>
                        <div className="text-sm text-gray-500">{contact.role}</div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => alert('Edit contact - coming soon')}
                          className="text-sm text-[#C85A3C] hover:underline"
                        >
                          Edit
                        </button>
                        {contact.permission !== 'account_owner' && (
                          <button
                            onClick={() => alert('Remove contact - coming soon')}
                            className="text-sm text-red-600 hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
};

export default ALISettings;

