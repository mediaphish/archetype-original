import React, { useState, useEffect } from 'react';
import OperatorsHeader from '../../components/operators/OperatorsHeader';
import { formatPhoneNumber, formatUSD, parseUSD, isValidPhone } from '../../../lib/operators/input-masks.js';

export default function CreateEvent() {
  const [formData, setFormData] = useState({
    title: '',
    event_date: '',
    stake_amount: '',
    max_seats: '',
    // Host fields
    host_name: '',
    host_logo_url: '',
    host_location: '',
    host_location_lat: '',
    host_location_lng: '',
    host_description: '',
    // Sponsor fields
    sponsor_name: '',
    sponsor_logo_url: '',
    sponsor_website: '',
    sponsor_phone: '',
    sponsor_pot_value: '',
    sponsor_description: ''
  });
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState({ host: false, sponsor: false });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [userRoles, setUserRoles] = useState([]);
  const [hostDescriptionWordCount, setHostDescriptionWordCount] = useState(0);
  const [sponsorDescriptionWordCount, setSponsorDescriptionWordCount] = useState(0);

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
    const fetchUserRoles = async () => {
      if (!email) return;
      
      try {
        const resp = await fetch(`/api/operators/users/me?email=${encodeURIComponent(email)}`);
        const json = await resp.json();
        if (json.ok && json.user) {
          setUserRoles(json.user.roles || []);
        }
      } catch (error) {
        console.error('Failed to fetch user roles:', error);
      }
    };

    fetchUserRoles();
  }, [email]);

  const handleLogoUpload = async (logoType, file) => {
    if (!file) return;

    // Validate file type
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type.toLowerCase())) {
      setError('Logo must be PNG or JPG format');
      return;
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      setError('Logo file size must be less than 2MB');
      return;
    }

    setUploadingLogo(prev => ({ ...prev, [logoType]: true }));
    setError('');

    try {
      const formData = new FormData();
      formData.append('logoType', logoType);
      formData.append('file', file);

      const resp = await fetch('/api/operators/upload-logo', {
        method: 'POST',
        body: formData
      });

      const json = await resp.json();

      if (json.ok) {
        setFormData(prev => ({
          ...prev,
          [`${logoType}_logo_url`]: json.logoUrl
        }));
      } else {
        setError(json.error || 'Failed to upload logo');
      }
    } catch (error) {
      setError('Failed to upload logo. Please try again.');
      console.error('Logo upload error:', error);
    } finally {
      setUploadingLogo(prev => ({ ...prev, [logoType]: false }));
    }
  };

  const handleGeocodeAddress = async () => {
    if (!formData.host_location) {
      setError('Please enter a location address first');
      return;
    }

    // Use Google Maps Geocoding API (you'll need to add API key to env)
    // For now, we'll just store the address and let users provide map links manually
    // In production, you'd call: https://maps.googleapis.com/maps/api/geocode/json?address=...
    
    // For MVP, we'll just validate the address exists and let them add map link manually
    setFormData(prev => ({
      ...prev,
      host_location_lat: '',
      host_location_lng: ''
    }));
  };

  const getMapLink = () => {
    if (!formData.host_location) return '';
    const encodedAddress = encodeURIComponent(formData.host_location);
    return `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    // Validate word counts
    if (formData.host_description) {
      const wordCount = formData.host_description.trim().split(/\s+/).length;
      if (wordCount > 150) {
        setError('Host description must be 150 words or less');
        setLoading(false);
        return;
      }
    }

    if (formData.sponsor_description) {
      const wordCount = formData.sponsor_description.trim().split(/\s+/).length;
      if (wordCount > 150) {
        setError('Sponsor description must be 150 words or less');
        setLoading(false);
        return;
      }
    }

    try {
      const resp = await fetch('/api/operators/events/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          ...formData,
          stake_amount: parseFloat(formData.stake_amount),
          max_seats: parseInt(formData.max_seats),
          sponsor_pot_value: formData.sponsor_pot_value ? parseUSD(formData.sponsor_pot_value) : 0,
          host_location_lat: formData.host_location_lat || null,
          host_location_lng: formData.host_location_lng || null
        })
      });

      const json = await resp.json();

      if (json.ok) {
        setSuccess(true);
        setTimeout(() => {
          handleNavigate(withEmail(`/operators/events/${json.event.id}`));
        }, 1500);
      } else {
        setError(json.error || 'Failed to create event');
      }
    } catch (error) {
      setError('Failed to create event. Please try again.');
      console.error('Create event error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Apply input masks
    if (name === 'sponsor_phone') {
      setFormData(prev => ({ ...prev, [name]: formatPhoneNumber(value) }));
    } else if (name === 'sponsor_pot_value') {
      setFormData(prev => ({ ...prev, [name]: formatUSD(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
      
      // Update word counts for descriptions
      if (name === 'host_description') {
        const wordCount = value.trim().split(/\s+/).filter(w => w.length > 0).length;
        setHostDescriptionWordCount(wordCount);
      } else if (name === 'sponsor_description') {
        const wordCount = value.trim().split(/\s+/).filter(w => w.length > 0).length;
        setSponsorDescriptionWordCount(wordCount);
      }
    }
  };

  if (!userRoles.includes('chief_operator') && !userRoles.includes('super_admin')) {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <OperatorsHeader active="events" email={email} userRoles={userRoles} onNavigate={handleNavigate} />
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <p className="text-gray-600">Only Chief Operators can create events.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <OperatorsHeader active="events" email={email} userRoles={userRoles} onNavigate={handleNavigate} />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6">
          <button
            onClick={() => handleNavigate(withEmail('/operators/events'))}
            className="text-blue-600 hover:text-blue-700 mb-4"
          >
            ← Back to Events
          </button>
          <h1 className="text-3xl font-semibold text-gray-900">Create Event</h1>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm max-w-4xl">
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
              Event created successfully! Redirecting...
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Event Info */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Event Information</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                    Event Title *
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    required
                    value={formData.title}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., February 2026 Operators Meeting"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="event_date" className="block text-sm font-medium text-gray-700 mb-2">
                      Event Date *
                    </label>
                    <input
                      type="date"
                      id="event_date"
                      name="event_date"
                      required
                      value={formData.event_date}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="max_seats" className="block text-sm font-medium text-gray-700 mb-2">
                      Max Seats *
                    </label>
                    <input
                      type="number"
                      id="max_seats"
                      name="max_seats"
                      required
                      min="1"
                      value={formData.max_seats}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="20"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="stake_amount" className="block text-sm font-medium text-gray-700 mb-2">
                    Stake Amount ($) *
                  </label>
                  <input
                    type="number"
                    id="stake_amount"
                    name="stake_amount"
                    required
                    min="0"
                    step="0.01"
                    value={formData.stake_amount}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="50.00"
                  />
                </div>
              </div>
            </section>

            {/* Host Information */}
            <section className="border-t pt-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Host Information</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="host_name" className="block text-sm font-medium text-gray-700 mb-2">
                    Host Name
                  </label>
                  <input
                    type="text"
                    id="host_name"
                    name="host_name"
                    value={formData.host_name}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Acme Corporation"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Host Logo
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) handleLogoUpload('host', file);
                      }}
                      className="text-sm text-gray-600"
                      disabled={uploadingLogo.host}
                    />
                    {uploadingLogo.host && <span className="text-sm text-gray-500">Uploading...</span>}
                    {formData.host_logo_url && (
                      <img src={formData.host_logo_url} alt="Host logo" className="h-12 w-auto" />
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">PNG or JPG, max 2MB. Recommended: 200x200px</p>
                </div>

                <div>
                  <label htmlFor="host_location" className="block text-sm font-medium text-gray-700 mb-2">
                    Host Location (Address)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      id="host_location"
                      name="host_location"
                      value={formData.host_location}
                      onChange={handleChange}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="123 Main St, City, State ZIP"
                    />
                    {formData.host_location && (
                      <a
                        href={getMapLink()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap"
                      >
                        Get Directions
                      </a>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Enter full address for map links</p>
                </div>

                <div>
                  <label htmlFor="host_description" className="block text-sm font-medium text-gray-700 mb-2">
                    Host Description
                    {hostDescriptionWordCount > 0 && (
                      <span className={`ml-2 text-sm ${hostDescriptionWordCount > 150 ? 'text-red-600' : 'text-gray-500'}`}>
                        ({hostDescriptionWordCount}/150 words)
                      </span>
                    )}
                  </label>
                  <textarea
                    id="host_description"
                    name="host_description"
                    rows="4"
                    value={formData.host_description}
                    onChange={handleChange}
                    maxLength={1000}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Brief description of the host (150 words max)"
                  />
                </div>
              </div>
            </section>

            {/* Sponsor Information */}
            <section className="border-t pt-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Sponsor Information (Optional)</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="sponsor_name" className="block text-sm font-medium text-gray-700 mb-2">
                    Sponsor Name
                  </label>
                  <input
                    type="text"
                    id="sponsor_name"
                    name="sponsor_name"
                    value={formData.sponsor_name}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., TechCorp Inc"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sponsor Logo
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) handleLogoUpload('sponsor', file);
                      }}
                      className="text-sm text-gray-600"
                      disabled={uploadingLogo.sponsor}
                    />
                    {uploadingLogo.sponsor && <span className="text-sm text-gray-500">Uploading...</span>}
                    {formData.sponsor_logo_url && (
                      <img src={formData.sponsor_logo_url} alt="Sponsor logo" className="h-12 w-auto" />
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">PNG or JPG, max 2MB. Recommended: 200x200px</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="sponsor_website" className="block text-sm font-medium text-gray-700 mb-2">
                      Sponsor Website
                    </label>
                    <input
                      type="url"
                      id="sponsor_website"
                      name="sponsor_website"
                      value={formData.sponsor_website}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://example.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="sponsor_phone" className="block text-sm font-medium text-gray-700 mb-2">
                      Sponsor Phone
                    </label>
                    <input
                      type="tel"
                      id="sponsor_phone"
                      name="sponsor_phone"
                      value={formData.sponsor_phone}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="sponsor_pot_value" className="block text-sm font-medium text-gray-700 mb-2">
                    Sponsor Pot Value ($)
                  </label>
                  <input
                    type="text"
                    id="sponsor_pot_value"
                    name="sponsor_pot_value"
                    value={formData.sponsor_pot_value}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                  <p className="mt-1 text-xs text-gray-500">Additional contribution to the pot for this event</p>
                </div>

                <div>
                  <label htmlFor="sponsor_description" className="block text-sm font-medium text-gray-700 mb-2">
                    Sponsor Description
                    {sponsorDescriptionWordCount > 0 && (
                      <span className={`ml-2 text-sm ${sponsorDescriptionWordCount > 150 ? 'text-red-600' : 'text-gray-500'}`}>
                        ({sponsorDescriptionWordCount}/150 words)
                      </span>
                    )}
                  </label>
                  <textarea
                    id="sponsor_description"
                    name="sponsor_description"
                    rows="4"
                    value={formData.sponsor_description}
                    onChange={handleChange}
                    maxLength={1000}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Brief description of the sponsor (150 words max)"
                  />
                </div>
              </div>
            </section>

            <div className="flex gap-4 pt-4 border-t">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Event'}
              </button>
              <button
                type="button"
                onClick={() => handleNavigate(withEmail('/operators/events'))}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
