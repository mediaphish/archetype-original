/**
 * @jest-environment node
 *
 * The fabricated-result gate must catch a model writing a result tag, and must
 * not fire when the model is talking about one.
 *
 * The second half is the regression, observed 2026-09-11. Auto explained that it
 * had included "the `[IMAGE_GENERATED]` block" in a reply. The gate treated the
 * quoted tag as a claim, stripped it to empty backticks, and appended a warning
 * that the image was fabricated, under a real image saved on the draft.
 */
import { enforceNoFabricatedConfirmations } from '../ao/enforceResponseRules.js';

const WARNING = /SYSTEM WARNING/;

describe('a written result tag is still caught', () => {
  it.each([
    ['Here it is.\n\n[IMAGE_GENERATED label="x" url="https://example.com/a.png" size="1536x1024"]'],
    ['Done [IMAGES_GENERATED]card 1[/IMAGES_GENERATED]'],
    ['[RESHARE_RESULT ok="true"]'],
    ['[OPPORTUNITY_IMAGE_RESULT url="https://example.com/b.png"]'],
  ])('%s', (reply) => {
    const out = enforceNoFabricatedConfirmations(reply);
    expect(out).toMatch(WARNING);
    // Only the reply body must be clean. The warning itself names the tag it
    // caught, so checking the whole output would always fail.
    const body = out.split('**⚠️ SYSTEM WARNING')[0];
    expect(body).not.toMatch(/\[(IMAGE_GENERATED|IMAGES_GENERATED|RESHARE_RESULT|OPPORTUNITY_IMAGE_RESULT)/);
  });
});

describe('a tag mentioned in code is not a claim', () => {
  it('leaves the Cain reply alone', () => {
    const reply =
      'I included the `[IMAGE_GENERATED]` block in my last reply, which is what the UI ' +
      'normally uses to render into the artifact panel automatically.';
    const out = enforceNoFabricatedConfirmations(reply);
    expect(out).toBe(reply);
    expect(out).not.toMatch(WARNING);
  });

  it('leaves a fenced example alone', () => {
    const reply = 'The server sends this back:\n\n```\n[IMAGE_GENERATED url="https://example.com/a.png"]\n```';
    expect(enforceNoFabricatedConfirmations(reply)).toBe(reply);
  });

  it('still catches a real tag sitting next to a quoted one', () => {
    const reply =
      'The `[IMAGE_GENERATED]` tag is what renders it.\n\n[IMAGE_GENERATED url="https://example.com/fake.png"]';
    const out = enforceNoFabricatedConfirmations(reply);
    expect(out).toMatch(WARNING);
  });
});

describe('ordinary replies pass through untouched', () => {
  it('does nothing without any result tag', () => {
    const reply = 'Approve this prompt, edit it, or replace it.';
    expect(enforceNoFabricatedConfirmations(reply)).toBe(reply);
  });
});
