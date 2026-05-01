/**
 * ALI Narrative Privacy Helpers
 *
 * Encodes the N-threshold and small-tenant guardrails in one place so the
 * exposure rules cannot drift between endpoints. The companion documentation
 * is in `notes/ali-narrative-privacy.md` — keep that file in sync with this
 * code; if rules change, update both.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let cachedConfig = null;

const DEFAULT_CONFIG = {
  version: 1,
  exposure_n_threshold: 3,
  small_tenant_min_respondents: 8,
  tenant_overrides: {},
};

/**
 * Load and cache the privacy config. Falls back to a hard-coded default.
 */
export function getPrivacyConfig() {
  if (cachedConfig) return cachedConfig;
  const candidates = [
    path.resolve(__dirname, '../config/ali-narrative-privacy.json'),
    path.resolve(process.cwd(), 'config/ali-narrative-privacy.json'),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        cachedConfig = JSON.parse(fs.readFileSync(p, 'utf8'));
        return cachedConfig;
      }
    } catch (err) {
      console.warn('[ali-narrative-privacy] config load failed at', p, err?.message || err);
    }
  }
  cachedConfig = DEFAULT_CONFIG;
  return cachedConfig;
}

/**
 * Resolve effective thresholds for a tenant, applying any overrides.
 */
export function resolveTenantThresholds(tenantId, config) {
  const cfg = config || getPrivacyConfig();
  const override = (cfg.tenant_overrides && tenantId && cfg.tenant_overrides[tenantId]) || {};
  return {
    exposure_n_threshold: typeof override.exposure_n_threshold === 'number'
      ? override.exposure_n_threshold
      : cfg.exposure_n_threshold ?? DEFAULT_CONFIG.exposure_n_threshold,
    small_tenant_min_respondents: typeof override.small_tenant_min_respondents === 'number'
      ? override.small_tenant_min_respondents
      : cfg.small_tenant_min_respondents ?? DEFAULT_CONFIG.small_tenant_min_respondents,
  };
}

/**
 * Evaluate whether a (deployment, condition) bucket can be exposed.
 *
 * @param {Object} args
 * @param {number} args.approvedCount - Approved narratives in the bucket
 * @param {number} args.respondentCount - Total survey respondents for the deployment
 * @param {string} [args.tenantId]
 * @param {Object} [args.config]
 * @returns {{ allowed: boolean, reason: string, details: object }}
 */
export function evaluateExposureGate({ approvedCount, respondentCount, tenantId, config }) {
  const cfg = config || getPrivacyConfig();
  const thresholds = resolveTenantThresholds(tenantId, cfg);

  if (typeof respondentCount !== 'number' || respondentCount < thresholds.small_tenant_min_respondents) {
    return {
      allowed: false,
      reason: 'small_tenant_guardrail',
      details: {
        respondentCount: respondentCount || 0,
        small_tenant_min_respondents: thresholds.small_tenant_min_respondents,
      },
    };
  }

  if (typeof approvedCount !== 'number' || approvedCount < thresholds.exposure_n_threshold) {
    return {
      allowed: false,
      reason: 'n_threshold_not_met',
      details: {
        approvedCount: approvedCount || 0,
        exposure_n_threshold: thresholds.exposure_n_threshold,
      },
    };
  }

  return {
    allowed: true,
    reason: 'thresholds_met',
    details: {
      approvedCount,
      respondentCount,
      ...thresholds,
    },
  };
}

export const __TEST_ONLY__ = { DEFAULT_CONFIG };
