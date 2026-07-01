export const US_TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern (ET)' },
  { value: 'America/Chicago', label: 'Central (CT)' },
  { value: 'America/Denver', label: 'Mountain (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific (PT)' },
];

const FALLBACK_TIMEZONES = [
  'America/Anchorage',
  'America/Phoenix',
  'America/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Australia/Sydney',
  'UTC',
];

export function getTimezoneOptionGroups() {
  const usValues = new Set(US_TIMEZONE_OPTIONS.map((o) => o.value));
  let all = [];
  try {
    if (typeof Intl !== 'undefined' && Intl.supportedValuesOf) {
      all = Intl.supportedValuesOf('timeZone');
    }
  } catch {
    all = [];
  }
  if (!all.length) {
    all = [...usValues, ...FALLBACK_TIMEZONES];
  }
  const rest = all.filter((tz) => !usValues.has(tz)).sort((a, b) => a.localeCompare(b));
  return { us: US_TIMEZONE_OPTIONS, rest };
}

export function detectBrowserTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    return '';
  }
}

export function timezoneLabel(value) {
  const hit = US_TIMEZONE_OPTIONS.find((o) => o.value === value);
  if (hit) return hit.label;
  return value || '—';
}
