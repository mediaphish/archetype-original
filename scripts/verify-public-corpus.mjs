/**
 * Fails the build if unpublished IP reaches the public corpus.
 *
 * public/knowledge.json is copied into dist/ and served at
 * https://www.archetypeoriginal.com/knowledge.json with no authentication.
 * Every byte in it is published.
 *
 * On 2026-08-21 that file carried all 55 Culture Science documents — the ALI
 * scoring model, the Four-Survey Framework, the archetypes, the drift timeline
 * — material whose own headings read "Without Revealing IP" and "Non-IP
 * Exposure". Thirteen of them also contained raw ChatGPT transcripts, which
 * published Bart's side of those planning conversations word for word.
 *
 * The boundary was drawn deliberately by the owner. Nothing enforced it, so it
 * eroded silently over eight months. This is the enforcement.
 *
 * Two independent checks, because either alone would have missed something:
 *   1. Document type must be on the allowlist. Catches whole categories.
 *   2. No chat-transcript markers in any body. Catches contamination inside an
 *      otherwise-public document, which a type check cannot see.
 */

import fs from 'fs';

const PUBLIC_FILE = 'public/knowledge.json';

const PUBLIC_DOC_TYPES = new Set([
  'journal-post',
  'devotional',
  'faq',
  'article',
  'chapter',
  'book',
  'preface',
  'podcast-episode',
]);

// Markers that mean a chat log was pasted in rather than authored content.
const TRANSCRIPT_MARKERS = [/^You said:$/m, /^ChatGPT said:$/m, /^Just say:$/m];

function main() {
  if (!fs.existsSync(PUBLIC_FILE)) {
    console.error(`verify-public-corpus: ${PUBLIC_FILE} not found`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(PUBLIC_FILE, 'utf8'));
  const docs = raw.docs || raw.documents || [];
  if (!docs.length) {
    console.error('verify-public-corpus: no documents — refusing to pass a corpus that failed to build.');
    process.exit(1);
  }

  const failures = [];

  for (const doc of docs) {
    const type = String(doc?.type || '');
    const slug = String(doc?.slug || '(no slug)');

    if (!PUBLIC_DOC_TYPES.has(type)) {
      failures.push(`  ${slug} — type "${type}" is not on the public allowlist`);
    }

    const body = String(doc?.body || '');
    for (const marker of TRANSCRIPT_MARKERS) {
      if (marker.test(body)) {
        failures.push(`  ${slug} — body contains a chat-transcript marker (${marker.source})`);
        break;
      }
    }
  }

  if (failures.length) {
    console.error('Unpublished material reached the public corpus. Build stopped.\n');
    console.error(failures.slice(0, 40).join('\n'));
    if (failures.length > 40) console.error(`  ...and ${failures.length - 40} more`);
    console.error(
      '\npublic/knowledge.json is served publicly at /knowledge.json. If a type belongs' +
        '\nin public, add it to PUBLIC_DOC_TYPES here and in scripts/build-knowledge.mjs.'
    );
    process.exit(1);
  }

  console.log(`verify-public-corpus: OK (${docs.length} public documents, no private types, no transcripts)`);
}

main();
