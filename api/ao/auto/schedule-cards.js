/**
 * POST /api/ao/auto/schedule-cards
 *
 * Writes approved Auto quote cards to ao_scheduled_posts for the cron publisher.
 *
 * Channels (no X): LinkedIn personal, LinkedIn business (second row), Instagram, Facebook.
 * Times: reads card dates from assistant table text in the thread; combines with peak
 * wall-clock slots (LinkedIn 10:00 / Instagram 11:00 / Facebook 13:00 US Central as UTC hours in code).
 * Optional per-card `schedule` body keys: linkedin, linkedin_business, instagram, facebook (ISO).
 *
 * Body: { thread_id?, cards: [{ card_index, image_url, line1?, line2?, caption?, schedule? }] }
 */

import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { getAutoThreadState } from '../../../lib/ao/autoHub.js';

function parseIso(v) {
  if (!v) return null;
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
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

  // Approved channels — LinkedIn Personal, LinkedIn Business, Instagram Business, Facebook Business.
  // No X/Twitter. The caption length fights the format and this content is not built for that conversation.
  // LinkedIn posts twice (personal + business page) using the same token/adapter but counted as separate rows.
  const APPROVED_CHANNELS = [
    { platform: 'linkedin', account_id: 'personal', label: 'linkedin_personal' },
    { platform: 'linkedin', account_id: 'personal', label: 'linkedin_business' }, // same token, posts to page via pageUrn
    { platform: 'instagram', account_id: 'meta', label: 'instagram' },
    { platform: 'facebook', account_id: 'meta', label: 'facebook' },
  ];

  // Peak reach times per platform (CDT = UTC-5)
  // LinkedIn: 10:00 AM CDT = 15:00 UTC
  // Instagram: 11:00 AM CDT = 16:00 UTC
  // Facebook: 1:00 PM CDT = 18:00 UTC
  const PLATFORM_TIMES = {
    linkedin: '15:00:00',
    instagram: '16:00:00',
    facebook: '18:00:00',
  };

  // Extract the approved schedule from the thread.
  // Auto documented the schedule as a table in the conversation.
  // Parse card dates from messages like "Card 1 | Thu May 14" or "| Card 1 | Thu May 14 |"
  function extractScheduleFromThread(messages) {
    const scheduleMap = {};
    const list = Array.isArray(messages) ? messages : [];
    for (const m of [...list].reverse()) {
      if (m.role !== 'assistant') continue;
      const content = String(m.content || '');
      // Match table rows: | Card N | Date | or Card N | Date
      const rows = content.matchAll(/\|\s*Card\s+(\d+)\s*\|\s*([^|\n]+)/gi);
      for (const row of rows) {
        const cardNum = parseInt(row[1], 10);
        const dateStr = row[2].trim();
        if (!Number.isFinite(cardNum) || !dateStr) continue;
        // Parse date like "Thu May 14" or "Mon Jun 2"
        const y = new Date().getFullYear();
        const parsed = new Date(`${dateStr} ${y}`);
        if (!Number.isNaN(parsed.getTime())) {
          scheduleMap[cardNum] = parsed;
        }
      }
      if (Object.keys(scheduleMap).length > 0) break;
    }
    return scheduleMap;
  }

  const threadSchedule = extractScheduleFromThread(threadMessages);

  const rows = [];
  const sortedCards = [...cards].sort(
    (a, b) => (Number(a.card_index) || 0) - (Number(b.card_index) || 0)
  );

  for (let idx = 0; idx < sortedCards.length; idx += 1) {
    const card = sortedCards[idx];
    const { card_index, image_url, schedule = {} } = card;
    const cardNum = Number(card_index) || idx + 1;

    const threadData = captionsMap[cardNum] || {};
    const line1 = card.line1 || threadData.line1 || '';
    const line2 = card.line2 || threadData.line2 || '';
    const caption = card.caption || threadData.caption || '';

    const captionText = String(caption || '').trim();
    const cardText = [String(line1 || '').trim(), String(line2 || '').trim()].filter(Boolean).join('\n').trim();
    const hasLines = Boolean(cardText);
    const textBody = cardText || captionText || `Quote card ${cardNum}`;
    const imageUrl = String(image_url || '').trim();

    // Get the approved date for this card from the thread schedule
    const approvedDate = threadSchedule[cardNum] || null;

    for (const ch of APPROVED_CHANNELS) {
      let when = null;

      // First try explicit schedule passed in body
      const explicitKey = ch.label === 'linkedin_business' ? 'linkedin_business' : ch.label.replace('_personal', '');
      if (schedule[explicitKey]) {
        when = parseIso(schedule[explicitKey]);
      }

      // Then use the approved date from thread + platform time
      if (!when && approvedDate) {
        const dateStr = approvedDate.toISOString().split('T')[0]; // YYYY-MM-DD
        const timeStr = PLATFORM_TIMES[ch.platform] || '15:00:00';
        when = parseIso(`${dateStr}T${timeStr}+00:00`);
      }

      // Fallback: stagger from now
      if (!when) {
        when = new Date(Date.now() + (idx * 24 + APPROVED_CHANNELS.indexOf(ch)) * 60 * 60 * 1000).toISOString();
      }

      rows.push({
        platform: ch.platform,
        account_id: ch.account_id,
        scheduled_at: when,
        text: textBody,
        image_url: imageUrl || null,
        first_comment: hasLines && captionText ? captionText : null,
        status: 'scheduled',
        source_kind: 'auto_quote_card',
        intent: {
          auto_hub: true,
          card_index: cardNum,
          channel_label: ch.label,
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
