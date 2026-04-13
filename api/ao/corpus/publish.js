/**
 * Secured publish: overlap check, optional GitHub commit, mark draft published.
 * POST /api/ao/corpus/publish
 * Body: { draft_id } OR { title, slug, summary, body_md, tags?, draft_id? }
 */

import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { checkCorpusPublishOverlap } from '../../../lib/ao/corpusOverlapCheck.js';
import { pushMarkdownFileToGithub } from '../../../lib/ao/githubCorpusPublish.js';

function slugify(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120);
}

function buildMarkdownFile({ title, slug, summary, tags, body, featured_image }) {
  const tagLine = Array.isArray(tags) && tags.length ? `tags: [${tags.map((t) => `"${String(t).replace(/"/g, '')}"`).join(', ')}]` : 'tags: []';
  const heroLine =
    featured_image && String(featured_image).trim().startsWith('http')
      ? `featured_image: "${String(featured_image).replace(/"/g, '\\"').slice(0, 800)}"\n`
      : '';
  const front = `---
title: "${String(title).replace(/"/g, '\\"')}"
slug: ${slug}
type: article
status: published
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
    const fileContent = buildMarkdownFile({
      title,
      slug,
      summary,
      tags,
      body: body_md,
      featured_image: approvedHeroUrl || undefined,
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
        ...(approvedHeroUrl ? { published_featured_image_url: approvedHeroUrl } : {}),
      };
      await supabaseAdmin
        .from('ao_corpus_drafts')
        .update({
          status: 'published',
          target_path: relativePath,
          full_markdown: body_md,
          meta: mergedMeta,
          updated_at: new Date().toISOString(),
        })
        .eq('id', draftId)
        .eq('created_by_email', auth.email);
    }

    if (!gh.ok && !process.env.GITHUB_TOKEN) {
      return res.status(200).json({
        ok: true,
        storedOnly: true,
        message:
          'Overlap check passed. GitHub token not configured — file was not pushed. Copy from `markdown` or configure GITHUB_TOKEN + GITHUB_REPO.',
        targetPath: relativePath,
        markdown: fileContent,
      });
    }

    if (!gh.ok) {
      return res.status(502).json({
        ok: false,
        error: gh.error || 'GitHub publish failed',
        targetPath: relativePath,
        markdown: fileContent,
      });
    }

    return res.status(200).json({
      ok: true,
      targetPath: relativePath,
      url: gh.url,
      message: 'Committed to repo. Run knowledge build on the next deploy so the live library updates.',
    });
  } catch (e) {
    console.error('[ao/corpus/publish]', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
}
