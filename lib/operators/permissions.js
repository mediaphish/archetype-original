/**
 * Operators Permission Checking
 * 
 * Utility functions to check user roles and permissions for Operators system
 */

import { supabaseAdmin } from '../supabase-admin.js';

/**
 * Get user's Operators roles
 * @param {string} email - User email
 * @returns {Promise<string[]>} Array of role strings
 */
export async function getUserOperatorsRoles(email) {
  if (!email) return [];
  
  try {
    const { data, error } = await supabaseAdmin
      .from('operators_users')
      .select('roles')
      .eq('email', email)
      .maybeSingle();
    
    if (error) {
      console.error('[OPERATORS_PERMISSIONS] Error fetching user roles:', error);
      return [];
    }
    
    return data?.roles || [];
  } catch (error) {
    console.error('[OPERATORS_PERMISSIONS] Exception fetching user roles:', error);
    return [];
  }
}

/**
 * Check if user has a specific role
 * @param {string} email - User email
 * @param {string} role - Role to check ('super_admin', 'chief_operator', 'operator', 'candidate', 'accountant')
 * @returns {Promise<boolean>}
 */
export async function hasRole(email, role) {
  const roles = await getUserOperatorsRoles(email);
  return roles.includes(role);
}

/**
 * Check if user has any of the specified roles
 * @param {string} email - User email
 * @param {string[]} allowedRoles - Array of allowed roles
 * @returns {Promise<boolean>}
 */
export async function hasAnyRole(email, allowedRoles) {
  const roles = await getUserOperatorsRoles(email);
  return allowedRoles.some(role => roles.includes(role));
}

/**
 * Check if user can perform action in event state
 * @param {string} email - User email
 * @param {string} eventState - Event state ('LIVE', 'OPEN', 'CLOSED')
 * @param {string} action - Action to check
 * @returns {Promise<boolean>}
 */
export async function canPerformAction(email, eventState, action) {
  const roles = await getUserOperatorsRoles(email);
  const isSA = roles.includes('super_admin');
  const isCO = roles.includes('chief_operator');
  const isOperator = roles.includes('operator');
  const isCandidate = roles.includes('candidate');
  const isAccountant = roles.includes('accountant');
  
  // Super Admin can do everything
  if (isSA) return true;
  
  // State-specific permissions
  if (eventState === 'LIVE') {
    switch (action) {
      case 'create_event':
        return isCO;
      case 'approve_candidate':
        return isCO;
      case 'open_event':
        return isCO || isAccountant;
      case 'close_event':
        return isCO || isAccountant;
      case 'rsvp':
        return isOperator || isCandidate;
      case 'invite_candidate':
        return isOperator;
      case 'view_event':
        return true; // All roles can view
      default:
        return false;
    }
  }
  
  if (eventState === 'OPEN') {
    switch (action) {
      case 'vote':
        return isOperator || isCandidate;
      case 'check_in':
        return isAccountant;
      case 'mark_no_show':
        return isAccountant;
      case 'record_offense':
        return isAccountant;
      case 'promote_waitlist':
        return isCO || isAccountant;
      case 'view_votes':
        return isCO || isAccountant || isSA;
      case 'close_event':
        return isCO || isAccountant;
      case 'view_event':
        return true;
      default:
        return false;
    }
  }
  
  if (eventState === 'CLOSED') {
    switch (action) {
      case 'view_outcomes':
        return true; // All roles can view outcomes
      case 'reverse_offense':
        return isSA; // Only SA can reverse
      default:
        return false;
    }
  }
  
  return false;
}

/**
 * Get user's Operators user record
 * @param {string} email - User email
 * @returns {Promise<Object|null>} User record or null
 */
export async function getOperatorsUser(email) {
  if (!email) return null;
  
  try {
    const { data, error } = await supabaseAdmin
      .from('operators_users')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    
    if (error) {
      console.error('[OPERATORS_PERMISSIONS] Error fetching user:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('[OPERATORS_PERMISSIONS] Exception fetching user:', error);
    return null;
  }
}

/**
 * Check if user is benched
 * @param {string} email - User email
 * @returns {Promise<boolean>}
 */
export async function isBenched(email) {
  const user = await getOperatorsUser(email);
  if (!user) return false;
  
  if (!user.benched_until) return false;
  
  return new Date(user.benched_until) > new Date();
}

/**
 * Check if user has owed balance
 * @param {string} email - User email
 * @returns {Promise<boolean>}
 */
export async function hasOwedBalance(email) {
  const user = await getOperatorsUser(email);
  if (!user) return false;
  
  return user.owed_balance > 0;
}

/**
 * Check if user can manage topics (SA, CO, or Accountant)
 * @param {string} email - User email
 * @returns {Promise<boolean>}
 */
export async function canManageTopics(email) {
  return await hasAnyRole(email, ['super_admin', 'chief_operator', 'accountant']);
}
