/**
 * @jest-environment node
 *
 * Status reports backed by a state read are not flagged as unverified actions.
 *
 * 2026-09-15: Auto said "Confirming current schedule state", read it, reported
 * "header image is attached" and "publish is locked", and the reply was stamped
 * "claimed completed action(s)... (publish, generate/attach image)". The same
 * day "status: draft" was flagged on a draft present_outline had just saved.
 */
import { findUnbackedActionClaims } from '../ao/gateActionClaims.js';

const ok = (name) => ({ name, result: { ok: true } });
const rules = (text, evidence) => findUnbackedActionClaims(text, evidence).unbacked.map((u) => u.ruleId);

describe('state reads back status reports', () => {
  const report =
    'Confirmed, real state: draft is approved, header image is attached, publish is locked for 2026-09-16 at 11:00 UTC.';

  it('flags the report with no read this turn', () => {
    expect(rules(report, { toolResults: [] })).toEqual(expect.arrayContaining(['approve', 'generate_image']));
  });

  it('does not flag it after get_publish_state succeeded this turn', () => {
    expect(rules(report, { toolResults: [ok('get_publish_state')] })).toEqual([]);
  });

  it('still flags a first-person action claim even after a read', () => {
    expect(rules('I have published the post.', { toolResults: [ok('get_publish_state')] })).toContain('publish');
  });
});

describe('present_outline counts as save evidence', () => {
  it('does not flag "status: draft" for a draft present_outline saved earlier in the thread', () => {
    const text = 'There is an existing draft, status: draft, no header image yet.';
    expect(rules(text, { toolResults: [], priorToolResults: [ok('present_outline')] })).not.toContain('save_status');
  });
});

describe('stage approval claims', () => {
  it('flags "captions are approved" with no approve_stage or read', () => {
    expect(rules('Captions are approved and saved on the draft.', { toolResults: [] })).toContain('stage_approval');
  });

  it('accepts it when approve_stage succeeded this turn', () => {
    expect(rules('Captions are approved.', { toolResults: [ok('approve_stage')] })).not.toContain('stage_approval');
  });
});
