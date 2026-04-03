/**
 * Auto Hub — guided publish for corpus pull quote cards → ao_scheduled_posts.
 */

import { supabaseAdmin } from '../supabase-admin.js';
import { uploadQuoteCardSvgToPublicUrl } from './quoteCardImageUrl.js';

const PLATFORMS = [
  { platform: 'instagram', account_id: 'meta' },
  { platform: 'facebook', account_id: 'meta' },
  { platform: 'linkedin', account_id: 'personal' },
  { platform: 'twitter', account_id: 'personal' },
];

function buildCaptionText(item, platform) {
  const longCap = String(item.caption || '').trim();
  const xCap = String(item.caption_x || '').trim();
  const cap = platform === 'twitter' ? (xCap || longCap) : longCap;
  const title = String(item.source_title || '').trim();
  const url = String(item.url || '').trim();
  const tail = [title, url].filter(Boolean).join(' · ');
  let body = [cap, tail].filter(Boolean).join('\n\n').trim();
  if (!body) body = '—';
  if (platform === 'twitter') return body.slice(0, 280);
  return body.slice(0, 2200);
}

export function suggestChannelsForQuoteCards() {
  return {
    recommended: ['linkedin', 'instagram', 'facebook', 'x'],
    discouraged: [],
    summaryLines: [
      'Channels: quote cards use the image on Instagram and Facebook; LinkedIn and X get the same image where the network supports it (X may need legacy API keys for a native photo; otherwise the post can include a link).',
      'You can edit or skip individual networks in Publisher after scheduling.',
    ],
  };
}

export async function getNextQuoteCardScheduleAnchor() {
  const now = new Date();
  const { data } = await supabaseAdmin
    .from('ao_scheduled_posts')
    .select('scheduled_at')
    .eq('status', 'scheduled')
    .gte('scheduled_at', now.toISOString())
    .order('scheduled_at', { ascending: false })
    .limit(1);

  const last = data?.[0]?.scheduled_at ? new Date(data[0].scheduled_at) : null;
  let base = new Date(Math.max(now.getTime(), last ? last.getTime() + 60 * 60 * 1000 : now.getTime()));
  base.setMinutes(0, 0, 0);
  if (base.getHours() < 10) {
    base.setHours(10, 30, 0, 0);
  } else if (base.getHours() === 10 && base.getMinutes() < 30) {
    base.setMinutes(30, 0, 0);
  } else if (base.getTime() <= now.getTime()) {
    base.setDate(base.getDate() + 1);
    base.setHours(10, 30, 0, 0);
  }
  if (base.getTime() < now.getTime()) {
    base = new Date(now.getTime() + 60 * 60 * 1000);
    base.setMinutes(0, 0, 0);
  }
  return base;
}

export async function proposeQuoteCardTimes(count, opts = {}) {
  const gapDays = Math.max(1, Math.min(14, Number(opts.gapDays) || 1));
  const start = await getNextQuoteCardScheduleAnchor();
  const times = [];
  for (let i = 0; i < count; i += 1) {
    const d = new Date(start.getTime() + i * gapDays * 86400000);
    times.push(d.toISOString());
  }
  return times;
}

export async function executeQuoteCardSchedule({ items, timesIso, email }) {
  if (!Array.isArray(items) || !items.length) {
    return { ok: false, error: 'No quote card items to schedule' };
  }
  if (!Array.isArray(timesIso) || timesIso.length !== items.length) {
    return { ok: false, error: 'Schedule times must match items' };
  }

  const rows = [];
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    const svg = String(item.svg || '').trim();
    if (!svg) {
      return { ok: false, error: `Missing card image for quote #${item.corpus_index}` };
    }
    const up = await uploadQuoteCardSvgToPublicUrl(svg, { subfolder: 'auto-hub-quote-cards' });
    if (!up.ok) return { ok: false, error: up.error || 'Image upload failed' };

    const when = timesIso[i];
    for (const ch of PLATFORMS) {
      const text = buildCaptionText(
        {
          caption: item.caption,
          caption_x: item.caption_x,
          source_title: item.source_title,
          url: item.url,
        },
        ch.platform
      );
      rows.push({
        platform: ch.platform,
        account_id: ch.account_id,
        scheduled_at: when,
        text,
        image_url: up.publicUrl,
        first_comment: null,
        status: 'scheduled',
        source_kind: 'auto_pull_quote_card',
        source_quote_id: null,
        intent: {
          auto_hub: true,
          corpus_index: item.corpus_index,
          created_by_email: email || null,
        },
        best_move: 'pull_quote_card',
        why_it_matters: null,
        ao_lane: null,
        topic_tags: null,
      });
    }
  }

  try {
    const inserted = await supabaseAdmin.from('ao_scheduled_posts').insert(rows).select('id, platform, scheduled_at');
    if (inserted.error) throw inserted.error;
    return {
      ok: true,
      scheduled: inserted.data || [],
      count: (inserted.data || []).length,
    };
  } catch (e2) {
    const msg = String(e2?.message || '');
    const missing = msg.includes('source_kind') || msg.includes('intent') || msg.includes('first_comment');
    if (!missing) return { ok: false, error: msg || 'Insert failed' };
    const minimal = rows.map(
      ({ source_kind, intent, best_move, why_it_matters, ao_lane, topic_tags, first_comment, ...rest }) => rest
    );
    const inserted = await supabaseAdmin.from('ao_scheduled_posts').insert(minimal).select('id, platform, scheduled_at');
    if (inserted.error) return { ok: false, error: inserted.error.message };
    return { ok: true, scheduled: inserted.data || [], count: (inserted.data || []).length };
  }
}

export function formatQuoteCardPublishPlan({ items, timesIso, channelHelp }) {
  const lines = [
    '**Publish plan (quote cards)**',
    '',
    `Cards: ${items.map((x) => x.corpus_index).join(', ')}`,
    '',
    ...channelHelp.summaryLines,
    '',
    'Suggested schedule (first slot tries to avoid piling on top of your existing queue):',
  ];
  items.forEach((it, i) => {
    const when = timesIso[i] ? new Date(timesIso[i]).toLocaleString() : '—';
    lines.push(`- Card ${it.corpus_index}: ${when} (all four channels)`);
  });
  lines.push('');
  lines.push('Reply **CONFIRM PUBLISH** to queue these in Publisher, or **CANCEL** to stop.');
  return lines.join('\n');
}
