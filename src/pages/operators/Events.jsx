import React, { useState, useEffect } from 'react';
import OperatorsHeader from '../../components/operators/OperatorsHeader';

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'LIVE', 'OPEN', 'CLOSED'
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
    const fetchEvents = async () => {
      if (!email) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const stateParam = filter !== 'all' ? `&state=${filter}` : '';
        const resp = await fetch(`/api/operators/events?email=${encodeURIComponent(email)}${stateParam}`);
        const json = await resp.json();
        
        if (json.ok) {
          setEvents(json.events || []);
          if (json.events && json.events.length > 0 && json.events[0].user_roles) {
            setUserRoles(json.events[0].user_roles);
          }
        }
      } catch (error) {
        console.error('Failed to fetch events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [email, filter]);

  const getStateColor = (state) => {
    switch (state) {
      case 'LIVE': return 'bg-blue-100 text-blue-800';
      case 'OPEN': return 'bg-green-100 text-green-800';
      case 'CLOSED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <OperatorsHeader active="events" email={email} userRoles={userRoles} onNavigate={handleNavigate} />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-semibold text-gray-900">Events</h1>
          {userRoles.includes('chief_operator') && (
            <button
              onClick={() => handleNavigate(withEmail('/operators/events/new'))}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Event
            </button>
          )}
        </div>

        <div className="flex gap-2 mb-6">
          {['all', 'LIVE', 'OPEN', 'CLOSED'].map(state => (
            <button
              key={state}
              onClick={() => setFilter(state)}
              className={`px-4 py-2 rounded-lg ${
                filter === state
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {state === 'all' ? 'All Events' : state}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12">Loading events...</div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No events found</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map(event => (
              <div
                key={event.id}
                onClick={() => handleNavigate(withEmail(`/operators/events/${event.id}`))}
                className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md cursor-pointer transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStateColor(event.state)}`}>
                    {event.state}
                  </span>
                  {event.user_rsvp_status && (
                    <span className="text-sm text-gray-500">RSVP: {event.user_rsvp_status}</span>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{event.title}</h3>
                <p className="text-sm text-gray-600 mb-4">
                  {new Date(event.event_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{event.confirmed_count}/{event.max_seats} seats</span>
                  {event.waitlist_count > 0 && (
                    <span>{event.waitlist_count} waitlisted</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
