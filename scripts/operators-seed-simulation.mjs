#!/usr/bin/env node
/**
 * Idempotent seed for Operators E2E simulation cast + LIVE simulation event +
 * pending + approved candidates.
 *
 * Uses SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local (gitignored).
 * Safe to run multiple times: upserts membership rows by email; refreshes simulation
 * event title match; resets candidate demo rows on that event.
 *
 * Usage: node scripts/operators-seed-simulation.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

function loadDotenvLocal() {
  const file = path.join(repoRoot, '.env.local');
  if (!fs.existsSync(file)) return;
  const text = fs.readFileSync(file, 'utf8');
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const k = line.slice(0, eq).trim();
    const v = line.slice(eq + 1).trim();
    if (!process.env[k]) process.env[k] = v;
  }
}

loadDotenvLocal();

const URL = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !SERVICE) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(URL, SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** 220 words for API validation parity (essay length rules on submit). */
const DEMO_ESSAY = Array.from({ length: 220 }, (_, i) => `wordWord${i + 1}`).join(
  '\n ',
);

const CONTACT = 'Simulation seed candidate — contact forwarded to bart@archetypeoriginal.com';

const CAST = [
  { email: 'bart@archetypeoriginal.com', roles: ['super_admin', 'chief_operator'] },
  { email: 'bartpaden@gmail.com', roles: ['operator'] },
  { email: 'bart@midwesternbuilt.com', roles: ['operator'] },
  { email: 'cariepaden@gmail.com', roles: ['operator'] },
  { email: 'mediaphish@me.com', roles: ['operator'] },
  { email: 'accountant.sim@archetypeoriginal.com', roles: ['accountant'] },
  { email: 'candidate.pending.sim@archetypeoriginal.com', roles: ['candidate'] },
  { email: 'candidate.approved.sim@archetypeoriginal.com', roles: ['candidate'] },
  { email: 'operator5.sim@archetypeoriginal.com', roles: ['operator'] },
];

const SIM_TITLE = 'Simulation Event - 2026-05-05';
const CREATED_BY = 'bart@archetypeoriginal.com';

async function upsertOperatorsUser(email, rolesDesired) {
  const { data: row, error: selErr } = await supabase
    .from('operators_users')
    .select('email,roles')
    .eq('email', email)
    .maybeSingle();
  if (selErr && selErr.code !== 'PGRST116') throw selErr;

  if (!row) {
    const { error } = await supabase.from('operators_users').insert({
      email,
      roles: [...rolesDesired],
      card_status: 'none',
      card_count: 0,
      owed_balance: 0,
      benched_until: null,
    });
    if (error) throw error;
    console.log(`  + users inserted: ${email} → ${rolesDesired.join(', ')}`);
    return;
  }
  const merged = [...new Set([...(row.roles || []), ...rolesDesired])];
  const { error } = await supabase.from('operators_users').update({ roles: merged }).eq('email', email);
  if (error) throw error;
  console.log(`  ✓ users merged: ${email} → ${merged.join(', ')}`);
}

async function upsertSimulationEvent() {
  const { data: existing, error: findErr } = await supabase
    .from('operators_events')
    .select('*')
    .eq('title', SIM_TITLE)
    .maybeSingle();
  if (findErr && findErr.code !== 'PGRST116') throw findErr;

  const row = {
    title: SIM_TITLE,
    event_date: '2026-06-20',
    start_time: '18:30:00',
    finish_time: '21:00:00',
    state: 'LIVE',
    stake_amount: 120,
    max_seats: 25,
    created_by: CREATED_BY,
  };

  if (existing?.id) {
    const { error } = await supabase
      .from('operators_events')
      .update({ ...row, state: 'LIVE', updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    if (error) throw error;
    console.log(`  ✓ event updated (LIVE): ${SIM_TITLE} id=${existing.id}`);
    return existing.id;
  }

  const { data: created, error: insErr } = await supabase
    .from('operators_events')
    .insert(row)
    .select('id')
    .single();
  if (insErr) throw insErr;
  console.log(`  + event created: ${SIM_TITLE} id=${created.id}`);
  return created.id;
}

async function resetSimulationCandidates(eventId) {
  const demoEmails = [
    'candidate.pending.sim@archetypeoriginal.com',
    'candidate.approved.sim@archetypeoriginal.com',
  ];

  const { error: delErr } = await supabase
    .from('operators_candidates')
    .delete()
    .eq('event_id', eventId)
    .in('candidate_email', demoEmails);

  if (delErr && delErr.code !== 'PGRST116') console.warn('[seed] candidates delete:', delErr.message);

  const now = new Date().toISOString();
  const { error } = await supabase.from('operators_candidates').insert([
    {
      event_id: eventId,
      candidate_email: demoEmails[0],
      invited_by_email: 'bartpaden@gmail.com',
      essay: DEMO_ESSAY,
      contact_info: CONTACT,
      status: 'pending',
    },
    {
      event_id: eventId,
      candidate_email: demoEmails[1],
      invited_by_email: 'bart@midwesternbuilt.com',
      essay: DEMO_ESSAY,
      contact_info: CONTACT,
      status: 'approved',
      approved_by_email: 'bart@archetypeoriginal.com',
      approved_at: now,
    },
  ]);

  if (error) throw error;
  console.log('  ✓ candidates: 1 pending, 1 approved (simulation)');
}

console.log('\noperators-seed-simulation: upsert membership\n');
for (const { email, roles } of CAST) {
  await upsertOperatorsUser(email, roles);
}

console.log('\noperators-seed-simulation: event\n');
const eventId = await upsertSimulationEvent();

console.log('\noperators-seed-simulation: candidates\n');
await resetSimulationCandidates(eventId);

console.log(`
Done.

Simulation event title: "${SIM_TITLE}"
Event id: ${eventId}

Manual checks:
- Approve pending candidate sim email as Chief Operator
- Operators RSVP via LIVE event detail
`);
