import React, { useState, useEffect } from 'react';
import OperatorsHeader from '../../components/operators/OperatorsHeader';
import LoadingSpinner, { ButtonSpinner } from '../../components/operators/LoadingSpinner';
import Skeleton from '../../components/operators/Skeleton';
import { Save } from 'lucide-react';
import { useToast } from '../../components/operators/ToastProvider';
import { useUser } from '../../contexts/UserContext';
import FormField from '../../components/operators/FormField';
import { validateProfileForm, validateFile } from '../../lib/operators/validation';
import { handleKeyDown } from '../../lib/operators/accessibility';
import { OptimizedImage } from '../../components/OptimizedImage';

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
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const { email, userRoles } = useUser();
  const toast = useToast();

  const handleNavigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
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

    const validation = validateFile(file, {
      maxSize: 2 * 1024 * 1024,
      allowedTypes: ['image/png', 'image/jpeg', 'image/jpg'],
      fieldName: 'Headshot'
    });

    if (!validation.valid) {
      toast.error(validation.error);
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
        toast.success('Headshot uploaded successfully');
      } else {
        toast.error(json.error || 'Failed to upload headshot');
      }
    } catch (error) {
      console.error('Failed to upload headshot:', error);
      toast.error('Failed to upload headshot. Please try again.');
    } finally {
      setUploadingHeadshot(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleFieldBlur = (e) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    
    // Validate field on blur
    const validation = validateProfileForm({ [name]: formData[name] });
    if (!validation.valid && validation.errors[name]) {
      setErrors(prev => ({ ...prev, [name]: validation.errors[name] }));
    }
  };

  const handleSave = async () => {
    // Validate entire form
    const validation = validateProfileForm(formData);
    if (!validation.valid) {
      setErrors(validation.errors);
      setTouched(Object.keys(formData).reduce((acc, key) => ({ ...acc, [key]: true }), {}));
      toast.error('Please fix the errors before saving');
      return;
    }

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
        toast.success('Profile updated successfully');
      } else {
        const errorMsg = json.details ? `${json.error}: ${json.details}` : json.error || 'Failed to update profile';
        console.error('Profile update error:', json);
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
      toast.error('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F3F0]">
        <OperatorsHeader active="profile" onNavigate={handleNavigate} />
        <div id="main-content" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12" aria-busy="true" aria-label="Loading profile">
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <Skeleton className="h-8 mb-6" width="30%" />
            <Skeleton lines={4} className="h-4" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#F5F3F0]">
        <OperatorsHeader active="profile" onNavigate={handleNavigate} />
        <div id="main-content" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <p className="text-gray-600">Profile not found</p>
        </div>
      </div>
    );
  }

  const isOperator = profile.roles?.includes('operator') || false;

  return (
    <div className="min-h-screen bg-[#F5F3F0]">
      <OperatorsHeader active="profile" onNavigate={handleNavigate} />
      <div id="main-content" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Profile</h1>
          <p className="text-gray-600 mb-6">Update your profile information to help generate better topic insights for events.</p>

          <div className="space-y-6">
            <FormField
              label="Role Title"
              name="role_title"
              type="text"
              value={formData.role_title}
              onChange={handleFieldChange}
              onBlur={handleFieldBlur}
              error={touched.role_title ? errors.role_title : undefined}
              placeholder="e.g., CEO, COO, VP of Operations"
              helpText="Your current role or title"
            />

            <FormField
              label="Industry"
              name="industry"
              type="text"
              value={formData.industry}
              onChange={handleFieldChange}
              onBlur={handleFieldBlur}
              error={touched.industry ? errors.industry : undefined}
              placeholder="e.g., Technology, Healthcare, Manufacturing"
              helpText="The industry you work in"
            />

            <FormField
              label="Bio"
              name="bio"
              type="textarea"
              value={formData.bio}
              onChange={handleFieldChange}
              onBlur={handleFieldBlur}
              error={touched.bio ? errors.bio : undefined}
              placeholder="Tell us about yourself, your background, and what you're working on. This helps generate more relevant discussion topics for events you attend. (Recommended: 100-200 words)"
              helpText={`${formData.bio.trim() ? formData.bio.trim().split(/\s+/).filter(word => word.length > 0).length : 0} words (Recommended: 100-200 words)`}
              rows={6}
              maxLength={2000}
            />

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
                      <OptimizedImage
                        src={formData.headshot_url}
                        alt="Headshot"
                        className="w-24 h-24 rounded-full object-cover border-2 border-gray-300"
                        width={96}
                        height={96}
                      />
                    )}
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg"
                        onChange={handleHeadshotUpload}
                        disabled={uploadingHeadshot}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 disabled:opacity-50"
                        aria-label="Upload headshot image"
                        aria-describedby="headshot-help"
                      />
                      {uploadingHeadshot && (
                        <p className="text-xs text-gray-500 mt-1">Uploading...</p>
                      )}
                    </div>
                  </div>
                  <p id="headshot-help" className="text-xs text-gray-500 mt-1">Upload a low-resolution headshot (PNG or JPG, max 2MB). Image will be automatically cropped and scaled.</p>
                </div>

                <FormField
                  label="Business Name"
                  name="business_name"
                  type="text"
                  value={formData.business_name}
                  onChange={handleFieldChange}
                  onBlur={handleFieldBlur}
                  error={touched.business_name ? errors.business_name : undefined}
                  placeholder="Your business or company name"
                />

                <FormField
                  label="Website Address"
                  name="website_url"
                  type="url"
                  value={formData.website_url}
                  onChange={handleFieldChange}
                  onBlur={handleFieldBlur}
                  error={touched.website_url ? errors.website_url : undefined}
                  placeholder="https://example.com"
                  helpText="Include https:// or http://"
                />
              </>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={handleSave}
                onKeyDown={handleKeyDown(handleSave)}
                disabled={saving}
                className="min-h-[44px] px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                aria-label="Save profile changes"
              >
                <Save className="w-4 h-4" aria-hidden="true" />
                {saving ? <><ButtonSpinner /> Saving...</> : 'Save Profile'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
