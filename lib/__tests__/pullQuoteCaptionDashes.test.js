/**
 * @jest-environment node
 *
 * The captions that publish under his name (2026-10-02).
 *
 * The first weekly bundle built after the quote queue was fixed came back with
 * em dashes in every other caption: "authority versus trust—it's", "unwelcome
 * there—it's". These captions go out on Instagram, Facebook, LinkedIn and X
 * beside the card. The dash rule is absolute and it was enforced on the journal,
 * on Auto's drafting, and on Archy, but not here. The caption prompt had never
 * mentioned it and nothing read the output.
 *
 * Same answer as Archy: the rule is in the prompt so the model mostly complies,
 * and the enforcement runs on the way out so compliance is not required.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { stripProseDashes } from '../ao/archyVoice.js';

const source = readFileSync(join(process.cwd(), 'lib/ao/pullQuoteCaptions.js'), 'utf8');

describe('pull-quote captions carry no dashes out of the model', () => {
  test('the prompt states the rule', () => {
    expect(source).toContain('ARCHY_DASH_RULE');
    expect(source).toMatch(/VOICE RULE/);
  });

  test('every model-written caption is stripped before it is returned', () => {
    // Both arrays the generator returns, the long caption and the X line.
    const captionLine = source.match(/const c = .*caps\[i\].*;/)?.[0] || '';
    const xLine = source.match(/const cx = .*capsX\[i\].*;/)?.[0] || '';
    const fallbackLine = source.match(/const fallback = .*caps\[i\].*;/)?.[0] || '';
    expect(captionLine).toContain('stripProseDashes');
    expect(xLine).toContain('stripProseDashes');
    expect(fallbackLine).toContain('stripProseDashes');
  });

  test('no fallback caption string ships a dash', () => {
    const literals = [...source.matchAll(/`[^`]*`|'[^']*'/g)].map((m) => m[0]);
    const offenders = literals.filter(
      (lit) => /[—–]/.test(lit) && !/VOICE RULE|Do NOT|do not|captions_x|LENGTH|DOCTRINE|Instruction line/.test(lit)
    );
    expect(offenders).toEqual([]);
  });

  test('the stripper turns the real captions into his punctuation', () => {
    expect(stripProseDashes("this isn't authority versus trust—it's borrowed authority")).toBe(
      "this isn't authority versus trust, it's borrowed authority"
    );
  });
});
