/**
 * Which draft a draft artifact is.
 *
 * Found 2026-09-13: the staged tabs shipped and never appeared. They engage only
 * when the panel can identify the draft, and the only identification it had was
 * a slug in YAML front matter. Auto-written drafts have none. Every Cain artifact
 * in the thread was `[ARTIFACT type="draft" label="The Cain Archetype"]` over a
 * body opening "*The Archetype Series, Entry Ten*". Show changes had the same
 * blind spot, because DraftArtifact used the same front-matter-only lookup.
 *
 * Order of trust:
 *   1. slug on the tag, which the server now writes from the real save
 *   2. slug in front matter, for pasted drafts that carry it
 *   3. the label turned into a slug, for every message written before (1)
 *
 * (3) is a guess. It is only ever used to ask the server for that draft, and the
 * staged panel shows nothing new unless the server confirms the draft exists.
 */
import { extractSlugFromDraftContent } from './draftDiff.js';

/** Same rule as canonicalizeSlug in lib/ao/getScheduleStatus.js. */
export function slugifyTitle(title) {
  return String(title || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function resolveDraftArtifactSlug(artifact) {
  if (!artifact || String(artifact.type || '') !== 'draft') return null;

  const fromTag = String(artifact.slug || '').trim();
  if (fromTag) return fromTag;

  const fromFrontMatter = extractSlugFromDraftContent(artifact.content);
  if (fromFrontMatter) return fromFrontMatter;

  // parseArtifact defaults a missing label to "Artifact". That is not a title.
  const label = String(artifact.label || '').trim();
  if (!label || label === 'Artifact') return null;
  return slugifyTitle(label) || null;
}
