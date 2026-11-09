import { deriveDraftStage } from './draftStage.js';
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
        // What Bart approved in the panel, read by the same rule the panel
        // uses, so the team and his screen never disagree (2026-11-09).
        ...stageSummary(row),
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

function stageSummary(row) {
  if (!row?.metadata) return {};
  try {
    const st = deriveDraftStage({ draft: row });
    const img = row.metadata?.stage_approvals?.image || null;
    return {
      stage: st?.stage || null,
      image_approved: Boolean(st?.approvals?.image),
      image_approved_at: st?.approvals?.image ? img?.approved_at || null : null,
      image_approval_note:
        img && !st?.approvals?.image
          ? `Bart approved an earlier image at ${img.approved_at}; the image saved now replaced it after that, so it still needs his OK.`
          : null,
      schedule_approved: Boolean(st?.approvals?.schedule),
      captions_approved: Boolean(st?.approvals?.captions),
    };
  } catch (_) {
    return {};
  }
}

async function defaultLoadDraft(slug, email) {
  const { contentDrafts } = await import('../db/contentDrafts.js');
  let query = contentDrafts()
    .select(
      'id, slug, title, status, approved_at, scheduled_publish_at, image_url, published_at, updated_at, metadata'
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
  return loadJournalCaptionRows(slug);
}

/**
 * Caption rows for one journal post.
 *
 * Exported so the artifact panel's stage (api/ao/auto/content-draft.js with
 * with_stage=1) matches captions to a post with exactly the rule Auto's
 * get_schedule_status tool uses. Two copies of this match would drift, and a
 * panel that disagrees with Auto about which stage a post is in is worse than
 * no panel.
 */
export async function loadJournalCaptionRows(slug) {
  const { scheduledPosts } = await import('../db/scheduledPosts.js');
  const { data, error } = await scheduledPosts()
    // caption, text and image_url are for the staged panel's Captions and
    // Schedule tabs: for automated channels the scheduled row is the only place
    // the text that will actually post exists. getScheduleStatus ignores them.
    .select('id, platform, account_id, scheduled_at, status, intent, caption, text, image_url')
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
