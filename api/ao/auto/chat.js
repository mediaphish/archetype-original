import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { getOpenAiKey } from '../../../lib/openaiKey.js';
import { ensureAutoThread, getAutoThreadState, addAutoMessage, listGuardrails, searchBundles, detectAutoMode } from '../../../lib/ao/autoHub.js';
import { buildAutoBundle, detectQualityAlarm } from '../../../lib/ao/autoBundle.js';
import { getCorpusPullQuotes, getCorpusTopicSnippets } from '../../../lib/ao/corpusPullQuotes.js';
import { renderQuoteCardSvg } from '../../../lib/ao/quoteCardDesigner.js';
import { getDefaultLogoUrl } from '../../../lib/ao/brandLogos.js';
import { inlineLogoForQuoteCardSvg } from '../../../lib/ao/remoteAssetDataUrl.js';
import { generatePullQuoteCaptionsForQuotes } from '../../../lib/ao/pullQuoteCaptions.js';
import {
  proposeQuoteCardTimes,
  executeQuoteCardSchedule,
  formatQuoteCardPublishPlan,
  buildQuoteCardPublishContext,
} from '../../../lib/ao/publishWizardQuoteCards.js';
import { messageForDevotionalOrSeriesPublish } from '../../../lib/ao/publishContentTypes.js';
import { normalizePublishCandidate } from '../../../lib/ao/publishQueueSchema.js';
import { uploadQuoteCardSvgToPublicUrl } from '../../../lib/ao/quoteCardImageUrl.js';
import { buildCorpusTldrMarkdown, buildCorpusOutlineMarkdown } from '../../../lib/ao/corpusTldrReport.js';

function safeText(v, maxLen = 0) {
  const s = String(v || '').trim();
  if (!s) return '';
  return maxLen ? s.slice(0, maxLen) : s;
}

function cleanChannels(arr) {
  const allowed = new Set(['linkedin', 'facebook', 'instagram', 'x']);
  const out = [];
  for (const item of Array.isArray(arr) ? arr : []) {
    const s = String(item || '').trim().toLowerCase();
    if (!allowed.has(s)) continue;
    if (!out.includes(s)) out.push(s);
  }
  return out.length ? out : ['linkedin', 'facebook', 'instagram', 'x'];
}

function looksLikeContent(text) {
  const s = String(text || '').trim();
  return s.length >= 120 || s.includes('\n\n');
}

function impliesNoRefine(text) {
  const s = String(text || '');
  return /\bdon'?t refine\b|\bdo not refine\b|\bnot refining\b|\bno more edits\b|\bfinished (?:my )?(?:post|draft)\b|\bthis is (?:my )?final\b|\bdo not edit (?:the )?post\b|\bi'?m not refining\b/i.test(s);
}

/**
 * Planning, design, or collaboration — do NOT treat as a finished post to package.
 * (Long “I need to…” messages were incorrectly forced into Packaging before.)
 */
function looksLikePlanningOrDiscussionRequest(text) {
  const s = String(text || '').trim().toLowerCase();
  if (!s) return false;
  if (/\?/.test(s)) return true;
  const patterns = [
    /\bhelp me (plan|design|figure|think|brainstorm|decide)\b/,
    /\bcan you help\b/,
    /\bcould we\b.*\b(plan|talk|design)\b/,
    /\bneed to (talk|plan|figure|brainstorm|explore|discuss|think through)\b/,
    /\blet'?s (plan|talk|discuss|figure|brainstorm|design|work on)\b/,
    /\bwe need to (talk|spend time|plan|figure)\b/,
    /\btalk (?:it )?through\b/,
    /\bbrainstorm\b/,
    /\bwork with me\b/,
    /\b(collaborat|together)\b.*\b(plan|design)\b/,
    /\bnot what I wanted\b/,
    /\bis that not part\b/,
    /\bneed to see them\b/,
    /\b(spend time|take time)\b.*\b(talk|right|through)\b/,
    /\b(planning|design)(?:ing)?\s+(?:a |the |some )?(?:series|campaign|pull|pull[- ]?quote|quotes)\b/,
    /\b(pull[- ]?quote|pull[- ]?quotes|quote cards?)\b.{0,100}\b(plan|help|design|series|weekly|corpus|talk)\b/,
    /\b(plan|help|design|weekly|series)\b.{0,100}\b(pull[- ]?quote|pull[- ]?quotes|quote cards?|from my corpus)\b/,
    /\bi need to (generate|create|build|figure out)\b.{0,140}\b(plan|help|can you|could you|series|weekly|how)\b/,
    /\bfrom my corpus\b.{0,80}\b(plan|help|design|series|pull)\b/,
  ];
  return patterns.some((re) => re.test(s));
}

function hasExplicitPackageIntent(text) {
  const s = String(text || '').toLowerCase();
  return /\b(here'?s (?:my )?(?:post|draft|article)|full (?:post|text|draft) below|below is (?:my |the )?(?:post|draft|article)|paste below|ready to package|package this (?:now)?|ship this|don'?t refine|finished (?:my )?(?:post|draft)|this is (?:the )?final (?:draft|version|post))\b/.test(
    s
  );
}

/** True when text looks like pasted article body, not a planning note. */
function looksLikeFinishedArticlePaste(text) {
  if (!looksLikeContent(text)) return false;
  const s = String(text || '').trim();
  const paragraphs = s.split(/\n\n+/).map((p) => p.trim()).filter((p) => p.length > 60);
  return paragraphs.length >= 2;
}

/**
 * Only assume packaging for long text when it looks like a finished piece or user said so.
 * Attachments still imply “send something through” unless clearly planning-only (handled above).
 */
function shouldAssumePackageMode(text, hasAttachments) {
  if (wantsCorpusPullQuotes(text)) return false;
  if (looksLikePlanningOrDiscussionRequest(text)) return false;
  if (hasAttachments) return true;
  if (!looksLikeContent(text)) return false;
  if (hasExplicitPackageIntent(text)) return true;
  const first = String(text || '').split('\n')[0].trim().toLowerCase();
  if (
    /^(what|why|how|when|where|who|show|list|tell me|got any|did you|can you|are you|is there|hey auto|i need to|i want to|i'?m trying to)[\s,]/.test(first)
  ) {
    return false;
  }
  if (looksLikeFinishedArticlePaste(text)) return true;
  return false;
}

async function getAutomationProof(email) {
  const owner = String(email || '').toLowerCase().trim();
  const lines = [];
  try {
    const { data: logs } = await supabaseAdmin
      .from('ao_scan_log')
      .select('scan_type, started_at, finished_at, candidates_found, candidates_inserted')
      .order('started_at', { ascending: false })
      .limit(40);
    const rows = Array.isArray(logs) ? logs : [];
    const lastOf = (type) => rows.find((r) => r.scan_type === type);
    const ext = lastOf('external');
    const int = lastOf('internal');
    const daily = lastOf('full_corpus');
    const fmt = (row) => {
      if (!row) return 'not logged yet';
      const t = row.finished_at || row.started_at;
      if (!t) return 'not logged yet';
      try {
        return new Date(t).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
      } catch {
        return String(t);
      }
    };
    lines.push(`Last outside scan: ${fmt(ext)}${ext?.candidates_inserted != null ? ` · added ${ext.candidates_inserted} to inbox` : ''}`);
    lines.push(`Last corpus scan: ${fmt(int)}${int?.candidates_inserted != null ? ` · added ${int.candidates_inserted}` : ''}`);
    lines.push(`Last daily run: ${fmt(daily)}`);

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from('ao_quote_review_queue')
      .select('id', { count: 'exact', head: true })
      .eq('created_by_email', owner)
      .gte('created_at', cutoff);
    const n = typeof count === 'number' ? count : 0;
    lines.push(`Opportunities created for you in the last 24h: ${n}`);
  } catch {
    lines.push('Scan log: temporarily unavailable.');
  }
  return lines;
}

/** User explicitly asked for Scout / inbox opportunities — must run even if thread mode is package/publish. */
/** User wants Auto to search published corpus for pull-quote lines (not Scout inbox). */
function wantsCorpusPullQuotes(text) {
  const s = String(text || '').trim().toLowerCase();
  if (!s) return false;

  const corpusHint =
    /\b(corpus|my (?:published )?writing|published (?:work|pieces)|knowledge base|site content|from (?:the )?archive)\b/.test(s) ||
    /\bfrom (?:my |the |our )?(?:site|journal|posts|articles|corpus|book|books)\b/.test(s) ||
    /\b(accidental\s+ceo|remaining\s+human|my\s+book|the\s+ebook|published\s+work)\b/.test(s);

  const quoteHint =
    /\b(pull[- ]?quotes?|quote\s+cards?|weekly\s+pull\s+quotes?|weekly\s+quotes?|candidate\s+quotes?|lines?\s+to\s+(?:quote|post))\b/.test(
      s
    ) || /\bweekly\b.{0,80}\bpull\b.{0,40}\bquotes?\b/.test(s);

  const actionHint =
    /\b(find|pull|suggest|give me|show me|list|search|look (?:at|in|through)|pick|select|generate|creating|create|build|need to (?:generate|create|pull|get))\b/.test(
      s
    );

  if (quoteHint && (corpusHint || /\bfrom (?:my |the |our )?(?:site|journal|posts|articles)\b/.test(s))) return true;
  if (actionHint && quoteHint && corpusHint) return true;
  if (/\bquotes? from (?:my |the |our )?corpus\b/.test(s)) return true;
  if (/\bsearch (?:the )?corpus for\b.{0,40}\bquotes?\b/.test(s)) return true;

  if (quoteHint && actionHint && /\b(series|weekly|generate|creating)\b/.test(s) && /\b(my|our|the)\b/.test(s)) return true;

  return false;
}

/** Thematic / research questions over published corpus (paragraph excerpts, not pull-quote cards). */
function wantsCorpusThemeSearch(text) {
  if (wantsCorpusPullQuotes(text)) return false;
  if (wantsScoutFindings(text)) return false;
  const s = String(text || '').trim().toLowerCase();
  if (!s) return false;

  if (/\bwhere (?:in|on|from) (?:my|our) (?:corpus|site|journal|writing|published)\b/.test(s)) return true;
  if (/\b(find|search|show)\s+(?:me\s+)?(?:passages|excerpts|mentions|places)\s+(?:in|from)\s+(?:my|our)\s+(?:corpus|writing|journal|site)\b/.test(s)) return true;

  const corpusHint =
    /\b(corpus|my (?:published )?writing|published (?:work|pieces)|knowledge base|site content|from (?:the )?archive|my (?:site|journal|posts|articles)|on my site|in my corpus|our (?:published )?content)\b/.test(s) ||
    /\b(?:in|from) (?:my|our) (?:corpus|writing|journal|posts|articles|site)\b/.test(s);

  const researchHint =
    /\bwhere (?:did|do) we\b/.test(s) ||
    /\bwhat (?:have I|did we) (?:say|write|cover|publish|address)\b/.test(s) ||
    /\bfind (?:passages|places|mentions|where)\b/.test(s) ||
    /\banything (?:on|about)\b/.test(s) ||
    /\b(talked|written|wrote|discussed)\s+about\b/.test(s) ||
    /\b(talk about|write about|covered)\b/.test(s) ||
    /\b(pitfalls|risk(?:s)?|drawbacks|downsides|concerns?)\s+(?:of|with|about)\b/.test(s) ||
    /\b(theme|coverage|angle)\s+(?:of|on)\b/.test(s) ||
    /\bpoint me to\b/.test(s) ||
    /\breferences?\s+to\b/.test(s) ||
    /\bexamples?\s+of\b/.test(s) ||
    /\bhave we (?:written|said|covered|addressed)\b/.test(s) ||
    /\banywhere we (?:talked|wrote|discussed)\b/.test(s) ||
    /\b(search|look)\s+(?:in|through)\s+(?:my|our)\b/.test(s);

  return !!(corpusHint && researchHint);
}

/** Pull digits 1–9 from a fragment (list like "4, 5" or "4 and 5"). */
function extractQuoteIndexDigits(fragment) {
  const out = new Set();
  String(fragment || '')
    .match(/\b[1-9]\b/g)
    ?.forEach((d) => out.add(Number(d)));
  return out;
}

/**
 * Indices the user explicitly rules out (so we do not treat every digit in the message as a pick).
 * Handles e.g. "4 and 5 would not work as pull quotes", "but not 4", "skip 4 and 5".
 */
function parseExcludedQuoteIndicesFromMessage(text) {
  const excluded = new Set();
  const s = String(text || '');
  const patterns = [
    // "4 and 5 would not work", "4, 5 wouldn't work"
    /\b([1-9](?:\s*(?:,|and|or|&)\s*[1-9])*)\s+(?:would|will|do)\s+not\b/gi,
    /\b([1-9](?:\s*(?:,|and|or|&)\s*[1-9])*)\s+wouldn'?t\s+work\b/gi,
    // "but not 4", "not 4 and 5"
    /\b(?:but\s+)?not\s+([1-9](?:\s*(?:,|and|or|&)\s*[1-9])*)\b/gi,
    /\b(?:skip|exclude|excluding|reject|rule\s+out|without)\s+([1-9](?:\s*(?:,|and|or|&)\s*[1-9])*)\b/gi,
    /\b(?:don'?t|do\s+not)\s+want\s+([1-9](?:\s*(?:,|and|or|&)\s*[1-9])*)\b/gi,
  ];
  for (const re of patterns) {
    re.lastIndex = 0;
    let m = re.exec(s);
    while (m) {
      const group = m[1];
      if (group) extractQuoteIndexDigits(group).forEach((n) => excluded.add(n));
      m = re.exec(s);
    }
  }
  return excluded;
}

/** Digits 1–9 only — for “quote #3” style picks (avoids matching years like 2024 as indices). */
function parseQuoteIndicesFromMessage(text) {
  const s = String(text || '');
  const nums = new Set();
  const re = /\b([1-9])\b/g;
  let m = re.exec(s);
  while (m) {
    nums.add(Number(m[1]));
    m = re.exec(s);
  }
  const excluded = parseExcludedQuoteIndicesFromMessage(s);
  excluded.forEach((n) => nums.delete(n));
  return [...nums].sort((a, b) => a - b);
}

function parseIndicesFromAssistantThread(messages) {
  if (!Array.isArray(messages)) return null;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const row = messages[i];
    if (row.role !== 'assistant' && row.role !== 'receipt') continue;
    const c = String(row.content || '');
    const receipt = /selected\s+quotes?\s*[:\s]*([0-9,\s]+)/i.exec(c);
    if (receipt) {
      const nums = receipt[1].match(/\b[1-9]\b/g);
      if (nums?.length) return [...new Set(nums.map(Number))].sort((a, b) => a - b);
    }
  }
  return null;
}

function wantsPublishRouteGuidance(userMessage) {
  const s = String(userMessage || '').trim().toLowerCase();
  if (!/\b(publish|schedule)\b/.test(s)) return false;
  return /\b(devotional|devotionals|journal series|weekly bundle|faith series)\b/.test(s);
}

function wantsPublishQuoteCardsIntent(userMessage, state) {
  const s = String(userMessage || '').trim().toLowerCase();
  if (/\b(devotional|devotionals)\b/.test(s) && !/\b(card|quote|pull)\b/.test(s)) return false;
  if (!/\b(publish|schedule|queue)\b/.test(s)) return false;
  const hasCorpus = Array.isArray(state?.corpus_pull_quotes) && state.corpus_pull_quotes.length > 0;
  const hasCandidates = Array.isArray(state?.publish_candidates) && state.publish_candidates.length > 0;
  if (!hasCorpus && !hasCandidates) return false;
  if (
    /\b(package|packaging|paste my finished|finished post below|ready to package)\b/.test(s) &&
    !/\b(card|quote|pull)\b/.test(s)
  ) {
    return false;
  }
  return (
    /\bcards?\b/.test(s) ||
    /\bquotes?\b/.test(s) ||
    /\bpull[- ]?quote\b/.test(s) ||
    /\b[1-9]\b/.test(s) ||
    /\ball\b/.test(s)
  );
}

function rebuildPublishCandidatesFromMessages(messages, corpusQuotes) {
  if (!Array.isArray(corpusQuotes) || !corpusQuotes.length) return [];
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const row = messages[i];
    if (row.role !== 'assistant') continue;
    const meta = row.meta && typeof row.meta === 'object' ? row.meta : null;
    const previews = meta?.quote_card_previews;
    if (!Array.isArray(previews) || !previews.length) continue;
    return previews
      .map((p) => {
        const idx = Number(p.index);
        const q = corpusQuotes[idx - 1];
        if (!q) return null;
        return normalizePublishCandidate({
          corpus_index: idx,
          quote: q.quote,
          source_title: q.source_title || p.source_title,
          url: q.url || '',
          caption: String(p.caption || ''),
          caption_x: String(p.caption_x || ''),
          svg: p.svg || '',
          image_url: String(p.image_url || ''),
        });
      })
      .filter(Boolean);
  }
  return [];
}

/**
 * User is continuing the pull-quote flow: pick numbers and/or ask for captions + cards.
 * Requires a prior corpus search stored on thread state (corpus_pull_quotes).
 */
function wantsCorpusPullQuoteDeliverables(userMessage, state, messages) {
  const quotes = state?.corpus_pull_quotes;
  if (!Array.isArray(quotes) || !quotes.length) return false;
  if (wantsCorpusPullQuotes(userMessage)) return false;
  const s = String(userMessage || '').trim().toLowerCase();
  const hasDigit = /\b[1-9]\b/.test(s);
  const deliver =
    /\b(captions?|cards?|image cards?|branded|instagram|produce|generat|go ahead|get to work|make the|make them|selected|now|draft|minimal|square)\b/.test(s);
  return hasDigit || deliver;
}

function extractCorpusTldrTopic(text) {
  let s = String(text || '').trim();
  s = s.replace(/^\s*corpus\s*[:.]?\s*/i, '');
  s = s.replace(/\b(tl;?dr|tldr|briefing|brief|report)\s*[:.]?\s*/gi, '');
  s = s.replace(/\boutline\s*[:.]?\s*/gi, '');
  s = s.replace(/\s+/g, ' ').trim();
  return s.slice(0, 500);
}

function isCorpusOutlineOnly(text) {
  const s = String(text || '').trim().toLowerCase();
  return /\boutline\b/.test(s) && !/\btl;?dr\b|\btldr\b|\bbriefing\b/.test(s);
}

/** CORPUS research / TL;DR / outline (internal Auto — not public Archy). */
function wantsCorpusTldrWork(text) {
  if (wantsCorpusPullQuotes(text)) return false;
  const s = String(text || '').trim().toLowerCase();
  if (!s) return false;
  if (!/\bcorpus\b/.test(s)) return false;
  if (/\bpull[- ]?quotes?\b/.test(s)) return false;
  if (/\btl;?dr\b|\btldr\b|\bbriefing\b|\boutline\b|\bcorpus\s+gap\b|\blandscape\b/.test(s)) return true;
  if (/^corpus\s*[:.]/.test(s) && s.length > 12) return true;
  if (/^corpus\s+/.test(s) && s.length > 15) return true;
  return false;
}

function wantsQueueCorpusDraft(text) {
  const s = String(text || '').trim().toLowerCase();
  return (
    /\b(save|queue|store)\b/.test(s) &&
    /\b(draft|drafts|brief|tldr|report|corpus brief)\b/.test(s)
  );
}

function wantsScoutFindings(text) {
  const s = String(text || '').trim().toLowerCase();
  if (!s) return false;
  if (/\bwhat did you find\b|\bwhat have you found\b/.test(s)) return true;
  if (/\bshow me what you(?:'ve)?\s+found\b|\bshow me what scout\b/.test(s)) return true;
  if (/\bgot any new ideas for today\b|\bany new ideas for today\b/.test(s)) return true;
  if (/\bwhat(?:'s| is) new from scout\b|\bscout findings\b|\bwhat did scout find\b|\bwhat has scout found\b/.test(s)) return true;
  if (/\b(pull up|give me|list)\s+(the\s+)?(today'?s\s+)?(opportunities|findings|leads|inbox)\b/.test(s)) return true;
  if (/\bwhat do you have for me today\b|\bwhat did you pick up\b|\banything new (?:in )?the inbox\b/.test(s)) return true;
  if (/\bwhat should we build from the corpus\b|\bcorpus (?:ideas|picks) for today\b/.test(s)) return true;
  return false;
}

function formatFindingLine(x) {
  const title = x.source_title || x.source_name || 'Opportunity';
  const link = x.is_internal
    ? safeText(x.source_slug_or_url, 500) || ''
    : safeText(x.source_url, 2000) || '';
  if (link && /^https?:\/\//i.test(link)) return `${title}\n   ${link}`;
  if (link) return `${title}\n   /${link.replace(/^\//, '')}`;
  return title;
}

function applyOneFix(text, before, after) {
  if (!before || !after) return text;
  const idx = text.indexOf(before);
  if (idx < 0) return text;
  return `${text.slice(0, idx)}${after}${text.slice(idx + before.length)}`;
}

async function saveReadyPostFromBundle({ email, bundle, imageAttachment }) {
  const ideaInsert = await supabaseAdmin
    .from('ao_ideas')
    .insert({
      path: 'ready_post',
      title: bundle.title,
      raw_input: bundle.original_input || '',
      markdown_content: bundle.original_input || '',
      status: 'new',
      created_by_email: email,
      ready_target_site: true,
      ready_target_social: true,
      ready_social_channels: Object.keys(bundle.channel_drafts?.drafts_by_channel || {}),
      ready_social_drafts: bundle.channel_drafts || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();
  if (ideaInsert.error) throw ideaInsert.error;

  if (imageAttachment?.public_url) {
    let contentBase64 = '';
    if (imageAttachment.storage_bucket && imageAttachment.storage_path) {
      try {
        const dl = await supabaseAdmin.storage
          .from(imageAttachment.storage_bucket)
          .download(imageAttachment.storage_path);
        if (!dl.error && dl.data) {
          const buffer = Buffer.from(await dl.data.arrayBuffer());
          contentBase64 = buffer.toString('base64');
        }
      } catch (_) {}
    }
    await supabaseAdmin.from('ao_idea_assets').insert({
      idea_id: ideaInsert.data.id,
      kind: 'featured_image',
      filename: imageAttachment.file_name,
      mime_type: imageAttachment.mime_type,
      content_base64: contentBase64,
      created_at: new Date().toISOString(),
    });
    await supabaseAdmin
      .from('ao_ideas')
      .update({
        ready_featured_image_filename: imageAttachment.file_name,
        ready_featured_image_mime_type: imageAttachment.mime_type,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ideaInsert.data.id);
  }

  return ideaInsert.data;
}

async function scheduleReadyPost({ email, idea, bundle, threadId }) {
  const draftsByChannel = bundle?.channel_drafts?.drafts_by_channel || {};
  const firstByChannel = bundle?.channel_drafts?.first_comment_suggestions || {};
  const schedule = bundle?.schedule_suggestion || {};
  const rows = [];
  for (const [channel, text] of Object.entries(draftsByChannel)) {
    const when = schedule[channel];
    if (!text || !when) continue;
    rows.push({
      platform: channel === 'x' ? 'twitter' : channel,
      account_id: channel === 'facebook' || channel === 'instagram' ? 'meta' : 'personal',
      scheduled_at: when,
      text,
      image_url: null,
      first_comment: safeText(firstByChannel[channel], 400) || null,
      status: 'scheduled',
      source_kind: 'idea',
      source_idea_id: idea.id,
      intent: {
        title: idea.title || null,
        why_it_matters: bundle.summary || null,
      },
      why_it_matters: bundle.summary || null,
    });
  }
  if (!rows.length) return { ok: false, error: 'No schedule rows available' };

  const inserted = await supabaseAdmin
    .from('ao_scheduled_posts')
    .insert(rows)
    .select('id, platform, scheduled_at, status');
  if (inserted.error) throw inserted.error;

  const log = await supabaseAdmin
    .from('ao_auto_action_log')
    .insert({
      created_by_email: email,
      thread_id: threadId,
      bundle_id: bundle.id,
      action_type: 'schedule_ready_post',
      payload: { idea_id: idea.id },
      undo_payload: { scheduled_post_ids: (inserted.data || []).map((x) => x.id) },
      created_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  return { ok: true, scheduled: inserted.data || [], actionLog: log.data || null };
}

async function recentFindings(email) {
  const cutoff = new Date(Date.now() - (24 * 60 * 60 * 1000)).toISOString();
  const { data } = await supabaseAdmin
    .from('ao_quote_review_queue')
    .select(
      'id,is_internal,source_title,source_name,source_url,source_slug_or_url,why_it_matters,summary_interpretation,created_at'
    )
    .eq('created_by_email', email)
    .gte('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(12);
  const rows = Array.isArray(data) ? data : [];
  return {
    external: rows.filter((x) => x.is_internal === false).slice(0, 5),
    internal: rows.filter((x) => x.is_internal === true).slice(0, 5),
  };
}

async function askModel({
  mode,
  message,
  messages,
  guardrails,
  findings,
  bundleSummary,
  automationProofLines = [],
  dontRefine = false,
}) {
  const apiKey = getOpenAiKey();
  if (!apiKey) return null;

  const isPlanOrWrite = mode === 'plan' || mode === 'write' || mode === 'general';

  const prompt = `You are Auto inside AO Automation. Bart is the only user.

You are NOT Archy. Archy is the public-facing assistant on the website; you are Auto — internal research and packaging for Bart and the automation team only. Never confuse those names in receipts or advice.

Current mode: ${JSON.stringify(mode)}
User asked not to refine / treat post as frozen: ${dontRefine ? 'YES — do not suggest edits; only package, plan, recall, or flag major risks if asked.' : 'no'}

Non-negotiables (hard rules):
- Never silently rewrite his words. Never "polish" or swap wording unless he explicitly asks for editing help.
- If current mode is "plan" or "write" or he is asking to plan, design, brainstorm, or figure out pull quotes / a series / campaigns: stay in conversation. Offer steps, tradeoffs, and questions. Do NOT say you already packaged a post, do NOT list fake receipts, and do NOT tell him to tap Proceed — there is no bundle until he pastes a finished post or explicitly asks to package.
- If current mode is "package" and he pasted a finished piece: then describe packaging (Journal + channel drafts + schedule) without rewriting his words.
- Modes you respect from context: plan, write, package, publish, recall, training, general.
- Quality: only challenge wording for major public risks if relevant; do not nitpick style.
- Be conversational, direct, short paragraphs. If unsure, one clarifying question.
${isPlanOrWrite ? '\n- If he asks to find pull quotes from the corpus, the system may already inject real candidate lines in the same turn—do not promise to "gather quotes later" or imply background research; reinforce the numbered list if present.\n- If he already has candidate quotes in this thread and asks for captions and/or image cards (or picks numbers like 1, 2, 3), the system may attach captions and square card previews in the same turn. Do not only outline steps or ask for design choices he already settled—briefly confirm what was generated. Do not repeat the full numbered quote list unless he asks.\n- If he asks where something appears on the site / in his corpus and this turn did NOT include a numbered list of excerpts with sources from the system, do NOT invent specific page titles, slugs, or URLs. Say you cannot search the published library from this reply alone and suggest he ask using "in my corpus" / "in my published writing" or similar so retrieval can run.\n- He may be designing pull-quote cards or a content series: work with him iteratively. Suggest cadence and what to design next — without claiming the bundle is already built.\n' : ''}

Guardrails:
${guardrails.map((g) => `- ${g.rule_text}`).join('\n') || '- none'}

System proof-of-work (timestamps for trust):
${automationProofLines.length ? automationProofLines.map((x) => `- ${x}`).join('\n') : '- not available'}

Recent opportunities snapshot (last ~24h lists may be partial):
${JSON.stringify(findings)}

Current bundle summary:
${JSON.stringify(bundleSummary || null)}

Recent conversation:
${JSON.stringify(messages.slice(-8).map((m) => ({ role: m.role, content: m.content })))}

Latest user message:
${JSON.stringify(message)}

Return ONLY JSON:
{
  "assistant_message": string,
  "receipts": string[]
}`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.AO_AUTO_MODEL || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 900,
        temperature: 0.3,
      }),
    });
    if (!res.ok) return null;
    const json = await res.json().catch(() => ({}));
    const content = json.choices?.[0]?.message?.content?.trim() || '';
    if (!content) return null;
    try {
      return JSON.parse(content);
    } catch {
      const start = content.indexOf('{');
      const end = content.lastIndexOf('}');
      if (start >= 0 && end > start) return JSON.parse(content.slice(start, end + 1));
      return null;
    }
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  const auth = requireAoSession(req, res);
  if (!auth) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const thread = await ensureAutoThread(auth.email, req.body?.thread_id || '');
    const fullState = await getAutoThreadState(auth.email, thread.id);
    const existingMessages = fullState.messages || [];
    const attachments = fullState.attachments || [];
    const requestedAttachmentIds = Array.isArray(req.body?.attachment_ids) ? req.body.attachment_ids.map((x) => String(x || '').trim()).filter(Boolean) : [];
    const activeAttachments = requestedAttachmentIds.length
      ? attachments.filter((a) => requestedAttachmentIds.includes(String(a.id)))
      : attachments.filter((a) => !a.message_id);
    const enabledGuardrails = (await listGuardrails(auth.email)).filter((g) => g.enabled);

    const userMessage = safeText(req.body?.message, 6000);
    if (!userMessage) return res.status(400).json({ ok: false, error: 'message required' });

    const currentState = fullState.thread.state && typeof fullState.thread.state === 'object' ? fullState.thread.state : {};
    let nextMode = detectAutoMode(userMessage, fullState.thread.current_mode || 'general');
    let statePatch = { ...currentState };
    if (impliesNoRefine(userMessage)) statePatch.dont_refine = true;
    if (looksLikePlanningOrDiscussionRequest(userMessage)) {
      nextMode = 'plan';
    } else if (wantsCorpusTldrWork(userMessage)) {
      nextMode = 'plan';
    } else if (wantsQueueCorpusDraft(userMessage)) {
      nextMode = 'plan';
    } else if (wantsCorpusPullQuotes(userMessage)) {
      nextMode = 'plan';
    } else if (wantsCorpusThemeSearch(userMessage)) {
      nextMode = 'plan';
    } else if (
      shouldAssumePackageMode(userMessage, activeAttachments.length > 0) &&
      !wantsScoutFindings(userMessage) &&
      !wantsCorpusPullQuotes(userMessage) &&
      !wantsCorpusThemeSearch(userMessage) &&
      !wantsCorpusTldrWork(userMessage) &&
      !wantsQueueCorpusDraft(userMessage) &&
      nextMode !== 'training' &&
      nextMode !== 'recall'
    ) {
      nextMode = 'package';
    }
    const inferredFromMessage = looksLikeContent(userMessage) ? userMessage : '';
    const textAttachment = activeAttachments.filter((a) => a.kind === 'text').map((a) => safeText(a.extracted_text, 20000)).filter(Boolean).join('\n\n');
    const imageAttachment = activeAttachments.filter((a) => a.kind === 'image').slice(-1)[0] || null;
    let sourceText = safeText(currentState?.draft_input, 30000) || inferredFromMessage || textAttachment;

    const userRow = await addAutoMessage({
      threadId: thread.id,
      role: 'user',
      mode: nextMode,
      content: userMessage,
      meta: { attachment_ids: activeAttachments.map((a) => a.id) },
    });

    if (activeAttachments.length) {
      await supabaseAdmin
        .from('ao_auto_attachments')
        .update({ message_id: userRow.id })
        .in('id', activeAttachments.map((a) => a.id));
    }

    const receipts = [];
    if (nextMode !== fullState.thread.current_mode) {
      receipts.push(
        `Mode: ${
          nextMode === 'write'
            ? 'Writing'
            : nextMode === 'publish'
              ? 'Publishing'
              : nextMode === 'package'
                ? 'Packaging'
                : nextMode === 'training'
                  ? 'Training'
                  : nextMode === 'recall'
                    ? 'Recall'
                    : nextMode === 'plan'
                      ? 'Planning'
                      : 'Auto'
        }`
      );
    }

    let assistantMessage = '';
    let assistantMeta = null;
    let savedBundle = null;
    let savedIdea = null;

    if (nextMode === 'training') {
      const cleanRule = userMessage
        .replace(/switch to training mode/i, '')
        .replace(/training mode/i, '')
        .trim();
      if (!cleanRule) {
        assistantMessage = 'Mode: Training. Tell me the behavior you want to lock in, and I’ll turn it into a guardrail.';
      } else {
        const title = cleanRule.length > 80 ? `${cleanRule.slice(0, 77)}...` : cleanRule;
        const created = await supabaseAdmin
          .from('ao_auto_guardrails')
          .insert({
            created_by_email: auth.email,
            title,
            rule_text: cleanRule,
            enabled: true,
            scope: 'global',
            source: 'user',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select('*')
          .single();
        if (created.error) throw created.error;
        receipts.push('Training mode: saved new guardrail');
        assistantMessage = `Locked in. I saved this as a global guardrail: "${cleanRule}"`;
      }
    } else if (nextMode === 'recall') {
      const bundleMatches = await searchBundles(auth.email, userMessage);
      const ideaOut = await supabaseAdmin
        .from('ao_ideas')
        .select('id,title,raw_input,updated_at,path')
        .eq('created_by_email', auth.email)
        .order('updated_at', { ascending: false })
        .limit(6);
      const ideaMatches = Array.isArray(ideaOut.data) ? ideaOut.data.slice(0, 3) : [];
      const lane1 = bundleMatches.slice(0, 3);
      const lane2 = lane1.length < bundleMatches.length ? bundleMatches.slice(3, 6) : ideaMatches;
      if (!lane1.length && !lane2.length) {
        assistantMessage = 'I checked Library and did not find a strong match yet.';
      } else {
        const lines = ['I think I remember it. Let me ask the Librarian.', ''];
        if (lane1.length) {
          lines.push('Closest matches:');
          lane1.forEach((b, idx) => lines.push(`${idx + 1}. ${b.title || 'Untitled bundle'} (${b.series_name || 'no series'})`));
          lines.push('');
        }
        if (lane2.length) {
          lines.push('Nearby matches:');
          lane2.forEach((b, idx) => lines.push(`${idx + 1}. ${b.title || b.raw_input?.slice(0, 60) || 'Saved item'}`));
        }
        lines.push('');
        lines.push('If you want, tell me which one to reuse and I’ll pull it into this session.');
        assistantMessage = lines.join('\n');
      }
    } else if (wantsQueueCorpusDraft(userMessage)) {
      nextMode = 'plan';
      let lastAssistant = '';
      for (let i = existingMessages.length - 1; i >= 0; i -= 1) {
        if (existingMessages[i].role === 'assistant') {
          lastAssistant = String(existingMessages[i].content || '');
          break;
        }
      }
      if (!lastAssistant.trim()) {
        assistantMessage =
          'I don’t have a recent assistant message to save. Ask for a CORPUS TL;DR (or outline) first, then say something like “save this brief to drafts.”';
      } else {
        const ins = await supabaseAdmin
          .from('ao_corpus_drafts')
          .insert({
            created_by_email: auth.email,
            topic: 'Queued from Auto chat',
            status: 'draft',
            tldr_markdown: lastAssistant,
            meta: { source: 'auto_chat' },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select('id')
          .single();
        if (ins.error) {
          assistantMessage = String(ins.error.message || '').includes('ao_corpus_drafts')
            ? 'The drafts queue isn’t set up in the database yet—your brief is still in this thread to copy. Run database/ao_corpus_and_archy.sql when ready.'
            : `Could not save draft: ${ins.error.message}`;
        } else {
          receipts.push('Saved to corpus drafts queue');
          assistantMessage =
            'Saved the last assistant reply to your corpus drafts queue for review. Nothing goes public until you use the secured publish step (overlap-checked).';
        }
      }
    } else if (wantsCorpusTldrWork(userMessage)) {
      nextMode = 'plan';
      const topic = extractCorpusTldrTopic(userMessage);
      const outlineOnly = isCorpusOutlineOnly(userMessage);
      const out = outlineOnly
        ? await buildCorpusOutlineMarkdown({ topic, email: auth.email })
        : await buildCorpusTldrMarkdown({ topic, email: auth.email });
      receipts.push(outlineOnly ? 'Generated CORPUS outline (internal research)' : 'Generated CORPUS TL;DR (landscape / gaps / AO fit)');
      if (out.ok && out.report) {
        assistantMessage = [
          outlineOnly ? 'Here is a CORPUS outline (internal research — not public):' : 'Here is your CORPUS TL;DR (internal research — not public):',
          '',
          out.report,
          '',
          'Tip: say “save this brief to drafts” to queue it for review, or refine the topic and ask again.',
        ].join('\n');
      } else {
        assistantMessage = out.error || 'Could not generate CORPUS briefing.';
      }
    } else if (wantsScoutFindings(userMessage)) {
      nextMode = 'plan';
      const findings = await recentFindings(auth.email);
      const proof = await getAutomationProof(auth.email);
      const lines = [];
      if (findings.external.length) {
        lines.push('From outside sources in the last 24 hours:');
        findings.external.forEach((x, idx) => lines.push(`${idx + 1}. ${formatFindingLine(x)}`));
        lines.push('');
      } else {
        lines.push('I looked and did not find anything new from outside sources in the last 24 hours.');
        lines.push('');
      }
      if (findings.internal.length) {
        lines.push('From your corpus:');
        findings.internal.forEach((x, idx) => lines.push(`${idx + 1}. ${formatFindingLine(x)}`));
      } else {
        lines.push('I do not have a strong corpus opportunity flagged in that window yet.');
      }
      lines.push('');
      lines.push('Proof of work (so you know the system has been running):');
      proof.forEach((p) => lines.push(`- ${p}`));
      assistantMessage = lines.join('\n');
    } else if (wantsCorpusPullQuotes(userMessage)) {
      nextMode = 'plan';
      const corpus = await getCorpusPullQuotes({ queryText: userMessage, limit: 5 });
      receipts.push('Searched your published corpus for stand-alone, high-impact pull quotes');
      if (corpus.ok && corpus.quotes.length) {
        const lines = [
          'Here are candidate pull quotes from your corpus (short lines only—full posts are not pasted here):',
          '',
        ];
        corpus.quotes.forEach((q, idx) => {
          lines.push(`${idx + 1}. “${q.quote}”`);
          lines.push(`   Source: ${q.source_title}${q.url ? ` · ${q.url}` : ''}`);
          lines.push('');
        });
        lines.push(
          'These are chosen to work on their own (no article required) and to hit with stakes, not just pleasant wording. Tell me which numbers you want and I’ll draft captions and minimal branded cards next.'
        );
        assistantMessage = lines.join('\n');
        try {
          const rawLogo = await getDefaultLogoUrl({ background: 'dark' });
          const logoUrl = (await inlineLogoForQuoteCardSvg(rawLogo)) || null;
          const first = corpus.quotes[0];
          const rendered = renderQuoteCardSvg({
            quote: first.quote,
            sourceName: first.source_title,
            logoUrl,
            style: 'minimal',
            minimalVariant: 'dark',
            forceLightLogo: true,
          });
          let quote_card_preview_image_url = null;
          if (rendered.ok && rendered.svg) {
            try {
              const up = await uploadQuoteCardSvgToPublicUrl(rendered.svg, { subfolder: 'auto-hub-quote-cards' });
              if (up.ok) quote_card_preview_image_url = up.publicUrl;
            } catch (_) {}
          }
          assistantMeta = {
            corpus_pull_quotes: corpus.quotes,
            quote_card_preview_svg: rendered.ok ? rendered.svg : null,
            quote_card_preview_image_url,
          };
        } catch (_) {
          assistantMeta = { corpus_pull_quotes: corpus.quotes };
        }
        statePatch.corpus_pull_quotes = corpus.quotes;
      } else {
        assistantMessage =
          'I couldn’t find strong pull-quote lines from the corpus for that ask. Try naming a theme (for example accountability, pressure, or culture) and ask again, or say which topics to prioritize.';
      }
    } else if (wantsPublishRouteGuidance(userMessage)) {
      nextMode = 'plan';
      assistantMessage = messageForDevotionalOrSeriesPublish();
    } else if (
      currentState.publish_wizard &&
      currentState.publish_wizard.step === 'await_confirm' &&
      /\b(confirm\s+publish|yes\s*,?\s*schedule|proceed\s+with\s+publish)\b/i.test(userMessage)
    ) {
      nextMode = 'plan';
      const pending = currentState.publish_wizard.pending;
      const result = await executeQuoteCardSchedule({
        items: pending.items,
        timesIso: pending.times_iso,
        email: auth.email,
        use_platforms: pending.classification?.use_platforms,
      });
      if (result.ok) {
        receipts.push(`Scheduled ${result.count || 0} Publisher slot(s)`);
        assistantMessage = `Done. ${result.count || 0} row(s) queued (image + caption per network). Open Publisher to review or adjust times.`;
        statePatch.publish_wizard = null;
      } else {
        assistantMessage = `Could not schedule: ${result.error || 'Unknown error'}`;
      }
    } else if (
      currentState.publish_wizard &&
      currentState.publish_wizard.step === 'await_confirm' &&
      /\b(cancel|abort|stop)\b/i.test(userMessage)
    ) {
      nextMode = 'plan';
      statePatch.publish_wizard = null;
      assistantMessage = 'Cancelled. When you are ready, say Publish cards … with the numbers you want.';
    } else if (wantsPublishQuoteCardsIntent(userMessage, currentState)) {
      nextMode = 'plan';
      const corpusQuotes = currentState.corpus_pull_quotes || [];
      let pool =
        Array.isArray(currentState.publish_candidates) && currentState.publish_candidates.length
          ? currentState.publish_candidates
          : rebuildPublishCandidatesFromMessages(existingMessages, corpusQuotes);
      statePatch.publish_candidates = pool;

      if (!pool.length) {
        assistantMessage =
          'I do not have quote cards saved in this thread yet. Pick quote numbers so I can draft captions and cards—then say Publish.';
      } else {
      let indices = parseQuoteIndicesFromMessage(userMessage);
      if (/\ball\b/i.test(userMessage)) {
        indices = pool.map((x) => x.corpus_index).sort((a, b) => a - b);
      }
      indices = indices.filter((n) => n >= 1 && n <= (corpusQuotes.length || 99)).slice(0, 12);

      if (!indices.length) {
        assistantMessage =
          'Say which card numbers to publish (for example: Publish cards 1, 2, and 4), or say all.';
      } else {
        const items = indices.map((n) => pool.find((x) => x.corpus_index === n)).filter(Boolean);
        if (!items.length || items.some((x) => !x.svg)) {
          assistantMessage =
            'I could not find those cards in this thread. Pick quote numbers and ask for captions and cards first—then say Publish.';
        } else {
          const timesIso = await proposeQuoteCardTimes(items.length, { gapDays: 1 });
          const { coverageLines, classification } = await buildQuoteCardPublishContext(auth.email, items);
          const ch = { summaryLines: classification.summaryLines || [] };
          statePatch.publish_wizard = {
            step: 'await_confirm',
            pending: { items, times_iso: timesIso, classification },
          };
          assistantMessage = formatQuoteCardPublishPlan({
            items,
            timesIso,
            channelHelp: ch,
            classification,
            coverageLines,
          });
        }
      }
      }
    } else if (wantsCorpusPullQuoteDeliverables(userMessage, currentState, existingMessages)) {
      nextMode = 'plan';
      const allQuotes = currentState.corpus_pull_quotes;
      let indices = parseQuoteIndicesFromMessage(userMessage);
      if (!indices.length) {
        const fromThread = parseIndicesFromAssistantThread(existingMessages);
        if (fromThread?.length) indices = fromThread;
      }
      if (!indices.length && Array.isArray(currentState.corpus_pull_quote_selection) && currentState.corpus_pull_quote_selection.length) {
        indices = [...currentState.corpus_pull_quote_selection];
      }
      const maxN = allQuotes.length;
      if (!indices.length) {
        indices = allQuotes.slice(0, Math.min(5, maxN)).map((_, i) => i + 1);
      }
      indices = indices.filter((n) => n >= 1 && n <= maxN).slice(0, 6);
      if (!indices.length) {
        assistantMessage =
          'Tell me which quote numbers to use from the list above (for example 1, 3, and 5), or say “all.”';
      } else {
        statePatch.corpus_pull_quote_selection = indices;
        const selected = indices.map((n) => allQuotes[n - 1]).filter(Boolean);
        receipts.push('Drafted interpretive captions and minimal square cards for your picks');
        const { captions, captions_x: captionsX } = await generatePullQuoteCaptionsForQuotes(selected, { maxChars: 2000 });
        const rawLogo = await getDefaultLogoUrl({ background: 'dark' });
        const logoUrl = (await inlineLogoForQuoteCardSvg(rawLogo)) || null;
        const previews = [];
        const lines = [
          'Here are interpretive captions (they explain or enhance the line—the image carries the quote) and minimal black square cards (same style as the preview—larger type, logo lightened for contrast).',
          '',
          'Captions (copy under each image in the thread; X-sized line included where useful):',
          '',
        ];
        for (let i = 0; i < selected.length; i += 1) {
          const q = selected[i];
          const cap = captions[i] || '';
          const capX = captionsX[i] || '';
          lines.push(`${i + 1}. ${cap}`);
          if (capX) lines.push(`   (X: ${capX})`);
          lines.push(`   “${safeText(q.quote, 280)}”`);
          lines.push(`   — ${q.source_title}${q.url ? ` · ${q.url}` : ''}`);
          lines.push('');
          const rendered = renderQuoteCardSvg({
            quote: q.quote,
            sourceName: q.source_title,
            logoUrl,
            style: 'minimal',
            minimalVariant: 'dark',
            forceLightLogo: true,
          });
          if (rendered.ok) {
            let image_url = '';
            try {
              const up = await uploadQuoteCardSvgToPublicUrl(rendered.svg, { subfolder: 'auto-hub-quote-cards' });
              if (up.ok) image_url = up.publicUrl;
            } catch (_) {}
            previews.push({
              svg: rendered.svg,
              image_url,
              index: indices[i],
              caption: cap,
              caption_x: capX,
              source_title: q.source_title,
            });
          }
        }
        assistantMessage = lines.join('\n');
        assistantMeta = {
          corpus_pull_quotes: allQuotes,
          quote_card_previews: previews,
          quote_card_preview_svg: previews[0]?.svg || null,
          quote_card_preview_image_url: previews[0]?.image_url || null,
        };
        statePatch.publish_candidates = indices
          .map((n, i) => {
            const q = selected[i];
            const pr = previews[i];
            return normalizePublishCandidate({
              corpus_index: n,
              quote: q.quote,
              source_title: q.source_title,
              url: q.url || '',
              caption: captions[i] || '',
              caption_x: captionsX[i] || '',
              svg: pr?.svg || null,
              image_url: pr?.image_url || '',
            });
          })
          .filter(Boolean);
      }
    } else if (wantsCorpusThemeSearch(userMessage)) {
      nextMode = 'plan';
      const topic = await getCorpusTopicSnippets({
        queryText: userMessage,
        limitSnippets: 8,
        topDocs: 30,
        maxCharsPerSnippet: 680,
        maxSnippetsPerDoc: 2,
      });
      receipts.push('Searched your corpus for topic matches');
      if (topic.ok && topic.snippets.length) {
        const slim = topic.snippets.map((x) => ({
          excerpt: String(x.excerpt || '').slice(0, 700),
          source_title: x.source_title,
          slug: x.slug,
          type: x.type,
          url: x.url,
        }));
        const lines = [
          'Here are passages from your published corpus that overlap your question (retrieval matches—not a full read of every post):',
          '',
        ];
        slim.forEach((sn, idx) => {
          lines.push(`${idx + 1}. ${sn.excerpt}`);
          lines.push(`   Source: ${sn.source_title}${sn.url ? ` · ${sn.url}` : ''}`);
          lines.push('');
        });
        lines.push('Open the links to verify context. If this misses the idea, try different keywords (synonyms aren’t always matched yet).');
        assistantMessage = lines.join('\n');
        assistantMeta = { corpus_theme_snippets: slim };
      } else {
        assistantMessage =
          'I didn’t find strong paragraph matches in the corpus for that wording. Try rephrasing with keywords that appear in your posts, or name the topic more directly (e.g. “servant leadership risks in my corpus”).';
      }
    } else if (nextMode === 'package' || nextMode === 'publish') {
      const pendingQuality = statePatch.pending_quality && typeof statePatch.pending_quality === 'object' ? statePatch.pending_quality : null;
      const lower = userMessage.toLowerCase();
      if (
        !pendingQuality &&
        (lower.includes('proceed') ||
          /\b(schedule|confirm)\s+(this\s+)?(package|bundle|posts?)\b/.test(lower) ||
          /\b(schedule|publish)\s+this\s+(package|bundle)\b/.test(lower)) &&
        currentState?.bundle_id
      ) {
        const bundleOut = await supabaseAdmin
          .from('ao_auto_bundles')
          .select('*')
          .eq('id', currentState.bundle_id)
          .eq('created_by_email', auth.email)
          .single();
        if (!bundleOut.error && bundleOut.data?.source_idea_id) {
          const ideaOut = await supabaseAdmin
            .from('ao_ideas')
            .select('*')
            .eq('id', bundleOut.data.source_idea_id)
            .eq('created_by_email', auth.email)
            .single();
          if (!ideaOut.error && ideaOut.data) {
            const scheduled = await scheduleReadyPost({
              email: auth.email,
              idea: ideaOut.data,
              bundle: bundleOut.data,
              threadId: thread.id,
            });
            if (scheduled.ok) {
              receipts.push('Scheduled posts');
              statePatch.last_action_log_id = scheduled.actionLog?.id || null;
              assistantMessage = `Proceed confirmed. I scheduled ${scheduled.scheduled.length} post(s).`;
            }
          }
        }
      }

      if (pendingQuality) {
        if (lower.includes('apply this fix') || lower.includes('apply fix')) {
          sourceText = applyOneFix(statePatch.draft_input || sourceText, pendingQuality.before, pendingQuality.after);
          statePatch.draft_input = sourceText;
          statePatch.pending_quality = null;
          receipts.push('Applied approved fix');
        } else if (lower.includes('keep as-is') || lower.includes('proceed anyway')) {
          statePatch.pending_quality = null;
          receipts.push('Keeping original wording');
        } else {
          assistantMessage = `Quality alarm: ${pendingQuality.explanation}\n\nBefore: ${pendingQuality.before}\nAfter: ${pendingQuality.after}\n\nReply with "Apply this fix" or "Keep as-is".`;
        }
      }

      if (!assistantMessage) {
        if (inferredFromMessage) {
          statePatch.draft_input = inferredFromMessage;
          sourceText = inferredFromMessage;
        }
        if (!sourceText) {
          assistantMessage = 'Paste the finished post here, or add a text file/image, and I’ll package it.';
        } else {
          const quality = await detectQualityAlarm({ text: sourceText });
          if (quality.has_issue) {
            statePatch.pending_quality = quality;
            statePatch.draft_input = sourceText;
            assistantMessage = `I know we are not refining, but I found a major issue that should be addressed before this goes out.\n\nWhy it matters: ${quality.explanation}\n\nBefore: ${quality.before}\nAfter: ${quality.after}\n\nReply with "Apply this fix" or "Keep as-is".`;
          } else {
            const bundle = await buildAutoBundle({
              title: currentState?.bundle_title || '',
              text: sourceText,
              channels: cleanChannels(req.body?.channels),
              imageAttachment,
            });
            if (!bundle.ok) throw new Error(bundle.error || 'Could not build bundle');

            const idea = await saveReadyPostFromBundle({
              email: auth.email,
              bundle: {
                ...bundle,
                original_input: sourceText,
              },
              imageAttachment,
            });

            const bundleInsert = await supabaseAdmin
              .from('ao_auto_bundles')
              .insert({
                created_by_email: auth.email,
                thread_id: thread.id,
                source_idea_id: idea.id,
                title: bundle.title,
                summary: bundle.summary,
                original_input: sourceText,
                original_input_frozen: true,
                journal_markdown: bundle.journal_markdown,
                channel_drafts: bundle.channel_drafts,
                pull_quote_companions: bundle.pull_quote_companions,
                schedule_suggestion: bundle.schedule_suggestion,
                attachment_refs: bundle.attachment_refs,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .select('*')
              .single();
            if (bundleInsert.error) throw bundleInsert.error;

            savedBundle = bundleInsert.data;
            savedIdea = idea;
            statePatch.bundle_id = savedBundle.id;
            statePatch.bundle_title = bundle.title;
            statePatch.draft_input = sourceText;
            receipts.push('Saved your post');
            receipts.push('Generated channel versions');
            receipts.push('Prepared Journal format');
            receipts.push('Prepared schedule suggestion');
            receipts.push('Saved bundle to Library');

            assistantMessage = [
              `I packaged this into a ready-to-publish bundle: ${bundle.title}`,
              '',
              `Journal: ready`,
              `Channels: ${Object.keys(bundle.channel_drafts?.drafts_by_channel || {}).join(', ') || 'none'}`,
              `Pull-quote companions: ${Array.isArray(bundle.pull_quote_companions) ? bundle.pull_quote_companions.length : 0}`,
              '',
              'Nothing will go live until you say Proceed.',
            ].join('\n');

          }
        }
      }
    } else {
      const findings = await recentFindings(auth.email);
      const proofLines = await getAutomationProof(auth.email);
      const model = await askModel({
        mode: nextMode,
        message: userMessage,
        messages: [...existingMessages, userRow],
        guardrails: enabledGuardrails,
        findings,
        bundleSummary: savedBundle ? { id: savedBundle.id, title: savedBundle.title } : null,
        automationProofLines: proofLines,
        dontRefine: !!(statePatch.dont_refine || impliesNoRefine(userMessage)),
      });
      assistantMessage = safeText(model?.assistant_message, 4000) || `Mode: ${nextMode.charAt(0).toUpperCase() + nextMode.slice(1)}. Tell me what you want to do next.`;
      if (Array.isArray(model?.receipts)) receipts.push(...model.receipts.map((x) => safeText(x, 160)).filter(Boolean));
    }

    await supabaseAdmin
      .from('ao_auto_threads')
      .update({
        current_mode: nextMode,
        state: statePatch,
        updated_at: new Date().toISOString(),
        last_message_at: new Date().toISOString(),
      })
      .eq('id', thread.id);

    const assistantRow = await addAutoMessage({
      threadId: thread.id,
      role: 'assistant',
      mode: nextMode,
      content: assistantMessage,
      meta: {
        ...(assistantMeta && typeof assistantMeta === 'object' ? assistantMeta : {}),
        bundle_id: savedBundle?.id || null,
        idea_id: savedIdea?.id || null,
      },
    });

    const receiptRows = [];
    for (const receipt of receipts) {
      const row = await addAutoMessage({
        threadId: thread.id,
        role: 'receipt',
        mode: nextMode,
        content: receipt,
      });
      receiptRows.push(row);
    }

    const finalState = await getAutoThreadState(auth.email, thread.id);
    return res.status(200).json({
      ok: true,
      thread: finalState.thread,
      messages: finalState.messages,
      attachments: finalState.attachments,
      assistant_message: assistantRow.content,
      receipts: receiptRows.map((x) => x.content),
      bundle_id: savedBundle?.id || statePatch.bundle_id || null,
      idea_id: savedIdea?.id || null,
      action_log_id: statePatch.last_action_log_id || null,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
