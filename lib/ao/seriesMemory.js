/**
 * Cross-thread series and seed memory for Auto (Phase 2).
 *
 * Companion to statedPreferences.js, same storage and the same conventions:
 * ao_editorial_memory_items rows, active rows have extra.superseded_by unset,
 * upsert keyed on (created_by_email, kind, source_url_or_slug).
 *
 * Why this exists — two measured gaps, 2026-08-20:
 *
 *   1. ao_editorial_memory_items has a `series_key` column that has never once
 *      been populated: across all 673 rows, count(distinct series_key) = 0. So
 *      "what series exist, what is the arc, what part comes next" had no home
 *      in durable memory at all.
 *
 *   2. Nothing captured exploratory, pre-decision work. The 8–10 seed
 *      Archetype figures Bart discussed are not hidden somewhere Auto could
 *      find with a better query — they were never written down. That is why
 *      Auto asked him to brainstorm from a blank page while four entries in
 *      the series were already published.
 *
 * loadSeriesContext in autoV2.js separately globs the journal directory behind
 * a hardcoded regex of five published series slugs, so an in-progress series is
 * invisible to it. This module is the durable side of that; series recorded
 * here are visible whether or not anything has been published yet.
 */

import crypto from 'crypto';

/**
 * Lazy Supabase handle.
 *
 * lib/supabase-admin.js builds its client at module load and throws when
 * SUPABASE_URL is unset, so a static import here would make the pure helpers in
 * this file — key normalization, prompt rendering — untestable without a live
 * database. They are the parts most worth testing.
 */
let cachedAdmin = null;
async function db() {
  if (!cachedAdmin) {
    ({ supabaseAdmin: cachedAdmin } = await import('../supabase-admin.js'));
  }
  return cachedAdmin;
}

// 'series_plan' was already in the table's kind CHECK constraint with zero rows
// — the schema anticipated this and it was never populated. Reusing the
// intended name rather than adding a parallel one. 'seed' had to be added
// to the constraint; nothing existed for pre-decision seeds.
export const SERIES_KIND = 'series_plan';
export const SEED_KIND = 'seed';
export const SEED_STATUSES = ['open', 'chosen', 'rejected'];
export const SERIES_PROMPT_CAP = 12;
export const SEED_PROMPT_CAP = 40;

/** Normalize any series name into a stable key. */
export function seriesKeyFor(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/\s+series\b.*$/i, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function seedSourceKey(seriesKey, name) {
  const norm = `${seriesKey || 'unassigned'}::${String(name || '').toLowerCase().replace(/\s+/g, ' ').trim()}`;
  const hash = crypto.createHash('sha256').update(norm).digest('hex').slice(0, 20);
  return `seed:${hash}`;
}

function normEmail(email) {
  return String(email || '').toLowerCase().trim();
}

function isActive(row) {
  const extra = row?.extra && typeof row.extra === 'object' ? row.extra : {};
  return extra.superseded_by == null || extra.superseded_by === '';
}

/* ------------------------------------------------------------------ series */

function rowToSeries(row) {
  if (!row) return null;
  const extra = row.extra && typeof row.extra === 'object' ? row.extra : {};
  const parts = Array.isArray(extra.parts) ? extra.parts : [];
  return {
    id: row.id,
    series_key: row.series_key || null,
    title: row.title || row.series_key || '',
    intent: String(extra.intent || row.body_text || '').trim(),
    status: extra.status || 'active',
    parts: [...parts].sort((a, b) => (a.part_number || 0) - (b.part_number || 0)),
    updated_at: row.updated_at || null,
  };
}

/**
 * Create or update a series record. Passing `parts` replaces the list; use
 * recordSeriesPart to add one without knowing the others.
 */
export async function upsertSeries({ email, seriesKey, title, intent = '', parts = null, status = 'active' }) {
  const emailNorm = normEmail(email);
  const key = seriesKeyFor(seriesKey || title);
  if (!emailNorm) return { ok: false, error: 'email is required' };
  if (!key) return { ok: false, error: 'seriesKey or title is required' };

  const existing = await getSeries(emailNorm, key);
  const nextParts = Array.isArray(parts) ? parts : existing.series?.parts || [];

  const extra = {
    intent: String(intent || existing.series?.intent || '').trim(),
    status,
    parts: nextParts,
    superseded_by: null,
  };

  const { data, error } = await (await db())
    .from('ao_editorial_memory_items')
    .upsert(
      {
        created_by_email: emailNorm,
        kind: SERIES_KIND,
        source_url_or_slug: `series:${key}`,
        series_key: key,
        title: String(title || existing.series?.title || key).slice(0, 200),
        body_text: extra.intent,
        published_at: new Date().toISOString(),
        topic_tags: ['series'],
        extra,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'created_by_email,kind,source_url_or_slug', ignoreDuplicates: false }
    )
    .select('id, title, body_text, series_key, extra, updated_at')
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  return { ok: true, series: rowToSeries(data) };
}

export async function getSeries(email, seriesKey) {
  const emailNorm = normEmail(email);
  const key = seriesKeyFor(seriesKey);
  if (!emailNorm || !key) return { ok: false, error: 'email and seriesKey are required', series: null };

  const { data, error } = await (await db())
    .from('ao_editorial_memory_items')
    .select('id, title, body_text, series_key, extra, updated_at')
    .eq('created_by_email', emailNorm)
    .eq('kind', SERIES_KIND)
    .eq('source_url_or_slug', `series:${key}`)
    .maybeSingle();

  if (error) return { ok: false, error: error.message, series: null };
  return { ok: true, series: data ? rowToSeries(data) : null };
}

/**
 * Record one part of a series without needing to know the rest.
 *
 * Called from the publish/save path, so the arc stays current on its own
 * rather than depending on anyone remembering to update it — the failure mode
 * that made every other memory attempt here decay.
 */
export async function recordSeriesPart({
  email,
  seriesKey,
  seriesTitle = null,
  partNumber = null,
  slug = null,
  title = null,
  status = 'draft',
  publishedAt = null,
}) {
  const emailNorm = normEmail(email);
  const key = seriesKeyFor(seriesKey);
  if (!emailNorm || !key) return { ok: false, error: 'email and seriesKey are required' };

  const current = await getSeries(emailNorm, key);
  const parts = current.series?.parts ? [...current.series.parts] : [];

  const matchIndex = parts.findIndex(
    (p) => (slug && p.slug === slug) || (partNumber != null && p.part_number === partNumber)
  );
  const entry = {
    part_number: partNumber ?? (matchIndex >= 0 ? parts[matchIndex].part_number : parts.length + 1),
    slug: slug || (matchIndex >= 0 ? parts[matchIndex].slug : null),
    title: title || (matchIndex >= 0 ? parts[matchIndex].title : null),
    status,
    published_at: publishedAt || (matchIndex >= 0 ? parts[matchIndex].published_at : null),
  };

  if (matchIndex >= 0) parts[matchIndex] = { ...parts[matchIndex], ...entry };
  else parts.push(entry);

  return upsertSeries({
    email: emailNorm,
    seriesKey: key,
    title: seriesTitle || current.series?.title || key,
    intent: current.series?.intent || '',
    parts,
  });
}

export async function listSeries(email, { limit = SERIES_PROMPT_CAP } = {}) {
  const emailNorm = normEmail(email);
  if (!emailNorm) return { ok: false, error: 'email is required', series: [] };

  const { data, error } = await (await db())
    .from('ao_editorial_memory_items')
    .select('id, title, body_text, series_key, extra, updated_at')
    .eq('created_by_email', emailNorm)
    .eq('kind', SERIES_KIND)
    .order('updated_at', { ascending: false })
    .limit(Math.max(Number(limit) || SERIES_PROMPT_CAP, 1) * 3);

  if (error) return { ok: false, error: error.message, series: [] };

  const active = (data || [])
    .filter(isActive)
    .map(rowToSeries)
    .filter(Boolean)
    .slice(0, limit);
  return { ok: true, series: active };
}

/* -------------------------------------------------------------- seeds */

function rowToSeed(row) {
  if (!row) return null;
  const extra = row.extra && typeof row.extra === 'object' ? row.extra : {};
  return {
    id: row.id,
    name: row.title || '',
    series_key: row.series_key || null,
    note: String(extra.note || row.body_text || '').trim(),
    status: SEED_STATUSES.includes(extra.status) ? extra.status : 'open',
    decided_at: extra.decided_at || null,
    source_key: row.source_url_or_slug || null,
  };
}

/**
 * Capture an seed that has been discussed but not decided on.
 *
 * This is the piece with no prior home anywhere in the system. Losing it is
 * what forced a from-scratch brainstorm of a series that was already underway.
 */
export async function upsertSeed({ email, seriesKey = null, name, note = '', status = 'open' }) {
  const emailNorm = normEmail(email);
  const nameText = String(name || '').replace(/\s+/g, ' ').trim();
  if (!emailNorm) return { ok: false, error: 'email is required' };
  if (!nameText) return { ok: false, error: 'name is required' };

  const key = seriesKey ? seriesKeyFor(seriesKey) : null;
  const statusNorm = SEED_STATUSES.includes(status) ? status : 'open';

  const { data, error } = await (await db())
    .from('ao_editorial_memory_items')
    .upsert(
      {
        created_by_email: emailNorm,
        kind: SEED_KIND,
        source_url_or_slug: seedSourceKey(key, nameText),
        series_key: key,
        title: nameText.slice(0, 200),
        body_text: String(note || '').trim(),
        published_at: new Date().toISOString(),
        topic_tags: ['seed', statusNorm],
        extra: {
          note: String(note || '').trim(),
          status: statusNorm,
          decided_at: statusNorm === 'open' ? null : new Date().toISOString(),
          superseded_by: null,
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'created_by_email,kind,source_url_or_slug', ignoreDuplicates: false }
    )
    .select('id, title, body_text, series_key, extra, source_url_or_slug')
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  return { ok: true, seed: rowToSeed(data) };
}

export async function listSeeds(email, { seriesKey = null, status = null, limit = SEED_PROMPT_CAP } = {}) {
  const emailNorm = normEmail(email);
  if (!emailNorm) return { ok: false, error: 'email is required', seeds: [] };

  let query = (await db())
    .from('ao_editorial_memory_items')
    .select('id, title, body_text, series_key, extra, source_url_or_slug')
    .eq('created_by_email', emailNorm)
    .eq('kind', SEED_KIND)
    .order('published_at', { ascending: false })
    .limit(Math.max(Number(limit) || SEED_PROMPT_CAP, 1) * 2);

  if (seriesKey) query = query.eq('series_key', seriesKeyFor(seriesKey));

  const { data, error } = await query;
  if (error) return { ok: false, error: error.message, seeds: [] };

  let rows = (data || []).filter(isActive).map(rowToSeed).filter(Boolean);
  if (status) rows = rows.filter((c) => c.status === status);
  return { ok: true, seeds: rows.slice(0, limit) };
}

/** Mark a seed chosen or rejected, so it stops looking undecided. */
export async function resolveSeed({ email, name, seriesKey = null, status = 'chosen' }) {
  const emailNorm = normEmail(email);
  const nameText = String(name || '').trim();
  if (!emailNorm || !nameText) return { ok: false, error: 'email and name are required' };
  if (!SEED_STATUSES.includes(status)) return { ok: false, error: `status must be one of ${SEED_STATUSES.join(', ')}` };

  const listed = await listSeeds(emailNorm, { seriesKey, limit: 200 });
  if (!listed.ok) return listed;

  const needle = nameText.toLowerCase();
  const target =
    listed.seeds.find((c) => c.name.toLowerCase() === needle) ||
    listed.seeds.find((c) => c.name.toLowerCase().includes(needle)) ||
    null;
  if (!target) return { ok: false, error: 'No matching seed found' };

  return upsertSeed({
    email: emailNorm,
    seriesKey: target.series_key,
    name: target.name,
    note: target.note,
    status,
  });
}

/* ------------------------------------------------------------------ prompt */

/** Render series + seeds as an always-on system prompt block. */
export function formatSeriesMemoryForPrompt(series = [], seeds = []) {
  const seriesList = Array.isArray(series) ? series : [];
  const candidateList = Array.isArray(seeds) ? seeds : [];
  if (!seriesList.length && !candidateList.length) return '';

  const sections = [];

  if (seriesList.length) {
    const lines = seriesList.map((s) => {
      const parts = s.parts || [];
      const published = parts.filter((p) => p.status === 'published');
      const pending = parts.filter((p) => p.status !== 'published');
      const bits = [`- **${s.title}** (${s.series_key})`];
      if (s.intent) bits.push(`  intent: ${s.intent}`);
      if (published.length) {
        bits.push(
          `  published (${published.length}): ` +
            published.map((p) => `${p.part_number}. ${p.title || p.slug}`).join('; ')
        );
      }
      if (pending.length) {
        bits.push(
          `  in progress: ` + pending.map((p) => `${p.part_number}. ${p.title || p.slug} [${p.status}]`).join('; ')
        );
      }
      return bits.join('\n');
    });
    sections.push(`### Series\n${lines.join('\n')}`);
  }

  const open = candidateList.filter((c) => c.status === 'open');
  const decided = candidateList.filter((c) => c.status !== 'open');

  if (open.length) {
    sections.push(
      `### Seeds in play (raised, not yet chosen)\n` +
        open.map((c) => `- ${c.name}${c.series_key ? ` [${c.series_key}]` : ''}${c.note ? ` — ${c.note}` : ''}`).join('\n')
    );
  }
  if (decided.length) {
    sections.push(
      `### Seeds already decided\n` +
        decided.map((c) => `- ${c.name} — ${c.status}`).join('\n')
    );
  }

  return (
    `## SERIES AND CANDIDATE MEMORY (cross-thread — this is the real state, not a guess)\n\n` +
    `You already know everything below. Do not ask Bart to re-supply it, and do not ` +
    `brainstorm from a blank page when open seeds exist. If something here looks ` +
    `wrong, say so and check — do not silently invent a replacement.\n\n` +
    `${sections.join('\n\n')}`
  );
}

/** Always-on prompt block for an owner. Returns '' on any failure. */
export async function loadSeriesMemoryContext(email) {
  try {
    const [seriesResult, candidateResult] = await Promise.all([
      listSeries(email, { limit: SERIES_PROMPT_CAP }),
      listSeeds(email, { limit: SEED_PROMPT_CAP }),
    ]);
    if (!seriesResult.ok && !candidateResult.ok) return '';
    return formatSeriesMemoryForPrompt(seriesResult.series || [], candidateResult.seeds || []);
  } catch (err) {
    console.error('[seriesMemory] load context failed:', err?.message || err);
    return '';
  }
}

/** Series keys Auto knows about, for detection that does not rely on a hardcoded list. */
export async function knownSeriesKeys(email) {
  const { ok, series } = await listSeries(email, { limit: 100 });
  if (!ok) return [];
  return series.map((s) => s.series_key).filter(Boolean);
}
