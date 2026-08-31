/**
 * @jest-environment node
 *
 * A new chat should start clean.
 *
 * Bart, 2026-08-30: "Why do I need that to start a new chat? If I am starting
 * new, I don't need to work on old."
 *
 * He opened a fresh thread and Auto's first words were a list of outstanding
 * drafts plus "What do you want to tackle first?". One item was a post already
 * scheduled to publish with all five captions queued. The other was a brief that
 * had been saved as a journal draft and was never a post at all.
 *
 * Auto was not reasoning badly. The block it reads is headed "UNPUBLISHED
 * DRAFTS — CRITICAL CONTEXT" and frames every line in it as unfinished work, so
 * on the first message of a thread it does not orient the conversation, it
 * hijacks it.
 *
 * Asserted against the source, because the function opens a database connection
 * at import and the invariant is structural: the list is gated on thread age,
 * both call sites pass that signal, and the referenced-draft injection survives
 * so he is still never asked to re-paste a draft he names.
 */
import fs from 'fs';
import path from 'path';

const SRC = fs.readFileSync(path.join(process.cwd(), 'lib/ao/autoV2.js'), 'utf8');

describe('new thread context', () => {
  it('gates the unpublished-drafts list on thread age', () => {
    expect(SRC).toMatch(/const suppressList = isNewThread && lines\.length > 0;/);
    expect(SRC).toMatch(/const draftsBlock = !suppressList && lines\.length > 0/);
  });

  it('passes the new-thread signal at every call site', () => {
    // Two call sites build the context. Fixing one and missing the other would
    // leave the behaviour depending on which path a request took.
    const passes = SRC.match(/isNewThread: !Array\.isArray\(history\) \|\| history\.length === 0/g) || [];
    const calls = SRC.match(/loadApprovedDraftsContext\(ownerEmail/g) || [];
    expect(calls.length).toBeGreaterThan(0);
    expect(passes).toHaveLength(calls.length);
  });

  it('still injects a draft the first message names', () => {
    // Suppressing the list must not cost him the thing the block was built for:
    // never being asked to re-paste content Auto already has.
    expect(SRC).toMatch(/const referencedContentBlock = buildReferencedDraftContentBlock\(/);
    const suppress = SRC.indexOf('const suppressList =');
    const referenced = SRC.indexOf('const referencedContentBlock =');
    expect(referenced).toBeGreaterThan(suppress);
  });

  it('tells the model a new thread is not a resume', () => {
    expect(SRC).toMatch(/A new thread is not a resume/);
    expect(SRC).toMatch(/never list outstanding drafts/i);
    expect(SRC).toMatch(/never ask which item he wants to tackle first/i);
  });

  it('keeps the resume behaviour for genuinely resumed threads', () => {
    // The orientation paragraph is still correct when there IS a thread to
    // resume. This is a scoping fix, not a removal.
    expect(SRC).toMatch(/When RESUMING a thread with more than 10 messages/);
  });

  it('surfaces scheduling state so a staged post is not called unfinished', () => {
    // The other half of the same incident: an approved post that was fully
    // staged looked identical to one nobody had touched.
    expect(SRC).toMatch(/PUBLISH SCHEDULED/);
    expect(SRC).toMatch(/CAPTIONS SCHEDULED/);
  });
});
