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
