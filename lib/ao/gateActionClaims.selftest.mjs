/**
 * Self-check for action-claim gate (ghost-streaming fix).
 * Run: node lib/ao/gateActionClaims.selftest.mjs
 */
import {
  findUnbackedActionClaims,
  annotateUnbackedActionClaims,
  collectPriorSuccessfulToolResults,
} from './gateActionClaims.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// Case from the live transcript: prose claims with no tool and no content block
{
  const reply =
    'Rebuilding the draft now...\nBuilding the draft now...\nSaved as draft, not approved. Structure now matches Part 1.';
  const { unbacked } = findUnbackedActionClaims(reply, { toolResults: [] });
  assert(unbacked.length >= 1, 'expected unbacked save/rebuild claims');
  assert(
    unbacked.some((u) => u.ruleId === 'save_or_rebuild' || u.ruleId === 'save_status'),
    'expected save-related rule'
  );
}

// Future-tense plan is allowed
{
  const reply = "I'll rebuild the draft next and then save it as draft.";
  const { unbacked } = findUnbackedActionClaims(reply, { toolResults: [] });
  assert(unbacked.length === 0, 'future tense should not trip the gate');
}

// Tool-backed claim is allowed
{
  const reply = 'Saved as draft, not approved.';
  const { unbacked } = findUnbackedActionClaims(reply, {
    toolResults: [{ name: 'save_draft', result: { ok: true, slug: 'x' } }],
  });
  assert(unbacked.length === 0, 'successful save_draft should back the claim');
}

// Failed tool does not back the claim
{
  const reply = 'Saved as draft.';
  const { unbacked } = findUnbackedActionClaims(reply, {
    toolResults: [{ name: 'save_draft', result: { ok: false, error: 'nope' } }],
  });
  assert(unbacked.length >= 1, 'failed save_draft must not back the claim');
}

// Legacy bracket world: JOURNAL_CONTENT backs save claim
{
  const reply = 'Saved as draft.\n[JOURNAL_CONTENT]\nHello\n[/JOURNAL_CONTENT]';
  const { unbacked } = findUnbackedActionClaims(reply, { toolResults: [] });
  assert(unbacked.length === 0, 'JOURNAL_CONTENT should back save claim');
}

// Legacy publish signal backs publish claim
{
  const reply = 'Published.\n[PUBLISH_JOURNAL slug="x"]';
  const { unbacked } = findUnbackedActionClaims(reply, { toolResults: [] });
  assert(!unbacked.some((u) => u.ruleId === 'publish'), 'PUBLISH_JOURNAL backs publish');
}

// Negated claims are allowed
{
  const reply = 'This draft is not published yet. Nothing has been saved.';
  const { unbacked } = findUnbackedActionClaims(reply, { toolResults: [] });
  assert(unbacked.length === 0, 'negated claims should not trip the gate');
}

// Ghost-streaming fix: prior-turn save evidence backs status report this turn
{
  const reply =
    `'Scoreboard Leadership' is saved in drafts, status: draft, not approved, not published.\n\n` +
    `# Scoreboard Leadership\n\nFull post body Bart needs to review stays visible.`;
  const prior = collectPriorSuccessfulToolResults([
    {
      role: 'assistant',
      meta: {
        tool_results: [{ name: 'save_draft', result: { ok: true, slug: 'scoreboard-leadership' } }],
      },
    },
  ]);
  assert(prior.length === 1, 'prior tool collector should find save_draft');
  const { unbacked } = findUnbackedActionClaims(reply, {
    toolResults: [],
    priorToolResults: prior,
  });
  assert(
    !unbacked.some((u) => u.ruleId === 'save_status'),
    'prior-turn save_draft must back "is saved in drafts" status claim'
  );
}

// Approve/publish remain turn-strict even with prior evidence
{
  const reply = "I've approved the draft and published it live on the site.";
  const { unbacked } = findUnbackedActionClaims(reply, {
    toolResults: [],
    priorToolResults: [
      { name: 'approve_draft', result: { ok: true } },
      { name: 'publish_journal', result: { ok: true } },
    ],
  });
  assert(
    unbacked.some((u) => u.ruleId === 'approve'),
    'approve must stay current-turn-only'
  );
  assert(
    unbacked.some((u) => u.ruleId === 'publish'),
    'publish must stay current-turn-only'
  );
}

// Annotate path keeps substantive content (no ghost replace)
{
  const body =
    `# Scoreboard Leadership\n\n` +
    `This is the complete stored post text for review.\n\n` +
    `I've approved the draft.`;
  const annotated = annotateUnbackedActionClaims(body, { toolResults: [] });
  assert(annotated.unbacked.length >= 1, 'approve claim should be unbacked');
  assert(
    annotated.reply.includes('complete stored post text for review'),
    'annotated reply must keep original substantive content'
  );
  assert(
    annotated.reply.includes('SYSTEM WARNING'),
    'annotated reply should append a warning note'
  );
  assert(
    annotated.reply.indexOf('complete stored post text') <
      annotated.reply.indexOf('SYSTEM WARNING'),
    'warning must come after original content'
  );
}

// False-positive: backticked slug containing "published" must NOT fire
{
  const reply =
    'Cleanup candidate: `do-we-have-any-examples-that-have-been-published-of-the-hazing-it-would-add-good`';
  const { unbacked } = findUnbackedActionClaims(reply, { toolResults: [] });
  assert(
    !unbacked.some((u) => u.ruleId === 'publish'),
    'backticked slug with published must not trip publish gate'
  );
}

// False-positive: bare long hyphen slug with "published" (live incident shape)
{
  const reply =
    'Word count aside, remove this garbage row: do-we-have-any-examples-that-have-been-published-of-the-hazing-it-would-add-good';
  const { unbacked } = findUnbackedActionClaims(reply, { toolResults: [] });
  assert(
    !unbacked.some((u) => u.ruleId === 'publish'),
    'hyphenated slug containing published must not trip publish gate'
  );
}

// Real prose claim must still fire
{
  const reply = "I've published the post.";
  const { unbacked } = findUnbackedActionClaims(reply, { toolResults: [] });
  assert(
    unbacked.some((u) => u.ruleId === 'publish'),
    'first-person published claim must still trip the gate'
  );
}

{
  const reply = 'the post was published this morning';
  const { unbacked } = findUnbackedActionClaims(reply, { toolResults: [] });
  assert(
    unbacked.some((u) => u.ruleId === 'publish'),
    'prose "was published" must still trip the gate'
  );
}

console.log('gateActionClaims.selftest: all checks passed');
