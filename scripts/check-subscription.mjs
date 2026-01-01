#!/usr/bin/env node

/**
 * Check subscription status for a specific email
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Use environment variables directly
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const emailToCheck = process.argv[2] || 'cariepaden@gmail.com';

async function checkSubscription() {
  console.log(`🔍 Checking subscription for: ${emailToCheck}`);
  console.log('');

  // Check exact match
  const { data: exact, error: exactError } = await supabase
    .from('journal_subscriptions')
    .select('*')
    .eq('email', emailToCheck.toLowerCase())
    .maybeSingle();

  if (exactError) {
    console.error('❌ Error querying database:', exactError);
    return;
  }

  if (exact) {
    console.log('✅ Found subscription (exact match):');
    console.log(JSON.stringify(exact, null, 2));
    console.log('');
    
    // Check if they should receive devotionals
    const shouldReceive = exact.is_active && exact.subscribe_devotionals;
    console.log(`📧 Should receive devotionals: ${shouldReceive ? 'YES ✅' : 'NO ❌'}`);
    console.log(`   - is_active: ${exact.is_active}`);
    console.log(`   - subscribe_devotionals: ${exact.subscribe_devotionals}`);
    console.log(`   - subscribe_journal_entries: ${exact.subscribe_journal_entries}`);
  } else {
    console.log('❌ No subscription found (exact match)');
    console.log('');
    
    // Check case-insensitive
    const { data: caseInsensitive, error: ciError } = await supabase
      .from('journal_subscriptions')
      .select('*')
      .ilike('email', emailToCheck)
      .limit(5);

    if (ciError) {
      console.error('❌ Error querying database (case-insensitive):', ciError);
      return;
    }

    if (caseInsensitive && caseInsensitive.length > 0) {
      console.log(`⚠️  Found ${caseInsensitive.length} subscription(s) with similar email (case-insensitive):`);
      caseInsensitive.forEach(sub => {
        console.log(`   - ${sub.email} (is_active: ${sub.is_active}, subscribe_devotionals: ${sub.subscribe_devotionals})`);
      });
    } else {
      console.log('❌ No subscription found (case-insensitive search)');
    }
  }

  // Check all active devotional subscribers
  const { data: allDevotionalSubs, error: allError } = await supabase
    .from('journal_subscriptions')
    .select('email, is_active, subscribe_devotionals, subscribe_journal_entries')
    .eq('is_active', true)
    .eq('subscribe_devotionals', true);

  if (allError) {
    console.error('❌ Error fetching all devotional subscribers:', allError);
    return;
  }

  console.log('');
  console.log(`📊 Total active devotional subscribers: ${allDevotionalSubs?.length || 0}`);
  
  if (allDevotionalSubs && allDevotionalSubs.length > 0) {
    const found = allDevotionalSubs.find(s => s.email.toLowerCase() === emailToCheck.toLowerCase());
    if (found) {
      console.log(`✅ ${emailToCheck} IS in the active devotional subscribers list`);
    } else {
      console.log(`❌ ${emailToCheck} is NOT in the active devotional subscribers list`);
      console.log('');
      console.log('First 10 active devotional subscribers:');
      allDevotionalSubs.slice(0, 10).forEach(s => {
        console.log(`   - ${s.email}`);
      });
    }
  }
}

checkSubscription().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

