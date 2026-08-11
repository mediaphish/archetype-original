/**
 * Lightweight self-check for gateActionClaims (no test runner required).
 * Run: node lib/ao/gateActionClaims.selftest.mjs
 */
import {
  findUnbackedActionClaims,
  buildUnbackedClaimCorrectionNote,
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
    unbacked.some((u) => u.ruleId === 'save_or_rebuild'),
    'expected save_or_rebuild rule'
  );
  const note = buildUnbackedClaimCorrectionNote(unbacked);
  assert(/save_draft/i.test(note), 'correction note should mention save_draft');
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

console.log('gateActionClaims.selftest: all checks passed');
