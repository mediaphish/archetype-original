/**
 * Re-exports dashboard allowlist helpers for the React app (same rules as server).
 * Implementation lives in lib/operators/dashboard-allowlist.js.
 */
export {
  DEFAULT_OPERATORS_DASHBOARD_EMAILS,
  rolesCanViewOperatorsDashboard,
  emailMayViewOperatorsDashboard,
} from '../../../lib/operators/dashboard-allowlist.js';
