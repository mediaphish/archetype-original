/**
 * @jest-environment node
 *
 * The queue that emptied itself (2026-09-23 to 2026-10-02).
 *
 * The scans kept running and kept finding candidates: the scan log records
 * insertions on September 28 and 30, and the quote-hash table still holds their
 * ids. The rows themselves were gone. Brief prep runs every ten minutes with a
 * five minute cooldown, so a candidate got its three attempts inside half an
 * hour, and a brief that would not generate was answered by deleting the find.
 * The analyst had started returning nothing the moment the brief call began
 * spending its token ceiling on reasoning instead of the answer, so every
 * candidate for ten days was deleted within thirty minutes of being found,
 * while every log said the scan succeeded.
 *
 * Whether the desk can write a brief says nothing about whether the find was
 * worth keeping. These two checks hold that line: a brief that fails parks the
 * candidate on hold, and nothing in the brief-failure path deletes a row.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(join(process.cwd(), 'lib/ao/prepareQuoteBrief.js'), 'utf8');

/** The body of a named function declaration, braces balanced. */
function functionBody(name) {
  const opener = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`);
  const start = source.search(opener);
  if (start < 0) return null;

  // Skip the parameter list first. A destructured parameter opens a brace of its
  // own, and counting from there would return the parameter object as the body.
  let depth = 0;
  let i = source.indexOf('(', start);
  for (; i < source.length; i += 1) {
    if (source[i] === '(') depth += 1;
    else if (source[i] === ')') {
      depth -= 1;
      if (depth === 0) break;
    }
  }

  const braceAt = source.indexOf('{', i);
  depth = 1;
  let j = braceAt + 1;
  for (; j < source.length && depth > 0; j += 1) {
    if (source[j] === '{') depth += 1;
    else if (source[j] === '}') depth -= 1;
  }
  return source.slice(braceAt + 1, j - 1);
}

describe('a brief that will not generate does not delete the candidate', () => {
  test('both exhausted-attempt paths park the row instead of removing it', () => {
    const exhausted = [...source.matchAll(/nextAttempts\s*>=\s*removeAfterAttempts\s*\)\s*\{([\s\S]*?)\n\s*\}/g)].map(
      (m) => m[1]
    );
    expect(exhausted.length).toBe(2);
    for (const block of exhausted) {
      expect(block).toContain('parkQuote');
      expect(block).not.toContain('removeQuote');
    }
  });

  test('parking sets a visible hold rather than touching the row count', () => {
    const body = functionBody('parkQuote');
    expect(body).toBeTruthy();
    expect(body).toContain("status: 'held'");
    expect(body).toContain('hold_reason');
    expect(body).not.toContain('.delete(');
  });

  test('the only delete left is the analyst deciding against a briefed candidate', () => {
    expect([...source.matchAll(/\.delete\(\)/g)].length).toBe(1);
    const removeBody = functionBody('removeQuote');
    expect(removeBody).toContain('.delete()');
  });
});
