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

// #129 — approve/image claims backed by fields on a different same-turn tool
{
  const reply =
    'the journal itself is confirmed scheduled... tied to the approved draft, header image attached, confirmed by the tool response itself, not my narration. Draft approved, header image attached, this is locked and correct.';
  const toolResults = [
    {
      name: 'schedule_journal_publish',
      result: {
        ok: true,
        draft: {
          status: 'approved',
          image_url:
            'https://example.com/manual-upload-the-standard-that-held.jpg',
        },
        scheduled_publish_at: '2026-08-19T11:00:00.000Z',
      },
    },
  ];
  const { unbacked } = findUnbackedActionClaims(reply, { toolResults });
  assert(
    !unbacked.some((u) => u.ruleId === 'approve'),
    'approve claim must be backed by draft.status on schedule_journal_publish'
  );
  assert(
    !unbacked.some((u) => u.ruleId === 'generate_image'),
    'image claim must be backed by draft.image_url on schedule_journal_publish'
  );
}

{
  const reply = 'The draft has been approved.';
  const { unbacked } = findUnbackedActionClaims(reply, {
    toolResults: [{ name: 'schedule_captions', result: { ok: true, total: 5 } }],
  });
  assert(
    unbacked.some((u) => u.ruleId === 'approve'),
    'approve claim with no status:approved in results must still fire'
  );
}

{
  const reply = 'The header image has been attached.';
  const { unbacked } = findUnbackedActionClaims(reply, {
    toolResults: [
      {
        name: 'publish_journal',
        result: {
          ok: true,
          image_url: 'https://example.com/header.jpg',
          journal_url: 'https://www.archetypeoriginal.com/journal/x',
        },
      },
    ],
  });
  assert(
    !unbacked.some((u) => u.ruleId === 'generate_image'),
    'image claim backed by publish_journal image_url must not fire'
  );
}

{
  const reply = "I've approved the draft.";
  const { unbacked } = findUnbackedActionClaims(reply, {
    toolResults: [{ name: 'approve_draft', result: { ok: true, status: 'approved' } }],
  });
  assert(
    !unbacked.some((u) => u.ruleId === 'approve'),
    'direct approve_draft tool still backs approve claims'
  );
}

{
  const reply = "I've attached the header image.";
  const { unbacked } = findUnbackedActionClaims(reply, {
    toolResults: [
      { name: 'generate_image', result: { ok: true, image_url: 'https://example.com/x.jpg' } },
    ],
  });
  assert(
    !unbacked.some((u) => u.ruleId === 'generate_image'),
    'direct generate_image tool still backs image claims'
  );
}

{
  const reply = 'Longer captions perform better on Instagram for this account.';
  const { unbacked } = findUnbackedActionClaims(reply, { toolResults: [] });
  assert(
    unbacked.some((u) => u.ruleId === 'caption_length_performance'),
    'caption-length performance claims must require the tool'
  );
}

{
  const reply = 'Longer captions perform better on Instagram for this account.';
  const { unbacked } = findUnbackedActionClaims(reply, {
    toolResults: [{ name: 'get_caption_length_performance', result: { ok: true } }],
  });
  assert(
    !unbacked.some((u) => u.ruleId === 'caption_length_performance'),
    'get_caption_length_performance backs caption-length claims'
  );
}

{
  const { unbacked } = findUnbackedActionClaims(
    'Does posting carousel posts help engagement? Yes — posting carousels help engagement.',
    { toolResults: [] }
  );
  assert(
    unbacked.some((u) => u.ruleId === 'performance_effectiveness'),
    'effectiveness claims without a metrics tool must be gated'
  );
}

{
  const reply = 'Does posting carousels help engagement? Yes — posting carousels help engagement.';
  const { unbacked } = findUnbackedActionClaims(reply, {
    toolResults: [{ name: 'get_recommended_schedule', result: { ok: true } }],
  });
  assert(
    !unbacked.some((u) => u.ruleId === 'performance_effectiveness'),
    'get_recommended_schedule backs a general effectiveness claim'
  );
}

{
  const reply =
    'I found a strong, well-documented one: Kelo v. City of New London (2005).';
  const { unbacked } = findUnbackedActionClaims(reply, { toolResults: [] });
  assert(
    unbacked.some((u) => u.ruleId === 'research_citation'),
    'Kelo-style "I found a strong, well-documented one" with no search must be unbacked'
  );
}

{
  const reply =
    'I found a strong, well-documented one: Kelo v. City of New London (2005).';
  const { unbacked } = findUnbackedActionClaims(reply, {
    toolsUsed: ['web_search'],
  });
  assert(
    !unbacked.some((u) => u.ruleId === 'research_citation'),
    'web_search in toolsUsed must back a research-citation claim'
  );
}

{
  const reply =
    'I found a strong, well-documented one: Kelo v. City of New London (2005).';
  const { unbacked } = findUnbackedActionClaims(reply, {
    toolResults: [{ name: 'save_draft', result: { ok: true, slug: 'x' } }],
    toolsUsed: ['web_search'],
  });
  assert(
    !unbacked.some((u) => u.ruleId === 'research_citation'),
    'web_search in toolsUsed must still back the claim when other client tools also ran'
  );
}

{
  const reply =
    'I found a strong, well-documented one: Kelo v. City of New London (2005).';
  const { unbacked } = findUnbackedActionClaims(reply, {
    toolResults: [{ name: 'web_search', result: { ok: true } }],
  });
  assert(
    !unbacked.some((u) => u.ruleId === 'research_citation'),
    'successful web_search tool result must back a research-citation claim'
  );
}

console.log('gateActionClaims.selftest: all checks passed');
