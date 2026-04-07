/**
 * Schedule social posts (image + caption) from a weekly corpus pull bundle row (Review inbox).
 * POST /api/ao/publishing/schedule-weekly-pull-bundle
 * Body: { quote_id, start_at?: ISO datetime (first slot), gap_days?: number (default 1) }
 */

import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { getDefaultLogoUrl } from '../../../lib/ao/brandLogos.js';
import { inlineLogoForQuoteCardSvg } from '../../../lib/ao/remoteAssetDataUrl.js';
import { uploadMinimalQuoteCardToPublicUrl, uploadQuoteCardSvgToPublicUrl } from '../../../lib/ao/quoteCardImageUrl.js';

function parseIso(v) {
  if (!v) return null;
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function toPlatform(channel) {
  if (channel === 'x') return 'twitter';
  return channel;
}

/**
 * Image shows the quote; caption text should interpret or enhance (never a quote fragment as a shortcut).
 * X uses caption_x when present—written for clarity in ~200 chars, not blind truncation of the long caption.
 */
function buildCaptionForCardPost(item, platform) {
  const longCap = String(item.caption || '').trim();
  const xCap = String(item.caption_x || '').trim();
  const cap = platform === 'twitter' ? (xCap || longCap) : longCap;
  const title = String(item.source_title || '').trim();
  const url = String(item.url || '').trim();
  const tail = [title, url].filter(Boolean).join(' · ');
  let body = [cap, tail].filter(Boolean).join('\n\n').trim();
  if (!body) body = '—';
  if (platform === 'twitter') {
    body = body.slice(0, 280);
  } else {
    body = body.slice(0, 2200);
  }
  return body;
}

const BUNDLE_PLATFORMS = [
  { platform: 'instagram', account_id: 'meta' },
  { platform: 'facebook', account_id: 'meta' },
  { platform: 'linkedin', account_id: 'personal' },
  { platform: 'twitter', account_id: 'personal' },
];

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const quoteId = req.body?.quote_id;
  if (!quoteId) return res.status(400).json({ ok: false, error: 'quote_id required' });

  const gapDays = Math.max(1, Math.min(14, Number.parseInt(String(req.body?.gap_days ?? '1'), 10) || 1));
  let start = parseIso(req.body?.start_at);
  if (!start) {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    t.setHours(10, 30, 0, 0);
    start = t;
  }

  try {
    const { data: row, error: fetchErr } = await supabaseAdmin
      .from('ao_quote_review_queue')
      .select('*')
      .eq('id', quoteId)
      .single();

    if (fetchErr) {
      if (fetchErr.code === 'PGRST116') return res.status(404).json({ ok: false, error: 'Not found' });
      return res.status(500).json({ ok: false, error: fetchErr.message });
    }

    if (String(row.created_by_email || '').toLowerCase() !== String(auth.email || '').toLowerCase()) {
      return res.status(403).json({ ok: false, error: 'Forbidden' });
    }

    const bundle = row?.studio_playbook?.weekly_corpus_pull;
    const items = Array.isArray(bundle?.items) ? bundle.items : [];
    if (!items.length) {
      return res.status(400).json({ ok: false, error: 'Not a weekly corpus bundle or empty items' });
    }

    for (let j = 0; j < items.length; j += 1) {
      if (!String(items[j].quote_card_svg || '').trim()) {
        return res.status(400).json({
          ok: false,
          error: `Bundle item ${j + 1} has no quote card image. Regenerate the weekly bundle in Review.`,
        });
      }
    }

    const rawLogo = await getDefaultLogoUrl({ background: 'dark' });
    const bundleLogoUrl = (await inlineLogoForQuoteCardSvg(rawLogo)) || null;

    const rows = [];
    for (let i = 0; i < items.length; i += 1) {
      const when = new Date(start.getTime() + i * gapDays * 86400000);
      const item = items[i];
      let imageUrl = String(item.quote_card_image_url || '').trim();
      if (imageUrl && !/^https:\/\//i.test(imageUrl)) {
        imageUrl = '';
      }
      const svg = String(item.quote_card_svg || '').trim();
      const qtext = String(item.quote || '').trim();
      if (!imageUrl && qtext) {
        const up = await uploadMinimalQuoteCardToPublicUrl(
          { quote: qtext, sourceName: item.source_title || '', logoUrl: bundleLogoUrl },
          { subfolder: 'weekly-pull-quote-cards' }
        );
        if (up.ok) imageUrl = up.publicUrl;
      }
      if (!imageUrl && svg) {
        const up = await uploadQuoteCardSvgToPublicUrl(svg, { subfolder: 'weekly-pull-quote-cards' });
        if (!up.ok) {
          return res.status(500).json({ ok: false, error: up.error || 'Could not create image for quote card' });
        }
        imageUrl = up.publicUrl;
      }

      for (const ch of BUNDLE_PLATFORMS) {
        const text = buildCaptionForCardPost(item, ch.platform);
        if (!text) continue;
        rows.push({
          platform: ch.platform,
          account_id: ch.account_id,
          scheduled_at: when.toISOString(),
          text,
          image_url: imageUrl,
          first_comment: null,
          status: 'scheduled',
          source_kind: 'weekly_pull_bundle',
          source_quote_id: quoteId,
          intent: {
            weekly_pull: true,
            week_start: bundle.week_start || null,
            theme_query: bundle.theme_query || null,
            index: i + 1,
            why_it_matters: row.why_it_matters || null,
            ao_lane: row.ao_lane || null,
          },
          best_move: 'weekly_pull_bundle',
          why_it_matters: row.why_it_matters || null,
          ao_lane: row.ao_lane || null,
          topic_tags: Array.isArray(row.topic_tags) ? row.topic_tags : null,
        });
      }
    }

    if (!rows.length) return res.status(400).json({ ok: false, error: 'Nothing to schedule' });

    let inserted = null;
    try {
      const out = await supabaseAdmin.from('ao_scheduled_posts').insert(rows).select('id, platform, scheduled_at, status');
      if (out.error) throw out.error;
      inserted = out.data || [];
    } catch (e2) {
      const msg = String(e2?.message || '');
      const missing = msg.includes('source_kind') || msg.includes('intent') || msg.includes('weekly');
      if (!missing) return res.status(500).json({ ok: false, error: msg || 'Insert failed' });
      const minimalRows = rows.map(
        ({ source_kind, intent, best_move, why_it_matters, ao_lane, topic_tags, ...rest }) => rest
      );
      const out = await supabaseAdmin.from('ao_scheduled_posts').insert(minimalRows).select('id, platform, scheduled_at, status');
      if (out.error) return res.status(500).json({ ok: false, error: out.error.message });
      inserted = out.data || [];
    }

    try {
      await supabaseAdmin
        .from('ao_quote_review_queue')
        .update({
          status: 'cleared',
          next_stage: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', quoteId);
    } catch (_) {}

    return res.status(200).json({
      ok: true,
      scheduled: inserted || [],
      message:
        'Queued with image + caption for Instagram, Facebook, LinkedIn, and X. Open Publisher to adjust times or text.',
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || 'Error' });
  }
}
