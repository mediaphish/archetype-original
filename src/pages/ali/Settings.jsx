import React, { useState, useEffect } from 'react';
import { getAliSessionEmail, setAliSessionEmail } from '../../lib/magicLinkBrowserSession';

const ALISettings = () => {
  const [activeTab, setActiveTab] = useState('company');
  const [companyData, setCompanyData] = useState({
    name: '',
    size: '',
    industry: '',
    website: ''
  });
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [contactsError, setContactsError] = useState(null);
  const [companyProfileUnavailable, setCompanyProfileUnavailable] = useState(true);

  const handleNavigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Preserve magic-link email across ALI app navigation (used for role-aware links)
  const urlParams = new URLSearchParams(window.location.search);
  const emailParam = urlParams.get('email');
  const email = (emailParam || getAliSessionEmail() || '').toLowerCase().trim();
  const isSuperAdminUser = !!email && email.endsWith('@archetypeoriginal.com');
  const withEmail = (path) => {
    if (!email) return path;
    if (!path || typeof path !== 'string') return path;
    if (path.includes('email=')) return path;
    const joiner = path.includes('?') ? '&' : '?';
    return `${path}${joiner}email=${encodeURIComponent(email)}`;
  };

  useEffect(() => {
    if (!emailParam) return;
    if (email) setAliSessionEmail(email);
  }, [emailParam, email]);

  // Contacts: real endpoint exists (GET /api/ali/contacts). Company profile fields
  // (size/industry/website) have no dedicated settings GET yet — leave empty and say so.
  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      if (!email) {
        if (isMounted) {
          setContacts([]);
          setContactsLoading(false);
          setContactsError(null);
          setCompanyProfileUnavailable(true);
        }
        return;
      }
      try {
        setContactsLoading(true);
        setContactsError(null);
        const resp = await fetch('/api/ali/contacts', { credentials: 'include' });
        const json = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          throw new Error(json?.error || 'Failed to load contacts');
        }
        if (!isMounted) return;
        const rows = Array.isArray(json?.contacts) ? json.contacts : [];
        setContacts(
          rows.map((c) => ({
            id: c.id,
            name: c.full_name || c.name || '',
            email: c.email || '',
            role: c.role || '',
            permission: c.permission_level || c.permission || 'view_only'
          }))
        );
        // No company-profile GET endpoint yet — keep empty defaults (not Acme placeholders).
        setCompanyData({ name: '', size: '', industry: '', website: '' });
        setCompanyProfileUnavailable(true);
      } catch (err) {
        if (!isMounted) return;
        setContacts([]);
        setContactsError(err?.message || 'Failed to load contacts');
        setCompanyProfileUnavailable(true);
      } finally {
        if (isMounted) setContactsLoading(false);
      }
    };
    run();
    return () => {
      isMounted = false;
    };
  }, [email]);

  const handleCompanySave = (e) => {
    e.preventDefault();
    alert('Company profile saving isn’t available yet — there’s no settings save endpoint wired for this screen.');
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
            <div className="text-xl font-bold text-gray-900">ALI</div>
            <nav className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={() => handleNavigate(withEmail('/ali/dashboard'))}
                className="min-h-[44px] inline-flex items-center justify-center px-3 text-gray-600 hover:text-gray-900"
              >
                Dashboard
              </button>
              <button
                onClick={() => handleNavigate(withEmail('/ali/reports'))}
                className="min-h-[44px] inline-flex items-center justify-center px-3 text-gray-600 hover:text-gray-900"
              >
                Reports
              </button>
              <button
                onClick={() => handleNavigate(withEmail('/ali/deploy'))}
                className="min-h-[44px] inline-flex items-center justify-center px-3 text-gray-600 hover:text-gray-900"
              >
                Deploy
              </button>
              <button
                onClick={() => handleNavigate(withEmail('/ali/settings'))}
                className="min-h-[44px] inline-flex items-center justify-center px-3 text-blue-600 font-semibold"
              >
                Settings
              </button>
              <button
                onClick={() => handleNavigate(withEmail('/ali/billing'))}
                className="min-h-[44px] inline-flex items-center justify-center px-3 text-gray-600 hover:text-gray-900"
              >
                Billing
              </button>
              {isSuperAdminUser && (
                <button
                  onClick={() => handleNavigate(withEmail('/ali/super-admin/overview'))}
                  className="min-h-[44px] inline-flex items-center justify-center px-3 text-[#2563eb] font-semibold hover:text-[#1d4ed8]"
                >
                  Super Admin
                </button>
              )}
              <button
                onClick={() => handleNavigate('/ali')}
                className="min-h-[44px] inline-flex items-center justify-center px-3 text-gray-600 hover:text-gray-800"
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Account Settings</h1>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-6">
            <button
              onClick={() => setActiveTab('company')}
              className={`min-h-[44px] flex items-center justify-center py-3 px-1 border-b-2 font-semibold ${
                activeTab === 'company' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Company Profile
            </button>
            <button
              onClick={() => setActiveTab('contacts')}
              className={`min-h-[44px] flex items-center justify-center py-3 px-1 border-b-2 font-semibold ${
                activeTab === 'contacts' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Contacts
            </button>
          </nav>
        </div>

        {/* Company Profile Tab */}
        {activeTab === 'company' && (
          <section className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Company Profile</h2>

            {companyProfileUnavailable ? (
              <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Company profile details aren’t available from the server for this screen yet — fields below stay blank on purpose so we don’t show invented company data. Contacts (next tab) load from the real contacts list when you’re signed in.
              </div>
            ) : null}
            
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  placeholder="Not available yet"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                >
                  <option value="">Not available yet</option>
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  placeholder="Not available yet"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  placeholder="Not available yet"
                />
              </div>

              <div className="pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700"
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
              <h2 className="text-xl font-semibold text-gray-900">Contacts</h2>
              <button
                onClick={handleAddContact}
                className="min-h-[44px] bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 text-sm flex items-center justify-center"
              >
                Add Contact
              </button>
            </div>

            {contactsLoading ? (
              <div className="text-center py-8 text-gray-500">
                Loading contacts…
              </div>
            ) : contactsError ? (
              <div className="text-center py-8 text-red-600">
                Couldn’t load contacts: {contactsError}
              </div>
            ) : contacts.length === 0 ? (
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
                          <div className="text-lg font-semibold text-gray-900">{contact.name}</div>
                          <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                            contact.permission === 'account_owner' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
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
                          className="text-sm text-blue-600 hover:underline"
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
