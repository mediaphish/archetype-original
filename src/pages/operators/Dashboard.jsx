import React, { useState, useEffect } from 'react';
import OperatorsHeader from '../../components/operators/OperatorsHeader';
import { MapPin, ExternalLink } from 'lucide-react';

export default function Dashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [candidateForm, setCandidateForm] = useState({});

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch dashboard metrics
        const dashboardResp = await fetch('/api/operators/dashboard');
        const dashboardJson = await dashboardResp.json();
        console.log('[DASHBOARD] API response:', dashboardJson);
        if (dashboardJson.ok && dashboardJson.dashboard) {
          setDashboard(dashboardJson.dashboard);
        } else {
          console.error('[DASHBOARD] API error:', dashboardJson.error || 'No dashboard data returned');
          setDashboard(null);
        }

        // Fetch upcoming events
        if (email) {
          const eventsResp = await fetch(`/api/operators/events?state=LIVE&email=${encodeURIComponent(email)}`);
          const eventsJson = await eventsResp.json();
          if (eventsJson.ok && eventsJson.events) {
            // Filter to only future events and add RSVP data
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const future = eventsJson.events.filter(e => {
              const eventDate = new Date(e.event_date);
              return eventDate >= today;
            }).map(e => ({
              ...e,
              user_rsvp: e.user_rsvp_status ? { status: e.user_rsvp_status } : null,
              rsvps: Array.from({ length: e.confirmed_count || 0 }, (_, i) => ({ status: 'confirmed' }))
                .concat(Array.from({ length: e.waitlist_count || 0 }, (_, i) => ({ status: 'waitlisted' })))
            }));
            setUpcomingEvents(future);
          }
        }
      } catch (error) {
        console.error('Failed to fetch dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [email]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <OperatorsHeader active="dashboard" email={email} userRoles={userRoles} />
        <div className="container mx-auto px-4 py-8">Loading dashboard...</div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <OperatorsHeader active="dashboard" email={email} userRoles={userRoles} />
        <div className="container mx-auto px-4 py-8">No data available</div>
      </div>
    );
  }

  const handleRSVP = async (eventId) => {
    setActionLoading(true);
    try {
      const resp = await fetch(`/api/operators/events/${eventId}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, action: 'rsvp' })
      });
      const json = await resp.json();
      if (json.ok) {
        // Refresh events
        const eventsResp = await fetch(`/api/operators/events?state=LIVE&email=${encodeURIComponent(email)}`);
        const eventsJson = await eventsResp.json();
        if (eventsJson.ok && eventsJson.events) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const future = eventsJson.events.filter(e => {
            const eventDate = new Date(e.event_date);
            return eventDate >= today;
          }).map(e => ({
            ...e,
            user_rsvp: e.user_rsvp_status ? { status: e.user_rsvp_status } : null,
            rsvps: Array.from({ length: e.confirmed_count || 0 }, (_, i) => ({ status: 'confirmed' }))
              .concat(Array.from({ length: e.waitlist_count || 0 }, (_, i) => ({ status: 'waitlisted' })))
          }));
          setUpcomingEvents(future);
        }
      } else {
        alert(json.error || 'Failed to RSVP');
      }
    } catch (error) {
      alert('Failed to RSVP. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelRSVP = async (eventId) => {
    if (!confirm('Are you sure you want to cancel your RSVP?')) {
      return;
    }
    setActionLoading(true);
    try {
      const resp = await fetch(`/api/operators/events/${eventId}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, action: 'cancel' })
      });
      const json = await resp.json();
      if (json.ok) {
        // Refresh events
        const eventsResp = await fetch(`/api/operators/events?state=LIVE&email=${encodeURIComponent(email)}`);
        const eventsJson = await eventsResp.json();
        if (eventsJson.ok && eventsJson.events) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const future = eventsJson.events.filter(e => {
            const eventDate = new Date(e.event_date);
            return eventDate >= today;
          }).map(e => ({
            ...e,
            user_rsvp: e.user_rsvp_status ? { status: e.user_rsvp_status } : null,
            rsvps: Array.from({ length: e.confirmed_count || 0 }, (_, i) => ({ status: 'confirmed' }))
              .concat(Array.from({ length: e.waitlist_count || 0 }, (_, i) => ({ status: 'waitlisted' })))
          }));
          setUpcomingEvents(future);
        }
      } else {
        alert(json.error || 'Failed to cancel RSVP');
      }
    } catch (error) {
      alert('Failed to cancel RSVP. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const canCancelRSVP = (event) => {
    if (!event.user_rsvp || event.state !== 'LIVE') return false;
    if (!event.event_date || !event.start_time) return false;
    
    const eventDateTime = new Date(`${event.event_date}T${event.start_time}`);
    const now = new Date();
    const hoursUntilEvent = (eventDateTime - now) / (1000 * 60 * 60);
    return hoursUntilEvent >= 24;
  };

  const handleSubmitCandidate = async (e, eventId) => {
    e.preventDefault();
    setActionLoading(true);
    const form = candidateForm[eventId] || { candidate_email: '', essay: '', contact_info: '' };
    try {
      const resp = await fetch('/api/operators/candidates/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          event_id: eventId,
          ...form
        })
      });
      const json = await resp.json();
      if (json.ok) {
        setCandidateForm(prev => ({ ...prev, [eventId]: { candidate_email: '', essay: '', contact_info: '' } }));
        // Refresh events
        const eventsResp = await fetch(`/api/operators/events?state=LIVE&email=${encodeURIComponent(email)}`);
        const eventsJson = await eventsResp.json();
        if (eventsJson.ok && eventsJson.events) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const future = eventsJson.events.filter(e => {
            const eventDate = new Date(e.event_date);
            return eventDate >= today;
          }).map(e => ({
            ...e,
            user_rsvp: e.user_rsvp_status ? { status: e.user_rsvp_status } : null,
            rsvps: Array.from({ length: e.confirmed_count || 0 }, (_, i) => ({ status: 'confirmed' }))
              .concat(Array.from({ length: e.waitlist_count || 0 }, (_, i) => ({ status: 'waitlisted' })))
          }));
          setUpcomingEvents(future);
        }
      } else {
        alert(json.error || 'Failed to submit candidate');
      }
    } catch (error) {
      alert('Failed to submit candidate. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const getStateColor = (state) => {
    switch (state) {
      case 'LIVE': return 'bg-blue-100 text-blue-800';
      case 'OPEN': return 'bg-green-100 text-green-800';
      case 'CLOSED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMapLink = (address) => {
    if (!address) return '';
    const encodedAddress = encodeURIComponent(address);
    return `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    // timeString is in HH:MM format (24-hour)
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const isOperator = userRoles.includes('operator');
  const canRSVP = isOperator || userRoles.includes('candidate');

  if (!dashboard) {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <OperatorsHeader active="dashboard" email={email} userRoles={userRoles} onNavigate={handleNavigate} />
        <div className="container mx-auto px-4 py-8">No data available</div>
      </div>
    );
  }

  const { event_metrics, longitudinal_metrics } = dashboard;

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <OperatorsHeader active="dashboard" email={email} userRoles={userRoles} onNavigate={handleNavigate} />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <h1 className="text-3xl font-semibold text-gray-900 mb-6">Dashboard</h1>
        
        {/* Event Metrics */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Event Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Total Events</h3>
              <p className="text-2xl font-semibold text-gray-900">{event_metrics.total_events}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Live Events</h3>
              <p className="text-2xl font-semibold text-gray-900">{event_metrics.live_events}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Open Events</h3>
              <p className="text-2xl font-semibold text-gray-900">{event_metrics.open_events}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Closed Events</h3>
              <p className="text-2xl font-semibold text-gray-900">{event_metrics.closed_events}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Seats Filled Rate</h3>
              <p className="text-2xl font-semibold text-gray-900">{event_metrics.seats_filled_rate.toFixed(1)}%</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Voting Completion</h3>
              <p className="text-2xl font-semibold text-gray-900">{event_metrics.voting_completion_rate.toFixed(1)}%</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Attendance Counted</h3>
              <p className="text-2xl font-semibold text-gray-900">{event_metrics.attendance_counted_rate.toFixed(1)}%</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Total Pot</h3>
              <p className="text-2xl font-semibold text-gray-900">${event_metrics.total_pot.toFixed(2)}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Room Positivity</h3>
              <p className="text-2xl font-semibold text-gray-900">{(event_metrics.room_positivity_index * 100).toFixed(1)}%</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Signal Clarity</h3>
              <p className="text-2xl font-semibold text-gray-900">{event_metrics.signal_clarity.toFixed(3)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Total Offenses</h3>
              <p className="text-2xl font-semibold text-gray-900">{event_metrics.total_offenses}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-sm font-medium text-gray-500 mb-2">No Shows</h3>
              <p className="text-2xl font-semibold text-gray-900">{event_metrics.no_show_offenses}</p>
            </div>
          </div>
        </div>

        {/* Longitudinal Metrics */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Longitudinal Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Active Operators</h3>
              <p className="text-2xl font-semibold text-gray-900">{longitudinal_metrics.active_operators}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Repeat Attendees</h3>
              <p className="text-2xl font-semibold text-gray-900">{longitudinal_metrics.repeat_attendance_count}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Promotion Rate</h3>
              <p className="text-2xl font-semibold text-gray-900">{longitudinal_metrics.promotion_rate.toFixed(1)}%</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Avg Signal Clarity</h3>
              <p className="text-2xl font-semibold text-gray-900">{longitudinal_metrics.average_signal_clarity.toFixed(3)}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Yellow Cards</h3>
              <p className="text-2xl font-semibold text-yellow-600">{longitudinal_metrics.discipline_trends.yellow_cards}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Orange Cards</h3>
              <p className="text-2xl font-semibold text-orange-600">{longitudinal_metrics.discipline_trends.orange_cards}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Red Cards</h3>
              <p className="text-2xl font-semibold text-red-600">{longitudinal_metrics.discipline_trends.red_cards}</p>
            </div>
          </div>
        </div>

        {/* Recent ROI Winners */}
        {dashboard.recent_roi_winners && dashboard.recent_roi_winners.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Recent ROI Winners</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dashboard.recent_roi_winners.map(winner => {
                const winnerName = winner.winner_name || (winner.winner_email ? winner.winner_email.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Unknown');
                const eventDate = winner.event_date ? new Date(winner.event_date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                }) : null;
                
                return (
                  <div key={winner.id} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{winnerName}</h3>
                      {winner.event_title && (
                        <p className="text-sm text-gray-600 mb-1">{winner.event_title}</p>
                      )}
                      {eventDate && (
                        <p className="text-xs text-gray-500">{eventDate}</p>
                      )}
                    </div>
                    {winner.pot_amount_won !== null && (
                      <div className="pt-3 border-t border-gray-200">
                        <p className="text-sm font-medium text-gray-500 mb-1">Pot Won</p>
                        <p className="text-2xl font-semibold text-green-600">
                          ${winner.pot_amount_won.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Upcoming Events */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Upcoming Events</h2>
          {upcomingEvents.length > 0 ? (
            <div className="space-y-6">
              {upcomingEvents.map(event => {
                const eventForm = candidateForm[event.id] || { candidate_email: '', essay: '', contact_info: '' };
                const canInviteCandidate = isOperator && event.state === 'LIVE';
                
                return (
                  <div key={event.id} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold text-gray-900">{event.title}</h3>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStateColor(event.state)}`}>
                            {event.state}
                          </span>
                        </div>
                        <p className="text-gray-600">
                          {new Date(event.event_date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                          {event.start_time && event.finish_time && (
                            <span className="ml-2">
                              • {formatTime(event.start_time)} - {formatTime(event.finish_time)}
                            </span>
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() => handleNavigate(withEmail(`/operators/events/${event.id}`))}
                        className="px-4 py-2 text-blue-600 hover:text-blue-700 border border-blue-600 rounded-lg"
                      >
                        View Details
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Stake Amount</p>
                        <p className="text-gray-900">${event.stake_amount}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Seats</p>
                        <p className="text-gray-900">
                          {event.rsvps?.filter(r => r.status === 'confirmed').length || 0}/{event.max_seats}
                        </p>
                      </div>
                    </div>

                    {event.host_name && (
                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-700 mb-1">Host: {event.host_name}</p>
                        {event.host_location && (
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-sm text-gray-600">{event.host_location}</p>
                              <a
                                href={getMapLink(event.host_location)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mt-1"
                              >
                                Get Directions <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {event.state === 'LIVE' && (
                      <div className="space-y-4 border-t pt-4">
                        {/* Rules Section */}
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Rules & Requirements</h4>
                          <div className="text-sm text-gray-600 space-y-2">
                            <div>
                              <p className="font-medium">To Become a Candidate:</p>
                              <ul className="list-disc list-inside ml-2 space-y-1">
                                <li>Must be invited by an existing Operator</li>
                                <li>Must submit a 200+ word essay</li>
                                <li>Must be approved by a Chief Operator</li>
                              </ul>
                            </div>
                            <div>
                              <p className="font-medium">To Become an Operator:</p>
                              <ul className="list-disc list-inside ml-2 space-y-1">
                                <li>Must be an approved Candidate</li>
                                <li>Must attend and be checked in</li>
                                <li>Must receive votes and be promoted</li>
                              </ul>
                            </div>
                          </div>
                        </div>

                        {/* RSVP */}
                        {canRSVP && !event.user_rsvp && (
                          <div>
                            <button
                              onClick={() => handleRSVP(event.id)}
                              disabled={actionLoading}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                              RSVP
                            </button>
                          </div>
                        )}

                        {/* RSVP Status and Cancel */}
                        {event.user_rsvp && (
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-700">Your RSVP:</span>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                event.user_rsvp.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                event.user_rsvp.status === 'waitlisted' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {event.user_rsvp.status}
                              </span>
                            </div>
                            {canCancelRSVP(event) && (
                              <button
                                onClick={() => handleCancelRSVP(event.id)}
                                disabled={actionLoading}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm"
                              >
                                Cancel RSVP
                              </button>
                            )}
                          </div>
                        )}

                        {/* Invite Candidate */}
                        {canInviteCandidate && (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Invite Candidate</h4>
                            <form onSubmit={(e) => handleSubmitCandidate(e, event.id)} className="space-y-3">
                              <input
                                type="email"
                                required
                                value={eventForm.candidate_email}
                                onChange={(e) => setCandidateForm(prev => ({
                                  ...prev,
                                  [event.id]: { ...eventForm, candidate_email: e.target.value }
                                }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                placeholder="Candidate email"
                              />
                              <textarea
                                required
                                rows="4"
                                value={eventForm.essay}
                                onChange={(e) => setCandidateForm(prev => ({
                                  ...prev,
                                  [event.id]: { ...eventForm, essay: e.target.value }
                                }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                placeholder="Essay (200+ words)"
                              />
                              <input
                                type="text"
                                required
                                value={eventForm.contact_info}
                                onChange={(e) => setCandidateForm(prev => ({
                                  ...prev,
                                  [event.id]: { ...eventForm, contact_info: e.target.value }
                                }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                placeholder="Contact info"
                              />
                              <button
                                type="submit"
                                disabled={actionLoading}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                              >
                                Submit Candidate
                              </button>
                            </form>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <p className="text-gray-500 text-center">No upcoming events scheduled</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
