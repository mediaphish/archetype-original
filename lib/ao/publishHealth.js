/**
 * Did the post actually go live, and if not, why?
 *
 * 2026-09-21. Auto published "The Org Chart Only Works Until It's Tested". The
 * commit succeeded, so the tool reported success and handed Bart the URL. The
 * build then failed on a truncated summary, every deploy after it failed too,
 * and the page served the app shell while the captions Bart had posted by hand
 * pointed at it. Asked to fix it, Auto said it had no tool that could, and
 * stopped. Bart: "It needs to know when a post fails. It should have been able
 * to tell why and fix it."
 *
 * Publishing is three steps, and Auto could only see the first:
 *   1. commit the markdown to GitHub   (publish_journal did this)
 *   2. the site build runs             (this is what failed)
 *   3. the page is live
 *
 * Vercel reports every build back to the commit, so the same GitHub token that
 * publishes can read whether the build passed. The blocking checks run here too,
 * against the committed file, so the reason is named rather than guessed, and
 * the summary case repairs itself.
 */
import { isTruncatedSummary } from './postSummary.js';
import { readFrontMatterSummary, readBody, replaceFrontMatterSummary } from './postFrontMatter.js';
import { repairSummaryForPublish } from './publishSummaryGuard.js';

const GITHUB_API = 'https://api.github.com';
const REPO_OWNER = 'mediaphish';
const REPO_NAME = 'archetype-original';
const BRANCH = 'main';

const filePathFor = (slug, kind = 'journal') =>
  kind === 'devotional'
    ? `ao-knowledge-hq-kit/journal/devotionals/${slug}.md`
    : `ao-knowledge-hq-kit/journal/${slug}.md`;

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

/** The committed file, or null when the post never reached the repo. */
export async function fetchCommittedPost({ slug, kind = 'journal', token }) {
  const path = filePathFor(slug, kind);
  const res = await fetch(`${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}?ref=${BRANCH}`, {
    headers: headers(token),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub read failed (${res.status})`);
  const json = await res.json();
  return {
    path,
    file_sha: json.sha,
    markdown: Buffer.from(json.content || '', 'base64').toString('utf8'),
  };
}

/** The newest commit that touched the post. */
export async function latestCommitForPath({ path, token }) {
  const res = await fetch(
    `${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/commits?path=${encodeURIComponent(path)}&sha=${BRANCH}&per_page=1`,
    { headers: headers(token) }
  );
  if (!res.ok) return null;
  const [commit] = await res.json();
  if (!commit) return null;
  return { sha: commit.sha, message: commit.commit?.message || '', date: commit.commit?.committer?.date || null };
}

/**
 * What the build said about that commit. Vercel posts its result back to the
 * commit, so "failure" here means the site did not rebuild.
 */
export async function deployStateForCommit({ sha, token }) {
  const res = await fetch(`${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/commits/${sha}/status`, {
    headers: headers(token),
  });
  if (!res.ok) return { state: 'unknown', checks: [] };
  const json = await res.json();
  return {
    state: json.state || 'unknown', // success | failure | pending | error
    checks: (json.statuses || []).map((s) => ({
      context: s.context,
      state: s.state,
      description: s.description,
      url: s.target_url,
    })),
  };
}

/**
 * Blocking problems in the committed file, in the same terms the build uses.
 * Pure, so it is testable without the network.
 */
export function diagnoseMarkdown(markdown) {
  const problems = [];
  const summary = readFrontMatterSummary(markdown);

  if (!summary) {
    problems.push({
      check: 'verify-post-summaries',
      blocking: true,
      detail: 'the post has no summary in its front matter',
      repairable: true,
    });
  } else {
    const truncated = isTruncatedSummary(summary);
    if (truncated) {
      problems.push({ check: 'verify-post-summaries', blocking: true, detail: truncated, repairable: true });
    }
  }

  if (!readBody(markdown).trim()) {
    problems.push({ check: 'body', blocking: true, detail: 'the post body is empty', repairable: false });
  }

  return problems;
}

/** Rewrite the committed summary so it ends on a whole sentence, and commit it. */
export async function repairPublishedSummary({ slug, kind = 'journal', token }) {
  const file = await fetchCommittedPost({ slug, kind, token });
  if (!file) return { ok: false, error: `No committed file for "${slug}".` };

  const current = readFrontMatterSummary(file.markdown);
  const guard = repairSummaryForPublish({ summary: current, content: readBody(file.markdown) });
  if (!guard.repaired) return { ok: false, error: 'The committed summary is not the problem.' };

  const updated = replaceFrontMatterSummary(file.markdown, guard.summary);
  const res = await fetch(`${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${file.path}`, {
    method: 'PUT',
    headers: { ...headers(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `Fix truncated summary so the build can run: ${slug}`,
      content: Buffer.from(updated, 'utf8').toString('base64'),
      sha: file.file_sha,
      branch: BRANCH,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    return { ok: false, error: `GitHub commit failed (${res.status}) ${detail.slice(0, 200)}` };
  }
  const json = await res.json();
  return { ok: true, summary: guard.summary, commit_sha: json.commit?.sha || null, was: guard.reason };
}

/**
 * The whole picture: committed, built, live, and what to do next.
 *
 * @param {{ slug: string, kind?: string, token: string, isLive?: () => Promise<boolean>, fix?: boolean }} args
 */
export async function checkPublishHealth({ slug, kind = 'journal', token, isLive = null, fix = false }) {
  if (!token) return { ok: false, error: 'GITHUB_PUBLISH_TOKEN is not configured, so the build state cannot be read.' };

  const file = await fetchCommittedPost({ slug, kind, token });
  if (!file) {
    return {
      ok: true,
      slug,
      committed: false,
      live_on_site: false,
      deploy: null,
      problems: [],
      next_action: 'The post was never committed to the repository. Publish it.',
    };
  }

  const commit = await latestCommitForPath({ path: file.path, token });
  const deploy = commit ? await deployStateForCommit({ sha: commit.sha, token }) : { state: 'unknown', checks: [] };
  const live = typeof isLive === 'function' ? await isLive().catch(() => false) : null;
  let problems = diagnoseMarkdown(file.markdown);

  let repair = null;
  if (fix && problems.some((p) => p.repairable)) {
    repair = await repairPublishedSummary({ slug, kind, token });
    if (repair.ok) {
      const after = await fetchCommittedPost({ slug, kind, token });
      problems = after ? diagnoseMarkdown(after.markdown) : problems;
    }
  }

  const buildFailed = deploy.state === 'failure' || deploy.state === 'error';
  let next_action;
  if (live) {
    next_action = 'The post is live. Nothing to do.';
  } else if (problems.length) {
    next_action = repair?.ok
      ? 'The summary was repaired and committed. The site rebuilds in a few minutes; check again before telling Bart it is live.'
      : `The build cannot pass while this is true: ${problems.map((p) => p.detail).join('; ')}. Fix it, then check again.`;
  } else if (buildFailed) {
    next_action =
      'The post is committed but the site build failed for a reason outside this post. Tell Bart plainly that it is committed and not live, name the failing build, and do not claim the URL works.';
  } else {
    next_action =
      'The post is committed and the build has not finished. Wait for it and check again before telling Bart it is live.';
  }

  return {
    ok: true,
    slug,
    committed: true,
    commit_sha: commit?.sha || null,
    deploy_state: deploy.state,
    deploy_checks: deploy.checks,
    live_on_site: live,
    problems,
    repair,
    next_action,
  };
}
