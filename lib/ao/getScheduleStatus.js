/**
 * Read-only schedule status for a journal slug (#130).
 * SELECT only — never inserts or updates.
 * DB loaders are lazy-imported so selftests can inject mocks without Supabase env.
 */

function canonicalizeSlug(raw) {
  return String(raw || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * @param {{
 *   slug: string,
 *   email?: string|null,
 *   loadDraft?: (slug: string, email?: string|null) => Promise<object|null>,
 *   loadCaptions?: (slug: string) => Promise<object[]>,
 * }} args
 */
export async function getScheduleStatus({
  slug: rawSlug,
  email = null,
  loadDraft = null,
  loadCaptions = null,
} = {}) {
  const slug = canonicalizeSlug(rawSlug);
  if (!slug) return { ok: false, error: 'slug is required' };

  const resolveDraft = loadDraft || defaultLoadDraft;
  const resolveCaptions = loadCaptions || defaultLoadCaptions;

  const row = await resolveDraft(slug, email);
  const captionRows = await resolveCaptions(slug);

  const draft = row
    ? {
        id: row.id,
        slug: row.slug || slug,
        title: row.title || null,
        status: row.status || null,
        approved_at: row.approved_at || null,
        scheduled_publish_at: row.scheduled_publish_at || null,
        has_image: !!(row.image_url || row.has_image),
        published_at: row.published_at || null,
      }
    : null;

  const captions = (captionRows || []).map((r) => ({
    channel_label: r.channel_label || r.intent?.channel_label || null,
    platform: r.platform || null,
    account_id: r.account_id || null,
    scheduled_at: r.scheduled_at || null,
    status: r.status || null,
  }));

  return {
    ok: true,
    slug,
    draft,
    captions,
    caption_count: captions.length,
    message: draft
      ? `Schedule status for ${slug}: draft status=${draft.status}, scheduled_publish_at=${draft.scheduled_publish_at || 'null'}, has_image=${draft.has_image}, ${captions.length} caption row(s).`
      : `No journal draft found for slug="${slug}". ${captions.length} caption row(s) matched.`,
  };
}

async function defaultLoadDraft(slug, email) {
  const { contentDrafts } = await import('../db/contentDrafts.js');
  let query = contentDrafts()
    .select(
      'id, slug, title, status, approved_at, scheduled_publish_at, image_url, published_at, updated_at'
    )
    .eq('kind', 'journal')
    .eq('slug', slug)
    .neq('status', 'abandoned')
    .order('updated_at', { ascending: false })
    .limit(1);

  const emailNorm = email
    ? String(email)
        .toLowerCase()
        .trim()
    : '';
  if (emailNorm) {
    query = query.eq('created_by_email', emailNorm);
  }

  const { data, error } = await query;
  if (error) {
    console.warn('[getScheduleStatus] draft lookup failed:', error.message);
    return null;
  }
  return data?.[0] || null;
}

async function defaultLoadCaptions(slug) {
  const { scheduledPosts } = await import('../db/scheduledPosts.js');
  const { data, error } = await scheduledPosts()
    .select('platform, account_id, scheduled_at, status, intent')
    .eq('source_kind', 'journal_launch')
    .contains('intent', { journal_slug: slug })
    .neq('status', 'failed')
    .order('scheduled_at', { ascending: true });

  if (error) {
    console.warn('[getScheduleStatus] caption lookup failed:', error.message);
    return [];
  }
  return Array.isArray(data) ? data : [];
}
