/**
 * requestClassifier.js
 *
 * Profiles an incoming Auto message and returns a context loading plan.
 * The plan tells runAutoChat which context loaders to call.
 * This eliminates unconditional context loading that bloats every request.
 *
 * Context profiles:
 *
 * needsCorpus — true when the task involves research, writing new content,
 *   or referencing existing published work. False for scheduling, captions
 *   on already-written content, queue questions, and short conversational replies.
 *
 * needsSchedule — true when the task involves scheduling, publishing,
 *   queue status, or social post management. False for writing, revision,
 *   and research tasks.
 *
 * needsEditorialMemory — true when generating new content seeds or
 *   checking for repeat content. False for revision, scheduling, and
 *   conversational replies.
 *
 * needsSeriesContext — true when the message references a specific series
 *   by name or asks for the next part of something. False otherwise.
 *
 * needsDraftsContext — true for almost all tasks. Approved drafts give
 *   Auto session continuity. Rarely false.
 *
 * needsPerformanceContext — true when generating new content or reviewing
 *   what to build next. False for revision of existing content and scheduling.
 *
 * activeDraftSlug — when a draft is actively being worked on, its slug.
 *   Used by the draft reference system (Phase 5-F).
 */

/**
 * Classify an incoming user message and recent thread history.
 *
 * @param {string} message — the current user message
 * @param {Array} recentHistory — last 6 messages from the thread
 * @returns {object} context profile
 */
export function classifyRequest(message, recentHistory = []) {
  const msg = String(message || '').toLowerCase().trim();
  const historyText = (recentHistory || [])
    .slice(-6)
    .map((m) => String(m.content || '').toLowerCase())
    .join(' ');

  // --- SCHEDULING SIGNALS ---
  // Queue questions, publish actions, scheduling requests
  const isSchedulingTask =
    /\b(schedule|publish|queue|post|when is|what.?s next|next slot|when does|cron|reshare)\b/.test(msg) ||
    /\[publish_journal/i.test(msg) ||
    /\[publish_devotional/i.test(msg) ||
    /approved.*caption/i.test(msg) ||
    /caption.*approved/i.test(msg) ||
    /ready to schedule/i.test(msg) ||
    /schedule.{0,20}(card|post|caption)/i.test(msg);

  // --- WRITING / RESEARCH SIGNALS ---
  // New content creation, research requests, corpus lookups
  const isWritingTask =
    /\b(write|draft|journal|devotional|article|series|research|seeds|quote card|new post|new entry)\b/.test(msg) ||
    /\b(what have i written|have i covered|check the corpus|corpus)\b/.test(msg) ||
    /\b(part [0-9]|episode|next part|continue the series)\b/.test(msg);

  // --- REVISION SIGNALS ---
  // Editing existing content in the thread
  const isRevisionTask =
    /\b(revise|revision|fix|change|update|edit|rewrite|adjust|modify|the draft|this draft|the post|this post|saul|joseph|darvo|power vs)\b/.test(msg) ||
    /\[journal_content\]/i.test(historyText) ||
    /\[devotional_content\]/i.test(historyText);

  // --- CONVERSATIONAL SIGNALS ---
  //
  // This used to require msg.length < 80.
  //
  // That number arrived on 2026-07-15 in a commit titled "eliminate
  // unconditional context loading". It was a token optimization, and
  // `isConversational` never meant "this is a conversation" — it meant "too
  // short to be worth loading context for". The label was then used to decide
  // behavior it was never designed to decide.
  //
  // The cost: on 2026-09-08 Bart sent nine notes containing three direct
  // questions about the Cain draft. 343 characters in a reduced test, far more
  // in reality. It classified as `writing`, so Auto regenerated the whole 2,700
  // word post three times and answered none of the questions. He had to ask
  // "Why didn't you explain yourself? Why did you just write?" twice.
  //
  // Bart: "If Auto cannot have a dialogue, it's worthless to me."
  //
  // Length is not evidence of intent. A question is. Asking something, or
  // asking Auto to justify a choice, means he wants an answer, and that holds
  // whether he wrote six words or six hundred.
  const asksSomething = /\?/.test(msg) ||
    /\b(tell me why|explain (why|that|this|the|your)|make your case|why (did|do|would|was|were|is|are)|walk me through|justify|your reasoning|not sure why|what do you think|thoughts on|push back|if you disagree)\b/i.test(msg);

  // An explicit instruction to produce. Without one, a message about the
  // writing is a conversation about the writing.
  const commandsProduction =
    /\b(go|write it|write the|draft it|refine|rewrite|revise it|make the (change|edit)|apply|execute|do it|publish|send it|update the (draft|post))\b/i.test(msg);

  const isConversational =
    !isSchedulingTask &&
    (asksSomething ||
      (!commandsProduction && !isWritingTask && !isRevisionTask) ||
      (msg.length < 80 &&
        !isWritingTask &&
        !isRevisionTask &&
        /^(yes|no|ok|good|approved?|go|do it|looks good|that.?s (it|good|right)|perfect|sounds good|fire it|send it|great|thanks|done|got it|understood|confirmed?)/.test(msg)));

  // --- SERIES DETECTION ---
  const seriesPatterns = [
    /power.?vs.?authority/i,
    /judas.?archetype/i,
    /saul.?archetype/i,
    /joseph.?archetype/i,
    /ali.?condition/i,
    /servant.?leadership.?series/i,
    /part\s+\d+/i,
    /next part/i,
    /series/i,
  ];
  const needsSeriesContext = seriesPatterns.some((p) => p.test(msg) || p.test(historyText));

  // --- ACTIVE DRAFT DETECTION ---
  // Extract slug from recent publish signals or approved content
  let activeDraftSlug = null;
  const slugMatch =
    historyText.match(/\[publish_journal[^\]]*slug="([^"]+)"/i) ||
    historyText.match(/slug[:\s]+"?([a-z0-9-]{5,})"?/i);
  if (slugMatch) activeDraftSlug = slugMatch[1];

  // --- BUILD PROFILE ---
  //
  // DIALOGUE WINS FIRST. This branch is deliberately ahead of revision,
  // scheduling and writing, because those match on single words like "fix",
  // "change" and "the post", which appear in almost every note Bart writes
  // about a draft. On 2026-09-08 that ordering sent nine notes containing three
  // direct questions to the revision path, and Auto regenerated 2,700 words
  // three times without answering any of them.
  //
  // A question asked without an instruction to produce is a conversation, no
  // matter how long the message is or which editing verbs it happens to
  // contain.
  //
  // Context here is generous rather than minimal. The old conversational
  // profile loaded almost nothing, which was right when "conversational" meant
  // "ok" and "thanks". A real discussion about a draft needs the draft, the
  // series it belongs to, and often the corpus, because "why did you choose
  // that word" and "make your case about Boisjoly" are answerable only with
  // the material in front of it.
  if (asksSomething && !commandsProduction) {
    return {
      needsCorpus: true,
      needsSchedule: false,
      needsEditorialMemory: false,
      needsSeriesContext,
      needsDraftsContext: true,
      needsPerformanceContext: false,
      activeDraftSlug,
      profile: 'dialogue',
      asksSomething,
      commandsProduction,
      // Explicitly NOT forceCorpusResearch. That flag tells Auto it must ground
      // and produce. Here it must ground and answer.
      forceCorpusResearch: false,
    };
  }

  // Revision tasks: corpus not needed (content is in thread), no schedule, no editorial memory
  if (isRevisionTask && !isWritingTask) {
    return {
      needsCorpus: false,
      needsSchedule: false,
      needsEditorialMemory: false,
      needsSeriesContext,
      needsDraftsContext: true,
      needsPerformanceContext: false,
      activeDraftSlug,
      profile: 'revision',
      asksSomething,
      commandsProduction,
    };
  }

  // Scheduling tasks: no corpus, schedule required, no editorial memory
  if (isSchedulingTask && !isWritingTask) {
    return {
      needsCorpus: false,
      needsSchedule: true,
      needsEditorialMemory: false,
      needsSeriesContext: false,
      needsDraftsContext: true,
      needsPerformanceContext: false,
      activeDraftSlug,
      profile: 'scheduling',
    };
  }

  // Conversational: minimal context
  if (isConversational) {
    return {
      needsCorpus: false,
      needsSchedule: false,
      needsEditorialMemory: false,
      needsSeriesContext: false,
      needsDraftsContext: true,
      needsPerformanceContext: false,
      activeDraftSlug,
      profile: 'conversational',
      asksSomething,
      commandsProduction,
    };
  }

  // Writing / research tasks: full corpus, editorial memory, performance.
  // Phase 2 JARVIS: corpus load is mandatory for writing — not optional model choice.
  if (isWritingTask) {
    return {
      needsCorpus: true,
      needsSchedule: false,
      needsEditorialMemory: true,
      needsSeriesContext,
      needsDraftsContext: true,
      needsPerformanceContext: true,
      activeDraftSlug,
      profile: 'writing',
      asksSomething,
      commandsProduction,
      forceCorpusResearch: true,
    };
  }

  // Default: load corpus and drafts but skip schedule and editorial memory
  // This is the safe fallback — it loads enough context to handle most tasks
  // without the full payload of a writing session
  return {
    needsCorpus: true,
    needsSchedule: false,
    needsEditorialMemory: false,
    needsSeriesContext,
    needsDraftsContext: true,
    needsPerformanceContext: false,
    activeDraftSlug,
    profile: 'general',
  };
}
