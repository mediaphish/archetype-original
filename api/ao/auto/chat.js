import { requireAoSession } from '../../../lib/ao/requireAoSession.js';
import { supabaseAdmin } from '../../../lib/supabase-admin.js';
import { getOpenAiKey } from '../../../lib/openaiKey.js';
import {
  ensureAutoThread,
  getAutoThreadState,
  addAutoMessage,
  listGuardrails,
  searchBundles,
  detectAutoMode,
  finalizeAutoModeForQuoteWork,
  shouldLoadAccountQuoteCardContext,
  wantsExitTrainingMode,
} from '../../../lib/ao/autoHub.js';
import { fetchAccountQuoteCardContext, formatQuoteCardContextBlock } from '../../../lib/ao/autoQuoteCardRecall.js';
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
import { uploadMinimalQuoteCardToPublicUrl, uploadQuoteCardSvgToPublicUrl } from '../../../lib/ao/quoteCardImageUrl.js';
import { stripMarkdownBoldForCardDisplay } from '../../../lib/ao/quoteCardMarkdown.js';
import {
  wantsUserSuppliedQuoteCards,
  parseUserSuppliedQuoteCards,
  looksLikeFreshPastedCardBatch,
} from '../../../lib/ao/userSuppliedQuoteCards.js';
import { resolveQuoteRoutingMessage } from '../../../lib/ao/autoIntentRouter.js';
import { buildCorpusTldrMarkdown, buildCorpusOutlineMarkdown } from '../../../lib/ao/corpusTldrReport.js';
import {
  buildThreadStateSnapshot,
  wantsPublishScheduleTweak,
  stripGapPhrasesForCardIndexParse,
  pushTransparencyReceipt,
  workflowHintFromState,
  restoreCorpusPullQuotesFromMessages,
} from '../../../lib/ao/autoIntent.js';
import { extractPublishScheduleConstraints, mergeScheduleOpts } from '../../../lib/ao/publishScheduleExtract.js';
import { appendSessionSummary, appendReceiptLog } from '../../../lib/ao/autoSessionSummary.js';
import { isAutoAgentToolsEnabled, runAutoAgentToolLoop } from '../../../lib/ao/autoAgentLoop.js';
import {
  wantsRapidWriteActivation,
  wantsExitRapidWrite,
  wantsRapidWriteAgentTraining,
  extractAgentTrainingBody,
  parseOrExtractRapidWriteSeeds,
  validateRapidWriteSeeds,
  writeRapidWritePost,
  normalizeRapidWriteDraftState,
  parseRapidWriteDraftOrDiscussIntent,
  reviseRapidWriteDraft,
  polishRapidWriteDraft,
  wantsRapidWriteManualPolishPass,
  wantsRunAllSeeds,
  wantsNextSeed,
  rapidWriteSeedIsDraftable,
  collectRapidWriteOverrideIds,
  rapidWriteOpeningSnippet,
  rapidWriteClosingSnippet,
  extractRapidWriteFirstNamesFromBody,
  rapidWriteBodySignatureSnippets,
  rapidWriteStoryPatternForBatchIndex,
  sortRapidWriteSeedIds,
  wantsGenerateRapidWriteHeroImages,
  wantsRegenerateRapidWriteHeroImage,
  wantsApproveRapidWriteHeroImage,
  extractRapidWriteSeedIdsFromMessage as extractRwSeedIdsFromMessage,
  isRapidWriteDraftTextRevisionMessage,
} from '../../../lib/ao/rapidWriteMode.js';
import { generateRapidWriteHeroForDraft, setRapidWriteHeroStatus } from '../../../lib/ao/rapidWriteImage.js';

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
  if (wantsUserSuppliedQuoteCards(text)) return false;
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
/** User wants Auto to search published corpus for pull-quote lines (not Scout inbox). Word "corpus" required. */
function wantsCorpusPullQuotes(text) {
  const raw = String(text || '').trim();
  if (!raw || !/\bcorpus\b/i.test(raw)) return false;

  const s = raw.toLowerCase();
  const quoteHint =
    /\b(pull[- ]?quotes?|quote\s+cards?|weekly\s+pull\s+quotes?|weekly\s+quotes?|candidate\s+quotes?|lines?\s+to\s+(?:quote|post))\b/.test(
      s
    ) || /\bweekly\b.{0,80}\bpull\b.{0,40}\bquotes?\b/.test(s);

  const actionHint =
    /\b(find|pull|suggest|give me|show me|list|search|look (?:at|in|through)|pick|select|generate|creating|create|build|need to (?:generate|create|pull|get))\b/.test(
      s
    );

  if (/\bquotes? from (?:my |the |our )?corpus\b/.test(s)) return quoteHint || actionHint;
  if (/\bsearch (?:the )?corpus for\b/i.test(raw)) return true;
  if (quoteHint && actionHint) return true;
  if (quoteHint && /\b(from|in|about|on|for)\s+(?:my|the|our)\s+corpus\b/.test(s)) return true;
  if (/\b(build|grow|add to|expand)\s+(?:the |my |our )?corpus\b/.test(s) && (quoteHint || /\b(pull|quote|card|lines?)\b/.test(s)))
    return true;

  return false;
}

/** Thematic / research questions over published corpus (paragraph excerpts, not pull-quote cards). */
function wantsCorpusThemeSearch(text) {
  if (wantsCorpusPullQuotes(text)) return false;
  if (wantsScoutFindings(text)) return false;
  if (shouldPrioritizePlanningOverCorpusThemeSearch(text)) return false;
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

function shouldPrioritizePlanningOverCorpusThemeSearch(text) {
  const s = String(text || '').trim().toLowerCase();
  if (!s) return false;
  const hasPlanSignal =
    /\blet'?s\s+(plan|build|write|work)\b/.test(s) ||
    /\bseries\b/.test(s) ||
    /\bjournal\s+(entries|series|posts?)\b/.test(s) ||
    /\beach one\b.*\b(post|entry)\b/.test(s);
  const hasScoutBuildSignal =
    /\bscout\b/.test(s) &&
    (/\bcrawl\b/.test(s) || /\binternet\b|\bweb\b|\bresearch\b/.test(s)) &&
    (/\bcorpus\b/.test(s) || /\bjournal\b|\bpost\b/.test(s));
  const hasLongBuildSignal =
    /\b10,?000\b|\b\d{4,}\s+words?\b/.test(s) &&
    /\bbuild\b.*\bcorpus\b|\bcorpus\b.*\bbuild\b/.test(s);
  return !!(hasPlanSignal || hasScoutBuildSignal || hasLongBuildSignal);
}

function isAffirmativeExecution(text) {
  const s = String(text || '').trim().toLowerCase();
  if (!s) return false;
  return (
    /^(yes|yep|yeah|ok|okay|do it|go ahead|proceed|please proceed|run it|ship it|sounds good|correct)\b/.test(s) ||
    /\b(do it|go ahead|please proceed|run with it|keep going|continue|let'?s do all of it)\b/.test(s)
  );
}

/** Bounded corpus retrieval for series_build confirmations (same HTTP request—no background job). */
async function buildSeriesCorpusResearchPack(userMessage) {
  const base = safeText(userMessage, 500);
  const queries = [
    `${base} ALI leadership conditions clarity consistency trust communication alignment stability drift`,
    'ALI Leadership Mirror conditions clarity consistency trust communication alignment stability drift servant leadership',
    'Culture Science ALI team experience leader intention stability trust alignment',
  ];
  const merged = [];
  const seen = new Set();
  const maxQueries = 3;
  const perCall = 5;
  for (let qi = 0; qi < Math.min(maxQueries, queries.length); qi += 1) {
    const topic = await getCorpusTopicSnippets({
      queryText: queries[qi],
      limitSnippets: perCall,
      topDocs: 24,
      maxCharsPerSnippet: 620,
      maxSnippetsPerDoc: 1,
    });
    if (!topic.ok || !Array.isArray(topic.snippets)) continue;
    for (const sn of topic.snippets) {
      const excerpt = String(sn.excerpt || '').trim();
      if (!excerpt) continue;
      const key = `${String(sn.slug || sn.source_title || '')}:${excerpt.slice(0, 96)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(sn);
      if (merged.length >= 14) break;
    }
    if (merged.length >= 14) break;
  }
  return merged;
}

function formatSeriesCorpusResearchBlock(snippets) {
  if (!Array.isArray(snippets) || !snippets.length) {
    return [
      '### Corpus research (this turn)',
      '',
      'No strong paragraph matches turned up for this pass. Say a tighter angle (for example one condition name) and I will run another corpus pass.',
    ].join('\n');
  }
  const lines = [
    '### Corpus research (this turn)',
    '',
    'Passages from your published corpus that overlap this series topic (retrieval matches—not a full read of every post):',
    '',
  ];
  snippets.forEach((sn, idx) => {
    const excerpt = String(sn.excerpt || '').trim();
    const title = String(sn.source_title || 'Source').trim();
    const url = sn.url ? String(sn.url).trim() : '';
    lines.push(`${idx + 1}. ${excerpt}`);
    lines.push(`   Source: ${title}${url ? ` · ${url}` : ''}`);
    lines.push('');
  });
  lines.push(
    'Open the links to verify context. If this misses the idea, tell me which condition to zoom in on next.'
  );
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(
    '**Open web / Scout:** This chat turn did not run an external crawl. To pull allowlisted outside sources into Analyst, use **Scout** on your AO dashboard and run an **External scan**, then ask me what came in.'
  );
  return lines.join('\n');
}

function isExplicitPathPivot(text) {
  const s = String(text || '').trim().toLowerCase();
  if (!s) return false;
  return /\b(instead|switch|change|different path|pivot|not this|stop this)\b/.test(s);
}

/** Guess a series / campaign label from natural language (quoted phrase or known series names). */
function guessSeriesFocus(text) {
  const raw = String(text || '').trim();
  if (!raw) return '';
  const m = raw.match(/['"]([^'"]{3,56})['"]/);
  if (m) return m[1].trim();
  if (/\bpower\s+says\b/i.test(raw)) return 'Power Says';
  return '';
}

/** Extract structured voice traits from pasted posts (Training mode). */
async function extractTrainingVoiceFromPaste(sampleText) {
  const apiKey = getOpenAiKey();
  if (!apiKey) return { ok: false, error: 'Voice analysis unavailable (no API key).' };
  const prompt = `You analyze writing samples for an internal authoring assistant. Given pasted post(s) below, return ONLY valid JSON (no markdown fence) with keys:
cadence, diction, openings, closures, avoid, themes (array of 3-8 short strings), digest_one_line (one sentence summarizing voice).
Keep each string field under 200 characters. Be concrete (sentence length, directness, theological/pastoral register if present).

SAMPLES:
${safeText(sampleText, 14000)}`;
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
        max_tokens: 700,
        temperature: 0.25,
      }),
    });
    if (!res.ok) return { ok: false, error: 'Voice analysis request failed.' };
    const json = await res.json().catch(() => ({}));
    let content = json.choices?.[0]?.message?.content?.trim() || '';
    content = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
    const parsed = JSON.parse(content);
    const themes = Array.isArray(parsed.themes) ? parsed.themes.map((t) => safeText(t, 120)).filter(Boolean) : [];
    const digest = safeText(parsed.digest_one_line, 400);
    const profileMerge = {
      preferences: {
        voice_from_corpus: true,
      },
      clarified_answers: {
        voice_cadence: safeText(parsed.cadence, 400),
        voice_diction: safeText(parsed.diction, 400),
        voice_openings: safeText(parsed.openings, 400),
        voice_closures: safeText(parsed.closures, 400),
        voice_avoid: safeText(parsed.avoid, 400),
        voice_themes_sample: themes.slice(0, 8).join(' · '),
      },
      voice_training_extraction: {
        at: new Date().toISOString(),
        digest_one_line: digest,
      },
    };
    const userMessage = [
      '**Voice profile updated** from your pasted sample(s). Here is what I locked in for future drafts in this thread:',
      '',
      digest ? `**Summary:** ${digest}` : '',
      '',
      `- **Cadence:** ${safeText(parsed.cadence, 320) || '—'}`,
      `- **Diction:** ${safeText(parsed.diction, 320) || '—'}`,
      `- **Openings:** ${safeText(parsed.openings, 280) || '—'}`,
      `- **Closures:** ${safeText(parsed.closures, 280) || '—'}`,
      `- **Avoid:** ${safeText(parsed.avoid, 280) || '—'}`,
      themes.length ? `- **Recurring themes:** ${themes.join('; ')}` : '',
      '',
      'This complements your published corpus—paste more samples anytime in Training to refresh.',
    ]
      .filter(Boolean)
      .join('\n');
    return { ok: true, profileMerge, userMessage };
  } catch (e) {
    return { ok: false, error: safeText(e.message, 200) || 'Could not parse voice profile.' };
  }
}

function mergeMemoryProfiles(base, current) {
  const a = base && typeof base === 'object' ? base : {};
  const b = current && typeof current === 'object' ? current : {};
  return {
    ...a,
    ...b,
    preferences: {
      ...(a.preferences && typeof a.preferences === 'object' ? a.preferences : {}),
      ...(b.preferences && typeof b.preferences === 'object' ? b.preferences : {}),
    },
    clarified_answers: {
      ...(a.clarified_answers && typeof a.clarified_answers === 'object' ? a.clarified_answers : {}),
      ...(b.clarified_answers && typeof b.clarified_answers === 'object' ? b.clarified_answers : {}),
    },
    voice_training_extraction:
      b.voice_training_extraction && typeof b.voice_training_extraction === 'object'
        ? b.voice_training_extraction
        : a.voice_training_extraction && typeof a.voice_training_extraction === 'object'
          ? a.voice_training_extraction
          : undefined,
    path_history: Array.isArray(b.path_history) ? b.path_history : Array.isArray(a.path_history) ? a.path_history : [],
  };
}

async function loadPersistentAutoMemoryProfile(email, currentThreadId) {
  try {
    const out = await supabaseAdmin
      .from('ao_auto_threads')
      .select('id,state,updated_at')
      .eq('created_by_email', email)
      .neq('id', currentThreadId)
      .order('updated_at', { ascending: false })
      .limit(25);
    const rows = Array.isArray(out.data) ? out.data : [];
    for (const row of rows) {
      const st = row?.state && typeof row.state === 'object' ? row.state : null;
      if (!st) continue;
      if (st.memory_profile && typeof st.memory_profile === 'object') {
        return st.memory_profile;
      }
    }
  } catch (_) {
    /* optional memory bootstrap */
  }
  return {};
}

function updateMemoryProfileFromTurn(profile, userMessage, activePath) {
  const next = profile && typeof profile === 'object' ? { ...profile } : {};
  const prefs = next.preferences && typeof next.preferences === 'object' ? { ...next.preferences } : {};
  const clarified = next.clarified_answers && typeof next.clarified_answers === 'object' ? { ...next.clarified_answers } : {};
  const s = String(userMessage || '').trim().toLowerCase();
  if (!prefs.default_response_depth) prefs.default_response_depth = 'balanced';
  if (/\bconfirm-first\b|\bwait\b.*\byes\b/.test(s)) prefs.execution_style = 'confirm_then_run';
  if (/\bself-correct\b/.test(s)) prefs.failure_recovery = 'self_correct_then_ask_if_needed';
  if (/\bmy tone\b|\bmy voice\b|\bcorpus\b.*\bvoice\b/.test(s)) {
    prefs.voice_from_corpus = true;
    clarified.voice_requirement = 'Use Bart corpus voice with subject-aware variation.';
  }
  if (/\b99%\s*automation\b|\b1%\s*oversight\b/.test(s)) clarified.automation_target = '99_1';
  next.preferences = prefs;
  next.clarified_answers = clarified;
  next.last_active_path = activePath || next.last_active_path || 'general';
  const history = Array.isArray(next.path_history) ? [...next.path_history] : [];
  if (activePath) history.push({ path: activePath, at: new Date().toISOString() });
  next.path_history = history.slice(-20);
  next.updated_at = new Date().toISOString();
  return next;
}

function buildPathConfirmationMessage(path, decision) {
  const pathText = path === 'quote_campaign'
    ? 'quote-card campaign'
    : path === 'series_build'
      ? 'series planning and writing'
      : path === 'one_off_post'
        ? 'one-off post build'
        : path === 'corpus_lookup'
          ? 'corpus lookup'
          : path === 'corpus_build_day'
            ? 'long-form corpus build session'
            : path === 'package_publish'
              ? 'package/publish prep'
              : path === 'scout_findings'
                ? 'Scout findings review'
                : 'planning';
  const firstStep = path === 'quote_campaign'
    ? 'pull or prepare the first batch with overlap protection'
    : path === 'series_build'
      ? 'build the series map and launch Scout research lanes'
      : path === 'one_off_post'
        ? 'set the post angle and draft structure'
        : path === 'corpus_lookup'
          ? 'retrieve the strongest matching corpus passages'
          : path === 'corpus_build_day'
            ? 'set staged output blocks toward your word target'
            : path === 'package_publish'
              ? 'prepare package-ready outputs'
              : 'start with the next concrete step';
  return [
    `I understand this as a **${pathText}** request.`,
    `First step: ${firstStep}.`,
    decision?.secondary?.length ? `I also picked up: ${decision.secondary.join(', ')}.` : '',
    'Reply **yes** to run this path, or tell me what to change.',
  ].filter(Boolean).join('\n');
}

function detectConversationPath({ userMessage, msgForQuoteRouting, hasAttachments, currentState }) {
  const s = String(userMessage || '').trim().toLowerCase();
  const secondary = [];
  if (!s) return { primary: 'general', confidence: 0, secondary, needsClarification: true, clarifyingQuestion: 'What do you want me to do first?' };

  if (wantsScoutFindings(userMessage)) return { primary: 'scout_findings', confidence: 0.95, secondary, needsClarification: false };
  if (wantsCorpusThemeSearch(userMessage)) return { primary: 'corpus_lookup', confidence: 0.95, secondary, needsClarification: false };
  if (wantsCorpusTldrWork(userMessage)) return { primary: 'corpus_build_day', confidence: 0.9, secondary, needsClarification: false };
  if (wantsUserSuppliedQuoteCards(msgForQuoteRouting)) {
    return { primary: 'quote_campaign', confidence: 0.95, secondary, needsClarification: false };
  }
  if (wantsPublisherQuoteScheduleInquiry(msgForQuoteRouting) || wantsQuoteCardInventory(msgForQuoteRouting)) {
    return { primary: 'planning', confidence: 0.88, secondary: ['quote_status_inquiry'], needsClarification: false };
  }

  const quoteCampaignSignal =
    /\bquote\s+cards?\b/.test(s) ||
    /\bpull[- ]?quotes?\b/.test(s) ||
    (/\b\d+\s+more\b/.test(s) && /\bquote/.test(s));
  if (quoteCampaignSignal) {
    if (/\boverlap|repeat|already done|no overlap\b/.test(s)) secondary.push('overlap_guard');
    return { primary: 'quote_campaign', confidence: 0.88, secondary, needsClarification: false };
  }

  const seriesSignal =
    /\bseries\b/.test(s) &&
    /\b(journal|posts?|entries?)\b/.test(s);
  const scoutSignal = /\bscout\b/.test(s) && (/\bcrawl\b|\bresearch\b|\binternet\b|\bweb\b/.test(s));
  const aliConditionsSignal = /\bclarity\b.*\bconsistency\b.*\btrust\b/i.test(String(userMessage || '')) && /\balignment\b.*\bstability\b.*\bdrift\b/i.test(String(userMessage || ''));
  if (seriesSignal || (scoutSignal && /\bcorpus\b/.test(s)) || aliConditionsSignal) {
    if (scoutSignal) secondary.push('scout_research');
    if (/\bwrite\b|\bdraft\b/.test(s)) secondary.push('drafting');
    return { primary: 'series_build', confidence: 0.9, secondary, needsClarification: false };
  }

  const oneOffSignal =
    /\bone[- ]off\b/.test(s) ||
    /\bsingle\s+post\b/.test(s) ||
    /\bwrite\s+a\s+post\b/.test(s);
  if (oneOffSignal) return { primary: 'one_off_post', confidence: 0.88, secondary, needsClarification: false };

  const corpusBuildSignal =
    (/\b10,?000\b|\b\d{4,}\s+words?\b/.test(s) && /\bcorpus\b/.test(s)) ||
    (/\bbuild(?:ing)?\s+the\s+corpus\b/.test(s) && /\bday\b/.test(s));
  if (corpusBuildSignal) return { primary: 'corpus_build_day', confidence: 0.92, secondary, needsClarification: false };

  if (shouldAssumePackageMode(userMessage, hasAttachments)) return { primary: 'package_publish', confidence: 0.75, secondary, needsClarification: false };

  const lastPath = currentState?.path_state?.confirmed_path;
  if (lastPath && (isAffirmativeExecution(userMessage) || /\bkeep going|continue\b/.test(s))) {
    return { primary: lastPath, confidence: 0.9, secondary: ['continuation'], needsClarification: false };
  }

  if (looksLikePlanningOrDiscussionRequest(userMessage)) {
    return {
      primary: 'planning',
      confidence: 0.45,
      secondary,
      needsClarification: false,
      clarifyingQuestion: '',
    };
  }

  return { primary: 'general', confidence: 0.4, secondary, needsClarification: false };
}

function applyVoiceFidelityGate(message, activePath, memoryProfile) {
  const msg = String(message || '').trim();
  if (!msg) return { message: msg, changed: false };
  const writingPath = new Set(['series_build', 'one_off_post', 'corpus_build_day']);
  if (!writingPath.has(activePath)) return { message: msg, changed: false };
  const prefs = memoryProfile?.preferences && typeof memoryProfile.preferences === 'object' ? memoryProfile.preferences : {};
  if (!prefs.voice_from_corpus) return { message: msg, changed: false };
  let revised = msg;
  revised = revised.replace(/(^|\n)As an AI[^\n]*/gi, '$1').trim();
  revised = revised.replace(/(^|\n)Let me know if you'd like[^\n]*/gi, '$1').trim();
  revised = revised.replace(/(^|\n)I can also help with[^\n]*/gi, '$1').trim();
  return { message: revised || msg, changed: revised !== msg };
}

/** Merge durable quote-card lines/themes into Planning (and related) when the user is continuing work or overlap-checking. */
function shouldMergeQuoteCardContext(userMessage) {
  if (shouldLoadAccountQuoteCardContext(userMessage)) return true;
  if (wantsCorpusPullQuotes(userMessage) && /\b(overlap|repeat|previous|last batch|already|same lines)\b/i.test(userMessage)) return true;
  return false;
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
/** Pasted / project quotes vs corpus crawl: different caps (see deliverables + publish). */
function isUserPasteQuoteBatch(state, quotes) {
  if (state?.quote_card_origin === 'user_paste') return true;
  if (state?.quote_card_origin === 'corpus_pull') return false;
  if (!Array.isArray(quotes) || !quotes.length) return false;
  return quotes.every((q) => !String(q?.url || '').trim());
}

function wantsCorpusPullQuoteDeliverables(userMessage, state, messages) {
  if (wantsQuoteCardInventory(userMessage)) return false;
  const quotes = state?.corpus_pull_quotes;
  if (!Array.isArray(quotes) || !quotes.length) return false;
  const s0 = String(userMessage || '').trim();
  const s = s0.toLowerCase();
  const picking = /\b[1-9]\b/.test(s0) || /\ball\b/i.test(userMessage);
  if (wantsCorpusPullQuotes(userMessage) && !picking) return false;
  const hasDigit = /\b[1-9]\b/.test(s);
  const deliver =
    /\b(captions?|cards?|image cards?|branded|instagram|produce|generat|go ahead|get to work|make the|make them|selected|now|draft|minimal|square|fix|correct|repair|update|redo|rebuild|regenerat|refresh|logo|show|see|display|preview|read|pull up)\b/.test(
      s
    );
  return hasDigit || deliver;
}

/** User wants the text (and optional preview) of existing numbered quote cards — not a new corpus pull or batch generation. */
function wantsQuoteCardInspect(userMessage) {
  const s = String(userMessage || '').trim().toLowerCase();
  if (!s) return false;
  if (looksLikeFreshPastedCardBatch(userMessage)) return false;
  if (wantsUserSuppliedQuoteCards(userMessage)) return false;
  if (/\b\d+\s+more\s+(?:quote\s+)?cards?\s+about\b/.test(s)) return false;
  if (/\b(generate|create|make|build)\s+(?:me\s+)?(?:\d+\s+)?(?:new\s+)?(?:more\s+)?(?:quote\s+)?cards?\b/.test(s) && !/\b(show|see|text|what|which|read)\b/.test(s)) {
    return false;
  }

  const hasCardRef = /\b(card|cards|quote|quotes)\b/.test(s);
  if (!hasCardRef) return false;

  const inspectIntent =
    /\b(show|see|display|preview|pull up|what(?:'s| is)|what are|text|words|copy|lines?|tell me|give me|need to see|look at|read (?:back|out|me))\b/.test(s) ||
    /\b(which|what)\b.*\b(card|quote)\b/.test(s);
  const shortCardIndex = /\b(card|quote)\s*#?\s*(1[0-2]|[1-9])\b/.test(s) && s.length < 120;

  if (!inspectIntent && !shortCardIndex) return false;

  if (
    wantsCorpusPullQuotes(userMessage) &&
    /\b(find|pull|search|suggest|give me lines)\b/.test(s) &&
    /\b(from|in)\s+(?:my\s+)?corpus\b/.test(s) &&
    !inspectIntent
  ) {
    return false;
  }

  return (
    /\b(1[0-2]|[1-9])\b/.test(s) ||
    /\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)\b/.test(s) ||
    shortCardIndex
  );
}

function normalizeOrdinalWordsForCardParse(text) {
  let s = String(text || '');
  const pairs = [
    ['first', '1'],
    ['second', '2'],
    ['third', '3'],
    ['fourth', '4'],
    ['fifth', '5'],
    ['sixth', '6'],
    ['seventh', '7'],
    ['eighth', '8'],
    ['ninth', '9'],
    ['tenth', '10'],
  ];
  for (const [w, d] of pairs) {
    s = s.replace(new RegExp(`\\b${w}\\b`, 'gi'), d);
  }
  return s;
}

/** Card indices for inspect/show (supports card 10–12 and ordinals normalized to digits). */
function parseQuoteCardInspectIndices(text) {
  const s = normalizeOrdinalWordsForCardParse(stripGapPhrasesForCardIndexParse(String(text || '')));
  const nums = new Set();
  const labeled = s.match(/\b(?:card|quote)\s*#?\s*(1[0-2]|[1-9])\b/gi);
  if (labeled) {
    for (const frag of labeled) {
      const m = frag.match(/(1[0-2]|[1-9])/);
      if (m) nums.add(Number(m[1]));
    }
  }
  if (!nums.size) {
    const re = /\b(1[0-2]|[1-9])\b/g;
    let m;
    while ((m = re.exec(s))) {
      nums.add(Number(m[1]));
    }
  }
  const excluded = parseExcludedQuoteIndicesFromMessage(s);
  return [...nums].filter((n) => !excluded.has(n) && n >= 1 && n <= 50).sort((a, b) => a - b);
}

/** Messages are oldest-first; walk newest-to-oldest so the latest caption wins per index. */
function extractLatestPreviewCaptionsByIndex(messages) {
  const map = new Map();
  if (!Array.isArray(messages)) return map;
  for (let mi = messages.length - 1; mi >= 0; mi -= 1) {
    const row = messages[mi];
    if (row.role !== 'assistant') continue;
    const meta = row.meta && typeof row.meta === 'object' ? row.meta : null;
    const previews = meta?.quote_card_previews;
    if (!Array.isArray(previews)) continue;
    for (const p of previews) {
      const idx = Number(p.index);
      if (!Number.isFinite(idx) || idx < 1) continue;
      if (!map.has(idx)) {
        map.set(idx, {
          caption: String(p.caption || ''),
          caption_x: String(p.caption_x || ''),
        });
      }
    }
  }
  return map;
}

/** Latest assistant turn that included quote_card_previews — which indices were built. */
function extractLastBuiltIndicesFromMessages(messages) {
  const out = new Set();
  if (!Array.isArray(messages)) return [];
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const row = messages[i];
    if (row.role !== 'assistant') continue;
    const meta = row.meta && typeof row.meta === 'object' ? row.meta : null;
    const previews = meta?.quote_card_previews;
    if (!Array.isArray(previews) || !previews.length) continue;
    for (const p of previews) {
      const idx = Number(p.index);
      if (Number.isFinite(idx) && idx >= 1) out.add(idx);
    }
    break;
  }
  return [...out].sort((a, b) => a - b);
}

/**
 * After a partial card build, keep every index 1..N in publish_candidates so edits and Publish
 * still see the full pool (merge new rows with previous state; stub missing SVG only when needed).
 */
async function mergePublishCandidatesForAllQuotes({
  allQuotes,
  currentState,
  existingMessages,
  indices,
  selected,
  previews,
  captions,
  captionsX,
  logoUrl,
}) {
  const PLACEHOLDER_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>';
  const maxN = allQuotes.length;
  const prevList =
    Array.isArray(currentState.publish_candidates) && currentState.publish_candidates.length
      ? currentState.publish_candidates
      : rebuildPublishCandidatesFromMessages(existingMessages, allQuotes);
  const prevByIdx = new Map(prevList.map((c) => [c.corpus_index, c]));
  const built = new Map();
  indices.forEach((n, i) => {
    const q = selected[i];
    const pr = previews[i];
    const svg = pr?.svg && String(pr.svg).trim() ? pr.svg : PLACEHOLDER_SVG;
    const row = normalizePublishCandidate({
      corpus_index: n,
      quote: q.quote,
      source_title: q.source_title,
      url: q.url || '',
      caption: captions[i] || '',
      caption_x: captionsX[i] || '',
      svg,
      image_url: pr?.image_url || '',
    });
    if (row) built.set(n, row);
  });
  const out = [];
  for (let n = 1; n <= maxN; n += 1) {
    if (built.has(n)) {
      out.push(built.get(n));
    } else if (prevByIdx.has(n)) {
      out.push(prevByIdx.get(n));
    } else {
      const q = allQuotes[n - 1];
      const rendered = renderQuoteCardSvg({
        quote: q.quote,
        sourceName: q.source_title,
        logoUrl,
        style: 'minimal',
        minimalVariant: 'dark',
        forceLightLogo: true,
      });
      let image_url = '';
      if (rendered.ok) {
        try {
          const up = await uploadMinimalQuoteCardToPublicUrl(
            { quote: q.quote, sourceName: q.source_title, logoUrl },
            { subfolder: 'auto-hub-quote-cards' }
          );
          if (up.ok) image_url = up.publicUrl;
        } catch (_) {}
      }
      const row = normalizePublishCandidate({
        corpus_index: n,
        quote: q.quote,
        source_title: q.source_title,
        url: q.url || '',
        caption: '',
        caption_x: '',
        svg: rendered.ok ? rendered.svg : PLACEHOLDER_SVG,
        image_url,
      });
      if (row) out.push(row);
    }
  }
  return out;
}

/** “Where are my cards / list all quotes / inventory” — factual list from thread state (before inspect/deliverables). */
function wantsQuoteCardInventory(userMessage) {
  const s = String(userMessage || '').trim().toLowerCase();
  if (!s) return false;
  if (looksLikeFreshPastedCardBatch(userMessage)) return false;
  if (wantsUserSuppliedQuoteCards(userMessage)) return false;
  if (wantsQuoteCardInspect(userMessage)) return false;
  if (wantsPublisherQuoteScheduleInquiry(userMessage)) return false;
  return (
    /\b(where (?:did|are)|what happened to|lost|missing|disappear)\b.*\b(card|quote|line|lines)\b/.test(s) ||
    /\b(how many|full list|list all|inventory|every quote|all candidates|all cards|all lines)\b/.test(s) ||
    /\bwhere\b.*\b(my|the)\b.*\b(card|quote|quotes|lines)\b/.test(s) ||
    /\b(show|give)\s+me\s+(?:a\s+)?(?:full\s+)?(?:list|inventory)\b/.test(s)
  );
}

/** How many / status about quote cards in the Publisher queue — not starting a new quote-card campaign. */
function wantsPublisherQuoteScheduleInquiry(userMessage) {
  const s = String(userMessage || '').trim().toLowerCase();
  if (!s) return false;
  if (looksLikeFreshPastedCardBatch(userMessage)) return false;
  if (wantsUserSuppliedQuoteCards(userMessage)) return false;
  const cardish =
    /\bquote\s+cards?\b/.test(s) ||
    /\bpull\s+quotes?\b/.test(s) ||
    (/\bcards?\b/.test(s) && /\b(quote|quotes)\b/.test(s));
  if (!cardish) return false;
  return (
    /\b(scheduled|publisher|publish queue|in the queue|queued for publish|going live|social schedule)\b/.test(s) ||
    (/\b(how many|count|number of|what'?s|research|find out|look up|check on)\b/.test(s) &&
      /\b(scheduled|queue|publisher|publish)\b/.test(s))
  );
}

function extractQuotedTopicPhrase(text) {
  const m = String(text || '').match(/['"]([^'"]{2,80})['"]/);
  return m ? String(m[1]).trim() : '';
}

async function fetchScheduledPublisherQuoteCardsForOwner(email, topicSubstring) {
  const owner = String(email || '').toLowerCase().trim();
  const needle = String(topicSubstring || '').trim().toLowerCase();
  const nowIso = new Date().toISOString();
  try {
    const out = await supabaseAdmin
      .from('ao_scheduled_posts')
      .select('id, platform, scheduled_at, text, intent, source_kind, best_move, status')
      .eq('status', 'scheduled')
      .gte('scheduled_at', nowIso)
      .order('scheduled_at', { ascending: true })
      .limit(400);
    if (out.error) return { ok: false, rows: [], error: out.error.message };
    let rows = Array.isArray(out.data) ? out.data : [];
    rows = rows.filter((r) => {
      const intent = r.intent && typeof r.intent === 'object' ? r.intent : {};
      const em = String(intent.created_by_email || '').toLowerCase().trim();
      const isQuoteCard =
        r.source_kind === 'auto_pull_quote_card' ||
        r.best_move === 'pull_quote_card' ||
        intent.auto_hub === true;
      if (!isQuoteCard) return false;
      if (owner) {
        if (em && em !== owner) return false;
        if (!em) return false;
      }
      return true;
    });
    if (needle) {
      rows = rows.filter((r) => String(r.text || '').toLowerCase().includes(needle));
    }
    return { ok: true, rows };
  } catch (e) {
    return { ok: false, rows: [], error: e.message };
  }
}

function formatScheduledPublisherQuoteCardsAnswer(rows, topicPhrase) {
  const topic = String(topicPhrase || '').trim();
  const header =
    topic.length > 0
      ? `**Publisher queue (scheduled)** — rows whose caption/body matches **${topic.slice(0, 80)}** (case-insensitive):`
      : '**Publisher queue (scheduled)** — quote-card style rows from Auto Hub (future times only):';
  if (!Array.isArray(rows) || !rows.length) {
    return [
      header,
      '',
      topic.length > 0
        ? `No matching scheduled rows found. Try a shorter phrase, or open **Publisher** on your dashboard for the full list.`
        : `No upcoming quote-card Publisher rows found. If you scheduled under a different account or before columns existed, check **Publisher** directly.`,
    ].join('\n');
  }
  const indices = new Set();
  for (const r of rows) {
    const intent = r.intent && typeof r.intent === 'object' ? r.intent : {};
    const ci = intent.corpus_index;
    if (ci != null && Number.isFinite(Number(ci))) indices.add(Number(ci));
  }
  const distinctCards = indices.size;
  const fmtWhen = (iso) => {
    try {
      return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return String(iso || '');
    }
  };
  const lines = [
    header,
    '',
    `**${rows.length}** scheduled post row(s) in the queue.`,
    distinctCards > 0
      ? `About **${distinctCards}** distinct card index(es) appear in metadata (quote cards often produce one row per network per card).`
      : `These rows may predate per-card metadata—count rows ÷ networks if you always schedule all four.`,
    '',
    'Next slots:',
    '',
  ];
  const cap = Math.min(rows.length, 24);
  for (let i = 0; i < cap; i += 1) {
    const r = rows[i];
    const intent = r.intent && typeof r.intent === 'object' ? r.intent : {};
    const ci = intent.corpus_index != null ? `#${intent.corpus_index}` : '—';
    const excerpt = safeText(stripMarkdownBoldForCardDisplay(String(r.text || '').replace(/\s+/g, ' ')), 140);
    lines.push(`- **${r.platform || '?'}** · ${fmtWhen(r.scheduled_at)} · card ${ci} · ${excerpt}${String(r.text || '').length > 140 ? '…' : ''}`);
  }
  if (rows.length > cap) lines.push(`… and **${rows.length - cap}** more row(s). Open Publisher for the full queue.`);
  lines.push('');
  lines.push('This is read from your scheduled-posts table in this same turn—not background research.');
  return lines.join('\n');
}

/** Meta-instructions meant for external dev tools — not Auto on this site. */
function wantsMetaDevAgentInstruction(userMessage) {
  const s = String(userMessage || '').trim().toLowerCase();
  if (!s) return false;
  return (
    /\bimplement the plan\b/.test(s) ||
    /\bdo not edit the plan file\b/.test(s) ||
    /\bmark\s+.*\s+as\s+in_?progress\b/.test(s) ||
    /\bto-?dos?\b.*\b(from the plan|already created|in progress)\b/.test(s)
  );
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

function trimMessagesForAskModel(messages, historyMax, perMsgMax) {
  const slice = (Array.isArray(messages) ? messages : []).slice(-historyMax);
  return slice.map((m) => ({
    role: m.role,
    content: safeText(m.content, perMsgMax),
  }));
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
  threadSnapshot = null,
  workflowHint = '',
}) {
  const apiKey = getOpenAiKey();
  if (!apiKey) return null;

  const historyMax = Math.min(80, Math.max(12, Number(process.env.AO_AUTO_CHAT_HISTORY_MESSAGES) || 40));
  const perMsgMax = Math.min(8000, Math.max(400, Number(process.env.AO_AUTO_CHAT_MESSAGE_MAX_CHARS) || 2500));
  const recentForPrompt = trimMessagesForAskModel(messages, historyMax, perMsgMax);

  const isPlanOrWrite = mode === 'plan' || mode === 'write' || mode === 'general';

  const snap = threadSnapshot && typeof threadSnapshot === 'object' ? threadSnapshot : {};
  const hasAccountQuoteCardMemory =
    Array.isArray(snap.recent_quote_card_context_from_account) && snap.recent_quote_card_context_from_account.length > 0;
  const hasThreadQuoteCardData =
    Number(snap.corpus_pull_quotes_count) > 0 ||
    Number(snap.publish_candidates_count) > 0 ||
    (Array.isArray(snap.quote_previews) && snap.quote_previews.length > 0);
  const hasSeriesResearchPack =
    snap.series_research_pack_this_turn &&
    typeof snap.series_research_pack_this_turn === 'object' &&
    snap.series_research_pack_this_turn.completed === true;

  const prompt = `You are Auto inside AO Automation. Bart is the only user.

You are NOT Archy. Archy is the public-facing assistant on the website; you are Auto — internal research and packaging for Bart and the automation team only. Never confuse those names in receipts or advice.

Current mode: ${JSON.stringify(mode)}
User asked not to refine / treat post as frozen: ${dontRefine ? 'YES — do not suggest edits; only package, plan, recall, or flag major risks if asked.' : 'no'}

Authoritative thread snapshot (from the product database for this conversation — do not contradict counts or pending steps):
${JSON.stringify(snap)}
${workflowHint ? `\nWorkflow hint: ${workflowHint}\n` : ''}
${hasAccountQuoteCardMemory ? '\nAccount quote-card memory: **recent_quote_card_context_from_account** in the snapshot is real prior work (saved Auto sessions and/or your publish trail). If Bart asks to continue quote-card work, avoid overlap with past lines, jump back in after a new chat, or recall what was already generated: summarize and use this context. Do **not** say recall is impossible or that this reply has no access to prior cards when that array is non-empty.\n' : ''}
${hasThreadQuoteCardData ? '\nThis thread snapshot includes **quote_previews** / quote-card counts (corpus_pull_quotes / publish_candidates). If Bart asks for the **text** of a specific card number, those lines are in the snapshot—do **not** claim you cannot access or show them; repeat the relevant preview text or say clearly which card index is out of range.\n' : ''}
${snap.rapid_write_active ? '\nRapid Write: the snapshot includes rapid_write_seeds (ids, ideas, flags). If rapid_write_drafts is present, saved draft text is there—only the system revision path actually changes those drafts; do not claim you saved edits unless a system step did. Questions about strategy, overlap, or extending a corpus post must get a direct answer—not a menu of commands unless he only wants that.\n' : ''}

Non-negotiables (hard rules):
- Never silently rewrite his words. Never "polish" or swap wording unless he explicitly asks for editing help.
- If intent is ambiguous, ask direct clarifying questions before doing heavy work. Do not guess.
- **Conversation-first:** Bart does **not** need special phrases or "path" confirmations for research, planning, drafts, design ideas, librarian counts, or discussion. Answer directly in plain language. Optional \`confirmed_path\` in the snapshot is an internal hint only—not something you ask him to confirm unless he is about to trigger an irreversible publish/schedule action described in the snapshot.
- **Honesty about research:** Do NOT say Scout, internet crawls, external scans, or "background research" **started**, **is running**, **was initiated**, or **will continue in the background** unless the thread snapshot explicitly documents a **completed** matching action for this same turn (for example \`series_research_pack_this_turn.completed === true\` means **in-corpus** snippet retrieval only—not an open-web crawl). If nothing in the snapshot proves a crawl or background job, say plainly what did and did not run.
- **Irreversible actions only:** Ask for explicit yes/proceed only when the snapshot shows a pending **publisher schedule**, **package Proceed**, or similar real-world posting step—not for brainstorming or drafting.
- Do **not** invent numbered **software / implementation / compliance** task lists, fake **todo boards**, or pretend you are **executing** a development plan, Cursor todos, or edits to an attached plan file. You are Auto inside this product only.
- If his message sounds like meta-instructions for an external task system ("implement the plan," "mark todos in progress"), answer in one short paragraph: you do not run those systems here; give **one** concrete next step for quote cards in AO (e.g. pick numbers, **Show card N**, or ask for a full list of lines in this thread).
- If current mode is "plan" or "write" or he is asking to plan, design, brainstorm, or figure out pull quotes / a series / campaigns: stay in conversation. Offer steps, tradeoffs, and questions. Do NOT say you already packaged a post, do NOT list fake receipts, and do NOT tell him to tap Proceed — there is no bundle until he pastes a finished post or explicitly asks to package.
- If current mode is "package" and he pasted a finished piece: then describe packaging (Journal + channel drafts + schedule) without rewriting his words.
- Modes you respect from context: plan, write, package, publish, recall, training, general.
- Quality: only challenge wording for major public risks if relevant; do not nitpick style.
- Be conversational, direct, short paragraphs. If unsure, one clarifying question.
- Use memory_profile from thread snapshot as durable preference memory (voice, execution style, recovery style). Apply it across turns.
${snap.voice_training_digest ? `\n- **Voice training:** snapshot includes voice_training_digest / clarified voice fields from Training-mode paste—prioritize them when drafting so tone matches Bart.\n` : ''}
${Array.isArray(snap.series_overlap_hints) && snap.series_overlap_hints.length ? '\n- **Series overlap hints:** numbered excerpts in snapshot may overlap a named series—cite them when advising on non-redundant posts.\n' : ''}
- **Capabilities (no magic words):** Bart may combine research, planning, writing, visual/design ideas, publishing timing, and factual "librarian" questions in one conversation. Treat these as normal dialogue; never tell him to "run a path" or reply yes to a labeled workflow unless posting is truly imminent.
${isPlanOrWrite ? '\n- For quote-card requests, infer intent from natural language first; do not require exact trigger wording. If he pasted his own quote lines, use that text verbatim on images rather than corpus retrieval.\n- If he asks to find pull quotes from the corpus, the system may already inject real candidate lines in the same turn—do not promise to "gather quotes later" or imply background research; reinforce the numbered list if present.\n- If he already has candidate quotes in this thread and asks for captions and/or image cards (or picks numbers like 1, 2, 3), the system may attach captions and square card previews in the same turn. Do not only outline steps or ask for design choices he already settled—briefly confirm what was generated. Do not repeat the full numbered quote list unless he asks.\n- If he asks where something appears on the site / in his corpus and this turn did NOT include a numbered list of excerpts with sources from the system, do NOT invent specific page titles, slugs, or URLs. Say you cannot search the published library from this reply alone and suggest he ask for corpus retrieval.\n- He may be designing pull-quote cards or a content series: work with him iteratively. Suggest cadence and what to design next — without claiming the bundle is already built.\n' : ''}
${hasSeriesResearchPack ? '\n- **Series corpus pack this turn:** \`series_research_pack_this_turn\` is true. The UI will prepend a "### Corpus research (this turn)" block for Bart—**do not paste that full numbered excerpt list again** inside \`assistant_message\`; acknowledge themes briefly and continue the series plan.\n' : ''}

Guardrails:
${guardrails.map((g) => `- ${g.rule_text}`).join('\n') || '- none'}

System proof-of-work (timestamps for trust):
${automationProofLines.length ? automationProofLines.map((x) => `- ${x}`).join('\n') : '- not available'}

Recent opportunities snapshot (last ~24h lists may be partial):
${JSON.stringify(findings)}

Current bundle summary:
${JSON.stringify(bundleSummary || null)}

Recent conversation (${recentForPrompt.length} turns, oldest first in this block):
${JSON.stringify(recentForPrompt)}

Latest user message:
${JSON.stringify(safeText(message, 6000))}

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
        max_tokens: Math.min(2500, Math.max(600, Number(process.env.AO_AUTO_MAX_TOKENS) || 1200)),
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
    if (isAutoAgentToolsEnabled()) {
      await runAutoAgentToolLoop();
    }

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
    const persistedMemoryProfile = await loadPersistentAutoMemoryProfile(auth.email, thread.id);
    const initialMemoryProfile = mergeMemoryProfiles(persistedMemoryProfile, currentState.memory_profile);
    let nextMode = detectAutoMode(userMessage, fullState.thread.current_mode || 'general');
    let statePatch = { ...currentState, memory_profile: initialMemoryProfile };

    let msgForQuoteRouting = userMessage;
    let intentRoute = null;
    const rwPre = currentState.rapid_write && typeof currentState.rapid_write === 'object' ? currentState.rapid_write : null;
    if (!rwPre?.active) {
      try {
        const resolved = await resolveQuoteRoutingMessage(userMessage, {
          currentState,
          existingMessages,
          nextMode,
          email: auth.email,
        });
        msgForQuoteRouting = resolved.msgForQuoteRouting;
        intentRoute = resolved.intentRoute;
      } catch (_) {
        msgForQuoteRouting = userMessage;
      }
    }

    /** No forced "reply yes to run this path" walls — conversation-first. Irreversible publisher actions keep their own in-flow confirms. */
    const majorConfirmPaths = new Set();
    const pathDecision = detectConversationPath({
      userMessage,
      msgForQuoteRouting,
      hasAttachments: activeAttachments.length > 0,
      currentState,
    });
    const prevPathState = currentState.path_state && typeof currentState.path_state === 'object' ? currentState.path_state : {};
    const pathState = { ...prevPathState };
    let activePath = safeText(pathState.confirmed_path, 60) || '';
    let forcedAssistantMessage = '';
    let pathReceipts = [];
    const affirmative = isAffirmativeExecution(userMessage);
    const pivot = isExplicitPathPivot(userMessage);

    if (safeText(pathState.pending_path, 60)) {
      if (affirmative) {
        activePath = safeText(pathState.pending_path, 60);
        pathState.confirmed_path = activePath;
        pathState.pending_path = '';
        pathReceipts.push(`Path confirmed: ${activePath}`);
      } else if (!pivot) {
        pathState.pending_path = '';
        pathReceipts.push('Cleared old path confirmation — continuing in conversation.');
      }
    }

    if (!forcedAssistantMessage) {
      const candidatePath = safeText(pathDecision.primary, 60);
      const shouldSwitch = !activePath || (pivot && candidatePath && candidatePath !== activePath);
      if (shouldSwitch) {
        if (pathDecision.needsClarification) {
          forcedAssistantMessage = safeText(pathDecision.clarifyingQuestion, 300) || 'Quick check: what should I run first?';
          pathState.pending_path = '';
        } else if (candidatePath && majorConfirmPaths.has(candidatePath) && !affirmative) {
          pathState.pending_path = candidatePath;
          pathState.last_preview = buildPathConfirmationMessage(candidatePath, pathDecision);
          forcedAssistantMessage = pathState.last_preview;
        } else if (candidatePath) {
          activePath = candidatePath;
          pathState.confirmed_path = candidatePath;
          pathState.pending_path = '';
          pathReceipts.push(`Path set: ${candidatePath}`);
        }
      }
    }

    if (!activePath && safeText(pathState.confirmed_path, 60)) {
      activePath = safeText(pathState.confirmed_path, 60);
    }
    pathState.updated_at = new Date().toISOString();
    statePatch.path_state = pathState;
    statePatch.memory_profile = updateMemoryProfileFromTurn(statePatch.memory_profile, userMessage, activePath || 'general');

    if (impliesNoRefine(userMessage)) statePatch.dont_refine = true;
    if (intentRoute?.intent === 'corpus_pull' && intentRoute.confidence >= 0.6) {
      nextMode = 'plan';
    } else if (looksLikePlanningOrDiscussionRequest(userMessage) && nextMode !== 'recall') {
      nextMode = 'plan';
    } else if (wantsCorpusTldrWork(userMessage)) {
      nextMode = 'plan';
    } else if (wantsQueueCorpusDraft(userMessage) && (!activePath || activePath === 'corpus_lookup' || activePath === 'corpus_build_day' || activePath === 'planning')) {
      nextMode = 'plan';
    } else if (wantsCorpusPullQuotes(msgForQuoteRouting)) {
      nextMode = 'plan';
    } else if (wantsCorpusThemeSearch(userMessage)) {
      nextMode = 'plan';
    } else if (
      shouldAssumePackageMode(userMessage, activeAttachments.length > 0) &&
      !wantsScoutFindings(userMessage) &&
      !wantsCorpusPullQuotes(msgForQuoteRouting) &&
      !wantsCorpusThemeSearch(userMessage) &&
      !wantsCorpusTldrWork(userMessage) &&
      !wantsQueueCorpusDraft(userMessage) &&
      nextMode !== 'training' &&
      nextMode !== 'recall'
    ) {
      nextMode = 'package';
    }

    nextMode = finalizeAutoModeForQuoteWork(userMessage, nextMode);

    if (wantsExitTrainingMode(userMessage)) {
      nextMode = 'plan';
    }

    let accountQuoteCardContextItems = null;
    const mergeQuoteCardCtx =
      shouldMergeQuoteCardContext(userMessage) ||
      nextMode === 'recall' ||
      (intentRoute &&
        intentRoute.confidence >= 0.5 &&
        (intentRoute.entities?.references_prior_work ||
          intentRoute.intent === 'continue_quote_series' ||
          intentRoute.intent === 'paste_quote_batch'));
    if (mergeQuoteCardCtx) {
      try {
        const ctx = await fetchAccountQuoteCardContext(auth.email);
        if (ctx.items?.length) accountQuoteCardContextItems = ctx.items;
      } catch (_) {
        /* ignore */
      }
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
    if (pathReceipts.length) receipts.push(...pathReceipts);
    if (accountQuoteCardContextItems?.length) {
      receipts.push('Loaded quote-card memory from your account for continuity');
    }
    if (intentRoute?.continuationGenerated) {
      pushTransparencyReceipt(receipts, 'Continuation: new quote lines generated to match your account/publish style, then routed into the card builder.');
    }
    if (intentRoute?.model && intentRoute?.intent === 'paste_quote_batch' && intentRoute.extracted_quotes?.length >= 2) {
      pushTransparencyReceipt(receipts, 'Intent routing: extracted quote lines from your message for the card pipeline.');
    }
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
    let rapidWriteHandled = false;

    if (forcedAssistantMessage) {
      rapidWriteHandled = true;
      nextMode = 'plan';
      assistantMessage = forcedAssistantMessage;
    }

    const rwExisting = currentState.rapid_write && typeof currentState.rapid_write === 'object' ? currentState.rapid_write : null;

    if (wantsExitRapidWrite(userMessage) && rwExisting?.active) {
      rapidWriteHandled = true;
      nextMode = 'plan';
      statePatch.rapid_write = null;
      receipts.push('Exited Rapid Write mode');
      assistantMessage =
        'Rapid Write mode ended. Your thread is back to general Auto. Say **Rapid Write** and paste your seed list when you want to start again.';
    } else if (wantsRapidWriteAgentTraining(userMessage) && rwExisting?.active) {
      rapidWriteHandled = true;
      nextMode = 'plan';
      const body = extractAgentTrainingBody(userMessage);
      const prev = Array.isArray(rwExisting.agent_training) ? [...rwExisting.agent_training] : [];
      if (body) prev.push(body);
      statePatch.rapid_write = { ...rwExisting, agent_training: prev.slice(-20) };
      receipts.push('Agent Training (Rapid Write): instruction stored for this thread');
      assistantMessage =
        '**Agent Training** received. I will apply these instructions to Rapid Write drafting in this thread. No publishable draft was generated this turn.\n\n' +
        (body ? `Stored:\n${body.slice(0, 1200)}${body.length > 1200 ? '…' : ''}` : '(Empty instruction — add text after **Agent Training:** or on following lines.)');
    } else if (wantsRapidWriteActivation(userMessage)) {
      rapidWriteHandled = true;
      nextMode = 'plan';
      const parsed = await parseOrExtractRapidWriteSeeds(userMessage);
      if (!parsed.ok) {
        assistantMessage = [
          '**Rapid Write** could not turn your message into seeds.',
          '',
          safeText(parsed.error, 1200),
          '',
          'Tip: On the first line write **Rapid Write**, then paste your list (bullets, numbers, or paragraphs—no special format required). The system interprets it. If you use a JSON array in a code block, that still works.',
        ].join('\n');
      } else {
        const validation = await validateRapidWriteSeeds(parsed.seeds, auth.email);
        statePatch.rapid_write = {
          active: true,
          seeds: parsed.seeds,
          validation,
          overrides: [],
          agent_training: Array.isArray(rwExisting?.agent_training) ? rwExisting.agent_training : [],
          written_ids: [],
          drafts_by_seed_id: {},
          batch_used_first_names: [],
          batch_prior_titles: [],
          batch_prior_closing_snippets: [],
          batch_prior_reflection_questions: [],
          batch_anti_repeat_snippets: [],
          queue: parsed.seeds.map((s) => s.id),
          step: 'validated',
          last_ask_batch: null,
        };
        receipts.push(`Rapid Write: loaded ${parsed.seeds.length} seed(s); validation run`);
        const lines = [
          `**Rapid Write** loaded **${parsed.seeds.length}** seed(s). Validation (corpus overlap + optional plain-fact check) is complete.`,
          '',
        ];
        validation.forEach((v) => {
          const seed = parsed.seeds.find((s) => s.id === v.id);
          const title = seed ? safeText(seed.core_idea, 80) : v.id;
          if (v.flags.length) {
            lines.push(
              `- **${v.id}** — FLAGGED: ${v.flags
                .map((f) => {
                  const tag = f.type === 'plain_fact' ? 'plain-fact' : f.type;
                  return `[${tag}] ${f.detail}`;
                })
                .join(' ')}`
            );
          } else {
            lines.push(`- **${v.id}** — OK — ${title}${title.length >= 80 ? '…' : ''}`);
          }
        });
        lines.push(
          '',
          'Reply **Run all seeds** to draft the **whole batch** (every seed—overlap and plain-fact advisories do not block run-all). **Next seed** drafts one at a time and still skips flagged seeds until you approve them or say **do it anyway**. Say **Exit Rapid Write** to leave this mode.'
        );
        assistantMessage = lines.join('\n');
      }
    } else if (rwExisting?.active) {
      const overrideResult = collectRapidWriteOverrideIds(userMessage, rwExisting);
      const rwAfterOverrides =
        overrideResult.source !== 'none'
          ? { ...rwExisting, overrides: [...overrideResult.overrides] }
          : rwExisting;
      if (overrideResult.source !== 'none') {
        statePatch.rapid_write = {
          ...rwAfterOverrides,
          memory: {
            ...(rwAfterOverrides.memory && typeof rwAfterOverrides.memory === 'object' ? rwAfterOverrides.memory : {}),
            standing_instructions: Array.isArray(rwAfterOverrides.agent_training)
              ? rwAfterOverrides.agent_training.slice(-6)
              : [],
            last_action: 'overrides_updated',
            last_override_source: overrideResult.source,
            updated_at: new Date().toISOString(),
          },
        };
        receipts.push(`Rapid Write: seed approval updated (${overrideResult.source})`);
      }

      if (wantsRunAllSeeds(userMessage)) {
      rapidWriteHandled = true;
      nextMode = 'plan';
      const seeds = Array.isArray(rwAfterOverrides.seeds) ? rwAfterOverrides.seeds : [];
      const validation = Array.isArray(rwAfterOverrides.validation) ? rwAfterOverrides.validation : [];
      const overrides = new Set(Array.isArray(rwAfterOverrides.overrides) ? rwAfterOverrides.overrides : []);
      const writtenIds = new Set(Array.isArray(rwAfterOverrides.written_ids) ? rwAfterOverrides.written_ids : []);
      const agentTraining = Array.isArray(rwAfterOverrides.agent_training) ? rwAfterOverrides.agent_training : [];
      const isWritable = (sid) => rapidWriteSeedIsDraftable(sid, validation, overrides, 'run_all');
      const pending = seeds.filter((s) => !writtenIds.has(s.id) && isWritable(s.id));
      if (!pending.length) {
        statePatch.rapid_write = {
          ...rwAfterOverrides,
          memory: {
            ...(rwAfterOverrides.memory && typeof rwAfterOverrides.memory === 'object' ? rwAfterOverrides.memory : {}),
            last_action: 'run_all_blocked',
            updated_at: new Date().toISOString(),
          },
        };
        assistantMessage =
          'No seeds left to draft in this batch—everything may already have a draft—or there are no seeds loaded. Say **Exit Rapid Write** or start again with **Rapid Write** and your seed list.';
      } else {
        const drafts = [];
        const draftsBySeed =
          rwAfterOverrides.drafts_by_seed_id && typeof rwAfterOverrides.drafts_by_seed_id === 'object'
            ? { ...rwAfterOverrides.drafts_by_seed_id }
            : {};
        const openingSnips = [];
        let batchUsedFirstNames = Array.isArray(rwAfterOverrides.batch_used_first_names)
          ? [...rwAfterOverrides.batch_used_first_names]
          : [];
        let batchPriorReflectionQuestions = Array.isArray(rwAfterOverrides.batch_prior_reflection_questions)
          ? [...rwAfterOverrides.batch_prior_reflection_questions]
          : [];
        let batchAntiRepeatSnippets = Array.isArray(rwAfterOverrides.batch_anti_repeat_snippets)
          ? [...rwAfterOverrides.batch_anti_repeat_snippets]
          : [];
        let batchPriorTitles = Array.isArray(rwAfterOverrides.batch_prior_titles)
          ? [...rwAfterOverrides.batch_prior_titles]
          : [];
        let batchPriorClosingSnippets = Array.isArray(rwAfterOverrides.batch_prior_closing_snippets)
          ? [...rwAfterOverrides.batch_prior_closing_snippets]
          : [];
        let batchPriorBodyHeads = Array.isArray(rwAfterOverrides.batch_prior_body_heads)
          ? [...rwAfterOverrides.batch_prior_body_heads]
          : [];
        for (const seed of pending) {
          const vRow = validation.find((x) => x.id === seed.id);
          const diffHint = vRow?.differentiation_hint ? safeText(vRow.differentiation_hint, 1200) : '';
          const batchPatternIndex = Math.max(0, seeds.findIndex((s) => s.id === seed.id));
          const w = await writeRapidWritePost(seed, {
            agentTrainingNotes: agentTraining,
            batchOpeningSnippets: [...openingSnips],
            batchUsedFirstNames,
            batchPriorReflectionQuestions,
            batchAntiRepeatSnippets,
            batchPriorTitles,
            batchPriorClosingSnippets,
            batchPriorBodyHeads,
            batchPatternIndex,
            differentiationHint: diffHint,
          });
          if (w.ok) {
            writtenIds.add(seed.id);
            drafts.push(w);
            openingSnips.push(rapidWriteOpeningSnippet(w.body));
            for (const n of extractRapidWriteFirstNamesFromBody(w.body)) {
              if (!batchUsedFirstNames.some((x) => String(x).toLowerCase() === n.toLowerCase())) {
                batchUsedFirstNames.push(n);
              }
            }
            if (w.reflection_question) {
              batchPriorReflectionQuestions.push(safeText(w.reflection_question, 500));
            }
            batchAntiRepeatSnippets.push(...rapidWriteBodySignatureSnippets(w.body));
            if (batchAntiRepeatSnippets.length > 64) {
              batchAntiRepeatSnippets = batchAntiRepeatSnippets.slice(-64);
            }
            if (w.title) batchPriorTitles.push(safeText(w.title, 220));
            batchPriorClosingSnippets.push(rapidWriteClosingSnippet(w.body));
            batchPriorBodyHeads.push(String(w.body || '').slice(0, 560));
            if (batchPriorTitles.length > 48) batchPriorTitles = batchPriorTitles.slice(-48);
            if (batchPriorClosingSnippets.length > 48) {
              batchPriorClosingSnippets = batchPriorClosingSnippets.slice(-48);
            }
            if (batchPriorBodyHeads.length > 16) batchPriorBodyHeads = batchPriorBodyHeads.slice(-16);
            let corpusDraftId = null;
            try {
              const ins = await supabaseAdmin
                .from('ao_corpus_drafts')
                .insert({
                  created_by_email: auth.email,
                  topic: w.title || 'Rapid Write',
                  status: 'draft',
                  tldr_markdown: w.markdown,
                  meta: { source: 'rapid_write', seed_id: seed.id, slug: w.slug },
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .select('id')
                .single();
              if (!ins.error && ins.data?.id) corpusDraftId = ins.data.id;
            } catch {
              /* table may be missing */
            }
            const rec = normalizeRapidWriteDraftState(w, corpusDraftId);
            if (rec) draftsBySeed[seed.id] = rec;
          }
        }
        statePatch.rapid_write = {
          ...rwAfterOverrides,
          overrides: [...overrides],
          written_ids: [...writtenIds],
          drafts_by_seed_id: draftsBySeed,
          batch_used_first_names: batchUsedFirstNames,
          batch_prior_titles: batchPriorTitles,
          batch_prior_closing_snippets: batchPriorClosingSnippets,
          batch_prior_body_heads: batchPriorBodyHeads,
          batch_prior_reflection_questions: batchPriorReflectionQuestions,
          batch_anti_repeat_snippets: batchAntiRepeatSnippets,
          queue: seeds.map((s) => s.id).filter((id) => !writtenIds.has(id)),
          last_ask_batch: 'all',
          memory: {
            ...(rwAfterOverrides.memory && typeof rwAfterOverrides.memory === 'object' ? rwAfterOverrides.memory : {}),
            standing_instructions: Array.isArray(rwAfterOverrides.agent_training)
              ? rwAfterOverrides.agent_training.slice(-6)
              : [],
            last_action: 'run_all',
            last_batch_draft_count: drafts.length,
            updated_at: new Date().toISOString(),
          },
        };
        const draftedIds = new Set(drafts.map((d) => d.seed_id));
        const skippedSeeds = seeds.filter((s) => !draftedIds.has(s.id));
        const skipNote =
          skippedSeeds.length > 0
            ? `\n\n**Note:** ${skippedSeeds.length} seed(s) were not drafted this run (writer error). Try **Run all seeds** again or ask for a single seed by id.`
            : '';
        const parts = drafts.map((d) => {
          const sid = safeText(d.seed_id, 80);
          const head = sid ? `### ${sid}\n\n` : '';
          return `${head}${safeText(d.markdown, 50000)}\n`;
        });
        assistantMessage = [
          `Generated **${drafts.length}** Rapid Write draft(s). Saved to your corpus drafts queue when the table is available. Each block below is the **full draft** (tags, reflection, and corpus cross-links)—nothing extra needed to “show links.”`,
          '',
          ...parts,
          skipNote,
          '',
          'You can ask Auto to **revise any draft by seed id** in your own words (same spirit as refining seeds).',
        ].join('\n');
      }
      } else if (wantsNextSeed(userMessage)) {
      rapidWriteHandled = true;
      nextMode = 'plan';
      const seeds = Array.isArray(rwAfterOverrides.seeds) ? rwAfterOverrides.seeds : [];
      const validation = Array.isArray(rwAfterOverrides.validation) ? rwAfterOverrides.validation : [];
      const overrides = new Set(Array.isArray(rwAfterOverrides.overrides) ? rwAfterOverrides.overrides : []);
      const writtenIds = new Set(Array.isArray(rwAfterOverrides.written_ids) ? rwAfterOverrides.written_ids : []);
      const agentTraining = Array.isArray(rwAfterOverrides.agent_training) ? rwAfterOverrides.agent_training : [];
      const isWritable = (sid) => rapidWriteSeedIsDraftable(sid, validation, overrides, 'next');
      const pending = seeds.filter((s) => !writtenIds.has(s.id) && isWritable(s.id));
      if (!pending.length) {
        statePatch.rapid_write = {
          ...rwAfterOverrides,
          memory: {
            ...(rwAfterOverrides.memory && typeof rwAfterOverrides.memory === 'object' ? rwAfterOverrides.memory : {}),
            last_action: 'next_blocked',
            updated_at: new Date().toISOString(),
          },
        };
        assistantMessage =
          'No seeds left to write, or the next seed is still flagged—say **do it anyway** or approve it, or **Exit Rapid Write**.';
      } else {
        const seed = pending[0];
        const draftsBySeed =
          rwAfterOverrides.drafts_by_seed_id && typeof rwAfterOverrides.drafts_by_seed_id === 'object'
            ? { ...rwAfterOverrides.drafts_by_seed_id }
            : {};
        const priorSnips = Object.values(draftsBySeed)
          .map((d) => rapidWriteOpeningSnippet(d?.body))
          .filter(Boolean);
        let batchPriorBodyHeads = Array.isArray(rwAfterOverrides.batch_prior_body_heads)
          ? [...rwAfterOverrides.batch_prior_body_heads]
          : [];
        if (!batchPriorBodyHeads.length) {
          batchPriorBodyHeads = sortRapidWriteSeedIds(Object.keys(draftsBySeed))
            .map((kid) => (draftsBySeed[kid]?.body ? String(draftsBySeed[kid].body).slice(0, 560) : ''))
            .filter(Boolean);
        }
        let batchUsedFirstNames = Array.isArray(rwAfterOverrides.batch_used_first_names)
          ? [...rwAfterOverrides.batch_used_first_names]
          : [];
        let batchPriorReflectionQuestions = Array.isArray(rwAfterOverrides.batch_prior_reflection_questions)
          ? [...rwAfterOverrides.batch_prior_reflection_questions]
          : [];
        let batchAntiRepeatSnippets = Array.isArray(rwAfterOverrides.batch_anti_repeat_snippets)
          ? [...rwAfterOverrides.batch_anti_repeat_snippets]
          : [];
        let batchPriorTitles = Array.isArray(rwAfterOverrides.batch_prior_titles)
          ? [...rwAfterOverrides.batch_prior_titles]
          : [];
        let batchPriorClosingSnippets = Array.isArray(rwAfterOverrides.batch_prior_closing_snippets)
          ? [...rwAfterOverrides.batch_prior_closing_snippets]
          : [];
        const vRow = validation.find((x) => x.id === seed.id);
        const diffHint = vRow?.differentiation_hint ? safeText(vRow.differentiation_hint, 1200) : '';
        const batchPatternIndex = Math.max(0, seeds.findIndex((s) => s.id === seed.id));
        const w = await writeRapidWritePost(seed, {
          agentTrainingNotes: agentTraining,
          batchOpeningSnippets: priorSnips,
          batchUsedFirstNames,
          batchPriorReflectionQuestions,
          batchAntiRepeatSnippets,
          batchPriorTitles,
          batchPriorClosingSnippets,
          batchPriorBodyHeads,
          batchPatternIndex,
          differentiationHint: diffHint,
        });
        if (w.ok) {
          writtenIds.add(seed.id);
          for (const n of extractRapidWriteFirstNamesFromBody(w.body)) {
            if (!batchUsedFirstNames.some((x) => String(x).toLowerCase() === n.toLowerCase())) {
              batchUsedFirstNames.push(n);
            }
          }
          if (w.reflection_question) {
            batchPriorReflectionQuestions.push(safeText(w.reflection_question, 500));
          }
          batchAntiRepeatSnippets.push(...rapidWriteBodySignatureSnippets(w.body));
          if (batchAntiRepeatSnippets.length > 64) {
            batchAntiRepeatSnippets = batchAntiRepeatSnippets.slice(-64);
          }
          if (w.title) batchPriorTitles.push(safeText(w.title, 220));
          batchPriorClosingSnippets.push(rapidWriteClosingSnippet(w.body));
          batchPriorBodyHeads.push(String(w.body || '').slice(0, 560));
          if (batchPriorTitles.length > 48) batchPriorTitles = batchPriorTitles.slice(-48);
          if (batchPriorClosingSnippets.length > 48) {
            batchPriorClosingSnippets = batchPriorClosingSnippets.slice(-48);
          }
          if (batchPriorBodyHeads.length > 16) batchPriorBodyHeads = batchPriorBodyHeads.slice(-16);
          let corpusDraftId = null;
          try {
            const ins = await supabaseAdmin
              .from('ao_corpus_drafts')
              .insert({
                created_by_email: auth.email,
                topic: w.title || 'Rapid Write',
                status: 'draft',
                tldr_markdown: w.markdown,
                meta: { source: 'rapid_write', seed_id: seed.id, slug: w.slug },
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .select('id')
              .single();
            if (!ins.error && ins.data?.id) corpusDraftId = ins.data.id;
          } catch {
            /* optional */
          }
          const rec = normalizeRapidWriteDraftState(w, corpusDraftId);
          if (rec) draftsBySeed[seed.id] = rec;
        }
        statePatch.rapid_write = {
          ...rwAfterOverrides,
          overrides: [...overrides],
          written_ids: [...writtenIds],
          drafts_by_seed_id: draftsBySeed,
          batch_used_first_names: batchUsedFirstNames,
          batch_prior_titles: batchPriorTitles,
          batch_prior_closing_snippets: batchPriorClosingSnippets,
          batch_prior_body_heads: batchPriorBodyHeads,
          batch_prior_reflection_questions: batchPriorReflectionQuestions,
          batch_anti_repeat_snippets: batchAntiRepeatSnippets,
          queue: seeds.map((s) => s.id).filter((id) => !writtenIds.has(id)),
          last_ask_batch: 'next',
          memory: {
            ...(rwAfterOverrides.memory && typeof rwAfterOverrides.memory === 'object' ? rwAfterOverrides.memory : {}),
            standing_instructions: Array.isArray(rwAfterOverrides.agent_training)
              ? rwAfterOverrides.agent_training.slice(-6)
              : [],
            last_action: 'next_seed',
            updated_at: new Date().toISOString(),
          },
        };
        assistantMessage = w.ok
          ? [
              `**Next seed** (${seed.id})`,
              '',
              w.markdown,
              '',
              'Say **Next seed** again or **Run all seeds** for the rest. You can also ask Auto to **revise this draft** (or any draft by seed id) in plain language.',
            ].join('\n')
          : `Could not generate draft: ${w.error || 'unknown'}`;
      }
    } else if (overrideResult.source !== 'none') {
      rapidWriteHandled = true;
      nextMode = 'plan';
      assistantMessage =
        'Understood. Flagged seeds you approved will be drafted when you say **Run all seeds** or **Next seed**.';
    } else {
      const draftsMap =
        rwAfterOverrides.drafts_by_seed_id && typeof rwAfterOverrides.drafts_by_seed_id === 'object'
          ? rwAfterOverrides.drafts_by_seed_id
          : {};
      if (Object.keys(draftsMap).length > 0) {
        const skipHeroForTextRevision = isRapidWriteDraftTextRevisionMessage(userMessage);
        const wantsPolish = wantsRapidWriteManualPolishPass(userMessage);
        const heroReg = !skipHeroForTextRevision && wantsRegenerateRapidWriteHeroImage(userMessage);
        const heroGen = !skipHeroForTextRevision && wantsGenerateRapidWriteHeroImages(userMessage);
        const heroAppr = !skipHeroForTextRevision && wantsApproveRapidWriteHeroImage(userMessage);

        if (wantsPolish) {
          rapidWriteHandled = true;
          nextMode = 'plan';
          const seeds = Array.isArray(rwAfterOverrides.seeds) ? rwAfterOverrides.seeds : [];
          const idsFromMsg = extractRwSeedIdsFromMessage(userMessage, new Set(Object.keys(draftsMap)));
          const allKeys = Object.keys(draftsMap);
          let targetSeeds = idsFromMsg.length
            ? idsFromMsg
                .map((raw) => {
                  const sid =
                    Object.keys(draftsMap).find((k) => k.toLowerCase() === String(raw).toLowerCase()) ||
                    String(raw);
                  return sid;
                })
                .filter((sid) => draftsMap[sid])
            : allKeys;
          if (!targetSeeds.length) {
            assistantMessage = 'No matching Rapid Write drafts for that polish request.';
          } else {
            const nextDrafts = { ...draftsMap };
            const outLines = [];
            let anyOk = false;
            let okCount = 0;
            for (const sid of targetSeeds) {
              const seed = seeds.find((s) => s.id === sid);
              const cur = nextDrafts[sid];
              if (!seed || !cur) {
                outLines.push(`**${sid}** — no draft on this thread for that seed id.`);
                // eslint-disable-next-line no-continue
                continue;
              }
              const w = await polishRapidWriteDraft(seed, cur);
              if (!w.ok) {
                outLines.push(`**${sid}** — polish failed: ${w.error || 'unknown'}`);
                // eslint-disable-next-line no-continue
                continue;
              }
              const prevId = cur.corpus_draft_id || null;
              let corpusId = prevId;
              try {
                if (prevId) {
                  await supabaseAdmin
                    .from('ao_corpus_drafts')
                    .update({
                      topic: w.title || 'Rapid Write',
                      tldr_markdown: w.markdown,
                      updated_at: new Date().toISOString(),
                    })
                    .eq('id', prevId)
                    .eq('created_by_email', auth.email);
                } else {
                  const ins = await supabaseAdmin
                    .from('ao_corpus_drafts')
                    .insert({
                      created_by_email: auth.email,
                      topic: w.title || 'Rapid Write',
                      status: 'draft',
                      tldr_markdown: w.markdown,
                      meta: { source: 'rapid_write', seed_id: w.seed_id, slug: w.slug },
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                    })
                    .select('id')
                    .single();
                  if (!ins.error && ins.data?.id) corpusId = ins.data.id;
                }
              } catch {
                /* optional */
              }
              const rec = normalizeRapidWriteDraftState(w, corpusId);
              if (rec) {
                nextDrafts[sid] = rec;
                anyOk = true;
                okCount += 1;
              }
              outLines.push(`### ${sid}\n\n${safeText(w.markdown, 50000)}`);
            }
            if (anyOk) {
              statePatch.rapid_write = {
                ...rwAfterOverrides,
                drafts_by_seed_id: nextDrafts,
                memory: {
                  ...(rwAfterOverrides.memory && typeof rwAfterOverrides.memory === 'object' ? rwAfterOverrides.memory : {}),
                  standing_instructions: Array.isArray(rwAfterOverrides.agent_training)
                    ? rwAfterOverrides.agent_training.slice(-6)
                    : [],
                  last_action: 'polish_pass',
                  updated_at: new Date().toISOString(),
                },
              };
              receipts.push('Rapid Write: register polish pass');
            }
            assistantMessage = [
              anyOk
                ? `**Editor / polish pass** — updated **${okCount}** draft(s). Full markdown below.`
                : 'No drafts were polished this turn.',
              '',
              ...outLines,
            ].join('\n');
          }
        } else if (heroReg || heroGen || heroAppr) {
          rapidWriteHandled = true;
          nextMode = 'plan';
          const idsFromMsg = extractRwSeedIdsFromMessage(userMessage, new Set(Object.keys(draftsMap)));
          const withCorpus = Object.keys(draftsMap).filter((k) => draftsMap[k]?.corpus_draft_id);
          let targetSeeds = idsFromMsg.length
            ? idsFromMsg
                .map((raw) => {
                  const sid =
                    Object.keys(draftsMap).find((k) => k.toLowerCase() === String(raw).toLowerCase()) ||
                    String(raw);
                  return sid;
                })
                .filter((sid) => draftsMap[sid]?.corpus_draft_id)
            : withCorpus;
          if (!targetSeeds.length) {
            assistantMessage =
              'No Rapid Write drafts with a saved corpus row were found for that request. Use **Run all seeds** or **Next seed** first so drafts are saved.';
          } else {
            const lines = [];
            let nextDrafts = { ...draftsMap };
            for (const sid of targetSeeds) {
              const cid = draftsMap[sid]?.corpus_draft_id;
              if (!cid) {
                lines.push(`**${sid}** — no saved corpus draft id.`);
                // eslint-disable-next-line no-continue
                continue;
              }
              let out;
              if (heroAppr) {
                out = await setRapidWriteHeroStatus(supabaseAdmin, cid, auth.email, 'approved');
              } else if (heroReg) {
                out = await generateRapidWriteHeroForDraft(supabaseAdmin, cid, auth.email, { force: true });
              } else {
                out = await generateRapidWriteHeroForDraft(supabaseAdmin, cid, auth.email, { force: false });
              }
              if (!out.ok) {
                lines.push(`**${sid}** — ${out.error || 'failed'}`);
                // eslint-disable-next-line no-continue
                continue;
              }
              const { data: row } = await supabaseAdmin
                .from('ao_corpus_drafts')
                .select('meta,id')
                .eq('id', cid)
                .eq('created_by_email', auth.email)
                .maybeSingle();
              const img = row?.meta?.rapid_write_image;
              if (img?.url) {
                nextDrafts[sid] = {
                  ...nextDrafts[sid],
                  hero_image: {
                    url: img.url,
                    status: img.status,
                    corpus_draft_id: String(row.id),
                  },
                };
              }
              if (heroAppr) {
                lines.push(`**${sid}** — hero image **approved** for publish.\n${img?.url || ''}`);
              } else {
                lines.push(
                  `**${sid}** — hero image generated (pending review). Open Analyst → **Corpus drafts** to approve, or say **approve hero image ${sid}**.`
                );
                lines.push(img?.url ? `\n${img.url}` : '');
              }
            }
            statePatch.rapid_write = {
              ...rwAfterOverrides,
              drafts_by_seed_id: nextDrafts,
              memory: {
                ...(rwAfterOverrides.memory && typeof rwAfterOverrides.memory === 'object' ? rwAfterOverrides.memory : {}),
                standing_instructions: Array.isArray(rwAfterOverrides.agent_training)
                  ? rwAfterOverrides.agent_training.slice(-6)
                  : [],
                last_action: heroAppr ? 'hero_approve' : heroReg ? 'hero_regenerate' : 'hero_generate',
                updated_at: new Date().toISOString(),
              },
            };
            receipts.push(
              heroAppr ? 'Rapid Write: hero image(s) approved' : 'Rapid Write: hero image(s) generated'
            );
            assistantMessage = ['**Rapid Write — hero images**', '', ...lines].join('\n');
          }
        } else {
        const intent = await parseRapidWriteDraftOrDiscussIntent(userMessage, {
          seeds: Array.isArray(rwAfterOverrides.seeds) ? rwAfterOverrides.seeds : [],
          drafts_by_seed_id: draftsMap,
        });
        if (
          intent.intent === 'revise_draft' &&
          intent.instruction &&
          Array.isArray(intent.seed_ids) &&
          intent.seed_ids.length > 0
        ) {
          rapidWriteHandled = true;
          nextMode = 'plan';
          const seeds = Array.isArray(rwAfterOverrides.seeds) ? rwAfterOverrides.seeds : [];
          const validation = Array.isArray(rwAfterOverrides.validation) ? rwAfterOverrides.validation : [];
          const agentTraining = Array.isArray(rwAfterOverrides.agent_training) ? rwAfterOverrides.agent_training : [];
          const nextDrafts = { ...draftsMap };
          const outLines = [];
          let anyOk = false;
          let successCount = 0;
          const openingBySid = {};
          for (const k of Object.keys(nextDrafts)) {
            openingBySid[k] = rapidWriteOpeningSnippet(nextDrafts[k]?.body);
          }
          for (const sidRaw of sortRapidWriteSeedIds(intent.seed_ids)) {
            const sid =
              Object.keys(nextDrafts).find((k) => k.toLowerCase() === String(sidRaw).toLowerCase()) ||
              String(sidRaw);
            const seed = seeds.find((s) => s.id === sid);
            const cur = nextDrafts[sid];
            if (!seed || !cur) {
              outLines.push(`**${sidRaw}** — no draft found for that seed id.`);
              continue;
            }
            const v = validation.find((x) => x.id === sid);
            const overlapHint = v?.flags?.length ? v.flags.map((f) => f.detail).join(' ') : '';
            const diffHint = v?.differentiation_hint ? safeText(v.differentiation_hint, 1200) : '';
            const siblingOpeningSnippets = Object.entries(openingBySid)
              .filter(([k]) => k !== sid)
              .map(([, o]) => o)
              .filter(Boolean);
            const batchPriorTitlesSib = [];
            const batchPriorClosingSnippetsSib = [];
            const batchPriorReflectionSib = [];
            const batchAntiRepeatSib = [];
            const batchPriorBodyHeadsSib = [];
            for (const [k, d] of Object.entries(nextDrafts)) {
              if (k === sid || !d) continue;
              if (d.title) batchPriorTitlesSib.push(safeText(d.title, 200));
              if (d.body) {
                batchPriorClosingSnippetsSib.push(rapidWriteClosingSnippet(d.body));
                batchPriorBodyHeadsSib.push(String(d.body).slice(0, 560));
                batchAntiRepeatSib.push(...rapidWriteBodySignatureSnippets(d.body));
              }
              if (d.reflection_question) batchPriorReflectionSib.push(safeText(d.reflection_question, 400));
            }
            if (batchAntiRepeatSib.length > 40) batchAntiRepeatSib.splice(0, batchAntiRepeatSib.length - 40);
            const patIdx = seeds.findIndex((s) => s.id === sid);
            const assignedStoryPattern = patIdx >= 0 ? rapidWriteStoryPatternForBatchIndex(patIdx) : '';
            const w = await reviseRapidWriteDraft(seed, cur, intent.instruction, {
              agentTrainingNotes: agentTraining,
              overlapHint: overlapHint || undefined,
              differentiationHint: diffHint || undefined,
              siblingOpeningSnippets,
              batchPriorTitles: batchPriorTitlesSib,
              batchPriorClosingSnippets: batchPriorClosingSnippetsSib,
              batchPriorReflectionQuestions: batchPriorReflectionSib,
              batchAntiRepeatSnippets: batchAntiRepeatSib,
              batchPriorBodyHeads: batchPriorBodyHeadsSib,
              assignedStoryPattern,
            });
            if (!w.ok) {
              outLines.push(`**${sid}** — could not revise: ${w.error || 'unknown'}`);
              continue;
            }
            const prevId = cur.corpus_draft_id || null;
            let corpusId = prevId;
            try {
              if (prevId) {
                const upd = await supabaseAdmin
                  .from('ao_corpus_drafts')
                  .update({
                    topic: w.title || 'Rapid Write',
                    tldr_markdown: w.markdown,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', prevId)
                  .eq('created_by_email', auth.email);
                if (upd.error) corpusId = prevId;
              } else {
                const ins = await supabaseAdmin
                  .from('ao_corpus_drafts')
                  .insert({
                    created_by_email: auth.email,
                    topic: w.title || 'Rapid Write',
                    status: 'draft',
                    tldr_markdown: w.markdown,
                    meta: { source: 'rapid_write', seed_id: w.seed_id, slug: w.slug },
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  })
                  .select('id')
                  .single();
                if (!ins.error && ins.data?.id) corpusId = ins.data.id;
              }
            } catch {
              /* optional */
            }
            const rec = normalizeRapidWriteDraftState(w, corpusId);
            if (rec) {
              nextDrafts[sid] = rec;
              openingBySid[sid] = rapidWriteOpeningSnippet(rec.body);
              anyOk = true;
              successCount += 1;
            }
            outLines.push(`### ${sid}\n\n${safeText(w.markdown, 50000)}`);
          }
          if (anyOk) {
            const rebuiltBodyHeads = [];
            const rebuiltTitles = [];
            for (const s of seeds) {
              const d = nextDrafts[s.id];
              if (d?.body) rebuiltBodyHeads.push(String(d.body).slice(0, 560));
              if (d?.title) rebuiltTitles.push(safeText(d.title, 220));
            }
            statePatch.rapid_write = {
              ...rwAfterOverrides,
              drafts_by_seed_id: nextDrafts,
              batch_prior_body_heads: rebuiltBodyHeads.slice(-16),
              batch_prior_titles: rebuiltTitles.slice(-48),
              memory: {
                ...(rwAfterOverrides.memory && typeof rwAfterOverrides.memory === 'object' ? rwAfterOverrides.memory : {}),
                standing_instructions: Array.isArray(rwAfterOverrides.agent_training)
                  ? rwAfterOverrides.agent_training.slice(-6)
                  : [],
                last_action: 'revise_drafts',
                batch_intent: {
                  kind: 'revise',
                  seed_ids: intent.seed_ids.slice(),
                  status: 'done',
                  updated_at: new Date().toISOString(),
                },
                updated_at: new Date().toISOString(),
              },
            };
            receipts.push('Rapid Write: draft revision(s) saved on this thread');
          }
          assistantMessage = [
            anyOk
              ? `Updated **${successCount}** Rapid Write draft(s). Full markdown below (tags and corpus links). Corpus drafts queue updated when available.`
              : 'No drafts were revised this turn.',
            '',
            ...outLines,
          ].join('\n');
        }
        }
      }
    }
    }
    /* Rapid Write: questions and strategy (not exact commands) fall through to normal Auto reply — snapshot + workflow hint carry seed ids and flags. */

    if (!rapidWriteHandled) {
    if (nextMode === 'training') {
      const trainingPaste = [userMessage, textAttachment].filter(Boolean).join('\n\n').trim();
      const voiceProbe =
        looksLikeContent(trainingPaste) &&
        trainingPaste.length >= 400 &&
        !wantsMetaDevAgentInstruction(userMessage);
      if (voiceProbe) {
        const extracted = await extractTrainingVoiceFromPaste(trainingPaste);
        if (extracted.ok) {
          statePatch.memory_profile = mergeMemoryProfiles(statePatch.memory_profile, extracted.profileMerge);
          receipts.push('Training mode: voice traits extracted and merged into style memory');
          pushTransparencyReceipt(receipts, 'Voice profile fields updated from pasted sample (cadence, diction, openings/closures, avoid list).');
          assistantMessage = extracted.userMessage;
        } else {
          assistantMessage = [
            'I could not fully analyze that paste for voice.',
            extracted.error || 'Try again with less formatting or a shorter excerpt.',
          ].join('\n');
        }
      } else {
        const cleanRule = userMessage
          .replace(/switch to training mode/i, '')
          .replace(/training mode/i, '')
          .trim();
        if (!cleanRule) {
          assistantMessage =
            '**Training mode.** Paste one or more finished posts (long paste) and I will extract tone and voice for future drafts—or type a short rule and I will save it as a guardrail.';
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
      }
    } else if (nextMode === 'recall') {
      const qcBlock = accountQuoteCardContextItems?.length ? formatQuoteCardContextBlock(accountQuoteCardContextItems) : [];
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
      if (!lane1.length && !lane2.length && !accountQuoteCardContextItems?.length) {
        assistantMessage = 'I checked Library and did not find a strong match yet.';
      } else {
        const lines = [];
        if (qcBlock.length) lines.push(...qcBlock, '');
        lines.push('I think I remember it. Let me ask the Librarian.', '');
        if (lane1.length) {
          lines.push('Closest matches:');
          lane1.forEach((b, idx) => lines.push(`${idx + 1}. ${b.title || 'Untitled bundle'} (${b.series_name || 'no series'})`));
          lines.push('');
        }
        if (lane2.length) {
          lines.push('Nearby matches:');
          lane2.forEach((b, idx) => lines.push(`${idx + 1}. ${b.title || b.raw_input?.slice(0, 60) || 'Saved item'}`));
          lines.push('');
        }
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
    } else if (wantsCorpusTldrWork(userMessage) && (!activePath || activePath === 'corpus_build_day' || activePath === 'planning')) {
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
    } else if (wantsScoutFindings(userMessage) && (!activePath || activePath === 'scout_findings' || activePath === 'planning' || activePath === 'series_build')) {
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
    } else if (wantsMetaDevAgentInstruction(userMessage)) {
      nextMode = 'plan';
      assistantMessage =
        'I’m Auto inside AO Automation on your site—I don’t run external task lists or edit attached plan files. For quote cards here: pull or paste lines, pick numbers, then ask **Show card N** for text, or **list all quotes in this thread** if the count looks wrong.';
    } else if (wantsUserSuppliedQuoteCards(msgForQuoteRouting)) {
      nextMode = 'plan';
      const userQuotes = parseUserSuppliedQuoteCards(msgForQuoteRouting);
      receipts.push('Generated minimal quote cards from the text you pasted (verbatim on the images)');
      pushTransparencyReceipt(receipts, `Quote cards from your paste (${userQuotes.length} line(s)); say Publish cards when ready.`);
      const rawLogo = await getDefaultLogoUrl({ background: 'dark' });
      const logoUrl = (await inlineLogoForQuoteCardSvg(rawLogo)) || null;
      const { captions, captions_x: captionsX } = await generatePullQuoteCaptionsForQuotes(userQuotes, {
        maxChars: 2000,
      });
      const previews = [];
      const lines = [
        'Here are interpretive captions and minimal black square cards using **your pasted lines** (the images show your wording, not corpus search results).',
        '',
        'Captions (copy under each image in the thread; X-sized line included where useful):',
        '',
      ];
      for (let i = 0; i < userQuotes.length; i += 1) {
        const q = userQuotes[i];
        const cap = captions[i] || '';
        const capX = captionsX[i] || '';
        lines.push(`${i + 1}. ${cap}`);
        if (capX) lines.push(`   (X: ${capX})`);
        lines.push(`   “${safeText(stripMarkdownBoldForCardDisplay(q.quote), 280)}”`);
        const pasteTail = [q.source_title, q.url].filter((x) => String(x || '').trim());
        if (pasteTail.length) lines.push(`   — ${pasteTail.join(' · ')}`);
        lines.push('');
        const rendered = renderQuoteCardSvg({
          quote: q.quote,
          sourceName: q.source_title,
          logoUrl,
          style: 'minimal',
          minimalVariant: 'dark',
          forceLightLogo: true,
        });
        let image_url = '';
        if (rendered.ok) {
          try {
            const up = await uploadMinimalQuoteCardToPublicUrl(
              { quote: q.quote, sourceName: q.source_title, logoUrl },
              { subfolder: 'auto-hub-quote-cards' }
            );
            if (up.ok) image_url = up.publicUrl;
          } catch (_) {}
        }
        if (rendered.ok) {
          previews.push({
            svg: rendered.svg,
            image_url,
            index: i + 1,
            caption: cap,
            caption_x: capX,
            source_title: q.source_title,
          });
        }
      }
      assistantMessage = lines.join('\n');
      assistantMeta = {
        corpus_pull_quotes: userQuotes,
        quote_card_previews: previews,
        quote_card_preview_svg: previews[0]?.svg || null,
        quote_card_preview_image_url: previews[0]?.image_url || null,
      };
      statePatch.corpus_pull_quotes = userQuotes;
      statePatch.publish_candidates = userQuotes.map((q, i) => {
        const pr = previews[i];
        return normalizePublishCandidate({
          corpus_index: i + 1,
          quote: q.quote,
          source_title: q.source_title,
          url: q.url || '',
          caption: captions[i] || '',
          caption_x: captionsX[i] || '',
          svg: pr?.svg || null,
          image_url: pr?.image_url || '',
        });
      });
      statePatch.quote_card_origin = 'user_paste';
    } else if (wantsPublisherQuoteScheduleInquiry(msgForQuoteRouting)) {
      nextMode = 'plan';
      const topicPhrase = extractQuotedTopicPhrase(userMessage);
      const needle = topicPhrase || (/\bpower\s+says\b/i.test(userMessage) ? 'power says' : '');
      const sched = await fetchScheduledPublisherQuoteCardsForOwner(auth.email, needle);
      if (sched.ok) {
        receipts.push(
          `Publisher schedule lookup: ${sched.rows.length} upcoming quote-card row(s)${needle ? ` (filter: ${safeText(needle, 80)})` : ''}`
        );
        pushTransparencyReceipt(
          receipts,
          'Answer used ao_scheduled_posts for this account (same request)—not the generic quote-campaign confirmation path.'
        );
        assistantMessage = formatScheduledPublisherQuoteCardsAnswer(sched.rows, topicPhrase || needle);
      } else {
        assistantMessage = [
          'I could not read your Publisher queue from the database this turn.',
          safeText(sched.error, 200),
          '',
          'Open **Publisher** on your AO dashboard for the authoritative list.',
        ]
          .filter(Boolean)
          .join('\n');
      }
    } else if (wantsQuoteCardInventory(msgForQuoteRouting)) {
      nextMode = 'plan';
      let allQuotes =
        Array.isArray(currentState.corpus_pull_quotes) && currentState.corpus_pull_quotes.length
          ? currentState.corpus_pull_quotes
          : restoreCorpusPullQuotesFromMessages(existingMessages);
      if (!Array.isArray(allQuotes) || !allQuotes.length) {
        assistantMessage =
          'I do not have quote lines stored in this thread yet. Pull quotes from your corpus (include the word **corpus** and your topic) or paste lines for cards—then ask again.';
      } else {
        const origin =
          currentState.quote_card_origin === 'user_paste'
            ? 'pasted lines (your text)'
            : currentState.quote_card_origin === 'corpus_pull'
              ? 'corpus search (up to five candidates per search)'
              : isUserPasteQuoteBatch(currentState, allQuotes)
                ? 'pasted lines (your text)'
                : 'corpus search (up to five candidates per search)';
        const pool =
          Array.isArray(currentState.publish_candidates) && currentState.publish_candidates.length
            ? currentState.publish_candidates
            : rebuildPublishCandidatesFromMessages(existingMessages, allQuotes);
        const lastBuilt = extractLastBuiltIndicesFromMessages(existingMessages);
        const lastSel = Array.isArray(currentState.corpus_pull_quote_selection)
          ? [...currentState.corpus_pull_quote_selection].filter((n) => Number.isFinite(n) && n >= 1)
          : [];
        const lines = [
          `**Quote pool in this thread (${allQuotes.length} line(s))** — source: ${origin}.`,
          '',
          '**All candidate lines (numbered):**',
          '',
        ];
        allQuotes.forEach((q, idx) => {
          const n = idx + 1;
          lines.push(`${n}. “${safeText(stripMarkdownBoldForCardDisplay(q.quote), 400)}”`);
          const tail = [q.source_title, q.url].filter((x) => String(x || '').trim());
          if (tail.length) lines.push(`   — ${tail.join(' · ')}`);
          lines.push('');
        });
        lines.push('**What was last built as image cards (this thread):**');
        if (lastBuilt.length) {
          lines.push(`Indices **${lastBuilt.join(', ')}** (from the latest assistant reply with previews).`);
        } else {
          lines.push('No image-card previews recorded in the latest turn yet.');
        }
        if (lastSel.length) {
          lines.push(`Last numbered picks stored for this flow: **${lastSel.join(', ')}**.`);
        }
        lines.push(
          `**Publish-ready rows in memory:** **${pool.length}** (one per card index when present). If a number is missing from previews, say the numbers you want or **all** to build more—nothing is silently discarded from the numbered list above.`
        );
        receipts.push('Quoted thread inventory (deterministic)');
        pushTransparencyReceipt(receipts, `Listed ${allQuotes.length} candidate line(s) and last-built indices from thread state.`);
        statePatch.corpus_pull_quotes = allQuotes;
        if (pool.length) statePatch.publish_candidates = pool;
        assistantMessage = lines.join('\n');
      }
    } else if (wantsQuoteCardInspect(msgForQuoteRouting)) {
      nextMode = 'plan';
      let allQuotes =
        Array.isArray(currentState.corpus_pull_quotes) && currentState.corpus_pull_quotes.length
          ? currentState.corpus_pull_quotes
          : restoreCorpusPullQuotesFromMessages(existingMessages);
      if (!Array.isArray(allQuotes) || !allQuotes.length) {
        assistantMessage =
          'I do not have quote lines stored in this thread yet. Pull quotes from your corpus (include the word **corpus** and your topic) or paste lines for cards—then ask again.';
      } else {
        let candidates =
          Array.isArray(currentState.publish_candidates) && currentState.publish_candidates.length
            ? currentState.publish_candidates
            : rebuildPublishCandidatesFromMessages(existingMessages, allQuotes);
        let indices = parseQuoteCardInspectIndices(userMessage);
        if (!indices.length) {
          assistantMessage =
            'Which card number? (For example: **Show card 3** or **What is the text on card 1?**)';
        } else {
          const maxN = allQuotes.length;
          indices = indices.filter((n) => n >= 1 && n <= maxN);
          if (!indices.length) {
            assistantMessage = `I only have cards **1–${maxN}** in this thread. Pick a number in that range.`;
          } else {
            statePatch.corpus_pull_quotes = allQuotes;
            if (candidates.length) statePatch.publish_candidates = candidates;
            const captionByIndex = extractLatestPreviewCaptionsByIndex(existingMessages);
            receipts.push('Card text from this thread (deterministic)');
            pushTransparencyReceipt(receipts, `Echoed quote/caption text for card(s): ${indices.join(', ')}.`);
            const lines = [];
            const rawLogo = await getDefaultLogoUrl({ background: 'dark' });
            const logoUrl = (await inlineLogoForQuoteCardSvg(rawLogo)) || null;
            const previews = [];
            for (const n of indices) {
              const q = allQuotes[n - 1];
              if (!q) continue;
              const cand = (candidates || []).find((c) => c.corpus_index === n);
              const capFromPrev = captionByIndex.get(n);
              const cap = cand?.caption || capFromPrev?.caption || '';
              const capX = cand?.caption_x || capFromPrev?.caption_x || '';
              const src = [q.source_title, q.url].filter((x) => String(x || '').trim());
              lines.push(`**Card ${n}**`, '');
              lines.push('**Pull quote**');
              lines.push(`"${safeText(stripMarkdownBoldForCardDisplay(q.quote), 2000)}"`);
              if (src.length) lines.push(`Source: ${src.join(' · ')}`);
              if (cap) lines.push(`Caption: ${cap}`);
              if (capX) lines.push(`X / short: ${capX}`);
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
                  const up = await uploadMinimalQuoteCardToPublicUrl(
                    { quote: q.quote, sourceName: q.source_title, logoUrl },
                    { subfolder: 'auto-hub-quote-cards' }
                  );
                  if (up.ok) image_url = up.publicUrl;
                } catch (_) {}
                previews.push({
                  svg: rendered.svg,
                  image_url,
                  index: n,
                  caption: cap,
                  caption_x: capX,
                  source_title: q.source_title,
                });
              }
            }
            assistantMessage = lines.join('\n').trim();
            if (previews.length) {
              assistantMeta = {
                corpus_pull_quotes: allQuotes,
                quote_card_previews: previews,
                quote_card_preview_svg: previews[0]?.svg || null,
                quote_card_preview_image_url: previews[0]?.image_url || null,
              };
            }
          }
        }
      }
    } else if (
      (
        wantsCorpusPullQuotes(msgForQuoteRouting) ||
        (intentRoute?.intent === 'corpus_pull' && intentRoute.confidence >= 0.6) ||
        activePath === 'quote_campaign'
      ) &&
      activePath !== 'series_build' &&
      activePath !== 'corpus_build_day'
    ) {
      nextMode = 'plan';
      const corpus = await getCorpusPullQuotes({ queryText: userMessage, limit: 5 });
      receipts.push('Searched your published corpus for stand-alone, high-impact pull quotes');
      if (corpus.ok && corpus.quotes.length) {
        pushTransparencyReceipt(
          receipts,
          `Corpus pull quotes: ${corpus.quotes.length} candidate(s) — pick numbers, then ask for captions/cards.`
        );
        const lines = [
          'Here are candidate pull quotes from your corpus (short lines only—full posts are not pasted here):',
          '',
        ];
        corpus.quotes.forEach((q, idx) => {
          lines.push(`${idx + 1}. “${stripMarkdownBoldForCardDisplay(q.quote)}”`);
          lines.push(`   Source: ${q.source_title}${q.url ? ` · ${q.url}` : ''}`);
          lines.push('');
        });
        lines.push(
          `Each corpus search returns up to **five** candidate lines at a time${corpus.quotes.length >= 5 ? ' (you may be seeing the full set from this search)' : ''}. Ask again with another topic or angle if you want more lines.`
        );
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
              const up = await uploadMinimalQuoteCardToPublicUrl(
                { quote: first.quote, sourceName: first.source_title, logoUrl },
                { subfolder: 'auto-hub-quote-cards' }
              );
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
        statePatch.quote_card_origin = 'corpus_pull';
      } else {
        assistantMessage =
          'I couldn’t find strong pull-quote lines from the corpus for that ask. Try naming a theme (for example accountability, pressure, or culture) and ask again, or say which topics to prioritize.';
      }
    } else if (wantsPublishRouteGuidance(userMessage) && (!activePath || activePath === 'package_publish' || activePath === 'planning')) {
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
        pushTransparencyReceipt(receipts, `Queued ${result.count || 0} Publisher slot(s) from your confirmed plan.`);
        assistantMessage = `Done. ${result.count || 0} row(s) queued (image + caption per network). Let me know and I'll talk to Publisher if you need to review or adjust times.`;
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
    } else if (
      currentState.publish_wizard &&
      currentState.publish_wizard.step === 'await_confirm' &&
      wantsPublishScheduleTweak(userMessage)
    ) {
      nextMode = 'plan';
      const pending = currentState.publish_wizard.pending;
      const items = Array.isArray(pending?.items) ? pending.items : [];
      if (!items.length) {
        assistantMessage =
          'No publish plan is waiting. Say **Publish cards** with numbers (or **all**) to build a plan first.';
      } else {
        const extracted = await extractPublishScheduleConstraints(userMessage, {
          cardCount: items.length,
          currentGapDays: pending.gap_days ?? null,
          currentLocalHour: pending.preferred_local_hour ?? null,
          currentLocalMinute: pending.preferred_local_minute ?? null,
        });
        const merged = mergeScheduleOpts({ extracted: extracted || {}, pending, message: userMessage });
        const timesIso = await proposeQuoteCardTimes(items.length, {
          gapDays: merged.gapDays,
          localHour: merged.localHour,
          localMinute: merged.localMinute,
        });
        const classification = pending.classification && typeof pending.classification === 'object' ? pending.classification : {};
        const ch = { summaryLines: classification.summaryLines || [] };
        const { coverageLines } = await buildQuoteCardPublishContext(auth.email, items);
        const scheduleNote = (merged.userFacingNote || pending.schedule_note || '').trim();
        statePatch.publish_wizard = {
          step: 'await_confirm',
          pending: {
            ...pending,
            items,
            times_iso: timesIso,
            gap_days: merged.gapDays,
            preferred_local_hour: merged.localHour,
            preferred_local_minute: merged.localMinute,
            schedule_note: scheduleNote,
            classification,
          },
        };
        pushTransparencyReceipt(
          receipts,
          `Updated publish plan: same ${items.length} card(s); ${merged.gapDays} day(s) between posts${merged.localHour != null ? `; around ${merged.localHour}:${String(merged.localMinute ?? 0).padStart(2, '0')} local time` : ''}.`
        );
        assistantMessage = formatQuoteCardPublishPlan({
          items,
          timesIso,
          channelHelp: ch,
          classification,
          coverageLines,
          scheduleNote: scheduleNote || undefined,
        });
      }
    } else if (wantsPublishQuoteCardsIntent(msgForQuoteRouting, currentState)) {
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
      let indices = parseQuoteIndicesFromMessage(stripGapPhrasesForCardIndexParse(userMessage));
      if (/\ball\b/i.test(userMessage)) {
        indices = pool.map((x) => x.corpus_index).sort((a, b) => a - b);
      }
      const publishCap = isUserPasteQuoteBatch(currentState, corpusQuotes) ? 50 : 12;
      indices = indices.filter((n) => n >= 1 && n <= (corpusQuotes.length || 99)).slice(0, publishCap);

      if (!indices.length) {
        assistantMessage =
          'Say which card numbers to publish (for example: Publish cards 1, 2, and 4), or say all.';
      } else {
        const items = indices.map((n) => pool.find((x) => x.corpus_index === n)).filter(Boolean);
        if (!items.length || items.some((x) => !String(x.quote || '').trim() && !String(x.svg || '').trim())) {
          assistantMessage =
            'I could not find those cards in this thread. Pick quote numbers and ask for captions and cards first—then say Publish.';
        } else {
          const extracted = await extractPublishScheduleConstraints(userMessage, {
            cardCount: items.length,
            currentGapDays: null,
            currentLocalHour: null,
            currentLocalMinute: null,
          });
          const merged = mergeScheduleOpts({ extracted: extracted || {}, pending: null, message: userMessage });
          const timesIso = await proposeQuoteCardTimes(items.length, {
            gapDays: merged.gapDays,
            localHour: merged.localHour,
            localMinute: merged.localMinute,
          });
          const { coverageLines, classification } = await buildQuoteCardPublishContext(auth.email, items);
          const ch = { summaryLines: classification.summaryLines || [] };
          statePatch.publish_wizard = {
            step: 'await_confirm',
            pending: {
              items,
              times_iso: timesIso,
              classification,
              gap_days: merged.gapDays,
              preferred_local_hour: merged.localHour,
              preferred_local_minute: merged.localMinute,
              schedule_note: merged.userFacingNote || '',
            },
          };
          pushTransparencyReceipt(
            receipts,
            `Publish plan ready for ${items.length} card(s) — confirm, cancel, or describe spacing and time in plain language.`
          );
          assistantMessage = formatQuoteCardPublishPlan({
            items,
            timesIso,
            channelHelp: ch,
            classification,
            coverageLines,
            scheduleNote: merged.userFacingNote || undefined,
          });
        }
      }
      }
    } else if (wantsCorpusPullQuoteDeliverables(msgForQuoteRouting, currentState, existingMessages)) {
      nextMode = 'plan';
      const allQuotes = currentState.corpus_pull_quotes;
      let indices = parseQuoteIndicesFromMessage(stripGapPhrasesForCardIndexParse(userMessage));
      if (!indices.length) {
        const fromThread = parseIndicesFromAssistantThread(existingMessages);
        if (fromThread?.length) indices = fromThread;
      }
      if (!indices.length && Array.isArray(currentState.corpus_pull_quote_selection) && currentState.corpus_pull_quote_selection.length) {
        indices = [...currentState.corpus_pull_quote_selection];
      }
      const maxN = allQuotes.length;
      const fromPaste = isUserPasteQuoteBatch(currentState, allQuotes);
      let filledDefaultIndices = false;
      if (!indices.length) {
        const defaultCap = fromPaste ? maxN : Math.min(5, maxN);
        filledDefaultIndices = true;
        indices = allQuotes.slice(0, defaultCap).map((_, i) => i + 1);
      }
      const usedDefaultCorpusFirstFive = !fromPaste && filledDefaultIndices && maxN > 5;
      const batchCap = fromPaste ? Math.min(50, maxN) : 6;
      const indicesBeforeBatchCap = indices.filter((n) => n >= 1 && n <= maxN);
      const truncatedByBatchCap = indicesBeforeBatchCap.length > batchCap;
      indices = indicesBeforeBatchCap.slice(0, batchCap);
      if (!indices.length) {
        assistantMessage =
          'Tell me which quote numbers to use from the list above (for example 1, 3, and 5), or say “all.”';
      } else {
        statePatch.corpus_pull_quotes = allQuotes;
        statePatch.corpus_pull_quote_selection = indices;
        const selected = indices.map((n) => allQuotes[n - 1]).filter(Boolean);
        receipts.push('Drafted interpretive captions and minimal square cards for your picks');
        pushTransparencyReceipt(receipts, `Built ${selected.length} quote card(s) for your numbered picks.`);
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
          lines.push(`   “${safeText(stripMarkdownBoldForCardDisplay(q.quote), 280)}”`);
          const attrTail = [q.source_title, q.url].filter((x) => String(x || '').trim());
          if (attrTail.length) lines.push(`   — ${attrTail.join(' · ')}`);
          lines.push('');
          const rendered = renderQuoteCardSvg({
            quote: q.quote,
            sourceName: q.source_title,
            logoUrl,
            style: 'minimal',
            minimalVariant: 'dark',
            forceLightLogo: true,
          });
          let image_url = '';
          let svg = null;
          if (rendered.ok) {
            svg = rendered.svg;
            try {
              const up = await uploadMinimalQuoteCardToPublicUrl(
                { quote: q.quote, sourceName: q.source_title, logoUrl },
                { subfolder: 'auto-hub-quote-cards' }
              );
              if (up.ok) image_url = up.publicUrl;
            } catch (_) {}
          }
          previews.push({
            svg,
            image_url,
            index: indices[i],
            caption: cap,
            caption_x: capX,
            source_title: q.source_title,
          });
        }
        assistantMessage = lines.join('\n');
        if (!fromPaste) {
          const footer = [];
          footer.push('');
          footer.push('---');
          footer.push(
            `**Thread pool:** ${maxN} quote line(s) stored from your last pull. Corpus search returns up to **five** candidates per search; caps below apply when building cards **without** a pasted batch.`
          );
          if (usedDefaultCorpusFirstFive) {
            footer.push(
              `This turn used the default **first five** of **${maxN}** because no numbers were in your message. Say **6–10**, **7–12**, or **all** to build more in the next message.`
            );
          }
          if (truncatedByBatchCap) {
            footer.push(
              `**Built ${selected.length} of ${indicesBeforeBatchCap.length}** requested this turn (corpus flow: up to **${batchCap}** cards per message). Say the remaining numbers in your next message to finish the batch.`
            );
          } else if (maxN > selected.length && !usedDefaultCorpusFirstFive && !truncatedByBatchCap) {
            footer.push(
              `This turn built **${selected.length}** card(s) from your picks; **${maxN}** line(s) remain in the pool. Ask for more numbers anytime.`
            );
          }
          assistantMessage = `${assistantMessage}\n${footer.join('\n')}`;
        }
        assistantMeta = {
          corpus_pull_quotes: allQuotes,
          quote_card_previews: previews.filter((p) => p && p.svg),
          quote_card_preview_svg: previews.find((p) => p?.svg)?.svg || null,
          quote_card_preview_image_url: previews.find((p) => p?.svg)?.image_url || null,
        };
        statePatch.publish_candidates = await mergePublishCandidatesForAllQuotes({
          allQuotes,
          currentState,
          existingMessages,
          indices,
          selected,
          previews,
          captions,
          captionsX,
          logoUrl,
        });
      }
    } else if (
      wantsCorpusThemeSearch(userMessage) &&
      (!activePath || activePath === 'corpus_lookup' || activePath === 'planning')
    ) {
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
    } else if (nextMode === 'package' || nextMode === 'publish' || activePath === 'package_publish') {
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

      let seriesOverlapHints = [];
      const sfOverlap = guessSeriesFocus(userMessage);
      const careOverlap =
        sfOverlap &&
        /\b(overlap|series|quote|power says|scheduled|prior|duplicate|repeat|more cards|posts)\b/i.test(userMessage);
      if (careOverlap) {
        statePatch.series_focus = { label: sfOverlap, updated_at: new Date().toISOString() };
        const ot = await getCorpusTopicSnippets({
          queryText: `${sfOverlap} journal posts quotes`,
          limitSnippets: 6,
          topDocs: 22,
          maxCharsPerSnippet: 380,
          maxSnippetsPerDoc: 1,
        });
        if (ot.ok && Array.isArray(ot.snippets) && ot.snippets.length) {
          seriesOverlapHints = ot.snippets.slice(0, 6).map((x, i) => ({
            n: i + 1,
            excerpt: safeText(x.excerpt, 360),
            source_title: safeText(x.source_title, 120),
            url: x.url ? String(x.url).slice(0, 500) : '',
          }));
          receipts.push(`Series overlap (${sfOverlap}): ${seriesOverlapHints.length} corpus excerpt(s)`);
        }
      }

      const seriesProceedThisTurn =
        activePath === 'series_build' &&
        (pathReceipts.some((r) => /Path set: series_build/.test(String(r || ''))) ||
          (affirmative &&
            (safeText(prevPathState.pending_path, 60) === 'series_build' ||
              pathReceipts.some((r) => /Path confirmed: series_build/.test(String(r || ''))) ||
              /\b(research|corpus|ALI|conditions|snippets?|please proceed|go ahead)\b/i.test(userMessage))));

      let seriesResearchSnippets = null;
      if (seriesProceedThisTurn) {
        seriesResearchSnippets = await buildSeriesCorpusResearchPack(userMessage);
        receipts.push(
          `Corpus research (series_build): ran topic retrieval in this same request; ${seriesResearchSnippets.length} snippet(s).`
        );
        pushTransparencyReceipt(
          receipts,
          `Series build: corpus topic retrieval finished in this request (${seriesResearchSnippets.length} excerpt(s)). Not a background job; open-web Scout was not run here.`
        );
      }

      const snapshotBase = buildThreadStateSnapshot(statePatch);
      let threadSnapshotForModel =
        accountQuoteCardContextItems?.length > 0
          ? {
              ...snapshotBase,
              recent_quote_card_context_from_account: accountQuoteCardContextItems,
            }
          : { ...snapshotBase };

      if (seriesResearchSnippets !== null) {
        threadSnapshotForModel = {
          ...threadSnapshotForModel,
          series_research_pack_this_turn: {
            completed: true,
            snippet_count: seriesResearchSnippets.length,
            note: 'in-corpus retrieval only; not an open-web Scout crawl',
          },
        };
      }

      if (seriesOverlapHints.length) {
        threadSnapshotForModel = {
          ...threadSnapshotForModel,
          series_overlap_hints: seriesOverlapHints,
        };
      }

      const seriesResearchBlock =
        seriesResearchSnippets !== null ? formatSeriesCorpusResearchBlock(seriesResearchSnippets) : '';

      const workflowCombined = [
        workflowHintFromState(statePatch),
        accountQuoteCardContextItems?.length
          ? 'Account quote-card memory is in the snapshot (recent_quote_card_context_from_account). Use it when Bart continues prior work, checks overlap, or recalls cards—do not claim recall is impossible.'
          : '',
        seriesResearchSnippets !== null
          ? 'thread_snapshot.series_research_pack_this_turn marks completed in-corpus retrieval for this series_build confirmation. Do not claim Scout/open-web crawls or background jobs. The "### Corpus research (this turn)" block is prepended to the user message after your JSON—keep assistant_message concise; do not duplicate the full excerpt list.'
          : '',
        seriesOverlapHints.length
          ? 'thread_snapshot.series_overlap_hints lists corpus excerpts that may overlap the named series—use them for non-redundant planning.'
          : '',
      ]
        .filter(Boolean)
        .join('\n');
      const model = await askModel({
        mode: nextMode,
        message: userMessage,
        messages: [...existingMessages, userRow],
        guardrails: enabledGuardrails,
        findings,
        bundleSummary: savedBundle ? { id: savedBundle.id, title: savedBundle.title } : null,
        automationProofLines: proofLines,
        dontRefine: !!(statePatch.dont_refine || impliesNoRefine(userMessage)),
        threadSnapshot: threadSnapshotForModel,
        workflowHint: workflowCombined,
      });
      assistantMessage = safeText(model?.assistant_message, 4000) || `Mode: ${nextMode.charAt(0).toUpperCase() + nextMode.slice(1)}. Tell me what you want to do next.`;
      if (Array.isArray(model?.receipts)) receipts.push(...model.receipts.map((x) => safeText(x, 160)).filter(Boolean));
      if (seriesResearchBlock) {
        assistantMessage = [seriesResearchBlock, '', assistantMessage].filter(Boolean).join('\n');
      }
    }
    }

    const voiceGate = applyVoiceFidelityGate(assistantMessage, activePath, statePatch.memory_profile);
    if (voiceGate.changed) {
      assistantMessage = voiceGate.message;
      receipts.push('Voice check: aligned response with your saved style profile');
    }

    const pathStateAfter = statePatch.path_state && typeof statePatch.path_state === 'object' ? statePatch.path_state : {};
    const shouldAnnouncePath =
      !!activePath &&
      !forcedAssistantMessage &&
      safeText(pathStateAfter.last_announced_path, 60) !== activePath &&
      majorConfirmPaths.has(activePath);
    if (shouldAnnouncePath && assistantMessage) {
      const pathLabel =
        activePath === 'quote_campaign'
          ? 'quote-card campaign'
          : activePath === 'series_build'
            ? 'series build'
            : activePath === 'one_off_post'
              ? 'one-off post'
              : activePath === 'corpus_build_day'
                ? 'corpus build session'
                : activePath === 'package_publish'
                  ? 'package/publish prep'
                  : activePath;
      assistantMessage = [`Path locked: ${pathLabel}.`, '', assistantMessage].join('\n');
      statePatch.path_state = { ...pathStateAfter, last_announced_path: activePath };
    }

    statePatch.session_summary = appendSessionSummary(currentState.session_summary, {
      userMessage,
      receipts,
      assistantPreview: assistantMessage,
      mode: nextMode,
    });
    statePatch.receipt_log = appendReceiptLog(currentState.receipt_log, receipts);

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

    const finalState = await getAutoThreadState(auth.email, thread.id);
    return res.status(200).json({
      ok: true,
      thread: finalState.thread,
      messages: finalState.messages,
      attachments: finalState.attachments,
      assistant_message: assistantRow.content,
      receipts,
      bundle_id: savedBundle?.id || statePatch.bundle_id || null,
      idea_id: savedIdea?.id || null,
      action_log_id: statePatch.last_action_log_id || null,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}
