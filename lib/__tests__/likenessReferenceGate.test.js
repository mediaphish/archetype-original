/**
 * @jest-environment node
 *
 * 2026-08-31. Auto asked for the header for Part 4 of the Scoreboard Leadership
 * series: a Vietnam battlefield, an infantry officer in his early 40s, lean,
 * close-cropped dark hair, angular jaw. The activity log shows what the server
 * attached as the reference:
 *
 *   manual-upload-the-signal-i-was-actually-watching-1787252286444.jpg
 *
 * One of Bart's approved quote cards. His face. The model put a bearded man in
 * his glasses in the Ia Drang Valley, and the two retries referenced the
 * previous generated header, so each attempt chained off the bad one.
 */
import { shouldAttachApprovedCard } from '../ao/likenessReferenceGate.js';

describe('shouldAttachApprovedCard', () => {
  it('does not attach a likeness card to a journal header', () => {
    // The exact call shape from the incident.
    expect(
      shouldAttachApprovedCard({ contentType: 'journal_header', intent: 'header_image_for_post' })
    ).toBe(false);
  });

  it('does not attach on intent alone when no content type is given', () => {
    // The old condition was an OR: intent header_image_for_post was enough by
    // itself, which is how a scene prompt reached the likeness branch.
    expect(shouldAttachApprovedCard({ intent: 'header_image_for_post' })).toBe(false);
  });

  it('attaches for an explicit quote card', () => {
    expect(shouldAttachApprovedCard({ contentType: 'quote_card' })).toBe(true);
  });

  it('attaches for resurface, which is a likeness format by convention', () => {
    expect(shouldAttachApprovedCard({ contentType: 'resurface' })).toBe(true);
  });

  it('is case and whitespace tolerant', () => {
    expect(shouldAttachApprovedCard({ contentType: '  Quote_Card ' })).toBe(true);
    expect(shouldAttachApprovedCard({ contentType: 'RESURFACE' })).toBe(true);
  });

  it('defaults to not attaching when nothing is specified', () => {
    // The asymmetry that decides this: no reference means the model paints a
    // generic scene, which is what every published series header already is.
    // A wrong reference cannot be fixed by retrying, because the retry
    // references the bad output.
    expect(shouldAttachApprovedCard({})).toBe(false);
    expect(shouldAttachApprovedCard()).toBe(false);
  });

  it('does not attach for social graphics', () => {
    expect(shouldAttachApprovedCard({ contentType: 'social_graphic' })).toBe(false);
  });
});
