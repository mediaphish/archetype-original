import React, { useState } from 'react';

const ALISignup = () => {
  const [formData, setFormData] = useState({
    companyName: '',
    companySize: '',
    industry: '',
    website: '',
    contactName: '',
    contactEmail: '',
    contactRole: '',
    acceptPrivacyPolicy: false,
    acceptTermsConditions: false,
    acceptEULA: false
  });

  const handleNavigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate all acceptances
    if (!formData.acceptPrivacyPolicy || !formData.acceptTermsConditions || !formData.acceptEULA) {
      alert('You must accept all three agreements to create an account.');
      return;
    }

    try {
      const response = await fetch('/api/ali/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: formData.companyName,
          companySize: formData.companySize,
          industry: formData.industry,
          website: formData.website,
          contactName: formData.contactName,
          contactEmail: formData.contactEmail,
          contactRole: formData.contactRole,
          pilotProgram: true,
          acceptPrivacyPolicy: formData.acceptPrivacyPolicy,
          acceptTermsConditions: formData.acceptTermsConditions,
          acceptEULA: formData.acceptEULA
        })
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Failed to create account. Please try again.');
        return;
      }

      // Navigate to verify-email on success
      handleNavigate('/ali/verify-email?email=' + encodeURIComponent(formData.contactEmail));
    } catch (error) {
      console.error('Signup error:', error);
      alert('An error occurred. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-3xl font-bold text-gray-900 mb-2">ALI</div>
          <h1 className="text-2xl font-bold text-gray-900">Create Your Account</h1>
          <p className="text-gray-600 mt-2">Get started with ALI in minutes</p>
        </div>

        {/* Signup Form */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company Information */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h2>
              
              <div className="mb-4">
                <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name <span className="text-gray-600">*</span>
                </label>
                <input
                  type="text"
                  id="companyName"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  required
                />
              </div>

              <div className="mb-4">
                <label htmlFor="companySize" className="block text-sm font-medium text-gray-700 mb-2">
                  Company Size <span className="text-gray-600">*</span>
                </label>
                <select
                  id="companySize"
                  name="companySize"
                  value={formData.companySize}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  required
                >
                  <option value="">Select size</option>
                  <option value="1-10">1-10 employees</option>
                  <option value="11-50">11-50 employees</option>
                  <option value="51-100">51-100 employees</option>
                  <option value="101-250">101-250 employees</option>
                  <option value="251-500">251-500 employees</option>
                  <option value="500+">500+ employees</option>
                </select>
              </div>

              <div className="mb-4">
                <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-2">
                  Industry
                </label>
                <input
                  type="text"
                  id="industry"
                  name="industry"
                  value={formData.industry}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  placeholder="e.g., Technology, Healthcare, Manufacturing"
                />
              </div>

              <div className="mb-4">
                <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-2">
                  Website
                </label>
                <input
                  type="url"
                  id="website"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  placeholder="https://company.com"
                />
              </div>
            </div>

            {/* Primary Contact */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Primary Contact (Account Owner)</h2>
              
              <div className="mb-4">
                <label htmlFor="contactName" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name <span className="text-gray-600">*</span>
                </label>
                <input
                  type="text"
                  id="contactName"
                  name="contactName"
                  value={formData.contactName}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  required
                />
              </div>

              <div className="mb-4">
                <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address <span className="text-gray-600">*</span>
                </label>
                <input
                  type="email"
                  id="contactEmail"
                  name="contactEmail"
                  value={formData.contactEmail}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">You'll use this email to sign in</p>
              </div>

              <div className="mb-4">
                <label htmlFor="contactRole" className="block text-sm font-medium text-gray-700 mb-2">
                  Role/Title
                </label>
                <input
                  type="text"
                  id="contactRole"
                  name="contactRole"
                  value={formData.contactRole}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  placeholder="e.g., CEO, Founder, HR Director"
                />
              </div>
            </div>

            {/* Legal Acceptances */}
            <div className="space-y-4 border-t border-gray-200 pt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Legal Agreements</h2>
              
              {/* Privacy Policy */}
              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="acceptPrivacyPolicy"
                  name="acceptPrivacyPolicy"
                  checked={formData.acceptPrivacyPolicy}
                  onChange={handleChange}
                  className="mt-1 mr-3"
                  required
                />
                <label htmlFor="acceptPrivacyPolicy" className="text-sm text-gray-700">
                  I have read and agree to the{' '}
                  <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    Privacy Policy
                  </a>
                  <span className="text-red-600">*</span>
                </label>
              </div>

              {/* Terms & Conditions */}
              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="acceptTermsConditions"
                  name="acceptTermsConditions"
                  checked={formData.acceptTermsConditions}
                  onChange={handleChange}
                  className="mt-1 mr-3"
                  required
                />
                <label htmlFor="acceptTermsConditions" className="text-sm text-gray-700">
                  I have read and agree to the{' '}
                  <a href="/terms-and-conditions" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    Terms & Conditions
                  </a>
                  <span className="text-red-600">*</span>
                </label>
              </div>

              {/* ALI EULA */}
              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="acceptEULA"
                  name="acceptEULA"
                  checked={formData.acceptEULA}
                  onChange={handleChange}
                  className="mt-1 mr-3"
                  required
                />
                <label htmlFor="acceptEULA" className="text-sm text-gray-700">
                  I have read and agree to the{' '}
                  <a href="/ali-eula" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    ALI End User License Agreement (EULA)
                  </a>
                  <span className="text-red-600">*</span>
                </label>
              </div>

              <p className="text-xs text-gray-500 mt-2">
                All three agreements must be accepted to create your ALI account. Links open in a new tab.
              </p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700"
            >
              Create Account
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <button
                onClick={() => handleNavigate('/ali/login')}
                className="text-blue-600 hover:underline font-semibold"
              >
                Log In
              </button>
            </p>
          </div>

          <div className="mt-4 text-center">
            <button
              onClick={() => handleNavigate('/ali')}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ALISignup;

