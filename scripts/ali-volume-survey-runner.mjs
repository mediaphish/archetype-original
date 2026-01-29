#!/usr/bin/env node
/**
 * ALI Volume Survey Runner
 *
 * Submits many simulated survey responses for load testing and data-change validation.
 * Use GET /api/ali/deployments?email=... to obtain deployment tokens, or pass them via env.
 *
 * Usage:
 *   DEPLOYMENT_TOKENS=token1,token2 NUM_USERS=100 BASE_URL=https://www.archetypeoriginal.com node scripts/ali-volume-survey-runner.mjs
 *
 * Env:
 *   DEPLOYMENT_TOKENS  Comma-separated deployment tokens (required)
 *   NUM_USERS          Number of simulated respondents (default: 50)
 *   BASE_URL           API base URL (default: https://www.archetypeoriginal.com)
 *   CONCURRENCY        Max concurrent submit requests (default: 5)
 */

const BASE_URL = (process.env.BASE_URL || 'https://www.archetypeoriginal.com').replace(/\/$/, '');
const NUM_USERS = Math.max(1, parseInt(process.env.NUM_USERS || '50', 10));
const CONCURRENCY = Math.max(1, Math.min(20, parseInt(process.env.CONCURRENCY || '5', 10)));
const FETCH_DEPLOYMENTS_EMAIL = process.env.FETCH_DEPLOYMENTS_EMAIL || '';

let DEPLOYMENT_TOKENS = (process.env.DEPLOYMENT_TOKENS || '')
  .split(',')
  .map((t) => t.trim())
  .filter(Boolean);

async function fetchTokensFromDeployments() {
  if (!FETCH_DEPLOYMENTS_EMAIL) return null;
  const url = `${BASE_URL}/api/ali/deployments?email=${encodeURIComponent(FETCH_DEPLOYMENTS_EMAIL)}`;
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok || !Array.isArray(data.deployments)) return null;
  const tokens = data.deployments.map((d) => d.deploymentToken).filter(Boolean);
  return tokens.length ? tokens : null;
}

const root = BASE_URL;

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** ~17% leader, 83% team_member */
function pickRole() {
  return Math.random() < 0.17 ? 'leader' : 'team_member';
}

/**
 * @param {string} token
 * @returns {Promise<{ stableIds: string[] } | null>}
 */
async function fetchSurvey(token) {
  const res = await fetch(`${root}/api/ali/survey/${encodeURIComponent(token)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`Survey fetch failed for token ${token.slice(0, 8)}...: ${res.status} ${data?.error || res.statusText}`);
    return null;
  }
  const questions = data.questions || [];
  const stableIds = questions.map((q) => q.id || q.stable_id).filter(Boolean);
  if (stableIds.length === 0) {
    console.error(`No question IDs for token ${token.slice(0, 8)}...`);
    return null;
  }
  return { stableIds };
}

/**
 * @param {string} token
 * @param {string[]} stableIds
 * @returns {Promise<{ ok: boolean; status: number; latencyMs: number }>}
 */
async function submitOne(token, stableIds) {
  const responses = {};
  for (const id of stableIds) {
    responses[id] = randomInt(1, 5);
  }
  const body = {
    deploymentToken: token,
    respondentRole: pickRole(),
    responses,
    deviceType: 'desktop'
  };
  const start = Date.now();
  const res = await fetch(`${root}/api/ali/submit-response`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const latencyMs = Date.now() - start;
  await res.text(); // consume body
  return { ok: res.ok, status: res.status, latencyMs };
}

async function run() {
  if (DEPLOYMENT_TOKENS.length === 0 && FETCH_DEPLOYMENTS_EMAIL) {
    console.log('Fetching deployment tokens from /api/ali/deployments...');
    const fetched = await fetchTokensFromDeployments();
    if (fetched?.length) {
      DEPLOYMENT_TOKENS = fetched;
      console.log('  Fetched', DEPLOYMENT_TOKENS.length, 'token(s)');
    } else {
      console.error('Could not fetch tokens. Ensure GET /api/ali/deployments is deployed and returns data for this email.');
      process.exit(1);
    }
  }

  if (DEPLOYMENT_TOKENS.length === 0) {
    console.error('Missing DEPLOYMENT_TOKENS. Set comma-separated tokens, or use FETCH_DEPLOYMENTS_EMAIL:');
    console.error('  DEPLOYMENT_TOKENS=abc123,def456 NUM_USERS=100 node scripts/ali-volume-survey-runner.mjs');
    console.error('  FETCH_DEPLOYMENTS_EMAIL=you@company.com BASE_URL=... NUM_USERS=50 node scripts/ali-volume-survey-runner.mjs');
    process.exit(1);
  }

  console.log('ALI Volume Survey Runner');
  console.log('  BASE_URL:', root);
  console.log('  DEPLOYMENT_TOKENS:', DEPLOYMENT_TOKENS.length, 'token(s)');
  console.log('  NUM_USERS:', NUM_USERS);
  console.log('  CONCURRENCY:', CONCURRENCY);
  console.log('');

  const surveyByToken = new Map();
  for (const token of DEPLOYMENT_TOKENS) {
    const meta = await fetchSurvey(token);
    if (!meta) continue;
    surveyByToken.set(token, meta);
    console.log(`  Loaded survey for token ...${token.slice(-8)}: ${meta.stableIds.length} questions`);
  }

  if (surveyByToken.size === 0) {
    console.error('No surveys could be loaded. Aborting.');
    process.exit(1);
  }

  const tokens = Array.from(surveyByToken.keys());
  let submitted = 0;
  let failed = 0;
  const latencies = [];

  async function doSubmit(i) {
    const token = tokens[i % tokens.length];
    const meta = surveyByToken.get(token);
    if (!meta) return;
    const { ok, status, latencyMs } = await submitOne(token, meta.stableIds);
    latencies.push(latencyMs);
    if (ok) submitted++;
    else failed++;
    if ((i + 1) % 10 === 0 || i === NUM_USERS - 1) {
      console.log(`  Progress: ${i + 1}/${NUM_USERS} (${submitted} ok, ${failed} failed)`);
    }
  }

  const startTotal = Date.now();
  for (let i = 0; i < NUM_USERS; i += CONCURRENCY) {
    const batch = [];
    for (let j = 0; j < CONCURRENCY && i + j < NUM_USERS; j++) {
      batch.push(doSubmit(i + j));
    }
    await Promise.all(batch);
  }
  const totalMs = Date.now() - startTotal;

  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)] ?? 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] ?? 0;

  console.log('');
  console.log('Results');
  console.log('  Total submitted:', submitted);
  console.log('  Failed:', failed);
  console.log('  Success rate:', NUM_USERS ? ((submitted / NUM_USERS) * 100).toFixed(1) : 0, '%');
  console.log('  Total time:', (totalMs / 1000).toFixed(1), 's');
  console.log('  Submit latency p50:', p50, 'ms');
  console.log('  Submit latency p95:', p95, 'ms');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
