/**
 * #131 draft artifact visibility — server append + panel resolve.
 * Run: node lib/ao/appendDraftArtifactFromSaveResults.selftest.mjs
 */
import assert from 'assert';
import {
  appendDraftArtifactFromSaveResults,
  sanitizeToolResultsForMeta,
  replyHasArtifactTag,
} from './appendDraftArtifactFromSaveResults.js';
import {
  resolveArtifactPanelState,
  findLatestArtifactInMessages,
} from '../../src/components/ao/draftArtifactSync.js';

const FULL =
  '# Ruth\n\n' +
  'A'.repeat(900) +
  '\n\nThe full journal body continues with enough depth to pass the length gate.';

// Test 1: prose-only reply + successful full save → append real ARTIFACT
{
  const prose = 'I made the changes you asked for, take a look.';
  const { reply, appended, slug } = appendDraftArtifactFromSaveResults(prose, [
    {
      name: 'save_draft',
      result: {
        ok: true,
        kind: 'journal',
        slug: 'ruth-draft',
        title: 'Ruth',
        content: FULL,
      },
    },
  ]);
  assert.strictEqual(appended, true);
  assert.strictEqual(slug, 'ruth-draft');
  assert.ok(replyHasArtifactTag(reply));
  assert.ok(reply.includes(FULL));
  assert.ok(reply.startsWith(prose) || reply.includes(prose));
  const panel = resolveArtifactPanelState([{ role: 'assistant', content: reply }]);
  assert.ok(panel.artifact);
  assert.ok(panel.artifact.content.length >= 17171 || panel.artifact.content.includes('Ruth'));
}

// Test 2: reply already has ARTIFACT → do not double-append
{
  const existing = `Done.\n\n[ARTIFACT type="draft" label="Ruth"]\n${FULL}\n[/ARTIFACT]`;
  const { reply, appended } = appendDraftArtifactFromSaveResults(existing, [
    {
      name: 'save_draft',
      result: { ok: true, kind: 'journal', slug: 'ruth-draft', title: 'Ruth', content: FULL + '\nextra' },
    },
  ]);
  assert.strictEqual(appended, false);
  assert.strictEqual((reply.match(/\[ARTIFACT/gi) || []).length, 1);
}

// Test 3: conversational turn with no tag — keep prior artifact (do not clear)
{
  let panelArtifact = { type: 'draft', label: 'Ruth', content: FULL };
  const msgs = [
    { role: 'assistant', content: `[ARTIFACT type="draft" label="Ruth"]\n${FULL}\n[/ARTIFACT]` },
    { role: 'user', content: 'Looks good — one more thought?' },
    { role: 'assistant', content: 'Happy to discuss. What are you thinking?' },
  ];
  const resolved = resolveArtifactPanelState(msgs);
  assert.strictEqual(resolved.clear, false);
  assert.strictEqual(resolved.source, 'fallback');
  assert.ok(resolved.artifact);
  assert.ok(resolved.artifact.content.includes('Ruth'));
  // Simulate panel: only clear when clear===true
  if (resolved.clear) panelArtifact = null;
  else if (resolved.artifact) panelArtifact = resolved.artifact;
  assert.ok(panelArtifact);
}

// Test 4: Ruth-like sequence ends with full content visible (not blank)
{
  const msgs = [
    {
      role: 'assistant',
      content: `[ARTIFACT type="draft" label="Ruth"]\n${'x'.repeat(1625)}\n[/ARTIFACT]`,
    },
    {
      role: 'assistant',
      content: `[ARTIFACT type="draft" label="Ruth"]\n${FULL}\n[/ARTIFACT]`,
    },
    {
      role: 'assistant',
      content: 'I tightened the opening and saved. Want another pass?',
    },
  ];
  // After save, server would have appended — simulate that final message
  const withAppend = appendDraftArtifactFromSaveResults(msgs[2].content, [
    {
      name: 'save_draft',
      result: {
        ok: true,
        kind: 'journal',
        slug: 'ruth',
        title: 'Ruth',
        content: FULL + '\n' + 'y'.repeat(500),
      },
    },
  ]);
  const finalMsgs = [
    msgs[0],
    msgs[1],
    { role: 'assistant', content: withAppend.reply },
  ];
  const end = resolveArtifactPanelState(finalMsgs);
  assert.ok(end.artifact);
  assert.ok(end.artifact.content.length > 1000);
  assert.notStrictEqual(end.source, 'none');
}

// Test 5: new/empty thread clears
{
  const empty = resolveArtifactPanelState([]);
  assert.strictEqual(empty.clear, true);
  assert.strictEqual(empty.artifact, null);

  const otherThread = resolveArtifactPanelState([
    { role: 'user', content: 'hi' },
  ]);
  assert.strictEqual(otherThread.clear, true);
}

// sanitize strips content from meta
{
  const sanitized = sanitizeToolResultsForMeta([
    {
      name: 'save_draft',
      result: { ok: true, slug: 'x', content: FULL, content_length: FULL.length },
    },
  ]);
  assert.ok(!sanitized[0].result.content);
  assert.strictEqual(sanitized[0].result.content_length, FULL.length);
}

assert.ok(findLatestArtifactInMessages([{ role: 'user', content: 'x' }]) === null);

console.log('appendDraftArtifactFromSaveResults.selftest: PASS');
