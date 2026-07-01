import { fromZonedTime } from 'date-fns-tz';

export function localDateTimeToIso(date, time, timezone) {
  const d = String(date || '').trim();
  const t = String(time || '').trim();
  const tz = String(timezone || '').trim() || 'America/Chicago';
  if (!d || !t) return null;

  const normalizedTime = t.length === 5 ? `${t}:00` : t;
  const local = `${d}T${normalizedTime}`;
  try {
    const iso = fromZonedTime(local, tz).toISOString();
    if (Number.isNaN(new Date(iso).getTime())) return null;
    return iso;
  } catch {
    return null;
  }
}

export function formatRecordingDateTime(iso, timezone) {
  if (!iso) return { dateStr: '—', timeStr: '—' };
  try {
    const d = new Date(iso);
    const tz = timezone || undefined;
    const dateStr = d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: tz,
    });
    const timeStr = d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
      timeZone: tz,
    });
    return { dateStr, timeStr };
  } catch {
    return { dateStr: String(iso), timeStr: '' };
  }
}

export function formatGuestSchedulePrefs(guest) {
  if (!guest) return null;
  const days = Array.isArray(guest.schedule_preferred_days)
    ? guest.schedule_preferred_days.filter(Boolean)
    : [];
  const hasAny =
    days.length ||
    guest.schedule_preferred_time ||
    guest.schedule_avoid_dates ||
    guest.schedule_timezone;
  if (!hasAny) return null;
  return {
    preferred_days: days.length ? days.join(', ') : '—',
    preferred_time: guest.schedule_preferred_time || '—',
    avoid_dates: guest.schedule_avoid_dates || '—',
    timezone: guest.schedule_timezone || '—',
  };
}
