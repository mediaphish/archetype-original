import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const UserContext = createContext(null);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
};

export default function UserProvider({ children, initialEmail = null }) {
  const [email, setEmail] = useState(initialEmail || (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('email') || '' : ''));
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

  const updateEmail = useCallback((newEmail) => {
    setEmail(newEmail);
  }, []);

  const refreshUserData = useCallback(() => {
    fetchUserData();
  }, [fetchUserData]);

  const value = {
    email,
    userRoles,
    userProfile,
    loading,
    updateEmail,
    refreshUserData,
    isSuperAdmin: userRoles.includes('super_admin'),
    isChiefOperator: userRoles.includes('chief_operator') || userRoles.includes('super_admin'),
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}
