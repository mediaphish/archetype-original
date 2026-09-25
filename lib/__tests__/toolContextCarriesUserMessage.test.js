/**
 * @jest-environment node
 *
 * The approval that would not record (2026-09-25).
 *
 * Bart typed "Approved" on the header image for The Jonathan Archetype, twice,
 * and both times approve_stage came back approval_not_given. The rule was fine:
 * bartApprovedInMessage('Approved') is true. What was missing was the message
 * itself. api/ao/auto/chat.js built a toolContext with userMessage on it, but
 * the streaming path in lib/ao/autoV2.js built its own toolContext for the tool
 * loop and left userMessage out, so the gate judged an empty string.
 *
 * Any gate that reads Bart's own words is dead the moment a context is built
 * without them, and that is invisible in a unit test of the rule. So this
 * checks the wiring: every toolContext handed to a tool loop carries the
 * message for the turn.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

const SOURCES = ['lib/ao/autoV2.js', 'api/ao/auto/chat.js'];

/**
 * Every toolContext object literal in a file, with its braces balanced. Both
 * spellings count: the one passed inline to a loop and the one declared with
 * const and passed by name.
 */
function toolContextLiterals(source) {
  const literals = [];
  const opener = /toolContext\s*(?::|=)\s*\{/g;
  let match;
  while ((match = opener.exec(source))) {
    let depth = 1;
    let i = match.index + match[0].length;
    for (; i < source.length && depth > 0; i += 1) {
      if (source[i] === '{') depth += 1;
      else if (source[i] === '}') depth -= 1;
    }
    literals.push(source.slice(match.index, i));
  }
  return literals;
}

describe('tool contexts carry the message for the turn', () => {
  for (const relative of SOURCES) {
    it(`${relative} passes userMessage on every toolContext it builds`, () => {
      const source = readFileSync(join(root, relative), 'utf8');
      const literals = toolContextLiterals(source);
      expect(literals.length).toBeGreaterThan(0);
      for (const literal of literals) {
        expect(literal).toMatch(/\buserMessage\b/);
      }
    });
  }
});

describe('the helper reads a literal correctly', () => {
  it('stops at the matching brace, not the first one', () => {
    const source = 'toolContext: { email, nested: { a: 1 }, userMessage }, after: 2';
    expect(toolContextLiterals(source)).toEqual([
      'toolContext: { email, nested: { a: 1 }, userMessage }',
    ]);
  });
});
