/**
 * Measures corpus retrieval against questions with known answers.
 *
 * Built 2026-09-23 from real Auto sessions, because "retrieval feels off" is
 * not something anyone can act on. Each case is a question Auto was actually
 * working on and the post that should surface for it. The last two are controls
 * with no answer in the corpus: they must return nothing, or the floor is too
 * low and every question drags in noise.
 *
 * Run it before and after touching retrieval:
 *   node scripts/eval-corpus-retrieval.mjs
 *
 * Needs SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and OPEN_API_KEY in the
 * environment (embeddings are OpenAI; see scripts/verify-no-openai-text.mjs for
 * why that is the one text-adjacent exception).
 *
 * Baseline on the day it was written: top-1 8/10, top-3 9/10, controls clean.
 */
import { searchCorpusChunks, groupChunksByDocument } from '../lib/ao/corpusChunks.js';

const CASES = [
  ['what does Saban say about the ordinary Tuesday nobody watches', 'your-tuesday'],
  ['Gallup found leaders rate themselves twenty points above their managers', 'twenty-points-apart'],
  ['leaders who exempt favorites from the standard, selective accountability', 'power-vs-authority-part-2-the-build'],
  ['crisis and pressure are the only real test of authority', 'power-vs-authority-part-3-the-test'],
  ['iHire toxic workplace report, unaccountable leadership blamed', 'the-data-caught-up'],
  ['Mulally Ford Edge red chart, making it safe to name a problem', 'unity-is-not-sameness'],
  ['Stumpf Wells Fargo eight is great cross-selling quota', 'scoreboard-leadership'],
  ['leadership pipeline is not draining, people refuse to step up', 'the-pipeline-isnt-draining-its-refusing-to-fill'],
  ['a leader kept producing instead of freed to lead', 'the-producer-leader-paradox'],
  ['affinity mistaken for service, uneven investment in people you like', 'affinity-dressed-as-service'],
  ['how do I configure a Kubernetes ingress controller', null],
  ['what is the weather in Branson tomorrow', null],
];

const SEARCH = { threshold: 0.4, maxResults: 30, maxPerDoc: 3, maxPerType: 8 };

let top1 = 0;
let top3 = 0;
let answered = 0;
let controlNoise = 0;
const misses = [];

for (const [question, expected] of CASES) {
  const docs = groupChunksByDocument(await searchCorpusChunks(question, SEARCH));

  if (expected === null) {
    const top = docs[0];
    if (top) {
      controlNoise += 1;
      console.log(`CONTROL  returned ${docs.length}: ${top.slug} ${top.similarity.toFixed(2)}  <- ${question}`);
    } else {
      console.log(`CONTROL  clean  <- ${question}`);
    }
    continue;
  }

  answered += 1;
  const rank = docs.findIndex((d) => d.slug === expected);
  if (rank === 0) top1 += 1;
  if (rank >= 0 && rank < 3) top3 += 1;
  if (rank < 0) misses.push([question, expected, docs.slice(0, 3).map((d) => d.slug).join(', ')]);

  const label = rank === 0 ? 'TOP ' : rank > 0 ? `#${String(rank + 1).padEnd(3)}` : 'MISS';
  console.log(`${label} ${expected}  <- ${question}`);
}

console.log(`\ntop-1: ${top1}/${answered}   top-3: ${top3}/${answered}   control noise: ${controlNoise}`);
for (const [q, expected, got] of misses) {
  console.log(`\nMISS ${expected}\n  question: ${q}\n  returned: ${got || '(nothing)'}`);
}
