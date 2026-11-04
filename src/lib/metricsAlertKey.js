/**
 * Stable identity for a set of metrics-sync alerts.
 *
 * The "Engagement numbers are not updating" banner in AutoV2Panel is dismissed
 * against this key rather than against a timestamp or a permanent flag. The
 * failure behind it — LinkedIn engagement permissions — is blocked inside
 * LinkedIn's own review queue and has been for weeks, so a banner that cannot
 * be dismissed is permanent furniture, and one that dismisses forever would
 * hide the next, different failure.
 *
 * Sorted before joining so the same alerts in a different order stay the same
 * key: the server has no ordering guarantee, and a reshuffle should not
 * resurrect a banner the owner already dealt with. Numbers are left out too: the
 * text carries post counts and post ids, so one new post made the same failure
 * look new and brought back a closed banner (2026-11-04).
 *
 * @param {string[]} alerts
 * @returns {string|null} null when there is nothing to show
 */
export function metricsAlertKeyFor(alerts) {
  if (!Array.isArray(alerts) || alerts.length === 0) return null;
  const cleaned = alerts.map((a) => String(a ?? '').replace(/\d+/g, '#').trim()).filter(Boolean);
  if (cleaned.length === 0) return null;
  return [...cleaned].sort().join('|');
}
