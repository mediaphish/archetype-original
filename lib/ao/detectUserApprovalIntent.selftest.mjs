/**
 * #132 approval intent — paste-ready must not approve; short real approvals must.
 * Run: node lib/ao/detectUserApprovalIntent.selftest.mjs
 */
import assert from 'assert';
import {
  detectUserApprovalIntent,
  isHyphenCompoundMatch,
} from './detectUserApprovalIntent.js';

// Test 1: exact paste-ready incident language — must NOT approve
{
  const msg =
    'Captions after image approval, same standing rules already in force: no link-in-bio omission on Instagram, real URLs on all other automated channels, manual paste-ready copy for LinkedIn Business, Facebook Personal, and Instagram Personal alongside the four automated captions.';
  const r = detectUserApprovalIntent(msg);
  assert.strictEqual(r.isApproval, false, 'paste-ready must not trip approval');
}

// Test 2: genuine short approval
{
  const r = detectUserApprovalIntent('looks good, publish it');
  assert.strictEqual(r.isApproval, true);
  assert.ok(r.matchedText);
}

// Test 3: long planning with solid/ready/yes in unrelated contexts
{
  assert.strictEqual(
    detectUserApprovalIntent(
      'Make sure the schedule is solid before we lock research. Once research is ready we can draft. This is a yes/no decision on Boaz later — not approving anything now.'
    ).isApproval,
    false
  );
}

// Test 4: negated approval still blocked
{
  assert.strictEqual(
    detectUserApprovalIntent('Nothing has been approved yet').isApproval,
    false
  );
  assert.strictEqual(
    detectUserApprovalIntent("I'm not ready to approve this").isApproval,
    false
  );
}

// Test 5: diagnostic logging fires on a real positive
{
  const warn = console.warn;
  const logs = [];
  console.warn = (...args) => {
    logs.push(args);
    return warn(...args);
  };
  try {
    const r = detectUserApprovalIntent('Approved. Lock it in.');
    assert.strictEqual(r.isApproval, true);
    assert.ok(
      logs.some((a) => a[0] === '[detectUserApprovalIntent] fired'),
      'diagnostic logging must fire'
    );
    const hit = logs.find((a) => a[0] === '[detectUserApprovalIntent] fired');
    assert.ok(hit?.[1]?.matchedText);
    assert.ok(hit?.[1]?.context);
  } finally {
    console.warn = warn;
  }
}

// Short "ready" alone still works; hyphen compound still blocked even when short
{
  assert.strictEqual(detectUserApprovalIntent('ready').isApproval, true);
  assert.strictEqual(detectUserApprovalIntent('paste-ready').isApproval, false);
  assert.ok(isHyphenCompoundMatch('paste-ready', 'paste-ready'.indexOf('ready'), 5));
}

console.log('detectUserApprovalIntent.selftest: PASS');
