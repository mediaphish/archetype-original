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
      await checkSelect('id,quote_card_image_url');
    } catch (e) {
      const msg = errText(e);
      if (hasAny(msg, ['quote_card_image_url'])) {
        addMissing(
          'database/ao_quote_review_queue_quote_card_image_url.sql',
          'Missing quote card PNG URL (preview parity with social)'
        );
      }
    }
    try {
      await checkSelect('id,studio_playbook');
    } catch (e) {
      const msg = errText(e);
      if (hasAny(msg, ['studio_playbook'])) {
        addMissing('database/ao_quote_review_queue_playbook.sql', 'Missing Analyst → Studio playbook storage field');
      }
    }
    try {
      await checkSelect('id,source_url');
    } catch (e) {
      const msg = errText(e);
      if (hasAny(msg, ['source_url'])) {
        addMissing('database/ao_quote_review_queue_intelligence_fields.sql', 'Missing source_url field (needed for URL dedupe)');
      }
    }
    // Note: we can’t reliably detect missing indexes via PostgREST; see notes below for optional dedupe SQL.
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

    // Studio chat sessions
    try {
      await checkTable('ao_studio_sessions', 'id,quote_id,updated_at');
    } catch (e) {
      const msg = errText(e);
      if (hasAny(msg, ['ao_studio_sessions', 'relation'])) addMissing('database/ao_studio_sessions.sql', 'Missing Studio chat sessions table');
    }

    // Brand assets (logos)
    try {
      await checkTable('ao_brand_assets', 'id,kind,label,variant,public_url,is_default_light,is_default_dark');
    } catch (e) {
      const msg = errText(e);
      if (hasAny(msg, ['ao_brand_assets', 'relation'])) addMissing('database/ao_brand_assets.sql', 'Missing Brand assets table');
    }

    // Editorial memory loop (shared newsroom memory)
    try {
      await checkTable('ao_editorial_memory_items', 'id,created_by_email,kind,published_at');
    } catch (e) {
      const msg = errText(e);
      if (hasAny(msg, ['ao_editorial_memory_items', 'relation'])) addMissing('database/ao_editorial_memory_items.sql', 'Missing editorial memory table');
    }
    try {
      await checkTable('ao_editorial_settings', 'created_by_email,beat_priorities,updated_at');
    } catch (e) {
      const msg = errText(e);
      if (hasAny(msg, ['ao_editorial_settings', 'relation'])) addMissing('database/ao_editorial_settings.sql', 'Missing editorial settings table');
    }
    try {
      await checkTable('ao_scout_chase_list', 'id,created_by_email,topic,status,priority');
    } catch (e) {
      const msg = errText(e);
      if (hasAny(msg, ['ao_scout_chase_list', 'relation'])) addMissing('database/ao_scout_chase_list.sql', 'Missing Scout chase list table');
    }

    notes.push('Optional: to prevent the same URL showing up repeatedly, run: database/ao_quote_review_queue_unique_source_url.sql');
    notes.push('If you just ran a SQL file, it can take 30–90 seconds for the system to “notice.”');
    notes.push('If you still see “schema cache” errors after waiting, run: NOTIFY pgrst, \'reload schema\'; in Supabase SQL editor.');

    return res.status(200).json({ ok: true, missing, notes });
  } catch (e) {
    return res.status(500).json({ ok: false, error: errText(e) });
  }
}

