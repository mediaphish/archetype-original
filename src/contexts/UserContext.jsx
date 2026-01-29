import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const UserContext = createContext(null);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
};

export default function UserProvider({ children, initialEmail = null }) {
  // Get email from localStorage first (from magic link auth), then URL param (backward compatibility)
  const getEmail = () => {
    if (typeof window === 'undefined') return '';
    // Check localStorage first (from magic link authentication)
    const stored = localStorage.getItem('operators_email');
    if (stored) return stored;
    // Fall back to URL param (backward compatibility)
    return new URLSearchParams(window.location.search).get('email') || '';
  };

  const [email, setEmail] = useState(initialEmail || getEmail());
  const [userRoles, setUserRoles] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = useCallback(async () => {
    if (!email) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const resp = await fetch(`/api/operators/users/me?email=${encodeURIComponent(email)}`);
      const json = await resp.json();
      
      if (json.ok && json.user) {
        setUserRoles(json.user.roles || []);
        setUserProfile(json.user);
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // Sync email from localStorage when it changes (e.g., from magic link verification)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const checkStorage = () => {
      const stored = localStorage.getItem('operators_email');
      if (stored && stored !== email) {
        setEmail(stored);
      }
    };
    
    // Check on mount and when storage changes
    checkStorage();
    window.addEventListener('storage', checkStorage);
    
    // Also check periodically (for same-tab updates)
    const interval = setInterval(checkStorage, 1000);
    
    return () => {
      window.removeEventListener('storage', checkStorage);
      clearInterval(interval);
    };
  }, [email]);

  const updateEmail = useCallback((newEmail) => {
    setEmail(newEmail);
    // Store in localStorage when email is set (from magic link verification)
    if (typeof window !== 'undefined' && newEmail) {
      try {
        localStorage.setItem('operators_email', newEmail);
      } catch (e) {
        console.error('Failed to store email in localStorage:', e);
      }
    }
  }, []);

  const logout = useCallback(() => {
    setEmail('');
    setUserRoles([]);
    setUserProfile(null);
    // Clear localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('operators_email');
      } catch (e) {
        console.error('Failed to remove email from localStorage:', e);
      }
    }
  }, []);

  const refreshUserData = useCallback(() => {
    fetchUserData();
  }, [fetchUserData]);

  const isSuperAdmin = useMemo(() => userRoles.includes('super_admin'), [userRoles]);
  const isChiefOperator = useMemo(() => userRoles.includes('chief_operator') || userRoles.includes('super_admin'), [userRoles]);
  const isAuthenticated = useMemo(() => !!email, [email]);

  const value = useMemo(() => ({
    email,
    userRoles,
    userProfile,
    loading,
    updateEmail,
    refreshUserData,
    logout,
    isSuperAdmin,
    isChiefOperator,
    isAuthenticated,
  }), [email, userRoles, userProfile, loading, updateEmail, refreshUserData, logout, isSuperAdmin, isChiefOperator, isAuthenticated]);

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}
