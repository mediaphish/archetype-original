import React, { useState, useEffect } from 'react';
import OperatorsHeader from '../../components/operators/OperatorsHeader';

export default function CreateEvent() {
  const [formData, setFormData] = useState({
    title: '',
    event_date: '',
    stake_amount: '',
    max_seats: '',
    sponsor_email: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [userRoles, setUserRoles] = useState([]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const resp = await fetch('/api/operators/events/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          ...formData,
          stake_amount: parseFloat(formData.stake_amount),
          max_seats: parseInt(formData.max_seats)
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
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
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

        <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm max-w-2xl">
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

          <form onSubmit={handleSubmit} className="space-y-6">
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

            <div className="grid grid-cols-2 gap-4">
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
              <label htmlFor="sponsor_email" className="block text-sm font-medium text-gray-700 mb-2">
                Sponsor Email (Optional)
              </label>
              <input
                type="email"
                id="sponsor_email"
                name="sponsor_email"
                value={formData.sponsor_email}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="sponsor@example.com"
              />
              <p className="mt-1 text-sm text-gray-500">Maximum 1 sponsor per event</p>
            </div>

            <div className="flex gap-4">
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
