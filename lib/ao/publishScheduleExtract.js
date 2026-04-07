/**
 * Natural-language → structured quote-card schedule options (gap + local time).
 * Primary path: small JSON model call. Fallback: light regex in autoIntent + local time heuristics.
 */

import { getOpenAiKey } from '../openaiKey.js';
import { getOwnerTimeZone } from './ownerSchedule.js';
import { parseGapDaysFromMessage } from './autoIntent.js';

function clamp(n, lo, hi) {
  const x = Number(n);
  if (!Number.isFinite(x)) return lo;
  return Math.min(hi, Math.max(lo, x));
}

/** Fallback local time from message (e.g. 10am, 14:30, "not 5:30" → prefer 10:00). */
export function parseLocalTimeFallback(message) {
  const s = String(message || '').trim();
  if (!s) return { hour: null, minute: null };

  const lower = s.toLowerCase();
  if (/\b(afternoon|after\s+lunch|pm\b)/i.test(s) && !/\b\d{1,2}\s*(:\d{2})?\s*(am|pm)?\b/i.test(s)) {
    return { hour: 14, minute: 0 };
  }
  if (/\b(noon|midday)\b/i.test(s)) return { hour: 12, minute: 0 };
  if (/\b(not|no|avoid|don'?t|without)\b.*\b(5\s*:\s*30|5:30|five\s+thirty)\b/i.test(s)) {
    return { hour: 10, minute: 0 };
  }
  if (/\b(not|no|avoid|don'?t)\b.*\b(early\s+morning|before\s+9|dawn)\b/i.test(s)) {
    return { hour: 10, minute: 0 };
  }

  const hm24 = s.match(/\b([01]?\d|2[0-3])\s*:\s*([0-5]\d)\b/);
  if (hm24) {
    return { hour: clamp(hm24[1], 0, 23), minute: clamp(hm24[2], 0, 59) };
  }

  const am = lower.match(/\b([1-9]|1[0-2])\s*(:\s*([0-5]\d))?\s*am\b/);
  if (am) {
    const h = am[1] === '12' ? 0 : parseInt(am[1], 10);
    const m = am[3] ? parseInt(am[3], 10) : 0;
    return { hour: clamp(h, 0, 23), minute: clamp(m, 0, 59) };
  }
  const pm = lower.match(/\b([1-9]|1[0-2])\s*(:\s*([0-5]\d))?\s*pm\b/);
  if (pm) {
    let h = parseInt(pm[1], 10);
    if (h !== 12) h += 12;
    const m = pm[3] ? parseInt(pm[3], 10) : 0;
    return { hour: clamp(h, 0, 23), minute: clamp(m, 0, 59) };
  }

  return { hour: null, minute: null };
}

function messageSuggestsWiderThanDailyGap(message) {
  const t = String(message || '').trim().toLowerCase();
  if (!t) return false;
  return (
    /\bnot\s+consecutive\b/.test(t) ||
    /\bconsecutive\s+days\b/.test(t) ||
    /\bdon'?t\s+want\s+(them\s+)?consecutive\b/.test(t) ||
    /\bnot\s+every\s+day\b/.test(t) ||
    /\bspace\s+(them\s+)?out\b/.test(t) ||
    /\bstagger(ed)?\b/.test(t) ||
    /\bevery\s+other\s+day\b/.test(t) ||
    /\bevery\s+third\s+day\b/.test(t) ||
    /\bevery\s+\d{1,2}\s+days?\b/.test(t) ||
    /\b[2-9]\s+or\s+[2-9]\s+days?\b/.test(t) ||
    /\bwider\b.*\b(spacing|gap|apart)\b/.test(t) ||
    /\b(days?\s+apart|gap\s+between)\b/.test(t)
  );
}

/**
 * @param {{ gapDays?: number|null, localHour?: number|null, localMinute?: number|null, userFacingNote?: string|null }} extracted
 * @param {{ gap_days?: number, preferred_local_hour?: number, preferred_local_minute?: number } | null} pending
 * @param {string} message
 * @returns {{ gapDays: number, localHour: number|null, localMinute: number|null, userFacingNote: string }}
 */
export function mergeScheduleOpts({ extracted, pending, message }) {
  const fbGap = parseGapDaysFromMessage(message);
  const fbTime = parseLocalTimeFallback(message);

  // Order: model → phrase/regex from *this* message → previous plan. Stale pending.gap_days must not
  // override an explicit "every other day" etc. in the new message.
  let gapDays = extracted?.gap_days;
  if (gapDays == null || gapDays === '') gapDays = fbGap;
  if (gapDays == null || gapDays === '') gapDays = pending?.gap_days;
  gapDays = clamp(gapDays ?? 1, 1, 14);

  const explicitGapFromModel =
    extracted &&
    extracted.gap_days != null &&
    extracted.gap_days !== '' &&
    Number.isFinite(Number(extracted.gap_days));
  const explicitGapFromRegex = fbGap != null;

  if (
    gapDays <= 1 &&
    !explicitGapFromModel &&
    !explicitGapFromRegex &&
    messageSuggestsWiderThanDailyGap(message)
  ) {
    gapDays = 2;
  }

  let localHour = extracted?.local_hour;
  let localMinute = extracted?.local_minute;
  if (localHour == null || localHour === '') localHour = pending?.preferred_local_hour;
  if (localMinute == null || localMinute === '') localMinute = pending?.preferred_local_minute;
  if (localHour == null || localHour === '') localHour = fbTime.hour;
  if (localMinute == null || localMinute === '') localMinute = fbTime.minute;

  if (localHour != null && localHour !== '') {
    localHour = clamp(localHour, 0, 23);
  } else {
    localHour = null;
  }
  if (localMinute != null && localMinute !== '') {
    localMinute = clamp(localMinute, 0, 59);
  } else {
    localMinute = localHour != null ? 0 : null;
  }

  const userFacingNote = safeNote(extracted?.user_facing_note);

  return {
    gapDays,
    localHour,
    localMinute,
    userFacingNote,
  };
}

function safeNote(s) {
  const t = String(s || '').trim();
  return t.length > 280 ? `${t.slice(0, 277)}…` : t;
}

/**
 * @param {string} message
 * @param {{ cardCount: number, currentGapDays?: number|null, currentLocalHour?: number|null, currentLocalMinute?: number|null }} ctx
 * @returns {Promise<{ gap_days: number|null, local_hour: number|null, local_minute: number|null, user_facing_note: string }|null>}
 */
export async function extractPublishScheduleConstraints(message, ctx = {}) {
  const apiKey = getOpenAiKey();
  if (!apiKey) return null;

  const cardCount = Number(ctx.cardCount) || 0;
  const curGap = ctx.currentGapDays != null ? ctx.currentGapDays : 'unknown';
  const curH = ctx.currentLocalHour != null ? ctx.currentLocalHour : 'unknown';
  const curM = ctx.currentLocalMinute != null ? ctx.currentLocalMinute : 'unknown';
  const tz = String(ctx.timezoneLabel || getOwnerTimeZone());

  const user = `User message (scheduling preferences for quote cards):
${String(message || '').trim()}

Context:
- Cards in this plan: ${cardCount}
- Current days between posts (if any): ${curGap}
- Current preferred local post time hour:minute (if any): ${curH}:${curM}
- Time zone for scheduling: ${tz}

Return JSON with this exact shape:
{"gap_days":null or integer 1-14,"local_hour":null or integer 0-23,"local_minute":null or integer 0-59,"user_facing_note":""}

Rules:
- Use null for any field the user did NOT specify or change. When null, the system keeps the previous plan value.
- Interpret natural language freely: e.g. not consecutive days, space them out, every other day, every third day, not at 5:30 AM, avoid early morning, prefer afternoons, etc.
- If they give two spacing options, pick the tighter reasonable gap (smaller number of days between posts) unless they clearly pick one.
- user_facing_note: optional one short sentence for the publish plan (e.g. "Using 2 days between posts; posts around 10:00 AM your time.")`;

  const model = process.env.AO_AUTO_SCHEDULE_EXTRACT_MODEL || 'gpt-4o-mini';

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 400,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You extract structured scheduling preferences. Reply with JSON only. No markdown.',
          },
          { role: 'user', content: user },
        ],
      }),
    });
    if (!res.ok) return null;
    const json = await res.json().catch(() => ({}));
    const content = json.choices?.[0]?.message?.content?.trim() || '';
    if (!content) return null;
    const parsed = JSON.parse(content);
    return {
      gap_days: parsed.gap_days == null ? null : clamp(parsed.gap_days, 1, 14),
      local_hour: parsed.local_hour == null ? null : clamp(parsed.local_hour, 0, 23),
      local_minute: parsed.local_minute == null ? null : clamp(parsed.local_minute, 0, 59),
      user_facing_note: safeNote(parsed.user_facing_note),
    };
  } catch {
    return null;
  }
}
