#!/usr/bin/env node

/**
 * Check subscription status directly using Supabase
 * Usage: node scripts/check-subscription-direct.mjs cariepaden@gmail.com
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('   Make sure these are set in your environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const emailToCheck = process.argv[2] || 'cariepaden@gmail.com';

async function checkSubscription() {
  console.log(`🔍 Checking subscription for: ${emailToCheck}`);
  console.log('');

  // Check exact match
  const { data: subscription, error: subError } = await supabase
    .from('journal_subscriptions')
    .select('*')
    .eq('email', emailToCheck.toLowerCase())
    .maybeSingle();

  if (subError) {
    console.error('❌ Error querying database:', subError);
    return;
  }

  if (subscription) {
    console.log('✅ Found subscription:');
    console.log(JSON.stringify(subscription, null, 2));
    console.log('');
    
    // Check if they should receive devotionals
    const shouldReceive = subscription.is_active && subscription.subscribe_devotionals;
    console.log(`📧 Should receive devotionals: ${shouldReceive ? 'YES ✅' : 'NO ❌'}`);
    console.log(`   - is_active: ${subscription.is_active}`);
    console.log(`   - subscribe_devotionals: ${subscription.subscribe_devotionals}`);
    console.log(`   - subscribe_journal_entries: ${subscription.subscribe_journal_entries}`);
    console.log('');
    
    if (!shouldReceive) {
      console.log('⚠️  This email will NOT receive devotional emails because:');
      if (!subscription.is_active) {
        console.log('   - Subscription is not active');
      }
      if (!subscription.subscribe_devotionals) {
        console.log('   - subscribe_devotionals is false');
      }
    }
  } else {
    console.log('❌ No subscription found for this email');
  }

  // Get all active devotional subscribers for comparison
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

  // Get all active subscribers who DON'T have devotionals enabled
  const { data: missingDevotionals, error: missingError } = await supabase
    .from('journal_subscriptions')
    .select('email, subscribe_devotionals, subscribe_journal_entries, subscribed_at')
    .eq('is_active', true)
    .eq('subscribe_devotionals', false);

  if (!missingError && missingDevotionals) {
    console.log('');
    console.log(`⚠️  Found ${missingDevotionals.length} active subscribers who DON'T have devotionals enabled:`);
    missingDevotionals.slice(0, 20).forEach(s => {
      console.log(`   - ${s.email} (journal: ${s.subscribe_journal_entries})`);
    });
    if (missingDevotionals.length > 20) {
      console.log(`   ... and ${missingDevotionals.length - 20} more`);
    }
  }
}

checkSubscription().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

