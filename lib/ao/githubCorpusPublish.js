/**
 * Optional: commit a single markdown file via GitHub Contents API (requires repo scope token).
 */

/**
 * @param {{ path: string, content: string, message: string }} opts
 * @returns {Promise<{ ok: boolean, url?: string, error?: string }>}
 */
export async function pushMarkdownFileToGithub(opts) {
  const token = String(process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '').trim();
  const repo = String(process.env.GITHUB_REPO || '').trim();
  const branch = String(process.env.GITHUB_BRANCH || 'main').trim();

  if (!token || !repo) {
    return { ok: false, error: 'GitHub integration not configured.' };
  }

  const [owner, repoName] = repo.split('/').filter(Boolean);
  if (!owner || !repoName) {
    return { ok: false, error: 'GITHUB_REPO must be owner/name.' };
  }

  const path = String(opts.path || '').replace(/^\//, '');
  const content = String(opts.content || '');
  const message = String(opts.message || 'Add corpus piece from AO').slice(0, 200);

  const apiUrl = `https://api.github.com/repos/${owner}/${repoName}/contents/${encodeURIComponent(path)}`;

  let sha = null;
  try {
    const cur = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (cur.ok) {
      const j = await cur.json();
      sha = j.sha;
    }
  } catch (_) {
    /* file may not exist */
  }

  const body = {
    message,
    content: Buffer.from(content, 'utf8').toString('base64'),
    branch,
  };
  if (sha) body.sha = sha;

  const put = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const j = await put.json().catch(() => ({}));
  if (!put.ok) {
    return { ok: false, error: j.message || 'GitHub API error' };
  }
  return { ok: true, url: j.content?.html_url || j.commit?.html_url };
}
