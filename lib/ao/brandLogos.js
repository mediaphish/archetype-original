import { supabaseAdmin } from '../supabase-admin.js';

function safeText(v, maxLen) {
  const s = String(v || '').trim();
  if (!s) return '';
  return maxLen ? s.slice(0, maxLen) : s;
}

/**
 * Best-effort: fetch a default logo public URL.
 * - prefer "dark" background default if present
 * - then "light"
 * - then any recent logo
 */
export async function getDefaultLogoUrl({ background = 'dark' } = {}) {
  try {
    const preferDark = String(background || '').toLowerCase() === 'dark';

    const pick = async (col) => {
      const out = await supabaseAdmin
        .from('ao_brand_assets')
        .select('public_url')
        .eq('kind', 'logo')
        .eq(col, true)
        .order('created_at', { ascending: false })
        .limit(1);
      if (out.error) throw out.error;
      const url = out.data?.[0]?.public_url;
      return safeText(url, 1000) || null;
    };

    const url1 = preferDark ? await pick('is_default_dark') : await pick('is_default_light');
    if (url1) return url1;

    const url2 = preferDark ? await pick('is_default_light') : await pick('is_default_dark');
    if (url2) return url2;

    const any = await supabaseAdmin
      .from('ao_brand_assets')
      .select('public_url')
      .eq('kind', 'logo')
      .order('created_at', { ascending: false })
      .limit(1);
    if (any.error) throw any.error;
    const url = any.data?.[0]?.public_url;
    return safeText(url, 1000) || null;
  } catch (_) {
    return null;
  }
}

