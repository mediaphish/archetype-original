/**
 * @jest-environment node
 *
 * Mentioning a post that is already published is not a claim of publishing.
 *
 * 2026-09-16: three replies in one resurface session were stamped "claimed
 * completed action(s)... (publish)" for sentences like these, taken from them.
 */
import { findUnbackedActionClaims } from '../ao/gateActionClaims.js';

const flagsPublish = (text) =>
  findUnbackedActionClaims(text, { toolResults: [] }).unbacked.some((u) => u.ruleId === 'publish');

describe('publish claim rule', () => {
  it.each([
    '"Twenty Points Apart" published 8/28/26, less than three weeks ago.',
    'This pitch scored too close to two published posts, not just adjacent ones.',
    'You literally resurfaced a post we wrote and published less than a month ago.',
  ])('does not flag a mention of existing work: %p', (text) => {
    expect(flagsPublish(text)).toBe(false);
  });

  it.each([
    'I have published the post.',
    "I've published it to the site.",
    'The post has been published.',
    'It is now published.',
  ])('still flags a claim of publishing: %p', (text) => {
    expect(flagsPublish(text)).toBe(true);
  });
});
