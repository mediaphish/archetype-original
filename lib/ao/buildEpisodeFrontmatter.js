/**
 * YAML frontmatter for podcast episode markdown files.
 */

function yamlQuote(s) {
  return `"${String(s || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function yamlList(items) {
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!list.length) return '  []';
  return list.map((x) => `  - ${yamlQuote(x)}`).join('\n');
}

export function buildEpisodeFrontmatter(fields) {
  const {
    title,
    slug,
    publish_date,
    summary,
    episode_type = 'solo',
    duration = '',
    youtube_id = '',
    spotify_embed_url = '',
    categories = [],
    tags = [],
    show_notes = [],
    key_takeaways = [],
    related = [],
    guest = null,
    status = 'published',
    transcript = '',
  } = fields;

  const now = new Date().toISOString().split('T')[0];
  const pub = publish_date || now;

  let guestBlock = 'guest: null';
  if (guest && typeof guest === 'object' && guest.name) {
    const lines = [`  name: ${yamlQuote(guest.name)}`];
    if (guest.title) lines.push(`  title: ${yamlQuote(guest.title)}`);
    if (guest.bio) lines.push(`  bio: ${yamlQuote(guest.bio)}`);
    if (guest.initials) lines.push(`  initials: ${yamlQuote(guest.initials)}`);
    if (guest.image) lines.push(`  image: ${yamlQuote(guest.image)}`);
    guestBlock = `guest:\n${lines.join('\n')}`;
  }

  const transcriptBlock = transcript
    ? `transcript: |\n${String(transcript)
        .split('\n')
        .map((line) => `  ${line}`)
        .join('\n')}`
    : 'transcript: ""';

  return `---
title: ${yamlQuote(title)}
slug: ${slug}
status: ${status}
publish_date: ${pub}
episode_type: ${episode_type}
duration: ${yamlQuote(duration)}
youtube_id: ${yamlQuote(youtube_id)}
spotify_embed_url: ${yamlQuote(spotify_embed_url)}
summary: >-
  ${String(summary || '')
    .replace(/\n/g, '\n  ')}
categories:
${yamlList(categories)}
tags:
${yamlList(tags)}
show_notes:
${yamlList(show_notes)}
key_takeaways:
${yamlList(key_takeaways)}
related:
${related.length ? related.map((r) => `  - ${r}`).join('\n') : '  []'}
${guestBlock}
${transcriptBlock}
---`;
}

export function episodeTargetPath(slug) {
  const safe = String(slug || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return {
    safeSlug: safe,
    path: `ao-knowledge-hq-kit/journal/podcast/${safe}.md`,
    liveUrl: `https://www.archetypeoriginal.com/podcast/${safe}`,
  };
}
