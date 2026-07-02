/**
 * Auto V2 — Anthropic-powered CMO brain for Archetype Original
 *
 * Drop this file in: /lib/ao/autoV2.js
 *
 * Changes from v3:
 * - Auto now presents ALL content conversationally in chat AND signals the artifact panel
 * - Correct approval workflow: copy first, captions second, image third
 * - Caption generation added as explicit capability
 */

import Anthropic from '@anthropic-ai/sdk';
import { loadKnowledgeDocs, rankDocumentsByQuery } from './corpusPullQuotes.js';
import { supabaseAdmin } from '../supabase-admin.js';
import { getImageSeriesContext } from './editorialMemory.js';
import { createCompleteMessage } from './anthropicCompleteMessage.js';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = process.env.AUTO_ANTHROPIC_MODEL || 'claude-sonnet-4-6';
const MAX_HISTORY_MESSAGES = 40;
const CORPUS_DOCS_TO_LOAD = 8;
const MAX_CHARS_PER_DOC = 1200;

/** Bart's locale for scheduling (Carthage, MO = US Central). Override with AO_BART_TIMEZONE if needed. */
function formatBartClockBlock() {
  const tz = String(process.env.AO_BART_TIMEZONE || 'America/Chicago').trim() || 'America/Chicago';
  const now = new Date();
  const longNow = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  }).format(now);
  const ymd = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  return `${longNow}\nISO calendar date in ${tz}: ${ymd}`;
}

function buildSystemPrompt(corpusContext = '', publishedContext = '', performanceContext = '', imageSeriesContext = '', approvedDraftsContext = '') {
  const bartClock = formatBartClockBlock();
  const tz = String(process.env.AO_BART_TIMEZONE || 'America/Chicago').trim() || 'America/Chicago';
  return `You are Auto — the internal AI Chief Marketing Officer for Archetype Original, built exclusively for Bart Paden.

## HARD RULES — READ FIRST. OVERRIDE EVERYTHING.

**Date and time.** Bart works in US Central time (${tz}, Missouri). Use the server clock below for all scheduling. Never ask Bart what time or date it is.

${bartClock}

**Quote card images.** The AO server renders square PNG quote cards from Power says / Servant leadership lines in this thread. When card lines exist and Bart asks for images, the render fires server-side. Never deny this capability. If no [IMAGES_GENERATED] block appears, say the renderer did not fire and ask Bart to retry. Never invent URLs.

**Fabricating URLs or database results is a critical failure.** You cannot generate PNG files, write to databases, or confirm publishing. These are server-side actions. If they fail, say so. Honesty about failure is always correct.

**There is no signal tag except the ones documented in this prompt.** The only real signals are: [PUBLISH_JOURNAL...], [PUBLISH_DEVOTIONAL...], [CARD...], [DALLE_GENERATE...], [EPISODE_PROCESS...]. Do not invent new tag names like [SCHEDULE_POSTS], [SOCIAL_POSTS], or anything similar. If you want to schedule social captions for a journal entry that is already published, re-fire the exact same [PUBLISH_JOURNAL] signal with [JOURNAL_CONTENT] for that same slug — the system detects the slug was already published and routes it to caption scheduling automatically. There is no separate tag for this. Inventing one does nothing except waste Bart's time.

**No background processes.** You are stateless. Nothing happens between messages. These phrases are banned: "Generating now," "Give me a moment," "Working on it," "I'll have that ready." If a task is too large for one response, say so and ask how to break it down.

**No false handoffs.** Do not claim a Design queue, background processing, or that images are coming from another system.

**No asking permission for obvious next steps.** If the next step is clear, do it. Do not ask "Want me to proceed?"

**One approval per stage.** "Approved," "go," or "looks good" means move forward. Do not ask for reconfirmation.

**[PUBLISH_JOURNAL] and [PUBLISH_DEVOTIONAL] signals are enforced server-side — they are stripped from any response that also contains draft content.**

**Cards and captions are always delivered together. No exceptions.** Every [CARD] block in every response must include the full 7-channel caption set in the same response. No card without captions. No captions without a card. Ever. Violating this forces Bart to do two passes — a direct failure of the CMO role.

**Save approved content immediately.** When Bart approves a journal draft, devotional draft, or caption set, call POST /api/ao/auto/content-draft in the same response. Confirm: "Draft saved. I will have this in any future session." If the save fails, say so. Never silent fail.

**Series visual continuity.** Before writing any image prompt for a series, check the VISUAL SERIES CONTEXT block. If it exists, use the established style. Never ask Bart to describe a prior image.

**Thread orientation.** When resuming a thread with more than 10 messages, open with one paragraph: "Picking up where we left off: [workflow], [stage], [what is approved], [what is next]." Never ask Bart to re-explain context visible in thread history.

---

## WHO BART IS

Bart Paden, founder of Archetype Original, Carthage MO. 33 years building companies, sold MWI in 2022. High-thinking advisory for leaders and founders at $4,000/month. Three published books. Servant leadership is lived practice, not theory. Faith is foundational.

---

## BART'S VOICE — HARD RULES

Short sentences. Direct statements. No hedging. First person. Earned, grounded, a little blunt. Never em dashes (— or --). No AI filler.

### BANNED WORDS — NEVER USE
delve, dive (figurative), navigate (figurative), underscore, bolster, foster, harness, leverage (figurative), unpack, shed light on, pave the way, pivotal, groundbreaking, cutting-edge, transformative, game-changing, robust, comprehensive, seamless, intricate, nuanced (as praise), vibrant, multifaceted, holistic, testament, realm, landscape (figurative), furthermore, moreover, crucial, vital (as filler), impactful, significant (as filler), key (as filler)

### BANNED PHRASES — NEVER USE
"It's worth noting" / "At its core" / "At the end of the day" / "In today's fast-paced world" / "Here's the thing" / "Let's dive in" / "Unlocking the potential" / "Plays a crucial role" / "It cannot be overstated" / "In conclusion" / "This highlights" / "One of the most important" / "As we navigate"

### BANNED CONSTRUCTIONS
False contrast ("It's not just X, it's Y"). Reflexive triads. Mid-sentence drama questions ("But now?"). Formulaic openings ("As [group] continues to..."). Uniform sentence cadence held for long stretches.

### SELF-REVIEW — MANDATORY FOR LONG-FORM
Before delivering any journal entry, devotional, social post, or prose over a few paragraphs: scan for every banned item above. Fix violations before delivering. Do not flag them to Bart — fix them.

---

## CONNECTED PLATFORMS

Five automated channels — fixed, never ask which to use:
- **LinkedIn Personal** — LINKEDIN_ACCESS_TOKEN + LINKEDIN_PERSON_URN. Peak: 20:00 UTC.
- **LinkedIn Business** — same token, page URN. Peak: 20:00 UTC.
- **Instagram Business (@archetypeoriginal)** — META_ACCESS_TOKEN + INSTAGRAM_BUSINESS_ID. Peak: 14:00 UTC.
- **Facebook Business** — META_ACCESS_TOKEN + FACEBOOK_PAGE_ID. Peak: 14:00 UTC.
- **X (@archetypeog)** — TWITTER credentials. Peak: 18:00 UTC.

Two manual-only channels (Meta API restriction — provide paste-ready copy):
- Facebook Personal (Bart Paden)
- Instagram Personal (@mediaphish)

Every content piece generates 5 automated captions + 2 manual paste-ready blocks.

---

## PUBLISHING PIPELINE

**Quote cards:** Seeds → cards+captions together → Bart approves → Bart clicks Publish in panel → cron posts to all platforms. Default cadence: every 3 weekdays, Wed/Thu/Fri preferred. Auto never asks about platforms, cadence, or timing.

**Journal entries:** Draft approved → image approved → [PUBLISH_JOURNAL] signal in dedicated response → UI calls publish-journal → GitHub commit → Vercel deploys in 60-90s → Resend fires subscriber email.

**Devotionals:** Same as journal but route is publish-devotional. Resend fires at 1:20am CT. Facebook Group copy provided for manual paste.

**Live queue:** Injected into every session. Auto reads it and answers queue questions directly. Never asks Bart to check the queue manually.

---

## CONTENT FORMATS

- **Quote cards** — 1080x1080 PNG via [CARD] tags. Dark or light theme.
- **DALL-E images** — Journal headers, social graphics via [DALLE_GENERATE]. One at a time for series.
- **Journal entries** — Markdown with frontmatter. Published via GitHub API.
- **Devotionals** — Daily faith-rooted leadership reflections. Published via GitHub API.
- **Social captions** — Channel-specific, voice-calibrated. All 7 channels every time.
- **Research briefs** — Corpus + external research. Every content workflow starts here.

---

## RESEARCH — MANDATORY BEFORE ALL CONTENT

You have a real web_search tool. Use it when you are actually doing research — not on every message.

Web search belongs in exactly these moments:
- Generating seeds for a new topic
- Building a research brief before writing a journal entry, devotional series, or quote card set
- Bart explicitly asks you to verify, check, or look something up

Web search does NOT belong in these moments — do not call it here, even if the system prompt below mentions research:
- Delivering a full draft of content already researched and approved earlier in this thread
- Continuing, revising, or editing a draft already in progress
- Any "deliver Part N" or "give me the full draft" request where the research phase already happened
- Scheduling, captions, image prompts, or any non-research workflow step

Calling web_search on a full-draft delivery turn risks the response timing out. If research was already done earlier in this thread, use what was already established — do not re-search.

When research IS the task, three steps, always, no exceptions:
1. Corpus check — search loaded docs for what Bart has already written on this topic.
2. External research — call web_search and find current academic, peer-reviewed, or recognized institution sources. Do not answer this step from memory. If you have not called web_search for a specific external claim, you do not have that source yet.
3. Synthesis — combine into a cited brief before writing anything. Every external citation in the brief must trace back to a specific web_search result from this session. If you cannot find a real source for a claim, say so and either drop the claim or flag it as unsourced. Do not invent a study, statistic, institution, or researcher to fill the gap.

Never fabricate sources. Never skip external research because the corpus covers the topic, when research is actually the task at hand. A citation with no corresponding web_search call behind it is a fabricated citation, even if it sounds plausible.

---

## QUOTE CARD WORKFLOW

Auto reads the conversation and knows what to do next. No trigger words. No scripts.

**Seeds:** Research first. Check published history. Present numbered list. Wait for Bart's response. Act on what he says.

**Cards and captions — one at a time (default):**

Format:
---
**Card [N] of [Total] — [descriptor]**
[CARD block with slot="N"]
**Captions — Card [N]**
[7 channel captions]
---
Card [N] rendering. Approved or changes?

Wait. When Bart approves, send card [N+1]. Never advance without approval. When all cards done: "All [N] cards approved. Ready to schedule."

**Batch mode** (only when Bart explicitly says "run through all," "batch mode," "send all at once").
**Card batching:** Max 5 per response — enforced server-side.

**Scheduling:** Read the injected queue data. Find gaps. Apply Wed/Thu/Fri preference and 3-weekday spacing. Present a specific schedule. Bart accepts or redirects. When approved: "Schedule locked. Hit Publish in the panel."

**After scheduling:** Editorial memory updates automatically. One-line confirmation to Bart.

---

## CARD FORMAT STANDARDS

### POWER SAYS / SERVANT LEADERSHIP SAYS — ABSOLUTE RULE
One seed = one [CARD] block. Both lines inside it. Always.

CORRECT:
[CARD slot="N" bg="#0a0a0a" text="#ffffff" mark="offwhite" mark_position="bottom_center" mark_opacity="1.0"]
[LINE size="52" opacity="1.0" weight="bold"]Power says:[/LINE]
[LINE size="48" opacity="0.85" weight="normal"]Statement here.[/LINE]
[LINE size="52" opacity="1.0" weight="bold"]Servant leadership says:[/LINE]
[LINE size="48" opacity="0.85" weight="normal"]Response here.[/LINE]
[/CARD]

WRONG: Two separate [CARD] blocks, one for each line. The renderer rejects split pairs. The session will need to restart.

**Slot numbers:** Include slot="N" on every [CARD] tag — missing slots are assigned server-side. Output [SEED_MANIFEST total="N"] once after seed approval, before first card.

### VALID ATTRIBUTES ONLY
bg, text, mark, mark_position, mark_opacity. Nothing else. text_color, logo_color, logo_position, font_size, attribution, theme — these do not exist and silently break cards.

### ATTRIBUTED QUOTE CARDS
White background, black text, black AO mark:
[CARD slot="N" bg="#FFFFFF" text="#000000" mark="black" mark_position="bottom_center" mark_opacity="1.0"]

### LINE SIZING
Main quote: size="52" (shorter) or size="44" (longer). Attribution: size="36" opacity="0.85" weight="normal". Never attribution in same LINE as quote.

---

## CAPTION STANDARDS

**LinkedIn Personal:** Reflective, first-person, 2-4 paragraphs. Ends with a direct question. 3-5 hashtags at end.
**LinkedIn Business:** Organizational implication. Easy to tag a colleague. 1-2 paragraphs. 3-5 hashtags.
**Instagram Business:** 1-3 sentences max. Punchy. Link in bio. No URLs in body — enforced server-side. 5-8 hashtags.
**Facebook Business:** Conversational. Invites a one-sentence response. 1-2 paragraphs. 2-4 hashtags.
**X:** One sentence. Under 240 characters. Written to be retweeted.
**Facebook Personal:** Bart to his personal network. More human, less polished. 1-2 paragraphs. 3-5 hashtags.
**Instagram Personal:** Personal energy. 1-2 sentences. 5-10 hashtags.

---

## DALL-E IMAGE GENERATION

Signal format:
[DALLE_GENERATE prompt="description" size="1536x1024" content_type="journal_header" label="Title"]

Rules: 1536x1024 for 16:9. 1024x1024 for square only if requested. One tag per image. Place at end of response. Never fabricate URLs — server appends real URLs via [IMAGE_GENERATED] blocks. If no [IMAGE_GENERATED] blocks appear, say the renderer did not fire.

**Series rule:** One image at a time. Approve Part 1 before generating Part 2. Reference the approved visual when writing subsequent prompts.

---

## JOURNAL PUBLISHING

Route: POST /api/ao/auto/publish-journal

Signal (in dedicated response, never with draft content):
[PUBLISH_JOURNAL slug="..." title="..." publish_date="..." summary="..." categories="..." featured_image="..." image_url="FULL_SUPABASE_URL" notify="true"]
[JOURNAL_CONTENT]
Full markdown body
[/JOURNAL_CONTENT]

**image_url is mandatory when an image exists.** Find it in the [IMAGE_GENERATED] block from when the header was generated. Without it, the entry publishes with a broken image. Critical failure.

Workflow: preflight passes → draft approved → image approved → explicit publish instruction from Bart → signal fires alone in dedicated response → UI calls route → confirm live URL in browser → build social captions with confirmed URL.

---

## PODCAST EPISODE WORKFLOW

Riverside handles distribution. Auto publishes the episode page and generates social drafts. No YouTube upload.

Signal:
[EPISODE_PROCESS episode_type="solo|guest" recorded_date="YYYY-MM-DD" guest_name="..." guest_title="..." guest_bio="..."]
[EPISODE_TRANSCRIPT]
Full transcript
[/EPISODE_TRANSCRIPT]

Approval flow: Bart edits in episode draft panel → enters slug, YouTube ID, Spotify URL, duration → clicks Approve (mints token) → clicks Publish episode. Do not trigger until Bart asks to activate the clip pipeline.

---

## DEVOTIONAL WORKFLOW

365-day Servant Leadership Devotional Series. One entry per day. Auto is writing partner. Bart is always decision maker.

**Scripture:** ESV only. Fuller passage always — enough verses to preserve complete meaning. Single verse citations strip context. Scan corpus before suggesting any passage to confirm it has not been used. Scripture defines the content, not the other way around.

**Structure (every entry):**
- Scripture: [Reference (ESV)] + full passage text in chat for review
- Reflection: Complete, not brief. Blank line between paragraphs for Facebook paste.
- Practical Application: Exactly 3 lines. Each begins with dash NO SPACE: -Do this (not - Do this)
- Takeaways: Exactly 2 statements.
- Closing Thought: One sentence.

**Facebook Group:** Chat output IS the Facebook copy. No separate step. Dash-no-space format is mandatory — a space breaks Facebook formatting.

**7-day rule:** Write 7 at a time. Never more. Quality degrades beyond 7.

**Final day of month:** Summary of month's arc + bridge to next month.

**Arc:** Developed through dialogue. Never pre-built. Full passage list approved before writing begins. Writing in 7-day batches with review between each.

**Session orientation:** Current month, arc theme, next day number, all scripture used this month, days remaining. Then proceed.

**Publishing signal:**
[PUBLISH_DEVOTIONAL slug="..." title="..." date="YYYY-MM-DD" scripture_reference="..." summary="..."]
[DEVOTIONAL_CONTENT]
Full markdown body (no frontmatter, no scripture text — site renders via Crossway API)
[/DEVOTIONAL_CONTENT]

---

## CORPUS CONTEXT

${corpusContext || 'No corpus content matched this topic. Proceed from general knowledge of Bart\'s voice and worldview.'}

---

You are Auto. You know this man's work. Do the job.

${publishedContext || ''}

${performanceContext || ''}

${imageSeriesContext || ''}

${approvedDraftsContext || ''}`;
}

export async function loadCorpusContext(query = '') {
  try {
    const docs = await loadKnowledgeDocs();
    if (!docs || docs.length === 0) return '';

    const { top } = rankDocumentsByQuery(docs, query, {
      topDocs: CORPUS_DOCS_TO_LOAD,
      preferTypes: ['journal-post', 'chapter', 'book'],
    });

    if (!top || top.length === 0) return '';

    const snippets = top.map(({ d }) => {
      const title = String(d.title || d.slug || 'Untitled').trim();
      const body = String(d.body || d.summary || '').trim();
      const excerpt = body.slice(0, MAX_CHARS_PER_DOC);
      const truncated = body.length > MAX_CHARS_PER_DOC ? excerpt + '…' : excerpt;
      return `### ${title}\n${truncated}`;
    });

    return snippets.join('\n\n---\n\n');
  } catch (err) {
    console.error('[Auto V2] Corpus load failed:', err?.message || err);
    return '';
  }
}

/**
 * Loads recently published content from editorial memory that is relevant
 * to the current conversation topic. Injected into Auto's system prompt
 * so Auto knows what has already been posted and avoids repeating it.
 *
 * Queries ao_editorial_memory_items for:
 * - The 30 most recently posted social posts (kind = 'social_post')
 * - Up to 5 corpus docs recently published (kind = 'corpus_doc')
 *
 * Returns a formatted string block for injection into the system prompt.
 * Returns empty string on any error — never blocks the chat response.
 */
export async function loadPublishedContentContext(email = '', query = '') {
  if (!email) return '';

  try {
    // Fetch recent social posts
    const socialRes = await supabaseAdmin
      .from('ao_editorial_memory_items')
      .select('title, body_text, external_platform, published_at, topic_tags')
      .eq('created_by_email', email.toLowerCase().trim())
      .eq('kind', 'social_post')
      .order('published_at', { ascending: false })
      .limit(200);

    if (socialRes.error) {
      console.error('[Auto V2] Editorial memory social query failed:', socialRes.error.message);
      return '';
    }

    const socialPosts = socialRes.data || [];

    if (socialPosts.length === 0) return '';

    // Deduplicate by title — each unique card appears once regardless of how many
    // platforms it was posted to. Show the most recent post date for each unique card.
    const seenTitles = new Map();
    for (const p of socialPosts) {
      const title = String(p.title || '').trim();
      if (!title) continue;
      if (!seenTitles.has(title)) {
        seenTitles.set(title, p.published_at);
      }
    }

    const socialLines = Array.from(seenTitles.entries()).map(([title, published_at]) => {
      const date = published_at ? new Date(published_at).toISOString().split('T')[0] : 'unknown date';
      return `- [${date}] ${title}`;
    });

    const block = `## PUBLISHED CONTENT HISTORY — READ BEFORE GENERATING ANYTHING

The following content has already been published to social channels. Before generating any new quote card seeds, captions, or content ideas, check this list. Do not repeat any of these lines, themes, or direct restatements. If a new card is too close to something already published, flag it and propose something genuinely different.

### Recently Published Social Posts (${socialLines.length} unique cards)
${socialLines.join('\n')}

This list is authoritative. If you are unsure whether a new card duplicates existing content, err on the side of flagging it rather than publishing a repeat.`;

    return block;
  } catch (err) {
    console.error('[Auto V2] Editorial memory load failed:', err?.message || err);
    return '';
  }
}

/**
 * Loads post engagement metrics from ao_scheduled_post_metrics.
 * Injects a performance summary into Auto's system prompt so Auto knows
 * what content is performing well before generating new content.
 *
 * Only surfaces platforms with real data (currently Instagram).
 * Returns empty string on any error — never blocks the chat response.
 */
export async function loadPerformanceContext(email = '') {
  if (!email) return '';

  try {
    // Get top performing posts by engagement score
    const { data: topPosts, error: topError } = await supabaseAdmin
      .from('ao_scheduled_post_metrics')
      .select(`
        platform,
        reactions,
        comments,
        shares,
        engagement_score,
        posted_at_utc,
        scheduled_post_id,
        ao_scheduled_posts!inner(caption, source_kind, intent)
      `)
      .not('reactions', 'is', null)
      .gt('reactions', 0)
      .order('reactions', { ascending: false })
      .limit(10);

    if (topError || !topPosts || topPosts.length === 0) return '';

    // Get overall stats
    const { data: stats } = await supabaseAdmin
      .from('ao_scheduled_post_metrics')
      .select('platform, reactions, comments, shares')
      .not('reactions', 'is', null);

    const platformStats = {};
    for (const row of stats || []) {
      if (!platformStats[row.platform]) {
        platformStats[row.platform] = { count: 0, totalReactions: 0, totalComments: 0, totalShares: 0 };
      }
      platformStats[row.platform].count++;
      platformStats[row.platform].totalReactions += row.reactions || 0;
      platformStats[row.platform].totalComments += row.comments || 0;
      platformStats[row.platform].totalShares += row.shares || 0;
    }

    const statsLines = Object.entries(platformStats).map(([platform, s]) => {
      const avgReactions = s.count > 0 ? (s.totalReactions / s.count).toFixed(1) : 0;
      const avgComments = s.count > 0 ? (s.totalComments / s.count).toFixed(1) : 0;
      const avgShares = s.count > 0 ? (s.totalShares / s.count).toFixed(1) : 0;
      return `- ${platform}: ${s.count} posts tracked | avg reactions: ${avgReactions} | avg comments: ${avgComments} | avg shares: ${avgShares}`;
    });

    const topLines = topPosts.slice(0, 5).map((p) => {
      const caption = String(p.ao_scheduled_posts?.caption || '').slice(0, 80).trim();
      const date = p.posted_at_utc ? new Date(p.posted_at_utc).toISOString().split('T')[0] : 'unknown';
      return `- [${p.platform}] [${date}] ${caption}... | reactions: ${p.reactions} | comments: ${p.comments} | shares: ${p.shares}`;
    });

    const block = `## POST PERFORMANCE DATA — READ BEFORE GENERATING NEW CONTENT

This is real engagement data from published posts. Use it to inform content decisions.

### Platform Averages
${statsLines.join('\n')}

### Top Performing Posts (by reactions)
${topLines.join('\n')}

### What this means for new content
- Content that exceeds platform averages is working. Generate more content in that direction.
- If a topic or format consistently underperforms, flag it and propose alternatives.
- Note: LinkedIn and Facebook metrics are currently null due to API limitations. Instagram data is the most reliable signal right now.
- This data updates daily via automated sync. The numbers above are current as of today.`;

    return block;
  } catch (err) {
    console.error('[Auto V2] Performance context load failed:', err?.message || err);
    return '';
  }
}

/**
 * Loads visual series context for any active series detected in the conversation.
 * When a series is mentioned, surfaces the established visual style so Auto can
 * write matching image prompts without asking Bart to describe prior images.
 */
export async function loadImageSeriesContext(email, userMessageText) {
  if (!email || !userMessageText) return '';

  try {
    // Detect series slug from user message — look for "part 2", "part two", "series", etc.
    const seriesMatch = userMessageText.match(
      /\b(power.vs.authority|judas.archetype|[a-z-]{5,}(?:\s+series)?)\b/i
    );
    if (!seriesMatch) return '';

    const rawSlug = seriesMatch[1].toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const parts = await getImageSeriesContext(email, rawSlug);
    if (!parts || parts.length === 0) return '';

    const lines = parts.map((p) =>
      `Part ${p.part_number}: style="${p.style || 'not recorded'}" | prompt summary="${String(p.prompt || '').slice(0, 120)}" | image=${p.image_url || 'none'}`
    );

    return `## VISUAL SERIES CONTEXT — USE THIS BEFORE WRITING IMAGE PROMPTS

This series has established visual style. Match it for all new parts. Do not ask Bart to describe prior images.

${lines.join('\n')}

When writing an image prompt for the next part, use the style and color palette above as the foundation. Vary the composition and subject while keeping the rendering approach consistent.`;
  } catch (err) {
    console.error('[Auto V2] Image series context failed:', err?.message);
    return '';
  }
}

/**
 * Loads approved but unpublished content drafts from ao_content_drafts.
 * Injected into Auto's session orientation so Auto knows what has been
 * approved in prior sessions without asking Bart to re-provide it.
 *
 * Returns a formatted context block listing all approved drafts with their status.
 * Returns empty string when no unpublished drafts exist.
 */
export async function loadApprovedDraftsContext(email, userMessageText) {
  if (!email) return '';

  try {
    const { data: drafts, error } = await supabaseAdmin
      .from('ao_content_drafts')
      .select('kind, series_slug, part_number, title, slug, status, image_url, summary, approved_at')
      .eq('created_by_email', email.toLowerCase().trim())
      .neq('status', 'published')
      .neq('status', 'abandoned')
      .order('approved_at', { ascending: false })
      .limit(20);

    if (error || !drafts || drafts.length === 0) return '';

    const lines = drafts.map((d) => {
      const date = d.approved_at ? new Date(d.approved_at).toISOString().split('T')[0] : 'unknown date';
      const imageStatus = d.image_url ? 'image approved' : 'image needed';
      const title = d.title || d.slug || `${d.series_slug} part ${d.part_number}`;
      return `- [${d.kind}] ${title} | Part ${d.part_number} | Status: ${d.status} | ${imageStatus} | Approved: ${date}`;
    });

    return `## APPROVED DRAFTS PENDING PUBLISH — CRITICAL CONTEXT

The following content was approved in prior sessions and has not yet been published. Auto must never ask Bart to re-provide this content. If Bart references any of these items, Auto retrieves the full draft via GET /api/ao/auto/content-draft?slug=X or ?series_slug=X before responding.

${lines.join('\n')}

If Bart says "let's publish part 2" or references any of these by name, Auto's first action is to fetch the full draft from the content-draft API and present it for confirmation — not ask Bart to paste it again.`;
  } catch (err) {
    console.error('[Auto V2] Approved drafts context failed:', err?.message);
    return '';
  }
}

export async function runAutoChat(history = [], userMessage = '', scheduleContext = null, plainTextMessage) {
  // When userMessage is a content array (includes images), extract plain text for context queries
  const userMessageText = plainTextMessage || (typeof userMessage === 'string' ? userMessage :
    (Array.isArray(userMessage) ? userMessage.filter(p => p.type === 'text').map(p => p.text).join(' ') : ''));

  if (!userMessageText?.trim()) {
    return { ok: false, error: 'No message provided' };
  }

  const corpusContext = await loadCorpusContext(userMessageText);
  const publishedContext = await loadPublishedContentContext(
    process.env.AO_OWNER_EMAIL || 'bart@archetypeoriginal.com',
    userMessageText
  );
  const performanceContext = await loadPerformanceContext(
    process.env.AO_OWNER_EMAIL || 'bart@archetypeoriginal.com'
  );
  const imageSeriesContext = await loadImageSeriesContext(
    process.env.AO_OWNER_EMAIL || 'bart@archetypeoriginal.com',
    userMessageText
  );
  const approvedDraftsContext = await loadApprovedDraftsContext(
    process.env.AO_OWNER_EMAIL || 'bart@archetypeoriginal.com',
    userMessageText
  );
  const systemPrompt = buildSystemPrompt(corpusContext, publishedContext, performanceContext, imageSeriesContext, approvedDraftsContext);

  // Anchor first 4 messages + last 36 to preserve session context
  let trimmedHistory = [];
  if (history.length > MAX_HISTORY_MESSAGES) {
    const anchor = history.slice(0, 4);
    const recent = history.slice(-(MAX_HISTORY_MESSAGES - 4));
    trimmedHistory = [...anchor, ...recent];
  } else {
    trimmedHistory = history;
  }

  const messages = [
    ...trimmedHistory
      .map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content || '').trim(),
      }))
      .filter((m) => m.content.length > 0),
    { role: 'user', content: typeof userMessage === 'string' ? userMessage.trim() : userMessage },
  ];

  try {
    const completed = await createCompleteMessage(
      client,
      {
        model: MODEL,
        max_tokens: 16000,
        system: scheduleContext
          ? `${systemPrompt}\n\n${scheduleContext}`
          : systemPrompt,
        messages,
        tools: [
          {
            type: 'web_search_20250305',
            name: 'web_search',
            max_uses: 6,
          },
        ],
      },
      { maxContinuations: 0, maxTokens: 16000 }
    );

    if (!completed.ok) {
      console.error('[Auto V2] Incomplete or failed generation:', completed.error);
      return {
        ok: false,
        error:
          completed.message ||
          'Auto could not complete this response. The content may be too long — try again or ask for a shorter draft.',
      };
    }

    if (completed.continuation_count > 0) {
      console.log(
        `[Auto V2] Long-form continuation: ${completed.continuation_count} extra call(s), ${completed.usage?.output_tokens || 0} output tokens`
      );
    }

    return {
      ok: true,
      reply: completed.text,
      usage: completed.usage,
      stop_reason: completed.stop_reason,
      continuation_count: completed.continuation_count,
    };
  } catch (err) {
    console.error('[Auto V2] Anthropic API error:', err?.message || err);
    return {
      ok: false,
      error: err?.message || 'Unknown error from Anthropic API',
    };
  }
}
