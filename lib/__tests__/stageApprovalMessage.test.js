/**
 * @jest-environment node
 *
 * Auto records an approval only when Bart's own message gives it.
 */
import { bartApprovedInMessage, cleanCaptions } from '../ao/stageApprovalRules.js';

describe('bartApprovedInMessage', () => {
  it.each([
    'Captions approved.',
    'Image approved.',
    'I approve the captions',
    'These look good. Approved.',
    'Looks good, lock them in',
    'Perfect, go ahead',
  ])('accepts %p', (text) => {
    expect(bartApprovedInMessage(text)).toBe(true);
  });

  // 2026-09-20: Bart uploaded the header himself, asked for captions, and Auto
  // spent six turns demanding the words "I approve the image".
  describe('the image-approval loop', () => {
    it.each([
      'Now give me captions.',
      'Schedule it.',
      "What's next?",
    ])('takes a request for the next step as approval of the image: %p', (text) => {
      expect(bartApprovedInMessage(text, { stage: 'image' })).toBe(true);
    });

    it.each([
      'I gave you the image. How would it not be approved.\n\nThe image is approved. Be smarter.',
      'The image is approved.',
      'Use that one.',
    ])('accepts approval in his own words: %p', (text) => {
      expect(bartApprovedInMessage(text, { stage: 'image' })).toBe(true);
    });

    it('treats an image Bart supplied as approved whatever he typed', () => {
      expect(bartApprovedInMessage('I provided you the header image.', { stage: 'image', suppliedByBart: true })).toBe(true);
    });

    it('does not take a captions request as approval of the captions themselves', () => {
      expect(bartApprovedInMessage('Now give me captions.', { stage: 'captions' })).toBe(false);
    });

    it('still refuses a refusal', () => {
      expect(bartApprovedInMessage('No I refuse', { stage: 'image' })).toBe(false);
      expect(bartApprovedInMessage('No. I will not.', { stage: 'image' })).toBe(false);
    });
  });

  it.each([
    '',
    'Change the LinkedIn Business caption to lead with Saban.',
    "Don't approve the captions yet",
    'Not approved, the X caption is too long',
    'Do not approve anything until I read them',
    'Why is the panel still on Image?',
  ])('refuses %p', (text) => {
    expect(bartApprovedInMessage(text)).toBe(false);
  });
});

describe('cleanCaptions', () => {
  it('keeps real channels with text and drops the rest', () => {
    expect(
      cleanCaptions({ linkedin_business: ' The organizations... ', facebook_personal: '', myspace: 'x' })
    ).toEqual({ linkedin_business: 'The organizations...' });
  });
});
