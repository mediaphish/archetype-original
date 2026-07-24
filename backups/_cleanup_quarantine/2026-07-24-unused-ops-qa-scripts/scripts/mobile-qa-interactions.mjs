#!/usr/bin/env node
/**
 * Public interaction smoke tests (API layer).
 * Usage: node scripts/mobile-qa-interactions.mjs [baseUrl]
 */
const BASE = process.argv[2] || 'https://www.archetypeoriginal.com';

const results = [];

async function test(name, fn) {
  try {
    const detail = await fn();
    results.push({ name, ok: true, detail });
    process.stdout.write('.');
  } catch (err) {
    results.push({ name, ok: false, detail: err.message });
    process.stdout.write('x');
  }
}

async function postJson(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

async function main() {
  const tag = `mobile-qa-${Date.now()}`;

  await test('contact form', () =>
    postJson('/api/contact', {
      name: 'AO Mobile QA Test',
      email: `ao-mobile-qa-${tag}@example.com`,
      subject: 'Mobile QA automated test',
      message: 'Automated mobile QA interaction test — safe to delete.',
    })
  );

  await test('engagement inquiry', () =>
    postJson('/api/engagement-inquiry', {
      form_loaded_at: Date.now() - 10000,
      q1: 'Automated mobile QA test — safe to delete.',
      q2: ['Growing'],
      q3: 'Exploring options',
      q4: ['Leadership advisory'],
      q5: 'Within 3 months',
      q6: 'Email',
      q7: `ao-mobile-qa-${tag}@example.com`,
      q8: 'AO QA automated test',
      role: 'CEO',
      orgSize: '11-50',
    })
  );

  await test('journal subscribe', () =>
    postJson('/api/journal/subscribe', {
      email: `ao-mobile-qa-${tag}@example.com`,
    })
  );

  const longStory = 'Automated mobile QA test story — safe to delete. '.repeat(80);

  await test('bad leader submit', () =>
    postJson('/api/bad-leader-submit', {
      name: 'AO Mobile QA Test',
      email: `ao-mobile-qa-${tag}@example.com`,
      region: 'Midwest',
      industry: 'Technology',
      story: longStory,
      consent: true,
      anonymous: false,
    })
  );

  await test('operators interest', () =>
    postJson('/api/operators/interest/submit', {
      name: 'AO Mobile QA Test',
      email: `ao-mobile-qa-${tag}@example.com`,
      role_title: 'QA Tester',
      company_size: '5-25',
      bio: 'Automated mobile QA test bio for The Operators interest form. This submission is safe to delete and was created only to verify the public form works end to end.',
    })
  );

  await test('chat endpoint', async () => {
    const res = await fetch(`${BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'What is servant leadership in one sentence?',
        sessionId: `mobile-qa-${tag}`,
        conversationHistory: [],
      }),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
    return 'response received';
  });

  await test('knowledge endpoint', async () => {
    const res = await fetch(`${BASE}/api/knowledge`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.docs?.length) throw new Error('empty docs');
    return `${json.docs.length} docs`;
  });

  console.log('\n\n=== Interaction Tests ===');
  for (const r of results) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.name}: ${r.detail}`);
  }

  const fs = await import('fs');
  const outPath = new URL('../notes/mobile-qa-interaction-results.json', import.meta.url);
  fs.writeFileSync(outPath, JSON.stringify({ base: BASE, at: new Date().toISOString(), results }, null, 2));

  const failed = results.filter((r) => !r.ok);
  if (failed.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
