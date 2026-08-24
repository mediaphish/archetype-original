import { summaryFromContent, isTruncatedSummary } from './postSummary.js';
/**
 * Cron/worker: publish approved journal drafts whose scheduled_publish_at is due (#127).
 *
 * Mirrors social caption auto-publish: no live Auto chat session required.
 * Reuses the same pre-publish checks as handlePublishJournal (image + captions).
 */

import { logActivity } from './logActivity.js';
import { evaluatePublishCaptionsGate } from './waypointGates.js';
import { publishJournalEntry } from './publishJournalEntry.js';
import { listDueScheduledJournals } from '../db/scheduledJournalPublish.js';
import { scheduledPosts } from '../db/scheduledPosts.js';

/**
 * @param {object} [opts]
 * @param {number} [opts.limit]
 * @param {string|null} [opts.nowIso] - inject clock for tests
 * @param {typeof listDueScheduledJournals} [opts.listDue]
 * @param {typeof publishJournalEntry} [opts.publishEntry]
 * @param {Function} [opts.loadScheduledRows]
 * @param {typeof logActivity} [opts.log]
 */
export async function publishDueScheduledJournals(opts = {}) {
  const limit = opts.limit ?? 20;
  const listDue = opts.listDue || listDueScheduledJournals;
  const publishEntry = opts.publishEntry || publishJournalEntry;
  const log = opts.log || logActivity;
  const loadScheduledRows =
    opts.loadScheduledRows ||
    (async (slug) => {
      try {
        const { data } = await scheduledPosts()
          .select('platform, account_id, status')
          .eq('source_kind', 'journal_launch')
          .contains('intent', { journal_slug: slug })
          .neq('status', 'failed');
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    });

  const listed = await listDue({ limit, nowIso: opts.nowIso || null });
  if (!listed.ok) {
    return {
      ok: false,
      error: listed.error || 'Failed to list due journals',
      processed: 0,
      published: 0,
      skipped: 0,
      results: [],
    };
  }

  const results = [];
  let published = 0;
  let skipped = 0;

  for (const draft of listed.rows || []) {
    const slug = String(draft.slug || '').trim();
    const title = String(draft.title || '').trim() || slug;
    const base = {
      id: draft.id,
      slug,
      scheduled_publish_at: draft.scheduled_publish_at,
    };

    try {
      if (!slug) {
        skipped += 1;
        const reason = 'Draft has no slug';
        results.push({ ...base, status: 'skipped', reason });
        await log({
          action_type: 'scheduled_journal_publish_skipped',
          source: 'cron:publish-scheduled-journals',
          reference_table: 'ao_content_drafts',
          reference_id: draft.id,
          created_by_email: draft.created_by_email || null,
          detail: { reason, ...base },
        });
        continue;
      }

      const content = String(draft.content || '').trim();
      if (!content) {
        skipped += 1;
        const reason = 'Draft has no content';
        results.push({ ...base, status: 'skipped', reason });
        await log({
          action_type: 'scheduled_journal_publish_skipped',
          source: 'cron:publish-scheduled-journals',
          reference_table: 'ao_content_drafts',
          reference_id: draft.id,
          created_by_email: draft.created_by_email || null,
          detail: { reason, slug },
        });
        continue;
      }

      const image_url = draft.image_url || '';
      if (!image_url) {
        skipped += 1;
        const reason = 'No header image';
        results.push({ ...base, status: 'skipped', reason });
        await log({
          action_type: 'scheduled_journal_publish_skipped',
          source: 'cron:publish-scheduled-journals',
          reference_table: 'ao_content_drafts',
          reference_id: draft.id,
          created_by_email: draft.created_by_email || null,
          detail: { reason, slug },
        });
        continue;
      }

      const scheduledRows = await loadScheduledRows(slug);
      const captionsGate = evaluatePublishCaptionsGate(
        { content, slug },
        scheduledRows
      );
      if (!captionsGate.ok) {
        skipped += 1;
        const reason = captionsGate.error || 'Missing required captions';
        results.push({
          ...base,
          status: 'skipped',
          reason,
          missing_channels: captionsGate.missing || [],
        });
        await log({
          action_type: 'scheduled_journal_publish_skipped',
          source: 'cron:publish-scheduled-journals',
          reference_table: 'ao_content_drafts',
          reference_id: draft.id,
          created_by_email: draft.created_by_email || null,
          detail: {
            reason,
            slug,
            missing_channels: captionsGate.missing || [],
          },
        });
        continue;
      }

      // The Jezebel Archetype shipped on 2026-08-24 with a summary that stopped
      // mid-word: "...and the law forbade him from selling it away. Ahab we".
      // The draft had no summary, this fell back to plain.slice(0, 280), and
      // nothing inspected the result before it went above the fold on a post
      // carrying Bart's name.
      let summary = String(draft.summary || '').trim();
      if (!summary) summary = summaryFromContent(content) || title;

      // Hard gate. A malformed summary now blocks the publish instead of
      // reaching the site, because it is the first thing a reader sees.
      const summaryProblem = isTruncatedSummary(summary);
      if (summaryProblem) {
        skipped += 1;
        const reason = `Summary rejected: ${summaryProblem}`;
        results.push({ ...base, status: 'skipped', reason });
        await log({
          action_type: 'scheduled_journal_publish_skipped',
          source: 'cron:publish-scheduled-journals',
          reference_table: 'ao_content_drafts',
          reference_id: draft.id,
          created_by_email: draft.created_by_email || null,
          detail: { reason, slug, summary },
        });
        continue;
      }

      const metaCategories = draft.metadata?.categories;
      const categories =
        Array.isArray(metaCategories) && metaCategories.length
          ? metaCategories.map(String)
          : ['Leadership', 'Servant Leadership'];

      const result = await publishEntry({
        slug,
        title,
        content,
        summary,
        publish_date: new Date().toISOString(),
        categories,
        image_url,
        featured_image: image_url,
        takeaways: [],
        notify: true,
        notify_delay_ms: 300000,
        series_slug: draft.series_slug || null,
        part_number: draft.part_number || null,
      });

      if (!result?.ok) {
        skipped += 1;
        const reason = result?.error || 'publishJournalEntry failed';
        results.push({ ...base, status: 'failed', reason });
        await log({
          action_type: 'scheduled_journal_publish_failed',
          source: 'cron:publish-scheduled-journals',
          reference_table: 'ao_content_drafts',
          reference_id: draft.id,
          created_by_email: draft.created_by_email || null,
          detail: { reason, slug },
        });
        continue;
      }

      published += 1;
      results.push({
        ...base,
        status: 'published',
        journal_url: result.journal_url || `https://www.archetypeoriginal.com/journal/${slug}`,
      });
      await log({
        action_type: 'scheduled_journal_published',
        source: 'cron:publish-scheduled-journals',
        reference_table: 'ao_content_drafts',
        reference_id: draft.id,
        created_by_email: draft.created_by_email || null,
        detail: {
          slug,
          journal_url: result.journal_url || null,
          scheduled_publish_at: draft.scheduled_publish_at,
        },
      });
    } catch (err) {
      skipped += 1;
      const reason = err?.message || String(err);
      results.push({ ...base, status: 'failed', reason });
      await log({
        action_type: 'scheduled_journal_publish_failed',
        source: 'cron:publish-scheduled-journals',
        reference_table: 'ao_content_drafts',
        reference_id: draft.id,
        created_by_email: draft.created_by_email || null,
        detail: { reason, slug },
      });
    }
  }

  return {
    ok: true,
    processed: results.length,
    published,
    skipped,
    results,
  };
}
