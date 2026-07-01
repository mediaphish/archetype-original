/**
 * Write podcast guest corpus markdown files for guests with published episodes.
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const GUESTS_DIR = 'ao-knowledge-hq-kit/guests';

const GUEST_QUESTIONS = [
  "What's something people get wrong about you?",
  "Where are you right now that you didn't expect to be five years ago?",
  "What's a story from your life you think about more than people would guess?",
  'What are you into right now? Books, shows, hobbies, whatever.',
  'What else do you want us to know?',
];

function guestSlug(name, id) {
  const base = String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return base || String(id || '').slice(0, 8);
}

function yamlQuote(s) {
  return `"${String(s || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function buildGuestMarkdown(guest, episodeSlug) {
  const answers = [
    guest.question_1,
    guest.question_2,
    guest.question_3,
    guest.question_4,
    guest.question_5,
  ];

  let body = '';
  if (guest.bio_md) {
    body += `## Bio\n\n${guest.bio_md.trim()}\n\n`;
  }

  answers.forEach((answer, i) => {
    if (!String(answer || '').trim()) return;
    body += `## ${GUEST_QUESTIONS[i]}\n\n${String(answer).trim()}\n\n`;
  });

  if (guest.research_brief) {
    body += `## Research brief\n\n${String(guest.research_brief).trim()}\n\n`;
  }

  const slug = guestSlug(guest.name, guest.id);
  const company = guest.company || '';

  return {
    slug,
    content: `---
type: podcast-guest
title: ${yamlQuote(`${guest.name}${company ? ` — ${company}` : ''}`)}
slug: ${slug}
name: ${yamlQuote(guest.name)}
company: ${yamlQuote(company)}
episode_slug: ${episodeSlug}
status: published
tags:
  - podcast
  - guest
summary: >-
  Podcast guest intake and research for ${guest.name}${company ? ` (${company})` : ''}.
---

${body.trim()}
`,
  };
}

export async function syncPodcastGuestCorpusFiles() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.log('⏭️  Skipping podcast guest corpus sync (no Supabase credentials)');
    return { written: 0, skipped: true };
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: episodes, error: epErr } = await supabase
    .from('ao_episode_drafts')
    .select('guest_id, slug, status')
    .eq('status', 'published')
    .not('guest_id', 'is', null)
    .not('slug', 'is', null);

  if (epErr) {
    console.warn(`⚠️  Guest corpus sync failed (episodes): ${epErr.message}`);
    return { written: 0, error: epErr.message };
  }

  const guestEpisodeMap = new Map();
  for (const row of episodes || []) {
    if (!row.guest_id || !row.slug) continue;
    guestEpisodeMap.set(row.guest_id, row.slug);
  }

  if (!guestEpisodeMap.size) {
    console.log('📭 No published guest episodes for corpus sync');
    return { written: 0 };
  }

  const guestIds = [...guestEpisodeMap.keys()];
  const { data: guests, error: guestErr } = await supabase
    .from('ao_podcast_guests')
    .select(
      'id, name, company, bio_md, question_1, question_2, question_3, question_4, question_5, research_brief, release_agreed'
    )
    .in('id', guestIds)
    .eq('release_agreed', true);

  if (guestErr) {
    console.warn(`⚠️  Guest corpus sync failed (guests): ${guestErr.message}`);
    return { written: 0, error: guestErr.message };
  }

  fs.mkdirSync(GUESTS_DIR, { recursive: true });

  let written = 0;
  for (const guest of guests || []) {
    const episodeSlug = guestEpisodeMap.get(guest.id);
    if (!episodeSlug) continue;
    const { slug, content } = buildGuestMarkdown(guest, episodeSlug);
    const filePath = path.join(GUESTS_DIR, `${slug}.md`);
    fs.writeFileSync(filePath, content, 'utf8');
    written += 1;
    console.log(`✅ Guest corpus: ${guest.name} → ${filePath}`);
  }

  return { written };
}
