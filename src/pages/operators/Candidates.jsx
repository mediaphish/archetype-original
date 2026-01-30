import React, { useState, useEffect } from 'react';
import OperatorsHeader from '../../components/operators/OperatorsHeader';
import LoadingSpinner, { ButtonSpinner } from '../../components/operators/LoadingSpinner';
import Skeleton, { SkeletonTable } from '../../components/operators/Skeleton';
import { CheckCircle, XCircle, Clock, UserCheck } from 'lucide-react';
import { useToast } from '../../components/operators/ToastProvider';
import ConfirmModal from '../../components/operators/ConfirmModal';
import { useUser } from '../../contexts/UserContext';
import { EmptyCandidates } from '../../components/operators/EmptyState';
import { handleKeyDown } from '../../lib/operators/accessibility';

export default function Candidates() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [confirmModal, setConfirmModal] = useState({ isOpen: false });
  const toast = useToast();
  const { email, userRoles } = useUser();

  const handleNavigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };


  useEffect(() => {
    const fetchCandidates = async () => {
      if (!email) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const url = filterStatus === 'all' 
          ? `/api/operators/candidates?email=${encodeURIComponent(email)}`
          : `/api/operators/candidates?email=${encodeURIComponent(email)}&status=${filterStatus}`;
        
        const resp = await fetch(url);
        const json = await resp.json();
        
        if (json.ok) {
          setCandidates(json.candidates || []);
        }
      } catch (error) {
        console.error('Failed to fetch candidates:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCandidates();
  }, [email, filterStatus]);

  const handleApprove = async (candidateId) => {
    setActionLoading(true);
    try {
      const resp = await fetch(`/api/operators/candidates/${candidateId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const json = await resp.json();
      if (json.ok) {
        // Refresh candidates
        const url = filterStatus === 'all' 
          ? `/api/operators/candidates?email=${encodeURIComponent(email)}`
          : `/api/operators/candidates?email=${encodeURIComponent(email)}&status=${filterStatus}`;
        const refreshResp = await fetch(url);
        const refreshJson = await refreshResp.json();
        if (refreshJson.ok) {
          setCandidates(refreshJson.candidates || []);
          toast.success('Candidate approved successfully');
        }
      } else {
        toast.error(json.error || 'Failed to approve candidate');
      }
    } catch (error) {
      toast.error('Failed to approve candidate. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeny = async (candidateId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Deny Candidate',
      message: 'Are you sure you want to deny this candidate?',
      onConfirm: () => performDeny(candidateId),
      variant: 'danger'
    });
  };

  const performDeny = async (candidateId) => {
    setActionLoading(true);
    try {
      const resp = await fetch(`/api/operators/candidates/${candidateId}/deny`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const json = await resp.json();
      if (json.ok) {
        // Refresh candidates
        const url = filterStatus === 'all' 
          ? `/api/operators/candidates?email=${encodeURIComponent(email)}`
          : `/api/operators/candidates?email=${encodeURIComponent(email)}&status=${filterStatus}`;
        const refreshResp = await fetch(url);
        const refreshJson = await refreshResp.json();
        if (refreshJson.ok) {
          setCandidates(refreshJson.candidates || []);
          toast.success('Candidate denied');
        }
      } else {
        toast.error(json.error || 'Failed to deny candidate');
      }
    } catch (error) {
      toast.error('Failed to deny candidate. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'denied': return 'bg-red-100 text-red-800';
      case 'promoted': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'denied': return <XCircle className="w-4 h-4" />;
      case 'promoted': return <UserCheck className="w-4 h-4" />;
      default: return null;
    }
  };

  const isCO = userRoles.includes('chief_operator') || userRoles.includes('super_admin');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <OperatorsHeader active="candidates" onNavigate={handleNavigate} />
        <div className="container mx-auto px-4 py-8 max-w-7xl" aria-busy="true" aria-label="Loading candidates">
          <Skeleton className="h-8 mb-6" width="40%" />
          <SkeletonTable rows={6} cols={4} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <OperatorsHeader active="candidates" onNavigate={handleNavigate} />
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant || 'default'}
      />
      <div id="main-content" className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-semibold text-gray-900">Candidates</h1>
          <div className="flex gap-2" role="group" aria-label="Filter candidates by status">
            <button
              onClick={() => setFilterStatus('all')}
              onKeyDown={handleKeyDown(() => setFilterStatus('all'))}
              className={`min-h-[44px] px-4 py-2 rounded-lg text-sm flex items-center justify-center ${
                filterStatus === 'all' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
              aria-label="Show all candidates"
              aria-pressed={filterStatus === 'all'}
            >
              All
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              onKeyDown={handleKeyDown(() => setFilterStatus('pending'))}
              className={`min-h-[44px] px-4 py-2 rounded-lg text-sm flex items-center justify-center ${
                filterStatus === 'pending' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
              aria-label="Show pending candidates"
              aria-pressed={filterStatus === 'pending'}
            >
              Pending
            </button>
            <button
              onClick={() => setFilterStatus('approved')}
              onKeyDown={handleKeyDown(() => setFilterStatus('approved'))}
              className={`min-h-[44px] px-4 py-2 rounded-lg text-sm flex items-center justify-center ${
                filterStatus === 'approved' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
              aria-label="Show approved candidates"
              aria-pressed={filterStatus === 'approved'}
            >
              Approved
            </button>
            <button
              onClick={() => setFilterStatus('denied')}
              onKeyDown={handleKeyDown(() => setFilterStatus('denied'))}
              className={`min-h-[44px] px-4 py-2 rounded-lg text-sm flex items-center justify-center ${
                filterStatus === 'denied' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
              aria-label="Show denied candidates"
              aria-pressed={filterStatus === 'denied'}
            >
              Denied
            </button>
            <button
              onClick={() => setFilterStatus('promoted')}
              onKeyDown={handleKeyDown(() => setFilterStatus('promoted'))}
              className={`min-h-[44px] px-4 py-2 rounded-lg text-sm flex items-center justify-center ${
                filterStatus === 'promoted' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
              aria-label="Show promoted candidates"
              aria-pressed={filterStatus === 'promoted'}
            >
              Promoted
            </button>
          </div>
        </div>

        {candidates.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <EmptyCandidates />
          </div>
        ) : (
          <div className="space-y-4">
            {candidates.map(candidate => {
              const event = candidate.operators_events;
              return (
                <div key={candidate.id} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{candidate.candidate_email}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(candidate.status)}`} aria-label={`Candidate status: ${candidate.status}`}>
                          {React.cloneElement(getStatusIcon(candidate.status), { 'aria-hidden': 'true' })}
                          {candidate.status}
                        </span>
                      </div>
                      {event && (
                        <div className="text-sm text-gray-600 mb-2">
                          <span className="font-medium">Event:</span> {event.title} ({new Date(event.event_date).toLocaleDateString()})
                        </div>
                      )}
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Invited by:</span> {candidate.invited_by_email}
                      </div>
                      {candidate.approved_by_email && (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Approved by:</span> {candidate.approved_by_email}
                        </div>
                      )}
                      {candidate.approved_at && (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Approved:</span> {new Date(candidate.approved_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    {isCO && candidate.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(candidate.id)}
                          onKeyDown={handleKeyDown(() => handleApprove(candidate.id))}
                          disabled={actionLoading}
                          className="min-h-[44px] px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm flex items-center justify-center"
                          aria-label={`Approve candidate ${candidate.candidate_email}`}
                        >
                          {actionLoading ? <><ButtonSpinner /> Approving...</> : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleDeny(candidate.id)}
                          onKeyDown={handleKeyDown(() => handleDeny(candidate.id))}
                          disabled={actionLoading}
                          className="min-h-[44px] px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm flex items-center justify-center"
                          aria-label={`Deny candidate ${candidate.candidate_email}`}
                        >
                          {actionLoading ? <><ButtonSpinner /> Denying...</> : 'Deny'}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="border-t pt-4 mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Essay:</p>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{candidate.essay}</p>
                  </div>
                  <div className="mt-3">
                    <p className="text-sm font-medium text-gray-700 mb-1">Contact Info:</p>
                    <p className="text-sm text-gray-600">{candidate.contact_info}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
