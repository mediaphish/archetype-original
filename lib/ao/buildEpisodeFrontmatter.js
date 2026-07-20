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

function guestYamlLines(g, indent = '  ') {
  const lines = [`${indent}name: ${yamlQuote(g.name)}`];
  if (g.title) lines.push(`${indent}title: ${yamlQuote(g.title)}`);
  if (g.company) lines.push(`${indent}company: ${yamlQuote(g.company)}`);
  if (g.bio) lines.push(`${indent}bio: ${yamlQuote(g.bio)}`);
  if (g.initials) lines.push(`${indent}initials: ${yamlQuote(g.initials)}`);
  if (g.image) lines.push(`${indent}image: ${yamlQuote(g.image)}`);
  if (g.website) lines.push(`${indent}website: ${yamlQuote(g.website)}`);
  if (Array.isArray(g.social_links) && g.social_links.length) {
    lines.push(`${indent}social_links:`);
    for (const link of g.social_links) {
      if (!link?.platform || !link?.url) continue;
      lines.push(`${indent}  - platform: ${link.platform}`);
      lines.push(`${indent}    url: ${yamlQuote(link.url)}`);
    }
  }
  return lines;
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
    guests = [],
    status = 'published',
    transcript = '',
  } = fields;

  const now = new Date().toISOString().split('T')[0];
  const pub = publish_date || now;

  let guestBlock = 'guest: null';
  const guestsList = Array.isArray(guests) ? guests.filter((g) => g && g.name) : [];

  if (guestsList.length > 1) {
    // Multi-guest episode: emit a guests array. Also emit the first guest under
    // the singular `guest` key for backward compatibility with any code still
    // reading it directly.
    const blocks = guestsList.map((g) => {
      const lines = guestYamlLines(g, '    ');
      return `  - ${lines[0].trim()}\n${lines.slice(1).join('\n')}`;
    });
    guestBlock = `guests:\n${blocks.join('\n')}\nguest:\n${guestYamlLines(guestsList[0]).join('\n')}`;
  } else if (guestsList.length === 1) {
    guestBlock = `guest:\n${guestYamlLines(guestsList[0]).join('\n')}`;
  } else if (guest && typeof guest === 'object' && guest.name) {
    guestBlock = `guest:\n${guestYamlLines(guest).join('\n')}`;
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
