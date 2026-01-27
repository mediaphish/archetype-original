import React, { useState, useEffect } from 'react';
import OperatorsHeader from '../../components/operators/OperatorsHeader';
import { Save } from 'lucide-react';

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingHeadshot, setUploadingHeadshot] = useState(false);
  const [formData, setFormData] = useState({
    role_title: '',
    industry: '',
    bio: '',
    headshot_url: '',
    business_name: '',
    website_url: ''
  });

  const urlParams = new URLSearchParams(window.location.search);
  const email = urlParams.get('email') || '';

  const handleNavigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const withEmail = (path) => {
    if (!email) return path;
    if (path.includes('email=')) return path;
    const joiner = path.includes('?') ? '&' : '?';
    return `${path}${joiner}email=${encodeURIComponent(email)}`;
  };

  useEffect(() => {
    const fetchProfile = async () => {
      if (!email) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const resp = await fetch(`/api/operators/users/me?email=${encodeURIComponent(email)}`);
        const json = await resp.json();
        
        if (json.ok && json.user) {
          setProfile(json.user);
          setFormData({
            role_title: json.user.role_title || '',
            industry: json.user.industry || '',
            bio: json.user.bio || '',
            headshot_url: json.user.headshot_url || '',
            business_name: json.user.business_name || '',
            website_url: json.user.website_url || ''
          });
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [email]);

  const handleHeadshotUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please select a PNG or JPG image');
      return;
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('Image must be smaller than 2MB');
      return;
    }

    setUploadingHeadshot(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'headshot');

      const resp = await fetch('/api/operators/upload-headshot', {
        method: 'POST',
        body: formData
      });

      const json = await resp.json();
      if (json.ok) {
        setFormData(prev => ({ ...prev, headshot_url: json.headshotUrl }));
        alert('Headshot uploaded successfully');
      } else {
        alert(json.error || 'Failed to upload headshot');
      }
    } catch (error) {
      console.error('Failed to upload headshot:', error);
      alert('Failed to upload headshot. Please try again.');
    } finally {
      setUploadingHeadshot(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const resp = await fetch(`/api/operators/users/me?email=${encodeURIComponent(email)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          ...formData
        })
      });

      const json = await resp.json();
      if (json.ok) {
        setProfile(json.user);
        alert('Profile updated successfully');
      } else {
        const errorMsg = json.details ? `${json.error}: ${json.details}` : json.error || 'Failed to update profile';
        console.error('Profile update error:', json);
        alert(errorMsg);
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F3F0]">
        <OperatorsHeader email={email} />
        <div className="max-w-4xl mx-auto px-6 py-12">
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#F5F3F0]">
        <OperatorsHeader email={email} />
        <div className="max-w-4xl mx-auto px-6 py-12">
          <p className="text-gray-600">Profile not found</p>
        </div>
      </div>
    );
  }

  const isOperator = profile.roles?.includes('operator') || false;

  return (
    <div className="min-h-screen bg-[#F5F3F0]">
      <OperatorsHeader email={email} />
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Profile</h1>
          <p className="text-gray-600 mb-6">Update your profile information to help generate better topic insights for events.</p>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role Title
              </label>
              <input
                type="text"
                value={formData.role_title}
                onChange={(e) => setFormData({ ...formData, role_title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent"
                placeholder="e.g., CEO, COO, VP of Operations"
              />
              <p className="text-xs text-gray-500 mt-1">Your current role or title</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Industry
              </label>
              <input
                type="text"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent"
                placeholder="e.g., Technology, Healthcare, Manufacturing"
              />
              <p className="text-xs text-gray-500 mt-1">The industry you work in</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bio
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows="6"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent"
                placeholder="Tell us about yourself, your background, and what you're working on. This helps generate more relevant discussion topics for events you attend. (Recommended: 100-200 words)"
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.bio.trim() ? formData.bio.trim().split(/\s+/).filter(word => word.length > 0).length : 0} words (Recommended: 100-200 words)
              </p>
            </div>

            {/* Operator-only fields */}
            {isOperator && (
              <>
                <div className="pt-4 border-t border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Operator Profile</h2>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Headshot
                  </label>
                  <div className="flex items-center gap-4">
                    {formData.headshot_url && (
                      <img 
                        src={formData.headshot_url} 
                        alt="Headshot" 
                        className="w-24 h-24 rounded-full object-cover border-2 border-gray-300"
                      />
                    )}
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg"
                        onChange={handleHeadshotUpload}
                        disabled={uploadingHeadshot}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 disabled:opacity-50"
                      />
                      {uploadingHeadshot && (
                        <p className="text-xs text-gray-500 mt-1">Uploading...</p>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Upload a low-resolution headshot (PNG or JPG, max 2MB). Image will be automatically cropped and scaled.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Name
                  </label>
                  <input
                    type="text"
                    value={formData.business_name}
                    onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent"
                    placeholder="Your business or company name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Website Address
                  </label>
                  <input
                    type="url"
                    value={formData.website_url}
                    onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent"
                    placeholder="https://example.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">Include https:// or http://</p>
                </div>
              </>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
