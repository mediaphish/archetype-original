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

function yamlJsonArray(key, items) {
  const list = Array.isArray(items) ? items : [];
  if (!list.length) return `${key}: []`;
  return `${key}: ${JSON.stringify(list)}`;
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
    spotify_episode_id = '',
    apple_podcasts_url = '',
    categories = [],
    tags = [],
    show_notes = [],
    key_takeaways = [],
    related = [],
    corpus_connections = [],
    thematic_threads = [],
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
    if (guest.company) lines.push(`  company: ${yamlQuote(guest.company)}`);
    if (guest.bio) lines.push(`  bio: ${yamlQuote(guest.bio)}`);
    if (guest.initials) lines.push(`  initials: ${yamlQuote(guest.initials)}`);
    if (guest.image) lines.push(`  image: ${yamlQuote(guest.image)}`);
    if (guest.website) lines.push(`  website: ${yamlQuote(guest.website)}`);
    if (Array.isArray(guest.social_links) && guest.social_links.length) {
      lines.push('  social_links:');
      for (const link of guest.social_links) {
        if (!link?.platform || !link?.url) continue;
        lines.push(`    - platform: ${link.platform}`);
        lines.push(`      url: ${yamlQuote(link.url)}`);
      }
    }
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
spotify_episode_id: ${yamlQuote(spotify_episode_id)}
apple_podcasts_url: ${yamlQuote(apple_podcasts_url)}
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
${yamlJsonArray('corpus_connections', corpus_connections)}
${yamlJsonArray('thematic_threads', thematic_threads)}
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
