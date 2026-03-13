/**
 * AO Automation — Brand asset detail
 * PATCH  /api/ao/brand/assets/[id]
 * DELETE /api/ao/brand/assets/[id]
 */

import { supabaseAdmin } from '../../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../../lib/ao/requireAoSession.js';

function safeText(v, maxLen) {
  const s = String(v || '').trim();
  if (!s) return '';
  return maxLen ? s.slice(0, maxLen) : s;
}

function parseBoolOrNull(v) {
  if (v == null) return null;
  const s = String(v).toLowerCase().trim();
  if (s === 'true' || s === '1' || s === 'yes') return true;
  if (s === 'false' || s === '0' || s === 'no') return false;
  return null;
}

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  const id = req.query?.id;
  if (!id) return res.status(400).json({ ok: false, error: 'Asset ID required' });

  if (req.method !== 'PATCH' && req.method !== 'DELETE') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { data: asset, error: readErr } = await supabaseAdmin
      .from('ao_brand_assets')
      .select('*')
      .eq('id', id)
      .single();
    if (readErr) {
      if (readErr.code === 'PGRST116') return res.status(404).json({ ok: false, error: 'Asset not found' });
      return res.status(500).json({ ok: false, error: readErr.message });
    }

    if (req.method === 'DELETE') {
      const bucket = asset.storage_bucket;
      const path = asset.storage_path;
      if (bucket && path) {
        try {
          await supabaseAdmin.storage.from(bucket).remove([path]);
        } catch (_) {}
      }
      const del = await supabaseAdmin.from('ao_brand_assets').delete().eq('id', id);
      if (del.error) throw del.error;
      return res.status(200).json({ ok: true });
    }

    const label = req.body?.label == null ? null : safeText(req.body.label, 80);
    const variantRaw = req.body?.variant == null ? null : safeText(req.body.variant, 20).toLowerCase();
    const defaultLight = parseBoolOrNull(req.body?.is_default_light);
    const defaultDark = parseBoolOrNull(req.body?.is_default_dark);

    const patch = { updated_at: new Date().toISOString() };
    if (label !== null) {
      if (!label) return res.status(400).json({ ok: false, error: 'Label is required' });
      patch.label = label;
    }
    if (variantRaw !== null) {
      const allowedVariants = ['mark', 'wordmark', 'lockup_light', 'lockup_dark', 'other'];
      if (!allowedVariants.includes(variantRaw)) return res.status(400).json({ ok: false, error: 'Invalid variant' });
      patch.variant = variantRaw;
    }

    if (defaultLight !== null) {
      if (defaultLight) {
        await supabaseAdmin.from('ao_brand_assets').update({ is_default_light: false }).eq('kind', 'logo').eq('is_default_light', true);
      }
      patch.is_default_light = defaultLight;
    }
    if (defaultDark !== null) {
      if (defaultDark) {
        await supabaseAdmin.from('ao_brand_assets').update({ is_default_dark: false }).eq('kind', 'logo').eq('is_default_dark', true);
      }
      patch.is_default_dark = defaultDark;
    }

    const upd = await supabaseAdmin
      .from('ao_brand_assets')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();
    if (upd.error) throw upd.error;

    return res.status(200).json({ ok: true, asset: upd.data });
  } catch (e) {
    const msg = String(e?.message || e || '');
    if (msg.includes('ao_brand_assets')) {
      return res.status(500).json({ ok: false, error: 'Brand assets are not set up yet. Run database/ao_brand_assets.sql in Supabase.' });
    }
    return res.status(500).json({ ok: false, error: msg || 'Server error' });
  }
}

