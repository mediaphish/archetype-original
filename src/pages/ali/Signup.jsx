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
    acceptTerms: false
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

  const handleSubmit = (e) => {
    e.preventDefault();
    // Fake submission - navigate to verify-email
    handleNavigate('/ali/verify-email?email=' + encodeURIComponent(formData.contactEmail));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-3xl font-bold text-[#1A1A1A] mb-2">ALI</div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Create Your Account</h1>
          <p className="text-gray-600 mt-2">Get started with ALI in minutes</p>
        </div>

        {/* Signup Form */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company Information */}
            <div>
              <h2 className="text-lg font-semibold text-[#1A1A1A] mb-4">Company Information</h2>
              
              <div className="mb-4">
                <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="companyName"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C85A3C] focus:border-transparent"
                  required
                />
              </div>

              <div className="mb-4">
                <label htmlFor="companySize" className="block text-sm font-medium text-gray-700 mb-2">
                  Company Size <span className="text-red-500">*</span>
                </label>
                <select
                  id="companySize"
                  name="companySize"
                  value={formData.companySize}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C85A3C] focus:border-transparent"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C85A3C] focus:border-transparent"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C85A3C] focus:border-transparent"
                  placeholder="https://company.com"
                />
              </div>
            </div>

            {/* Primary Contact */}
            <div>
              <h2 className="text-lg font-semibold text-[#1A1A1A] mb-4">Primary Contact (Account Owner)</h2>
              
              <div className="mb-4">
                <label htmlFor="contactName" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="contactName"
                  name="contactName"
                  value={formData.contactName}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C85A3C] focus:border-transparent"
                  required
                />
              </div>

              <div className="mb-4">
                <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="contactEmail"
                  name="contactEmail"
                  value={formData.contactEmail}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C85A3C] focus:border-transparent"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C85A3C] focus:border-transparent"
                  placeholder="e.g., CEO, Founder, HR Director"
                />
              </div>
            </div>

            {/* Terms */}
            <div className="flex items-start">
              <input
                type="checkbox"
                id="acceptTerms"
                name="acceptTerms"
                checked={formData.acceptTerms}
                onChange={handleChange}
                className="mt-1 mr-3"
                required
              />
              <label htmlFor="acceptTerms" className="text-sm text-gray-700">
                I agree to the{' '}
                <a href="/terms-and-conditions" className="text-[#C85A3C] hover:underline">Terms of Service</a>
                {' '}and{' '}
                <a href="/privacy-policy" className="text-[#C85A3C] hover:underline">Privacy Policy</a>
                <span className="text-red-500">*</span>
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full bg-[#C85A3C] text-white py-3 rounded-lg font-semibold hover:bg-[#B8492A]"
            >
              Create Account
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <button
                onClick={() => handleNavigate('/ali/login')}
                className="text-[#C85A3C] hover:underline font-semibold"
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

