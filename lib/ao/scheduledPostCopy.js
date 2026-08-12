/**
 * scheduledPostCopy.js
 *
 * Single source of truth for ao_scheduled_posts copy fields.
 * text is what publishOne() sends to platforms. caption is used by editors/UI.
 * Every write path must set BOTH to the same body so they cannot drift apart.
 */

/** Known placeholder / landmine shapes that must never go live. */
export const PLACEHOLDER_TEXT_PATTERNS = [
  /^Quote card\s+\d+$/i,
  /^none$/i,
  /^n\/?a$/i,
  /^placeholder$/i,
  /^tbd$/i,
  /^TODO$/i,
  /^test(?:\s+post)?$/i,
  /^undefined$/i,
  /^null$/i,
  // Empty-caption fallbacks that previously reached the queue as "content"
  /^—$/,
  /^[-–—.]{1,3}$/,
];

/**
 * @param {unknown} raw
 * @returns {boolean}
 */
export function isPlaceholderScheduledText(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return true;
  return PLACEHOLDER_TEXT_PATTERNS.some((re) => re.test(text));
}

/**
 * Normalize body for insert/update. Always returns identical text + caption.
 * @param {unknown} body
 * @returns {{ ok: true, text: string, caption: string } | { ok: false, error: string }}
 */
export function buildSyncedScheduledCopy(body) {
  const text = String(body ?? '').trim();
  if (!text) {
    return { ok: false, error: 'Caption/text body is empty' };
  }
  if (isPlaceholderScheduledText(text)) {
    return {
      ok: false,
      error: `Refusing placeholder scheduled copy: "${text.slice(0, 80)}"`,
    };
  }
  return { ok: true, text, caption: text };
}

/**
 * Fields to spread into an ao_scheduled_posts insert/update for copy.
 * @param {unknown} body
 */
export function syncedCopyFields(body) {
  const built = buildSyncedScheduledCopy(body);
  if (!built.ok) return built;
  return {
    ok: true,
    fields: {
      text: built.text,
      caption: built.caption,
    },
  };
}

/**
 * Atomically update text+caption together. Never updates only one field.
 * @param {import('@supabase/supabase-js').SupabaseClient} client
 * @param {{ id: string, body: string, onlyIfStatus?: string | string[] }} opts
 */
export async function updateScheduledPostCopy(client, { id, body, onlyIfStatus = 'scheduled' }) {
  const built = syncedCopyFields(body);
  if (!built.ok) return { ok: false, error: built.error };

  let query = client
    .from('ao_scheduled_posts')
    .update({
      ...built.fields,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (onlyIfStatus) {
    const statuses = Array.isArray(onlyIfStatus) ? onlyIfStatus : [onlyIfStatus];
    query = query.in('status', statuses);
  }

  const { data, error } = await query.select('id, text, caption, status').maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: 'No matching scheduled row to update' };
  return { ok: true, row: data };
}

/**
 * Pre-publish guard used by publishOne().
 * @param {{ text?: string, caption?: string } | null | undefined} row
 * @returns {{ ok: true, text: string } | { ok: false, error: string }}
 */
export function assertPublishableScheduledText(row) {
  const text = String(row?.text ?? '').trim();
  if (isPlaceholderScheduledText(text)) {
    const caption = String(row?.caption ?? '').trim();
    // Prefer healing from caption only when caption is real and text is the landmine —
    // still refuse if both are bad. Callers that want hard-fail without heal can ignore healText.
    if (caption && !isPlaceholderScheduledText(caption) && text !== caption) {
      return {
        ok: false,
        error: `Refusing to publish placeholder text "${text.slice(0, 60)}". Caption has real copy but text drifted — fix the row (sync text from caption) before retrying.`,
        healFromCaption: caption,
      };
    }
    return {
      ok: false,
      error: `Refusing to publish placeholder or empty text: "${text.slice(0, 60) || '(empty)'}"`,
    };
  }
  return { ok: true, text };
}

/**
 * Resolve the publish body for one Auto quote card before insert.
 * Caption is required social copy; line1/line2 are image text only and must
 * never become a "Quote card N" fallback.
 */
export function resolveQuoteCardScheduleCopy(card) {
  const cardNum = Number(card?.card_index) || 1;
  const line1 = String(card?.line1 || '').trim();
  const line2 = String(card?.line2 || '').trim();
  const caption = String(card?.caption || '').trim();
  const cardText = [line1, line2].filter(Boolean).join('\n').trim();

  if (!caption) {
    return {
      ok: false,
      error: `Card ${cardNum} has no caption. Every card must have a caption before scheduling.`,
      card_index: cardNum,
    };
  }
  if (isPlaceholderScheduledText(caption)) {
    return {
      ok: false,
      error: `Card ${cardNum} caption looks like a placeholder ("${caption}"). Refusing to schedule.`,
      card_index: cardNum,
    };
  }

  const synced = buildSyncedScheduledCopy(caption);
  if (!synced.ok) {
    return { ok: false, error: synced.error, card_index: cardNum };
  }

  return {
    ok: true,
    card_index: cardNum,
    line1,
    line2,
    cardText,
    text: synced.text,
    caption: synced.caption,
  };
}
