/**
 * AO Automation — Import batch detail + publish.
 * GET /api/ao/import/batches/:id
 * POST /api/ao/import/batches/:id/publish
 *
 * Note: Vercel routes map POST /api/ao/import/batches/{id}/publish to this file with `action=publish`.
 */

import { supabaseAdmin } from '../../../../lib/supabase-admin.js';
import { requireAoSession } from '../../../../lib/ao/requireAoSession.js';
import { buildGroupReadyText } from '../../../../lib/ao/groupReadyPost.js';

const DEFAULT_REPO = 'mediaphish/archetype-original';
const DEFAULT_BRANCH = 'main';

function getEnv(name) {
  const v = process.env[name];
  return v && String(v).trim() ? String(v).trim() : '';
}

function getGitHubConfig() {
  const token = getEnv('AO_GITHUB_TOKEN');
  const repo = getEnv('AO_GITHUB_REPOSITORY') || DEFAULT_REPO;
  const branch = getEnv('AO_GITHUB_BRANCH') || DEFAULT_BRANCH;
  return { token, repo, branch };
}

async function ghJson(url, { token, method = 'GET', body } = {}) {
  const res = await fetch(url, {
    method,
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      'User-Agent': 'archetype-original/ao-import',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

async function publishBatchToGitHub({ token, repo, branch, items, message }) {
  const base = 'https://api.github.com';

  const tree = [];
  for (const it of items) {
    tree.push({
      path: it.target_path,
      mode: '100644',
      type: 'blob',
      content: it.content,
    });
  }

  // Retry once if branch advanced during publish.
  for (let attempt = 1; attempt <= 2; attempt++) {
    const refRes = await ghJson(`${base}/repos/${repo}/git/ref/heads/${encodeURIComponent(branch)}`, { token });
    if (!refRes.ok) {
      return { ok: false, error: `GitHub ref lookup failed (${refRes.status})`, details: refRes.json };
    }
    const latestCommitSha = refRes.json?.object?.sha;
    if (!latestCommitSha) {
      return { ok: false, error: 'GitHub ref lookup returned no commit SHA' };
    }

    const commitRes = await ghJson(`${base}/repos/${repo}/git/commits/${latestCommitSha}`, { token });
    if (!commitRes.ok) {
      return { ok: false, error: `GitHub commit lookup failed (${commitRes.status})`, details: commitRes.json };
    }
    const baseTreeSha = commitRes.json?.tree?.sha;
    if (!baseTreeSha) {
      return { ok: false, error: 'GitHub commit lookup returned no tree SHA' };
    }

    const newTreeRes = await ghJson(`${base}/repos/${repo}/git/trees`, {
      token,
      method: 'POST',
      body: {
        base_tree: baseTreeSha,
        tree,
      },
    });
    if (!newTreeRes.ok) {
      return { ok: false, error: `GitHub tree create failed (${newTreeRes.status})`, details: newTreeRes.json };
    }
    const newTreeSha = newTreeRes.json?.sha;
    if (!newTreeSha) {
      return { ok: false, error: 'GitHub tree create returned no tree SHA' };
    }

    const newCommitRes = await ghJson(`${base}/repos/${repo}/git/commits`, {
      token,
      method: 'POST',
      body: {
        message,
        tree: newTreeSha,
        parents: [latestCommitSha],
      },
    });
    if (!newCommitRes.ok) {
      return { ok: false, error: `GitHub commit create failed (${newCommitRes.status})`, details: newCommitRes.json };
    }
    const newCommitSha = newCommitRes.json?.sha;
    if (!newCommitSha) {
      return { ok: false, error: 'GitHub commit create returned no commit SHA' };
    }

    const updateRefRes = await ghJson(`${base}/repos/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, {
      token,
      method: 'PATCH',
      body: { sha: newCommitSha, force: false },
    });
    if (updateRefRes.ok) {
      return { ok: true, commitSha: newCommitSha, attempts: attempt };
    }

    // If non-fast-forward or conflict, retry once with latest head.
    const msg = JSON.stringify(updateRefRes.json || {});
    const canRetry = attempt === 1 && (updateRefRes.status === 409 || updateRefRes.status === 422 || msg.toLowerCase().includes('update is not a fast forward'));
    if (!canRetry) {
      return { ok: false, error: `GitHub ref update failed (${updateRefRes.status})`, details: updateRefRes.json };
    }
  }

  return { ok: false, error: 'GitHub publish failed after retry' };
}

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  const id = req.query?.id;
  if (!id) {
    return res.status(400).json({ ok: false, error: 'Batch ID required' });
  }

  const action = String(req.query?.action || '').trim().toLowerCase();

  if (req.method === 'GET') {
    try {
      const { data: batch, error: batchErr } = await supabaseAdmin
        .from('ao_import_batches')
        .select('*')
        .eq('id', id)
        .single();
      if (batchErr) {
        if (batchErr.code === 'PGRST116') return res.status(404).json({ ok: false, error: 'Batch not found' });
        if (String(batchErr.message || '').includes('ao_import_batches')) {
          return res.status(500).json({
            ok: false,
            error: 'Import inbox is not set up yet. Run database/ao_imports.sql in Supabase, then refresh.',
          });
        }
        return res.status(500).json({ ok: false, error: batchErr.message });
      }

      const { data: items, error: itemsErr } = await supabaseAdmin
        .from('ao_import_items')
        .select('*')
        .eq('batch_id', id)
        .order('created_at', { ascending: true });
      if (itemsErr) {
        if (String(itemsErr.message || '').includes('ao_import_items')) {
          return res.status(500).json({
            ok: false,
            error: 'Import inbox is not set up yet. Run database/ao_imports.sql in Supabase, then refresh.',
          });
        }
        return res.status(500).json({ ok: false, error: itemsErr.message });
      }

      const enriched = (items || []).map((it) => {
        const fm = it.frontmatter && typeof it.frontmatter === 'object' ? it.frontmatter : null;
        const groupReady = fm ? buildGroupReadyText(fm) : null;
        const publicUrl = fm?.slug ? `https://www.archetypeoriginal.com/journal/${fm.slug}` : null;
        return {
          ...it,
          group_ready_text: groupReady,
          public_url: publicUrl,
        };
      });

      return res.status(200).json({ ok: true, batch, items: enriched });
    } catch (e) {
      console.error('[ao/import/batches/id GET]', e);
      if (String(e.message || '').toLowerCase().includes('does not exist') && String(e.message || '').includes('ao_import_')) {
        return res.status(500).json({
          ok: false,
          error: 'Import inbox is not set up yet. Run database/ao_imports.sql in Supabase, then refresh.',
        });
      }
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  if (req.method === 'POST' && action === 'publish') {
    const { token, repo, branch } = getGitHubConfig();
    if (!token) {
      return res.status(400).json({
        ok: false,
        error: 'Publish is not configured (missing AO_GITHUB_TOKEN).',
      });
    }

    try {
      const { data: batch, error: batchErr } = await supabaseAdmin
        .from('ao_import_batches')
        .select('*')
        .eq('id', id)
        .single();
      if (batchErr) {
        if (batchErr.code === 'PGRST116') return res.status(404).json({ ok: false, error: 'Batch not found' });
        if (String(batchErr.message || '').includes('ao_import_batches')) {
          return res.status(500).json({
            ok: false,
            error: 'Import inbox is not set up yet. Run database/ao_imports.sql in Supabase, then retry.',
          });
        }
        return res.status(500).json({ ok: false, error: batchErr.message });
      }

      const { data: items, error: itemsErr } = await supabaseAdmin
        .from('ao_import_items')
        .select('*')
        .eq('batch_id', id)
        .order('created_at', { ascending: true });
      if (itemsErr) {
        if (String(itemsErr.message || '').includes('ao_import_items')) {
          return res.status(500).json({
            ok: false,
            error: 'Import inbox is not set up yet. Run database/ao_imports.sql in Supabase, then retry.',
          });
        }
        return res.status(500).json({ ok: false, error: itemsErr.message });
      }

      const validated = (items || []).filter((i) => i.status === 'validated');
      const rejected = (items || []).filter((i) => i.status !== 'validated');
      if (validated.length === 0) {
        return res.status(400).json({ ok: false, error: 'No validated items to publish', rejected_count: rejected.length });
      }

      const message = `AO Import: publish ${validated.length} devotional file(s) (batch ${id})`;
      const published = await publishBatchToGitHub({ token, repo, branch, items: validated, message });
      if (!published.ok) {
        await supabaseAdmin
          .from('ao_import_batches')
          .update({ status: 'failed', publish_error: published.error, updated_at: new Date().toISOString() })
          .eq('id', id);
        return res.status(500).json({ ok: false, error: published.error, details: published.details || null });
      }

      await supabaseAdmin
        .from('ao_import_batches')
        .update({
          status: 'published',
          publish_commit_sha: published.commitSha,
          publish_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      await supabaseAdmin
        .from('ao_import_items')
        .update({ status: 'published', updated_at: new Date().toISOString() })
        .eq('batch_id', id)
        .eq('status', 'validated');

      return res.status(200).json({ ok: true, commit_sha: published.commitSha, published_count: validated.length });
    } catch (e) {
      console.error('[ao/import/batches/id publish]', e);
      if (String(e.message || '').toLowerCase().includes('does not exist') && String(e.message || '').includes('ao_import_')) {
        return res.status(500).json({
          ok: false,
          error: 'Import inbox is not set up yet. Run database/ao_imports.sql in Supabase, then retry.',
        });
      }
      return res.status(500).json({ ok: false, error: e.message });
    }
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}

