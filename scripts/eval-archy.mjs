/**
 * Archy, end to end, against the running site.
 *
 * Built 2026-09-28. scripts/eval-corpus-retrieval.mjs measures retrieval alone,
 * which is not where Archy breaks. The Culture Science failure Bart found was
 * retrieval, but the em dashes were the prompt, the fragment risk was the model
 * call, and the handoff decision is its own gate. All four sit between a
 * visitor's question and the answer, so all four have to be exercised together.
 *
 * It matters more here than anywhere else in the system: Archy has no traffic
 * to catch a regression. In the eighteen days to 2026-09-28 the widget was
 * shown to 1,287 sessions and opened once. Nothing but this will notice.
 *
 *   node scripts/eval-archy.mjs                      # production
 *   node scripts/eval-archy.mjs http://localhost:3000
 *
 * Session ids start with archy-eval-, which lib/ao/testSession.js recognises,
 * so the handoff cases do not email Bart or write rows every run.
 */

const BASE = (process.argv[2] || 'https://www.archetypeoriginal.com').replace(/\/$/, '');

/**
 * Each case is a question a visitor could plausibly ask.
 *
 *   answers: true  the corpus holds this and Archy must not hand off
 *   answers: false outside what Bart has written, so the handoff is correct
 *   expect:        substrings the answer must contain, case-insensitive
 */
const CASES = [
  {
    q: 'What is the Four-Survey Framework in Culture Science, and what are the boundaries of Culture Science?',
    answers: true,
    expect: ['quarter', 'condition'],
    note: 'the compound question that failed on 2026-09-10',
  },
  { q: 'What are the boundaries of Culture Science?', answers: true, expect: ['condition'] },
  { q: 'What is Culture Science?', answers: true, expect: ['culture science'] },
  { q: 'Who is Bart Paden and what does he do?', answers: true, expect: ['bart'] },
  { q: 'What is servant leadership and how do I start applying it with my team?', answers: true, expect: ['serv'] },
  { q: 'What is ALI?', answers: true, expect: ['leadership'] },
  { q: 'What does Bart mean by selective accountability?', answers: true, expect: ['account'] },
  { q: 'What is The Room about?', answers: true, expect: ['room'] },
  { q: 'What does Bart say about leaders who keep producing instead of leading?', answers: true, expect: ['lead'] },
  { q: 'Tell me about the Jonathan Archetype.', answers: true, expect: ['jonathan'] },
  { q: 'How do I configure a Kubernetes ingress controller?', answers: false },
  { q: 'What is the weather in Branson tomorrow?', answers: false },
];

/** The canned line Archy uses when it gives up and asks for contact details. */
const HANDOFF = /having trouble answering it|contact information/i;

async function ask(question, index) {
  const started = Date.now();
  const response = await fetch(`${BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: question,
      sessionId: `archy-eval-${Date.now()}-${index}`,
      conversationHistory: [],
    }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const body = await response.json();
  return { text: String(body.response || body.message || ''), ms: Date.now() - started };
}

const failures = [];
let passed = 0;

for (const [index, testCase] of CASES.entries()) {
  const label = testCase.q.length > 62 ? `${testCase.q.slice(0, 59)}...` : testCase.q;
  let result;
  try {
    result = await ask(testCase.q, index);
  } catch (err) {
    failures.push([testCase.q, `request failed: ${err.message}`]);
    console.log(`FAIL  ${label}\n      request failed: ${err.message}`);
    continue;
  }

  const { text, ms } = result;
  const problems = [];
  const handedOff = HANDOFF.test(text);

  if (testCase.answers && handedOff) problems.push('handed off a question the corpus answers');
  if (!testCase.answers && !handedOff) problems.push('answered a question it has no source for');

  if (testCase.answers && !handedOff) {
    for (const needle of testCase.expect || []) {
      if (!text.toLowerCase().includes(needle.toLowerCase())) problems.push(`missing "${needle}"`);
    }
    // Voice and completeness apply to every real answer.
    if (/[—–]/.test(text)) problems.push('used an em or en dash');
    if (text.trim() && !/[.!?)"'\]]$/.test(text.trim())) problems.push('ends mid sentence');
    if (text.trim().length < 80) problems.push(`suspiciously short (${text.trim().length} chars)`);
  }

  if (problems.length) {
    failures.push([testCase.q, problems.join('; ')]);
    console.log(`FAIL  ${label}\n      ${problems.join('\n      ')}`);
  } else {
    passed += 1;
    console.log(`pass  ${label}  (${ms}ms)`);
  }
}

console.log(`\n${passed}/${CASES.length} passed against ${BASE}`);
if (failures.length) {
  console.log('\nFailures:');
  for (const [question, why] of failures) console.log(`  ${question}\n    ${why}`);
  process.exit(1);
}
