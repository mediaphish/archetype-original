#!/usr/bin/env node
/**
 * Repair script: fix weekend posts and clustering in ao_scheduled_posts.
 * Reads all scheduled quote card posts, groups by card_index,
 * sorts by card_index, then rebuilds the schedule correctly:
 * - No weekends
 * - Each card group shares one calendar date
 * - Cards spaced 3 weekdays apart
 * - Platform times: LinkedIn 15:00 UTC, Instagram 16:00 UTC, Facebook 18:00 UTC, X 14:00 UTC
 *
 * Run: node scripts/repair-queue-schedule.mjs
 * Add --dry-run to preview without writing changes.
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DRY_RUN = process.argv.includes('--dry-run');

const PLATFORM_TIMES = {
  linkedin: '15:00:00',
  instagram: '16:00:00',
  facebook: '18:00:00',
  twitter: '14:00:00',
};

function addWeekdays(date, days) {
  const d = new Date(date);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) added++;
  }
  return d;
}

function nextWeekday(date) {
  const d = new Date(date);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

function toScheduledAt(date, platform) {
  const ymd = date.toISOString().split('T')[0];
  const time = PLATFORM_TIMES[platform] || '15:00:00';
  return new Date(`${ymd}T${time}+00:00`).toISOString();
}

async function main() {
  console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Repairing queue schedule...\n`);

  const { data: rows, error } = await supabase
    .from('ao_scheduled_posts')
    .select('id, platform, scheduled_at, status, intent')
    .eq('status', 'scheduled')
    .eq('source_kind', 'auto_quote_card')
    .order('scheduled_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch queue:', error.message);
    process.exit(1);
  }

  console.log(`Found ${rows.length} scheduled quote card posts`);

  // Group by card_index
  const groups = {};
  for (const row of rows) {
    const cardIndex = row.intent?.card_index || 0;
    if (!groups[cardIndex]) groups[cardIndex] = [];
    groups[cardIndex].push(row);
  }

  const cardIndices = Object.keys(groups).map(Number).sort((a, b) => a - b);
  console.log(`Card groups found: ${cardIndices.join(', ')}\n`);

  // Start from today or the earliest existing date, whichever is later
  let currentDate = nextWeekday(new Date());

  const updates = [];

  for (const cardIndex of cardIndices) {
    const group = groups[cardIndex];
    console.log(`Card ${cardIndex}: scheduling ${group.length} rows on ${currentDate.toDateString()}`);

    for (const row of group) {
      const newScheduledAt = toScheduledAt(currentDate, row.platform);
      if (newScheduledAt !== row.scheduled_at) {
        updates.push({ id: row.id, scheduled_at: newScheduledAt, card_index: cardIndex });
        console.log(`  ${row.platform}: ${row.scheduled_at} → ${newScheduledAt}`);
      } else {
        console.log(`  ${row.platform}: already correct`);
      }
    }

    // Next card is 3 weekdays later
    currentDate = addWeekdays(currentDate, 3);
  }

  console.log(`\n${updates.length} rows need updating`);

  if (DRY_RUN) {
    console.log('\n[DRY RUN] No changes written. Remove --dry-run to apply.');
    return;
  }

  if (updates.length === 0) {
    console.log('Queue is already correct. Nothing to do.');
    return;
  }

  // Apply updates
  let fixed = 0;
  for (const update of updates) {
    const { error: updateErr } = await supabase
      .from('ao_scheduled_posts')
      .update({ scheduled_at: update.scheduled_at, updated_at: new Date().toISOString() })
      .eq('id', update.id);

    if (updateErr) {
      console.error(`Failed to update ${update.id}:`, updateErr.message);
    } else {
      fixed++;
    }
  }

  console.log(`\nFixed ${fixed} of ${updates.length} rows.`);
  console.log('Queue repair complete.');
}

main().catch(console.error);
