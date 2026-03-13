/**
 * AO Automation — Database setup check (best-effort)
 * GET /api/ao/db-check
 *
 * Returns a list of one-time SQL files that are likely missing.
 */

import { supabaseAdmin } from '../../lib/supabase-admin.js';
import { requireAoSession } from '../../lib/ao/requireAoSession.js';

async function checkSelect(selectExpr) {
  const out = await supabaseAdmin
    .from('ao_quote_review_queue')
    .select(selectExpr, { head: true, count: 'exact' })
    .limit(1);
  if (out.error) throw out.error;
  return true;
}

async function checkTable(table, selectExpr) {
  const out = await supabaseAdmin
    .from(table)
    .select(selectExpr, { head: true, count: 'exact' })
    .limit(1);
  if (out.error) throw out.error;
  return true;
}

function errText(e) {
  return String(e?.message || e || '').trim();
}

function hasAny(msg, needles) {
  const m = String(msg || '');
  return needles.some((n) => m.includes(n));
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const auth = requireAoSession(req, res);
  if (!auth) return;

  const missing = [];
  const notes = [];

  const addMissing = (sqlFile, reason) => {
    if (missing.some((m) => m.sql === sqlFile)) return;
    missing.push({ sql: sqlFile, reason });
  };

  try {
    // Core scan tables
    try {
      await checkTable('ao_scan_log', 'id');
    } catch (e) {
      const msg = errText(e);
      if (hasAny(msg, ['ao_scan_log', 'relation'])) addMissing('database/ao_queue_and_scan_schema.sql', 'Missing scan log table');
    }

    // External sources allowlist
    try {
      await checkTable('ao_external_sources', 'id,url,source_type,created_at');
    } catch (e) {
      const msg = errText(e);
      if (hasAny(msg, ['ao_external_sources', 'relation'])) addMissing('database/ao_queue_and_scan_schema.sql', 'Missing external sources table');
    }
    try {
      await checkTable('ao_external_sources', 'id,origin,is_protected');
    } catch (e) {
      const msg = errText(e);
      if (hasAny(msg, ['origin', 'is_protected'])) addMissing('database/ao_external_sources_protected.sql', 'Missing source protection fields');
    }

    // Quote review queue routing + intelligence + drafts (Studio)
    try {
      await checkSelect('id,next_stage');
    } catch (e) {
      const msg = errText(e);
      if (msg.includes('next_stage')) addMissing('database/ao_queue_next_stage.sql', 'Missing routing field for Analyst → Studio/Publisher');
    }
    try {
      await checkSelect('id,best_move,why_it_matters,pull_quote,summary_interpretation,alt_moves,ao_lane,topic_tags,quote_card_svg,quote_card_caption');
    } catch (e) {
      const msg = errText(e);
      if (hasAny(msg, ['best_move', 'why_it_matters', 'pull_quote', 'summary_interpretation', 'alt_moves', 'ao_lane', 'topic_tags', 'quote_card_svg', 'quote_card_caption'])) {
        addMissing('database/ao_quote_review_queue_intelligence_fields.sql', 'Missing Analyst/Studio intelligence fields');
      }
    }
    try {
      await checkSelect('id,drafts_by_channel,hashtags_by_channel,first_comment_suggestions');
    } catch (e) {
      const msg = errText(e);
      if (hasAny(msg, ['drafts_by_channel', 'hashtags_by_channel', 'first_comment_suggestions'])) {
        addMissing('database/ao_quote_review_queue_add_drafts.sql', 'Missing Studio draft storage fields');
      }
    }
    try {
      await checkSelect('id,held_at,hold_reason');
    } catch (e) {
      const msg = errText(e);
      if (hasAny(msg, ['held_at', 'hold_reason'])) {
        addMissing('database/ao_quote_review_queue_brief_and_hold_fields.sql', 'Missing hold metadata fields');
      }
    }

    // Brain trust
    try {
      await checkTable('ao_brain_trust_sources', 'id,name,active');
    } catch (e) {
      const msg = errText(e);
      if (hasAny(msg, ['ao_brain_trust_sources', 'relation'])) addMissing('database/ao_brain_trust_sources.sql', 'Missing Brain Trust table');
    }

    notes.push('If you just ran a SQL file, it can take 30–90 seconds for the system to “notice.”');
    notes.push('If you still see “schema cache” errors after waiting, run: NOTIFY pgrst, \'reload schema\'; in Supabase SQL editor.');

    return res.status(200).json({ ok: true, missing, notes });
  } catch (e) {
    return res.status(500).json({ ok: false, error: errText(e) });
  }
}

