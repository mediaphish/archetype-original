import React, { useState, useEffect } from 'react';
import OperatorsHeader from '../../components/operators/OperatorsHeader';
import { MapPin, ExternalLink, Users, UserPlus, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function EventDetail() {
  const path = window.location.pathname;
  const id = path.replace('/operators/events/', '');
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [candidateForm, setCandidateForm] = useState({ candidate_email: '', essay: '', contact_info: '' });

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
    const fetchEvent = async () => {
      if (!id || !email) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const resp = await fetch(`/api/operators/events/${id}?email=${encodeURIComponent(email)}`);
        const json = await resp.json();
        
        if (json.ok) {
          setEvent(json.event);
        }
      } catch (error) {
        console.error('Failed to fetch event:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id, email]);

  const handleRSVP = async () => {
    setActionLoading(true);
    try {
      const resp = await fetch(`/api/operators/events/${id}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, action: 'rsvp' })
      });
      const json = await resp.json();
      if (json.ok) {
        // Refresh event data
        const eventResp = await fetch(`/api/operators/events/${id}?email=${encodeURIComponent(email)}`);
        const eventJson = await eventResp.json();
        if (eventJson.ok) setEvent(eventJson.event);
      } else {
        alert(json.error || 'Failed to RSVP');
      }
    } catch (error) {
      alert('Failed to RSVP. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitCandidate = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const resp = await fetch('/api/operators/candidates/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          event_id: id,
          ...candidateForm
        })
      });
      const json = await resp.json();
      if (json.ok) {
        setCandidateForm({ candidate_email: '', essay: '', contact_info: '' });
        // Refresh event data
        const eventResp = await fetch(`/api/operators/events/${id}?email=${encodeURIComponent(email)}`);
        const eventJson = await eventResp.json();
        if (eventJson.ok) setEvent(eventJson.event);
      } else {
        alert(json.error || 'Failed to submit candidate');
      }
    } catch (error) {
      alert('Failed to submit candidate. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveCandidate = async (candidateId) => {
    setActionLoading(true);
    try {
      const resp = await fetch(`/api/operators/candidates/${candidateId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const json = await resp.json();
      if (json.ok) {
        // Refresh event data
        const eventResp = await fetch(`/api/operators/events/${id}?email=${encodeURIComponent(email)}`);
        const eventJson = await eventResp.json();
        if (eventJson.ok) setEvent(eventJson.event);
      } else {
        alert(json.error || 'Failed to approve candidate');
      }
    } catch (error) {
      alert('Failed to approve candidate. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenEvent = async () => {
    if (!confirm('Are you sure you want to open this event? This will enable voting and check-ins.')) return;
    setActionLoading(true);
    try {
      const resp = await fetch(`/api/operators/events/${id}/open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const json = await resp.json();
      if (json.ok) {
        // Refresh event data
        const eventResp = await fetch(`/api/operators/events/${id}?email=${encodeURIComponent(email)}`);
        const eventJson = await eventResp.json();
        if (eventJson.ok) setEvent(eventJson.event);
      } else {
        alert(json.error || 'Failed to open event');
      }
    } catch (error) {
      alert('Failed to open event. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseEvent = async () => {
    if (!confirm('Are you sure you want to close this event? This will finalize all outcomes and cannot be undone.')) return;
    setActionLoading(true);
    try {
      const resp = await fetch(`/api/operators/events/${id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const json = await resp.json();
      if (json.ok) {
        // Refresh event data
        const eventResp = await fetch(`/api/operators/events/${id}?email=${encodeURIComponent(email)}`);
        const eventJson = await eventResp.json();
        if (eventJson.ok) setEvent(eventJson.event);
      } else {
        alert(json.error || 'Failed to close event');
      }
    } catch (error) {
      alert('Failed to close event. Please try again.');
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

  const getMapLink = () => {
    if (!event?.host_location) return '';
    const encodedAddress = encodeURIComponent(event.host_location);
    return `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <OperatorsHeader active="events" email={email} userRoles={userRoles} onNavigate={handleNavigate} />
        <div className="container mx-auto px-4 py-8">Loading event...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <OperatorsHeader active="events" email={email} userRoles={userRoles} onNavigate={handleNavigate} />
        <div className="container mx-auto px-4 py-8">Event not found</div>
      </div>
    );
  }

  const isCO = userRoles.includes('chief_operator') || userRoles.includes('super_admin');
  const isOperator = userRoles.includes('operator');
  const isAccountant = userRoles.includes('accountant');
  const canRSVP = isOperator || userRoles.includes('candidate');
  const canInviteCandidate = isOperator && event.state === 'LIVE';
  const canApproveCandidate = isCO && event.state === 'LIVE';
  const canManageEvent = isCO || isAccountant;
  
  // Check if event can be edited (LIVE state and future date)
  const canEdit = isCO && event.state === 'LIVE';
  const eventDate = new Date(event.event_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isFutureEvent = eventDate >= today;

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
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-semibold text-gray-900">{event.title}</h1>
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
              </p>
            </div>
            {canManageEvent && event.state === 'LIVE' && (
              <button
                onClick={handleOpenEvent}
                disabled={actionLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Open Event
              </button>
            )}
            {canManageEvent && event.state === 'OPEN' && (
              <button
                onClick={handleCloseEvent}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Close Event
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event Details */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Event Details</h2>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-500">Stake Amount:</span>
                  <span className="ml-2 text-gray-900">${event.stake_amount}</span>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Max Seats:</span>
                  <span className="ml-2 text-gray-900">{event.max_seats}</span>
                </div>
                {event.user_rsvp && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Your RSVP:</span>
                    <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                      event.user_rsvp.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      event.user_rsvp.status === 'waitlisted' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {event.user_rsvp.status}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Host Information */}
            {(event.host_name || event.host_location) && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Host Information</h2>
                <div className="space-y-3">
                  {event.host_name && (
                    <div className="flex items-center gap-3">
                      {event.host_logo_url && (
                        <img src={event.host_logo_url} alt="Host logo" className="h-12 w-12 rounded" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{event.host_name}</p>
                      </div>
                    </div>
                  )}
                  {event.host_location && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-gray-900">{event.host_location}</p>
                        <a
                          href={getMapLink()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mt-1"
                        >
                          Get Directions <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  )}
                  {event.host_description && (
                    <p className="text-gray-600 text-sm">{event.host_description}</p>
                  )}
                </div>
              </div>
            )}

            {/* Sponsor Information */}
            {event.sponsor_name && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Sponsor Information</h2>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    {event.sponsor_logo_url && (
                      <img src={event.sponsor_logo_url} alt="Sponsor logo" className="h-12 w-12 rounded" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{event.sponsor_name}</p>
                      {event.sponsor_website && (
                        <a
                          href={event.sponsor_website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          {event.sponsor_website}
                        </a>
                      )}
                    </div>
                  </div>
                  {event.sponsor_phone && (
                    <p className="text-gray-600 text-sm">Phone: {event.sponsor_phone}</p>
                  )}
                  {event.sponsor_pot_value > 0 && (
                    <p className="text-gray-600 text-sm">Pot Contribution: ${event.sponsor_pot_value}</p>
                  )}
                  {event.sponsor_description && (
                    <p className="text-gray-600 text-sm">{event.sponsor_description}</p>
                  )}
                </div>
              </div>
            )}

            {/* LIVE State Actions */}
            {event.state === 'LIVE' && (
              <>
                {/* RSVP Section */}
                {canRSVP && !event.user_rsvp && (
                  <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">RSVP to Event</h2>
                    <button
                      onClick={handleRSVP}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {actionLoading ? 'Processing...' : 'RSVP'}
                    </button>
                  </div>
                )}

                {/* Invite Candidate (Operators only) */}
                {canInviteCandidate && (
                  <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Invite Candidate</h2>
                    <form onSubmit={handleSubmitCandidate} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Candidate Email *
                        </label>
                        <input
                          type="email"
                          required
                          value={candidateForm.candidate_email}
                          onChange={(e) => setCandidateForm({ ...candidateForm, candidate_email: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                          placeholder="candidate@example.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Essay (200+ words) *
                        </label>
                        <textarea
                          required
                          rows="6"
                          value={candidateForm.essay}
                          onChange={(e) => setCandidateForm({ ...candidateForm, essay: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                          placeholder="Why do you want to join The Operators?"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          {candidateForm.essay.trim().split(/\s+/).filter(w => w.length > 0).length} words
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Contact Info *
                        </label>
                        <input
                          type="text"
                          required
                          value={candidateForm.contact_info}
                          onChange={(e) => setCandidateForm({ ...candidateForm, contact_info: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                          placeholder="Phone, LinkedIn, etc."
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={actionLoading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {actionLoading ? 'Submitting...' : 'Submit Candidate'}
                      </button>
                    </form>
                  </div>
                )}

                {/* Approve Candidates (CO only) */}
                {canApproveCandidate && event.candidates && event.candidates.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Pending Candidates</h2>
                    <div className="space-y-4">
                      {event.candidates.filter(c => c.status === 'pending').map(candidate => (
                        <div key={candidate.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium text-gray-900">{candidate.candidate_email}</p>
                            <button
                              onClick={() => handleApproveCandidate(candidate.id)}
                              disabled={actionLoading}
                              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                            >
                              Approve
                            </button>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{candidate.essay}</p>
                          <p className="text-xs text-gray-500">Contact: {candidate.contact_info}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* OPEN State - Voting, Check-in, etc. */}
            {event.state === 'OPEN' && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Event is OPEN</h2>
                <p className="text-gray-600 mb-4">
                  Voting and check-ins are now active. {event.remaining_votes !== null && (
                    <span>You have {event.remaining_votes} votes remaining.</span>
                  )}
                </p>
                {/* Voting interface and check-in interface will be added in separate components */}
                <p className="text-sm text-gray-500">Voting and check-in interfaces coming soon...</p>
              </div>
            )}

            {/* CLOSED State - Outcomes */}
            {event.state === 'CLOSED' && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Event Outcomes</h2>
                {event.roi_winner && (
                  <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="font-medium text-green-900">ROi Winner:</p>
                    <p className="text-green-800">{event.roi_winner.winner_email}</p>
                  </div>
                )}
                {event.promotions && event.promotions.length > 0 && (
                  <div>
                    <p className="font-medium text-gray-900 mb-2">Promotions:</p>
                    {event.promotions.map(promo => (
                      <div key={promo.id} className="text-sm text-gray-600">
                        {promo.candidate_email}: {promo.promoted ? 'Promoted' : 'Not Promoted'}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* RSVP Status */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-3">RSVPs</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Confirmed:</span>
                  <span className="font-medium text-gray-900">
                    {event.rsvps?.filter(r => r.status === 'confirmed').length || 0}/{event.max_seats}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Waitlisted:</span>
                  <span className="font-medium text-gray-900">
                    {event.rsvps?.filter(r => r.status === 'waitlisted').length || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            {canManageEvent && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  {canEdit && isFutureEvent && (
                    <button
                      onClick={() => handleNavigate(withEmail(`/operators/events/${id}/edit`))}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      Edit Event
                    </button>
                  )}
                  {event.state === 'LIVE' && (
                    <button
                      onClick={handleOpenEvent}
                      disabled={actionLoading}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
                    >
                      Open Event
                    </button>
                  )}
                  {event.state === 'OPEN' && (
                    <button
                      onClick={handleCloseEvent}
                      disabled={actionLoading}
                      className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm"
                    >
                      Close Event
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
