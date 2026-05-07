/**
 * Secured publish: overlap check, optional GitHub commit, mark draft published.
 * POST /api/ao/corpus/publish
 * Body: { draft_id } OR { title, slug, summary, body_md, tags?, draft_id? }
 */

import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { checkCorpusPublishOverlap } from '../../../lib/ao/corpusOverlapCheck.js';
import { pushMarkdownFileToGithub } from '../../../lib/ao/githubCorpusPublish.js';
import { auditPublicationEvent } from '../../../lib/ao/auditPublicationEvent.js';
import {
  validateJournalPublishApproval,
  consumeJournalPublishApprovalRow,
} from '../../../lib/ao/consumeJournalPublishApproval.js';

function vercelRequestId(req) {
  const h = req?.headers || {};
  return h['x-vercel-id'] || h['x-request-id'] || null;
}

function slugify(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
}

function buildMarkdownFile({ title, slug, summary, tags, body, featured_image, status }) {
  const publicationStatus = status === 'published' ? 'published' : 'draft';
  const tagLine = Array.isArray(tags) && tags.length ? `tags: [${tags.map((t) => `"${String(t).replace(/"/g, '')}"`).join(', ')}]` : 'tags: []';
  const heroLine =
    featured_image && String(featured_image).trim().startsWith('http')
      ? `featured_image: "${String(featured_image).replace(/"/g, '\\"').slice(0, 800)}"\n`
      : '';
  const front = `---
title: "${String(title).replace(/"/g, '\\"')}"
slug: ${slug}
type: article
status: ${publicationStatus}
summary: "${String(summary || '').replace(/"/g, '\\"').slice(0, 400)}"
${tagLine}
${heroLine}created_at: "${new Date().toISOString()}"
updated_at: "${new Date().toISOString()}"
---

${String(body || '').trim()}
`;
  return front;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  const auth = requireAoSession(req, res);
  if (!auth) return;

  try {
    const body = typeof req.body === 'object' && req.body ? req.body : {};
    let title = String(body.title || '').trim();
    let slug = slugify(body.slug || body.title || '');
    let summary = String(body.summary || '').trim();
    let body_md = String(body.body_md || body.body || '').trim();
    let tags = Array.isArray(body.tags) ? body.tags.map((t) => String(t).slice(0, 80)) : [];
    let draftId = body.draft_id || body.draftId || null;
    /** @type {Record<string, unknown>|null} */
    let draftMeta = null;

    if (draftId) {
      const { data: row, error } = await supabaseAdmin
        .from('ao_corpus_drafts')
        .select('*')
        .eq('id', draftId)
        .eq('created_by_email', auth.email)
        .maybeSingle();
      if (error) return res.status(500).json({ ok: false, error: error.message });
      if (!row) return res.status(404).json({ ok: false, error: 'Draft not found' });
      draftMeta = row.meta && typeof row.meta === 'object' ? row.meta : {};
      title = title || String(row.topic || 'Untitled');
      summary = summary || String(row.meta?.summary || '').slice(0, 500) || String(row.tldr_markdown || '').slice(0, 300);
      body_md = body_md || String(row.full_markdown || row.outline_markdown || row.tldr_markdown || '').trim();
      slug = slug || slugify(row.meta?.slug || row.topic || title);
      if (Array.isArray(row.tags) && row.tags.length) tags = row.tags;
    }

    if (!title || !slug || !body_md) {
      return res.status(400).json({ ok: false, error: 'title, slug, and body_md (or draft_id with content) required' });
    }

    const overlap = await checkCorpusPublishOverlap({ slug, title, summary });
    if (!overlap.ok) {
      return res.status(409).json({
        ok: false,
        error: 'Overlap with published library',
        conflicts: overlap.conflicts,
      });
    }

    const rwImg = draftMeta?.rapid_write_image && typeof draftMeta.rapid_write_image === 'object' ? draftMeta.rapid_write_image : null;
    const approvedHeroUrl =
      rwImg?.status === 'approved' && rwImg?.url && String(rwImg.url).startsWith('https://') ? String(rwImg.url) : null;

    const relativePath = `ao-knowledge-hq-kit/journal/${slug}.md`;
    const wantsLive =
      body.live_on_site === true ||
      body.live_on_site === 'true' ||
      String(body.live_on_site || '').toLowerCase() === 'yes';
    const approvalToken =
      typeof body.publish_approval_token === 'string' ? body.publish_approval_token.trim() : '';

    let journalPublicationStatus = 'draft';
    /** @type {{ rowId?: string }|null} */
    let pendingApprovalConsume = null;
    if (wantsLive) {
      if (!approvalToken) {
        return res.status(400).json({
          ok: false,
          error:
            'Live Journal requires explicit approval: call POST /api/ao/journal/publish-approval with this slug, then retry with publish_approval_token and live_on_site: true.',
          targetPath: relativePath,
        });
      }
      const approval = await validateJournalPublishApproval({
        token: approvalToken,
        email: auth.email,
        targetPath: relativePath,
      });
      if (!approval.ok || !approval.rowId) {
        if (approval.error === 'approval_table_missing') {
          return res.status(503).json({
            ok: false,
            error:
              'Journal approval table missing. Run database/ao_journal_publish_approvals.sql in Supabase, then mint a token and retry.',
          });
        }
        return res.status(403).json({
          ok: false,
          error: `Journal publish approval failed: ${approval.error}`,
          targetPath: relativePath,
        });
      }
      pendingApprovalConsume = { rowId: approval.rowId };
      journalPublicationStatus = 'published';
    }

    const fileContent = buildMarkdownFile({
      title,
      slug,
      summary,
      tags,
      body: body_md,
      featured_image: approvedHeroUrl || undefined,
      status: journalPublicationStatus,
    });

    const gh = await pushMarkdownFileToGithub({
      path: relativePath,
      content: fileContent,
      message: `Add corpus: ${title}`,
    });

    if (draftId && draftMeta) {
      const mergedMeta = {
        ...draftMeta,
        slug,
        published_via: 'github',
        github_ok: gh.ok,
        journal_site_status: journalPublicationStatus,
        ...(approvedHeroUrl ? { published_featured_image_url: approvedHeroUrl } : {}),
      };
      await supabaseAdmin
        .from('ao_corpus_drafts')
        .update({
          status: journalPublicationStatus === 'published' ? 'published' : 'approved',
          target_path: relativePath,
          full_markdown: body_md,
          meta: mergedMeta,
          updated_at: new Date().toISOString(),
        })
        .eq('id', draftId)
        .eq('created_by_email', auth.email);
    }

    if (!gh.ok && !process.env.GITHUB_TOKEN) {
      await auditPublicationEvent({
        source: 'api:ao/corpus/publish',
        action: 'corpus_publish_no_github_token',
        outcome: 'partial',
        actor_email: auth.email,
        resource_paths: [relativePath],
        vercel_id: vercelRequestId(req),
        detail: {
          draft_id: draftId || null,
          title,
          slug,
          journal_site_status: journalPublicationStatus,
          note: 'Overlap OK; GitHub token missing — user must paste markdown or configure token.',
        },
      });
      return res.status(200).json({
        ok: true,
        storedOnly: true,
        journal_site_status: journalPublicationStatus,
        message:
          'Overlap check passed. GitHub token not configured — file was not pushed. Copy from `markdown` or configure GITHUB_TOKEN + GITHUB_REPO.',
        targetPath: relativePath,
        markdown: fileContent,
      });
    }

    if (!gh.ok) {
      await auditPublicationEvent({
        source: 'api:ao/corpus/publish',
        action: 'github_contents_api_push',
        outcome: 'failure',
        actor_email: auth.email,
        resource_paths: [relativePath],
        vercel_id: vercelRequestId(req),
        error_message: gh.error || 'GitHub publish failed',
        detail: { draft_id: draftId || null, title, slug, journal_site_status: journalPublicationStatus },
      });
      return res.status(502).json({
        ok: false,
        error: gh.error || 'GitHub publish failed',
        targetPath: relativePath,
        markdown: fileContent,
      });
    }

    await auditPublicationEvent({
      source: 'api:ao/corpus/publish',
      action: 'github_contents_api_push',
      outcome: 'success',
      actor_email: auth.email,
      resource_paths: [relativePath],
      vercel_id: vercelRequestId(req),
      detail: {
        draft_id: draftId || null,
        title,
        slug,
        journal_site_status: journalPublicationStatus,
        github_html_url: gh.url || null,
      },
    });

    if (pendingApprovalConsume?.rowId) {
      const burned = await consumeJournalPublishApprovalRow(pendingApprovalConsume.rowId);
      if (!burned.ok) {
        console.error('[ao/corpus/publish] approval token consume failed after successful push:', burned.error);
      }
    }

    return res.status(200).json({
      ok: true,
      targetPath: relativePath,
      journal_site_status: journalPublicationStatus,
      url: gh.url,
      message:
        journalPublicationStatus === 'published'
          ? 'Committed to repo as published. Run knowledge build / deploy so the live Journal picks it up.'
          : 'Committed to repo as draft (not on public Journal until you mint approval and republish live, or set status to published manually). Knowledge build runs on deploy as usual.',
    });
  } catch (e) {
    console.error('[ao/corpus/publish]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
