import React, { useState, useEffect } from 'react';
import OperatorsHeader from '../../components/operators/OperatorsHeader';
import { UserPlus, RotateCcw, Shield, AlertCircle } from 'lucide-react';
import { useToast } from '../../components/operators/ToastProvider';
import ConfirmModal from '../../components/operators/ConfirmModal';
import { useUser } from '../../contexts/UserContext';
import { handleKeyDown } from '../../lib/operators/accessibility';

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [promoteEmail, setPromoteEmail] = useState('');
  const [reverseEmail, setReverseEmail] = useState('');
  const [confirmModal, setConfirmModal] = useState({ isOpen: false });
  const toast = useToast();
  const { email, userRoles } = useUser();

  const handleNavigate = (path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  };


  useEffect(() => {
    const fetchUsers = async () => {
      if (!email) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const resp = await fetch(`/api/operators/users?email=${encodeURIComponent(email)}`);
        const json = await resp.json();
        
        if (json.ok) {
          setUsers(json.users || []);
        } else if (json.error && json.error.includes('Super Admin')) {
          // User is not Super Admin, that's okay
          setUsers([]);
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [email]);

  const handlePromote = async (targetEmail) => {
    if (!targetEmail) {
      toast.error('Please enter an email address');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Promote to Chief Operator',
      message: `Promote ${targetEmail} to Chief Operator?`,
      onConfirm: () => performPromote(targetEmail),
      variant: 'default'
    });
  };

  const performPromote = async (targetEmail) => {

    setActionLoading(true);
    try {
      const resp = await fetch(`/api/operators/users/${encodeURIComponent(targetEmail)}/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const json = await resp.json();
      if (json.ok) {
        setPromoteEmail('');
        // Refresh users
        const refreshResp = await fetch(`/api/operators/users?email=${encodeURIComponent(email)}`);
        const refreshJson = await refreshResp.json();
        if (refreshJson.ok) setUsers(refreshJson.users || []);
        toast.success('User promoted successfully');
      } else {
        toast.error(json.error || 'Failed to promote user');
      }
    } catch (error) {
      toast.error('Failed to promote user. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReverseOffense = async (targetEmail) => {
    if (!targetEmail) {
      toast.error('Please enter an email address');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Reverse Offenses',
      message: `Reverse all offenses for ${targetEmail}? This will remove card status, bench status, and owed balance.`,
      onConfirm: () => performReverseOffense(targetEmail),
      variant: 'danger'
    });
  };

  const performReverseOffense = async (targetEmail) => {

    setActionLoading(true);
    try {
      const resp = await fetch(`/api/operators/users/${encodeURIComponent(targetEmail)}/reverse-offense`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const json = await resp.json();
      if (json.ok) {
        setReverseEmail('');
        // Refresh users
        const refreshResp = await fetch(`/api/operators/users?email=${encodeURIComponent(email)}`);
        const refreshJson = await refreshResp.json();
        if (refreshJson.ok) setUsers(refreshJson.users || []);
        toast.success('Offenses reversed successfully');
      } else {
        toast.error(json.error || 'Failed to reverse offenses');
      }
    } catch (error) {
      toast.error('Failed to reverse offenses. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const getCardStatusColor = (status) => {
    switch (status) {
      case 'yellow': return 'bg-yellow-100 text-yellow-800';
      case 'orange': return 'bg-orange-100 text-orange-800';
      case 'red': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isSuperAdmin = userRoles.includes('super_admin');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <OperatorsHeader active="admin" email={email} userRoles={userRoles} onNavigate={handleNavigate} />
        <div className="container mx-auto px-4 py-8">Loading...</div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <OperatorsHeader active="admin" email={email} userRoles={userRoles} onNavigate={handleNavigate} />
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="bg-white rounded-xl border border-red-200 p-6 shadow-sm">
            <p className="text-red-600">Only Super Admins can access this page.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <OperatorsHeader active="admin" email={email} userRoles={userRoles} onNavigate={handleNavigate} />
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant || 'default'}
      />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <h1 className="text-3xl font-semibold text-gray-900 mb-6">Admin Controls</h1>

        {/* Promote User */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5" aria-hidden="true" />
            Promote to Chief Operator
          </h2>
          <div className="flex gap-2">
            <input
              type="email"
              value={promoteEmail}
              onChange={(e) => setPromoteEmail(e.target.value)}
              placeholder="user@example.com"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
              aria-label="Email address of user to promote"
            />
            <button
              onClick={() => handlePromote(promoteEmail)}
              onKeyDown={handleKeyDown(() => handlePromote(promoteEmail))}
              disabled={actionLoading || !promoteEmail}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              aria-label="Promote user to Chief Operator"
            >
              Promote
            </button>
          </div>
        </div>

        {/* Reverse Offense */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <RotateCcw className="w-5 h-5" aria-hidden="true" />
            Reverse Offense
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            This will remove card status, bench status, and reset owed balance for a user.
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              value={reverseEmail}
              onChange={(e) => setReverseEmail(e.target.value)}
              placeholder="user@example.com"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
              aria-label="Email address of user to reverse offenses for"
            />
            <button
              onClick={() => handleReverseOffense(reverseEmail)}
              onKeyDown={handleKeyDown(() => handleReverseOffense(reverseEmail))}
              disabled={actionLoading || !reverseEmail}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              aria-label="Reverse all offenses for user"
            >
              Reverse
            </button>
          </div>
        </div>

        {/* All Users */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" aria-hidden="true" />
            All Users
          </h2>
          {users.length === 0 ? (
            <p className="text-gray-600">No users found.</p>
          ) : (
            <div className="space-y-3">
              {users.map(user => (
                <div key={user.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 mb-2">{user.email}</p>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {user.roles && user.roles.length > 0 ? (
                          user.roles.map(role => (
                            <span key={role} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                              {role}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-500">No roles</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        {user.card_status !== 'none' && (
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getCardStatusColor(user.card_status)}`}>
                            Card: {user.card_status} ({user.card_count || 0})
                          </span>
                        )}
                        {user.benched_until && (
                          <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                            Benched until: {new Date(user.benched_until).toLocaleDateString()}
                          </span>
                        )}
                        {user.owed_balance > 0 && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                            Owed: ${user.owed_balance}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
