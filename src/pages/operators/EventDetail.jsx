import React, { useState, useEffect } from 'react';
import OperatorsHeader from '../../components/operators/OperatorsHeader';
import { MapPin, ExternalLink, Users, UserPlus, CheckCircle, XCircle, Clock, ThumbsUp, ThumbsDown, LogIn, LogOut, X, ChevronDown, ChevronUp, Edit2, Save, Lock } from 'lucide-react';

export default function EventDetail() {
  const path = window.location.pathname;
  const id = path.replace('/operators/events/', '');
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [candidateForm, setCandidateForm] = useState({ candidate_email: '', essay: '', contact_info: '' });
  const [userVotes, setUserVotes] = useState({}); // { target_email: vote_value }
  const [editingScenarioId, setEditingScenarioId] = useState(null);
  const [editingScenarios, setEditingScenarios] = useState([]);
  const [expandedPrompts, setExpandedPrompts] = useState(new Set());
  const [voteSummary, setVoteSummary] = useState({}); // { target_email: { upvotes, downvotes } }

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
          // Initialize user votes from event data
          if (json.event.vote_summary) {
            setVoteSummary(json.event.vote_summary);
          }
          // Fetch user's votes to show current vote status
          if (json.event.state === 'OPEN' && email) {
            fetchUserVotes(id, email);
          }
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

  const canCancelRSVP = (event) => {
    if (!event || !event.event_date || !event.start_time) return false;
    const eventDateTime = new Date(`${event.event_date}T${event.start_time}`);
    const now = new Date();
    const hoursUntilEvent = (eventDateTime - now) / (1000 * 60 * 60);
    return hoursUntilEvent > 24;
  };

  const handleCancelRSVP = async () => {
    if (!confirm('Are you sure you want to cancel your RSVP?')) return;
    setActionLoading(true);
    try {
      const resp = await fetch(`/api/operators/events/${id}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, action: 'cancel' })
      });
      const json = await resp.json();
      if (json.ok) {
        // Refresh event data
        const eventResp = await fetch(`/api/operators/events/${id}?email=${encodeURIComponent(email)}`);
        const eventJson = await eventResp.json();
        if (eventJson.ok) setEvent(eventJson.event);
      } else {
        alert(json.error || 'Failed to cancel RSVP');
      }
    } catch (error) {
      alert('Failed to cancel RSVP. Please try again.');
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

  const handleRemoveRSVP = async (targetEmail) => {
    if (!confirm(`Are you sure you want to remove ${targetEmail} from this event?`)) {
      return;
    }
    setActionLoading(true);
    try {
      const resp = await fetch(`/api/operators/events/${id}/remove-rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, target_email: targetEmail })
      });
      const json = await resp.json();
      if (json.ok) {
        // Refresh event data
        const eventResp = await fetch(`/api/operators/events/${id}?email=${encodeURIComponent(email)}`);
        const eventJson = await eventResp.json();
        if (eventJson.ok) setEvent(eventJson.event);
      } else {
        alert(json.error || 'Failed to remove RSVP');
      }
    } catch (error) {
      alert('Failed to remove RSVP. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePromoteWaitlist = async (targetEmail) => {
    setActionLoading(true);
    try {
      const resp = await fetch(`/api/operators/events/${id}/promote-waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, target_email: targetEmail })
      });
      const json = await resp.json();
      if (json.ok) {
        // Refresh event data
        const eventResp = await fetch(`/api/operators/events/${id}?email=${encodeURIComponent(email)}`);
        const eventJson = await eventResp.json();
        if (eventJson.ok) setEvent(eventJson.event);
      } else {
        alert(json.error || 'Failed to promote from waitlist');
      }
    } catch (error) {
      alert('Failed to promote from waitlist. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenEvent = async () => {
    if (!confirm('Are you sure you want to start this event? This will enable voting and check-ins.')) return;
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

  const handleReopenEvent = async () => {
    if (!confirm('Are you sure you want to reopen this event? This will unlock scenarios and allow voting/attendance again.')) return;
    setActionLoading(true);
    try {
      const resp = await fetch(`/api/operators/events/${id}/reopen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const json = await resp.json();
      if (json.ok) {
        // Refresh event data with cache-busting to ensure fresh data
        const eventResp = await fetch(`/api/operators/events/${id}?email=${encodeURIComponent(email)}&_t=${Date.now()}`);
        const eventJson = await eventResp.json();
        if (eventJson.ok) {
          setEvent(eventJson.event);
          console.log('Event reopened to OPEN. RSVP Closed:', eventJson.event.rsvp_closed);
        }
      } else {
        const errorMsg = json.details ? `${json.error}: ${json.details}` : json.error || 'Failed to reopen event';
        console.error('Reopen event error:', json);
        alert(errorMsg);
      }
    } catch (error) {
      alert('Failed to reopen event. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevertToLive = async () => {
    if (!confirm('Are you sure you want to revert this event to LIVE? This will unlock scenarios and allow editing before opening again.')) return;
    setActionLoading(true);
    try {
      const resp = await fetch(`/api/operators/events/${id}/revert-to-live`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const json = await resp.json();
      if (json.ok) {
        console.log('[UI] Revert to LIVE successful. Event from API:', json.event);
        // Refresh event data with cache-busting to ensure fresh data
        const eventResp = await fetch(`/api/operators/events/${id}?email=${encodeURIComponent(email)}&_t=${Date.now()}`);
        const eventJson = await eventResp.json();
        if (eventJson.ok) {
          console.log('[UI] Refreshed event data. State:', eventJson.event.state, 'RSVP Closed:', eventJson.event.rsvp_closed);
          setEvent(eventJson.event);
          // Force a re-render by updating state
          alert('Event successfully reverted to LIVE. RSVPs are now enabled.');
        } else {
          console.error('[UI] Failed to refresh event data:', eventJson);
          alert('Event reverted but failed to refresh. Please reload the page.');
        }
      } else {
        const errorMsg = json.details ? `${json.error}: ${json.details}` : json.error || 'Failed to revert event to LIVE';
        console.error('Revert to LIVE error:', json);
        alert(errorMsg);
      }
    } catch (error) {
      alert('Failed to revert event to LIVE. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const fetchUserVotes = async (eventId, userEmail) => {
    try {
      // Get event data which includes vote_summary
      const resp = await fetch(`/api/operators/events/${eventId}?email=${encodeURIComponent(userEmail)}`);
      const json = await resp.json();
      if (json.ok && json.event.vote_summary) {
        setVoteSummary(json.event.vote_summary);
      }
      // Note: We'll get user's actual votes from the event data when it's fetched
      // The API doesn't currently return individual user votes, so we'll infer from vote_summary
    } catch (error) {
      console.error('Failed to fetch user votes:', error);
    }
  };

  const handleVote = async (targetEmail, voteValue) => {
    if (email === targetEmail) {
      alert('You cannot vote for yourself');
      return;
    }

    setActionLoading(true);
    try {
      const resp = await fetch(`/api/operators/events/${id}/votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          target_email: targetEmail,
          vote_value: voteValue
        })
      });
      const json = await resp.json();
      if (json.ok) {
        // Update user's vote tracking
        setUserVotes(prev => ({ ...prev, [targetEmail]: voteValue }));
        // Refresh event data to get updated vote counts
        const eventResp = await fetch(`/api/operators/events/${id}?email=${encodeURIComponent(email)}`);
        const eventJson = await eventResp.json();
        if (eventJson.ok) {
          setEvent(eventJson.event);
          if (eventJson.event.vote_summary) {
            setVoteSummary(eventJson.event.vote_summary);
          }
        }
      } else {
        alert(json.error || 'Failed to submit vote');
      }
    } catch (error) {
      alert('Failed to submit vote. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckIn = async (targetEmail, action, cashConfirmed = false) => {
    if (action === 'check_in' && !cashConfirmed) {
      if (!confirm('Have you confirmed cash payment for this attendee?')) {
        return;
      }
      cashConfirmed = true;
    }

    setActionLoading(true);
    try {
      const resp = await fetch(`/api/operators/events/${id}/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          target_email: targetEmail,
          action,
          cash_confirmed: cashConfirmed
        })
      });
      const json = await resp.json();
      if (json.ok) {
        // Refresh event data
        const eventResp = await fetch(`/api/operators/events/${id}?email=${encodeURIComponent(email)}`);
        const eventJson = await eventResp.json();
        if (eventJson.ok) setEvent(eventJson.event);
      } else {
        alert(json.error || `Failed to ${action}`);
      }
    } catch (error) {
      alert(`Failed to ${action}. Please try again.`);
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

  const formatTime = (timeString) => {
    if (!timeString) return '';
    // timeString is in HH:MM format (24-hour)
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <OperatorsHeader active="events" email={email} userRoles={userRoles} onNavigate={handleNavigate} />
        <div className="container mx-auto px-4 py-8">Loading event...</div>
      </div>
    );
  }

  const handleCloseRSVP = async () => {
    if (!confirm('Are you sure you want to close RSVP? This will prevent new RSVPs and stop waitlist auto-promotion.')) {
      return;
    }
    setActionLoading(true);
    try {
      const resp = await fetch(`/api/operators/events/${id}/close-rsvp`, {
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
        alert(json.error || 'Failed to close RSVP');
      }
    } catch (error) {
      alert('Failed to close RSVP. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateScenarios = async () => {
    if (!confirm('Generate scenario insights for this event? This will analyze attendee profiles and current challenges to create realistic problem scenarios.')) {
      return;
    }
    setActionLoading(true);
    try {
      const resp = await fetch(`/api/operators/events/${id}/generate-scenarios`, {
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
        alert(json.error || 'Failed to generate scenarios');
      }
    } catch (error) {
      alert('Failed to generate scenarios. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateScenarios = async () => {
    setActionLoading(true);
    try {
      const resp = await fetch(`/api/operators/events/${id}/scenarios`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, scenarios: editingScenarios })
      });
      const json = await resp.json();
      if (json.ok) {
        setEditingScenarioId(null);
        setEditingScenarios([]);
        // Refresh event data
        const eventResp = await fetch(`/api/operators/events/${id}?email=${encodeURIComponent(email)}`);
        const eventJson = await eventResp.json();
        if (eventJson.ok) setEvent(eventJson.event);
      } else {
        alert(json.error || 'Failed to update scenarios');
      }
    } catch (error) {
      alert('Failed to update scenarios. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartEditScenarios = () => {
    if (event.scenarios && event.scenarios.length > 0) {
      setEditingScenarios([...event.scenarios]);
      setEditingScenarioId('all');
    }
  };

  const handleCancelEditScenarios = () => {
    setEditingScenarioId(null);
    setEditingScenarios([]);
  };

  const handleMoveScenario = (index, direction) => {
    if (direction === 'up' && index > 0) {
      const newScenarios = [...editingScenarios];
      [newScenarios[index], newScenarios[index - 1]] = [newScenarios[index - 1], newScenarios[index]];
      newScenarios[index].rank = index + 1;
      newScenarios[index - 1].rank = index;
      setEditingScenarios(newScenarios);
    } else if (direction === 'down' && index < editingScenarios.length - 1) {
      const newScenarios = [...editingScenarios];
      [newScenarios[index], newScenarios[index + 1]] = [newScenarios[index + 1], newScenarios[index]];
      newScenarios[index].rank = index + 1;
      newScenarios[index + 1].rank = index + 2;
      setEditingScenarios(newScenarios);
    }
  };

  const togglePrompts = (scenarioId) => {
    const newExpanded = new Set(expandedPrompts);
    if (newExpanded.has(scenarioId)) {
      newExpanded.delete(scenarioId);
    } else {
      newExpanded.add(scenarioId);
    }
    setExpandedPrompts(newExpanded);
  };


  if (!event) {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <OperatorsHeader active="events" email={email} userRoles={userRoles} onNavigate={handleNavigate} />
        <div className="container mx-auto px-4 py-8">Event not found</div>
      </div>
    );
  }

  const isSA = userRoles.includes('super_admin');
  const isCO = userRoles.includes('chief_operator') || userRoles.includes('super_admin');
  const isOperator = userRoles.includes('operator');
  const isAccountant = userRoles.includes('accountant');
  const canRSVP = isOperator || userRoles.includes('candidate');
  const canInviteCandidate = isOperator && event.state === 'LIVE' && !event.rsvp_closed;
  const canApproveCandidate = isCO && event.state === 'LIVE';
  const canManageEvent = isCO || isAccountant;
  const canManageRSVPs = isSA || isCO; // SA or CO can manage RSVPs
  const canManageTopics = isSA || isCO || isAccountant; // SA, CO, or Accountant can manage scenarios
  
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
                {event.start_time && event.finish_time && (
                  <span className="ml-2">
                    • {formatTime(event.start_time)} - {formatTime(event.finish_time)}
                  </span>
                )}
              </p>
            </div>
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

                {/* RSVP Status and Cancel */}
                {event.user_rsvp && (
                  <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Your RSVP</h2>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-sm font-medium text-gray-700">Status:</span>
                      <span className={`px-3 py-1 rounded text-sm font-medium ${
                        event.user_rsvp.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        event.user_rsvp.status === 'waitlisted' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {event.user_rsvp.status}
                      </span>
                    </div>
                    {canCancelRSVP(event) && (
                      <button
                        onClick={handleCancelRSVP}
                        disabled={actionLoading}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                      >
                        {actionLoading ? 'Processing...' : 'Cancel RSVP'}
                      </button>
                    )}
                    {!canCancelRSVP(event) && event.user_rsvp && (
                      <p className="text-sm text-gray-500">
                        Cancellation is only available more than 24 hours before the event starts.
                      </p>
                    )}
                  </div>
                )}

                {/* Rules & Requirements */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Rules & Requirements</h2>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">To Become a Candidate:</h3>
                      <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                        <li>Must be invited by an existing Operator</li>
                        <li>Must submit a 200+ word essay explaining why you want to join</li>
                        <li>Must provide contact information</li>
                        <li>Must be approved by a Chief Operator</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">To Become an Operator:</h3>
                      <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                        <li>Must be an approved Candidate</li>
                        <li>Must attend an event and be checked in</li>
                        <li>Must receive votes from other Operators during the event</li>
                        <li>Must be promoted based on voting results and attendance</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Scenario Insights (SA/CO/Accountant only) */}
                {canManageTopics && (event.state === 'LIVE' || event.state === 'OPEN') && (
                  <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Topics & Scenarios</h2>
                    
                    {/* Close RSVP Section (LIVE only) */}
                    {event.state === 'LIVE' && event.can_close_rsvp && (
                      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-900 mb-3">
                          RSVP is currently open. Close RSVP to enable scenario generation.
                        </p>
                        <button
                          onClick={handleCloseRSVP}
                          disabled={actionLoading}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                          {actionLoading ? 'Processing...' : 'Close RSVP'}
                        </button>
                      </div>
                    )}

                    {/* Generate Scenarios Section (LIVE only) */}
                    {event.state === 'LIVE' && event.can_generate_scenarios && (
                      <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-900 mb-3">
                          RSVP is closed. Generate AI-powered scenario insights based on attendee profiles and current challenges.
                        </p>
                        <button
                          onClick={handleGenerateScenarios}
                          disabled={actionLoading}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                          {actionLoading ? 'Generating...' : 'Generate Scenario Insights'}
                        </button>
                      </div>
                    )}

                    {/* Scenarios Display */}
                    {event.scenarios && event.scenarios.length > 0 && (
                      <div className="space-y-4">
                        {/* Edit Mode (LIVE only, not locked) */}
                        {editingScenarioId === 'all' && event.state === 'LIVE' ? (
                          <div className="space-y-4">
                            {editingScenarios.map((scenario, index) => (
                              <div key={scenario.id} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-500">Rank {scenario.rank}</span>
                                    <button
                                      onClick={() => handleMoveScenario(index, 'up')}
                                      disabled={index === 0}
                                      className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-30"
                                    >
                                      <ChevronUp className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleMoveScenario(index, 'down')}
                                      disabled={index === editingScenarios.length - 1}
                                      className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-30"
                                    >
                                      <ChevronDown className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                                <div className="space-y-3">
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Scenario Title</label>
                                    <input
                                      type="text"
                                      value={scenario.scenario_title}
                                      onChange={(e) => {
                                        const updated = [...editingScenarios];
                                        updated[index].scenario_title = e.target.value;
                                        setEditingScenarios(updated);
                                      }}
                                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Scenario Story</label>
                                    <textarea
                                      value={scenario.scenario_story}
                                      onChange={(e) => {
                                        const updated = [...editingScenarios];
                                        updated[index].scenario_story = e.target.value;
                                        setEditingScenarios(updated);
                                      }}
                                      rows="5"
                                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                                      placeholder="1 paragraph (3-5 sentences) describing the problem scenario"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Why This Fits</label>
                                    <input
                                      type="text"
                                      value={scenario.why_this_fits_this_room}
                                      onChange={(e) => {
                                        const updated = [...editingScenarios];
                                        updated[index].why_this_fits_this_room = e.target.value;
                                        setEditingScenarios(updated);
                                      }}
                                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Starter Prompts (one per line)</label>
                                    <textarea
                                      value={Array.isArray(scenario.starter_prompts) ? scenario.starter_prompts.join('\n') : ''}
                                      onChange={(e) => {
                                        const updated = [...editingScenarios];
                                        updated[index].starter_prompts = e.target.value.split('\n').filter(p => p.trim());
                                        setEditingScenarios(updated);
                                      }}
                                      rows="4"
                                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                            <div className="flex items-center gap-3">
                              <button
                                onClick={handleUpdateScenarios}
                                disabled={actionLoading}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                              >
                                <Save className="w-4 h-4" />
                                Save Changes
                              </button>
                              <button
                                onClick={handleCancelEditScenarios}
                                disabled={actionLoading}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* View Mode */
                          <div className="space-y-4">
                            {event.scenarios.map((scenario) => (
                              <div key={scenario.id} className="border border-gray-200 rounded-lg p-4">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-sm font-medium text-gray-500">#{scenario.rank}</span>
                                      <h3 className="text-lg font-semibold text-gray-900">{scenario.scenario_title}</h3>
                                      {scenario.is_locked && (
                                        <Lock className="w-4 h-4 text-gray-400" title="Locked" />
                                      )}
                                    </div>
                                    <p className="text-sm text-gray-700 mb-3 leading-relaxed">{scenario.scenario_story}</p>
                                    <p className="text-sm text-gray-700 italic mb-3 border-l-2 border-gray-300 pl-3">
                                      <span className="font-medium">Why this fits:</span> {scenario.why_this_fits_this_room}
                                    </p>
                                  </div>
                                </div>
                                <div>
                                  <button
                                    onClick={() => togglePrompts(scenario.id)}
                                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                                  >
                                    {expandedPrompts.has(scenario.id) ? (
                                      <>
                                        <ChevronUp className="w-4 h-4" />
                                        Hide Starter Prompts
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown className="w-4 h-4" />
                                        Show Starter Prompts
                                      </>
                                    )}
                                  </button>
                                  {expandedPrompts.has(scenario.id) && (
                                    <div className="mt-2 pl-4 border-l-2 border-gray-200">
                                      <ul className="space-y-1 text-sm text-gray-600">
                                        {(Array.isArray(scenario.starter_prompts) ? scenario.starter_prompts : []).map((prompt, idx) => (
                                          <li key={idx} className="list-disc list-inside">{prompt}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                            {/* Edit Scenarios button (LIVE only, not locked) */}
                            {event.state === 'LIVE' && event.can_edit_scenarios && !event.scenarios.some(s => s.is_locked) && (
                              <button
                                onClick={handleStartEditScenarios}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center gap-2"
                              >
                                <Edit2 className="w-4 h-4" />
                                Edit Scenarios
                              </button>
                            )}
                            {/* Locked message for OPEN events */}
                            {event.state === 'OPEN' && (
                              <p className="text-sm text-gray-500 italic flex items-center gap-2">
                                <Lock className="w-4 h-4" />
                                Scenarios are locked. They cannot be edited once the event is open.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {event.rsvp_closed && !event.scenarios && !event.can_generate_scenarios && (
                      <p className="text-sm text-gray-500">Scenarios have been generated. Refresh to view them.</p>
                    )}
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

                {/* Manage RSVPs (SA/CO only) */}
                {canManageRSVPs && event.rsvps && event.rsvps.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold text-gray-900">Manage RSVPs</h2>
                      {event.rsvp_closed && (
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded">
                          RSVPs Closed
                        </span>
                      )}
                    </div>
                    
                    {/* Confirmed RSVPs */}
                    {event.rsvps.filter(r => r.status === 'confirmed').length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-3">Confirmed ({event.rsvps.filter(r => r.status === 'confirmed').length})</h3>
                        <div className="space-y-2">
                          {event.rsvps
                            .filter(r => r.status === 'confirmed')
                            .map(rsvp => (
                              <div key={rsvp.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                                <div>
                                  <p className="font-medium text-gray-900">{rsvp.user_email}</p>
                                  <p className="text-xs text-gray-500">
                                    RSVP'd: {new Date(rsvp.created_at).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                </div>
                                <button
                                  onClick={() => handleRemoveRSVP(rsvp.user_email)}
                                  disabled={actionLoading}
                                  className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Waitlisted RSVPs */}
                    {event.rsvps.filter(r => r.status === 'waitlisted').length > 0 && (
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-3">Waitlisted ({event.rsvps.filter(r => r.status === 'waitlisted').length})</h3>
                        <div className="space-y-2">
                          {event.rsvps
                            .filter(r => r.status === 'waitlisted')
                            .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
                            .map(rsvp => (
                              <div key={rsvp.id} className="flex items-center justify-between p-3 border border-yellow-200 bg-yellow-50 rounded-lg">
                                <div>
                                  <p className="font-medium text-gray-900">{rsvp.user_email}</p>
                                  <p className="text-xs text-gray-500">
                                    Waitlisted: {new Date(rsvp.created_at).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                </div>
                                <button
                                  onClick={() => handlePromoteWaitlist(rsvp.user_email)}
                                  disabled={actionLoading}
                                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                                >
                                  Promote
                                </button>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {event.rsvps.filter(r => r.status === 'confirmed').length === 0 && event.rsvps.filter(r => r.status === 'waitlisted').length === 0 && (
                      <p className="text-gray-500 text-sm">No RSVPs yet.</p>
                    )}
                  </div>
                )}
              </>
            )}

            {/* OPEN State - Voting, Check-in, etc. */}
            {event.state === 'OPEN' && (
              <>
                {/* Voting Interface */}
                {isOperator && (
                  <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Voting</h2>
                    {event.remaining_votes !== null && (
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-900">
                          <span className="font-medium">Remaining Votes:</span> {event.remaining_votes} / 10
                        </p>
                      </div>
                    )}
                    {event.rsvps && event.rsvps.filter(r => r.status === 'confirmed' || r.status === 'attended').length > 0 ? (
                      <div className="space-y-3">
                        {event.rsvps
                          .filter(r => (r.status === 'confirmed' || r.status === 'attended') && r.user_email !== email)
                          .map(rsvp => {
                            const summary = event.vote_summary?.[rsvp.user_email] || { upvotes: 0, downvotes: 0 };
                            // Check if user has voted for this person (we'll need to track this after voting)
                            const userVote = userVotes[rsvp.user_email] || null;
                            return (
                              <div key={rsvp.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">{rsvp.user_email}</p>
                                  <div className="flex items-center gap-4 mt-1">
                                    <span className="text-sm text-green-600">↑ {summary.upvotes}</span>
                                    <span className="text-sm text-red-600">↓ {summary.downvotes}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleVote(rsvp.user_email, 1)}
                                    disabled={actionLoading || event.remaining_votes === 0}
                                    className={`p-2 rounded-lg ${
                                      userVote === 1
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-gray-100 text-gray-600 hover:bg-green-50'
                                    } disabled:opacity-50`}
                                    title="Vote Up"
                                  >
                                    <ThumbsUp className="w-5 h-5" />
                                  </button>
                                  <button
                                    onClick={() => handleVote(rsvp.user_email, -1)}
                                    disabled={actionLoading || event.remaining_votes === 0}
                                    className={`p-2 rounded-lg ${
                                      userVote === -1
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-gray-100 text-gray-600 hover:bg-red-50'
                                    } disabled:opacity-50`}
                                    title="Vote Down"
                                  >
                                    <ThumbsDown className="w-5 h-5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No attendees to vote on yet.</p>
                    )}
                  </div>
                )}

                {/* Check-in Interface (Accountants only) */}
                {isAccountant && (
                  <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Check-In Management</h2>
                    {event.rsvps && event.rsvps.length > 0 ? (
                      <div className="space-y-3">
                        {event.rsvps.map(rsvp => {
                          const attendance = event.attendance?.find(a => a.user_email === rsvp.user_email);
                          const isCheckedIn = attendance?.checked_in || false;
                          const isNoShow = attendance?.marked_no_show || false;
                          const hasCheckedOut = attendance?.checked_out_at || false;

                          return (
                            <div key={rsvp.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{rsvp.user_email}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  {isCheckedIn && !hasCheckedOut && (
                                    <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">Checked In</span>
                                  )}
                                  {isNoShow && (
                                    <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded">No Show</span>
                                  )}
                                  {hasCheckedOut && (
                                    <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded">Checked Out</span>
                                  )}
                                  {!isCheckedIn && !isNoShow && (
                                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded">Not Checked In</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {!isCheckedIn && !isNoShow && (
                                  <button
                                    onClick={() => {
                                      if (confirm('Have you confirmed cash payment for this attendee?')) {
                                        handleCheckIn(rsvp.user_email, 'check_in', true);
                                      }
                                    }}
                                    disabled={actionLoading}
                                    className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                                  >
                                    <LogIn className="w-4 h-4" />
                                    Check In
                                  </button>
                                )}
                                {!isCheckedIn && !isNoShow && (
                                  <button
                                    onClick={() => handleCheckIn(rsvp.user_email, 'mark_no_show')}
                                    disabled={actionLoading}
                                    className="px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
                                  >
                                    <X className="w-4 h-4" />
                                    No Show
                                  </button>
                                )}
                                {isCheckedIn && !hasCheckedOut && (
                                  <button
                                    onClick={() => {
                                      if (confirm('Mark this attendee as checked out (early departure)?')) {
                                        handleCheckIn(rsvp.user_email, 'check_out');
                                      }
                                    }}
                                    disabled={actionLoading}
                                    className="px-3 py-2 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700 disabled:opacity-50 flex items-center gap-1"
                                  >
                                    <LogOut className="w-4 h-4" />
                                    Check Out
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No RSVPs to manage yet.</p>
                    )}
                  </div>
                )}
              </>
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
            {/* Event Actions (CO/Accountant only) */}
            {canManageEvent && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Event Actions</h2>
                <div className="space-y-3">
                  {event.state === 'LIVE' && (
                    <>
                      {canEdit && isFutureEvent && (
                        <button
                          onClick={() => handleNavigate(withEmail(`/operators/events/${id}/edit`))}
                          className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-left"
                        >
                          Edit Event
                        </button>
                      )}
                      <button
                        onClick={handleOpenEvent}
                        disabled={actionLoading}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        Start Event
                      </button>
                    </>
                  )}
                  {event.state === 'OPEN' && (
                    <>
                      <button
                        onClick={handleRevertToLive}
                        disabled={actionLoading}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        Revert to LIVE
                      </button>
                      <button
                        onClick={handleCloseEvent}
                        disabled={actionLoading}
                        className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                      >
                        Close Event
                      </button>
                    </>
                  )}
                  {event.state === 'CLOSED' && (
                    <button
                      onClick={handleReopenEvent}
                      disabled={actionLoading}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      Reopen Event
                    </button>
                  )}
                </div>
              </div>
            )}
            {/* RSVP Status */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">RSVPs</h3>
                {event.rsvp_closed && (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                    Closed
                  </span>
                )}
              </div>
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

          </div>
        </div>
      </div>
    </div>
  );
}
