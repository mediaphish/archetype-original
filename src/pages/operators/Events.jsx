import React, { useState, useEffect, useMemo, useCallback } from 'react';
import OperatorsHeader from '../../components/operators/OperatorsHeader';
import Skeleton, { SkeletonCard } from '../../components/operators/Skeleton';
import { EmptyEvents } from '../../components/operators/EmptyState';
import { useUser } from '../../contexts/UserContext';
import { handleKeyDown } from '../../lib/operators/accessibility';

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'LIVE', 'OPEN', 'CLOSED'
  
  const { email, userRoles, isAuthenticated } = useUser();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated && !email) {
      window.location.replace('/operators/login');
    }
  }, [isAuthenticated, email]);

  const handleNavigate = useCallback((path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);


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
        }
      } catch (error) {
        console.error('Failed to fetch events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [email, filter]);

  const getStateColor = useCallback((state) => {
    switch (state) {
      case 'LIVE': return 'bg-blue-100 text-blue-800';
      case 'OPEN': return 'bg-green-100 text-green-800';
      case 'CLOSED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <OperatorsHeader active="events" onNavigate={handleNavigate} />
      
      <div id="main-content" className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-semibold text-gray-900">Events</h1>
          {(userRoles.includes('chief_operator') || userRoles.includes('super_admin')) && (
            <button
              onClick={() => handleNavigate('/operators/events/new')}
              onKeyDown={handleKeyDown(() => handleNavigate('/operators/events/new'))}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              aria-label="Create a new event"
            >
              Create Event
            </button>
          )}
        </div>

        <div className="flex gap-2 mb-6" role="group" aria-label="Filter events by state">
          {['all', 'LIVE', 'OPEN', 'CLOSED'].map(state => (
            <button
              key={state}
              onClick={() => setFilter(state)}
              onKeyDown={handleKeyDown(() => setFilter(state))}
              className={`px-4 py-2 rounded-lg ${
                filter === state
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
              aria-label={`Filter events by ${state === 'all' ? 'all states' : state.toLowerCase()} state`}
              aria-pressed={filter === state}
            >
              {state === 'all' ? 'All Events' : state}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" aria-busy="true" aria-label="Loading events">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : events.length === 0 ? (
          <EmptyEvents onCreateEvent={() => handleNavigate('/operators/events/new')} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" role="list" aria-label="Events list">
            {events.map(event => (
              <div
                key={event.id}
                onClick={() => handleNavigate(`/operators/events/${event.id}`)}
                onKeyDown={handleKeyDown(() => handleNavigate(`/operators/events/${event.id}`))}
                className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md cursor-pointer transition-shadow"
                role="listitem"
                tabIndex={0}
                aria-label={`Event: ${event.title}, ${new Date(event.event_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}, ${event.confirmed_count} of ${event.max_seats} seats filled`}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStateColor(event.state)}`} aria-label={`Event state: ${event.state}`}>
                    {event.state}
                  </span>
                  {event.user_rsvp_status && (
                    <span className="text-sm text-gray-500" aria-label={`Your RSVP status: ${event.user_rsvp_status}`}>RSVP: {event.user_rsvp_status}</span>
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
                  <span aria-label={`${event.confirmed_count} confirmed out of ${event.max_seats} total seats`}>{event.confirmed_count}/{event.max_seats} seats</span>
                  {event.waitlist_count > 0 && (
                    <span aria-label={`${event.waitlist_count} people on waitlist`}>{event.waitlist_count} waitlisted</span>
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
