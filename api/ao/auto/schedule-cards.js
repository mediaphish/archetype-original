/**
 * POST /api/ao/auto/schedule-cards
 *
 * Takes an approved package of quote cards from Auto V2
 * (copy + captions + image URLs + optional per-channel schedule) and writes
 * rows to ao_scheduled_posts so the existing cron publisher picks them up.
 *
 * When `schedule` is omitted on a card, times default from the shared
 * schedule heuristic (owner timezone, queue-aware), one calendar day per card.
 *
 * Body: {
 *   thread_id?: string,
 *   cards: [
 *     {
 *       card_index: 1,
 *       image_url: "https://...",
 *       line1?, line2?, caption?,
 *       schedule?: { linkedin?, facebook?, instagram?, x? } // ISO strings
 *     },
 *     ...
 *   ]
 * }
 */

import { addHours } from 'date-fns';
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { getAutoThreadState } from '../../../lib/ao/autoHub.js';
import { buildScheduleSuggestionForChannels } from '../../../lib/ao/scheduleHeuristic.js';

function parseIso(v) {
  if (!v) return null;
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function toPlatform(channel) {
  if (channel === 'x') return 'twitter';
  return channel;
}

function toAccountId(platform) {
  if (platform === 'facebook' || platform === 'instagram') return 'meta';
  return 'personal';
}

function extractCaptionsMapFromThread(threadMessages) {
  const captionsMap = {};
  const list = Array.isArray(threadMessages) ? threadMessages : [];
  for (const m of [...list].reverse()) {
    if (m.role !== 'assistant') continue;
    const content = String(m.content || '');
    const captionsMatch = content.match(
      /\[ARTIFACT\s+type=["']captions["'][^\]]*\]([\s\S]*?)\[\/ARTIFACT\]/i
    );
    if (!captionsMatch) continue;
    const blocks = captionsMatch[1].split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
    for (const block of blocks) {
      const cardNumMatch = block.match(/Card\s+(\d+)/i);
      const line1Match = block.match(/Power\s+says:\s*(.+)/i);
      const line2Match = block.match(/Servant\s+leadership\s+says:\s*(.+)/i);
      const captionMatch = block.match(/Caption:\s*([\s\S]+?)(?=\n\s*\*?\*?Card\s|\n\s*$|$)/i);
      if (cardNumMatch) {
        const n = parseInt(cardNumMatch[1], 10);
        if (!Number.isFinite(n)) continue;
        captionsMap[n] = {
          line1: line1Match ? `Power says: ${line1Match[1].trim()}` : '',
          line2: line2Match ? `Servant leadership says: ${line2Match[1].trim()}` : '',
          caption: captionMatch ? captionMatch[1].trim() : '',
        };
      }
    }
    break;
  }
  return captionsMap;
}

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const body = req.body || {};
  const { cards } = body;
  const threadId = body.thread_id;

  let threadMessages = [];
  if (threadId) {
    try {
      const state = await getAutoThreadState(auth.email, threadId);
      threadMessages = Array.isArray(state?.messages) ? state.messages : [];
    } catch (_) {
      threadMessages = [];
    }
  }

  const captionsMap = extractCaptionsMapFromThread(threadMessages);

  if (!Array.isArray(cards) || cards.length === 0) {
    return res.status(400).json({ ok: false, error: 'cards array is required' });
  }

  const channels = ['linkedin', 'facebook', 'instagram', 'x'];

  let baseSchedule = {};
  try {
    baseSchedule = await buildScheduleSuggestionForChannels();
  } catch (e) {
    console.error('[schedule-cards] buildScheduleSuggestionForChannels', e?.message || e);
  }
  const anchor = Date.now() + 60 * 60 * 1000;
  for (let i = 0; i < channels.length; i += 1) {
    const c = channels[i];
    if (!baseSchedule[c]) {
      baseSchedule[c] = new Date(anchor + i * 2 * 60 * 60 * 1000).toISOString();
    }
  }

  const rows = [];
  const sortedCards = [...cards].sort(
    (a, b) => (Number(a.card_index) || 0) - (Number(b.card_index) || 0)
  );

  for (let idx = 0; idx < sortedCards.length; idx += 1) {
    const card = sortedCards[idx];
    const { card_index, image_url, schedule = {} } = card;

    const threadData = captionsMap[Number(card_index)] || {};
    const line1 = card.line1 || threadData.line1 || '';
    const line2 = card.line2 || threadData.line2 || '';
    const caption = card.caption || threadData.caption || '';

    const captionText = String(caption || '').trim();
    const cardText = [String(line1 || '').trim(), String(line2 || '').trim()].filter(Boolean).join('\n').trim();
    const hasLines = Boolean(cardText);
    const textBody = cardText || captionText || `Quote card ${card_index || idx + 1}`;

    const imageUrl = String(image_url || '').trim();

    for (const channel of channels) {
      const fromSchedule = schedule[channel];
      const fromBase = baseSchedule[channel];
      let whenRaw = fromSchedule || null;
      if (!whenRaw && fromBase) {
        whenRaw = addHours(new Date(fromBase), idx * 24).toISOString();
      }
      const when = parseIso(whenRaw);
      if (!when) continue;

      const platform = toPlatform(channel);
      const account_id = toAccountId(platform);

      rows.push({
        platform,
        account_id,
        scheduled_at: when,
        text: textBody,
        image_url: imageUrl || null,
        first_comment: hasLines ? captionText || null : null,
        status: 'scheduled',
        source_kind: 'auto_quote_card',
        intent: {
          auto_hub: true,
          card_index: card_index || null,
          created_by_email: auth.email,
          thread_id: threadId || null,
        },
      });
    }
  }

  if (rows.length === 0) {
    return res.status(400).json({
      ok: false,
      error:
        'No scheduled rows could be built. Generate images first, ensure captions exist in this thread, or provide per-channel schedule ISO times on each card.',
    });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('ao_scheduled_posts')
      .insert(rows)
      .select('id, platform, scheduled_at, status');

    if (error) {
      console.error('[schedule-cards]', error.message);
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(200).json({
      ok: true,
      scheduled: data || [],
      total: (data || []).length,
    });
  } catch (err) {
    console.error('[schedule-cards]', err?.message || err);
    return res.status(500).json({ ok: false, error: err?.message || 'Server error' });
  }
}
