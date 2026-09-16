/**
 * @jest-environment node
 *
 * Resurface work is exempt from the duplicate check; nothing else is.
 * Decided from Bart's own words, so Auto cannot claim the exemption.
 */
import { isResurfaceConversation } from '../ao/resurfaceContext.js';

describe('isResurfaceConversation', () => {
  it('is true when Bart asked for a resurface', () => {
    expect(isResurfaceConversation(["Let's do a resurface post for this Friday. What you got?", 'Let me see the post.'])).toBe(true);
  });

  it('is true for other forms of the word', () => {
    expect(isResurfaceConversation(['Can we keep resurfacing older posts this month?'])).toBe(true);
  });

  it('is false for ordinary post work', () => {
    expect(isResurfaceConversation(['Write Part 6 of the transformational leadership series.', 'Approved.'])).toBe(false);
  });

  it('is false with no messages', () => {
    expect(isResurfaceConversation([])).toBe(false);
    expect(isResurfaceConversation(null)).toBe(false);
  });
});
