#!/usr/bin/env node
// scripts/send-journal-notification.mjs
// Manual script to send email notifications for a specific journal post
// Usage: node scripts/send-journal-notification.mjs <post-slug>
// Requires Node.js 18+ (for built-in fetch)

// Node.js 18+ has built-in fetch
const fetch = globalThis.fetch;

const POST_SLUG = process.argv[2];
const SITE_URL = process.env.PUBLIC_SITE_URL || 'https://www.archetypeoriginal.com';

if (!POST_SLUG) {
  console.error('❌ Error: Post slug is required');
  console.log('Usage: node scripts/send-journal-notification.mjs <post-slug>');
  process.exit(1);
}

async function sendNotification() {
  try {
    console.log(`📧 Sending notifications for post: ${POST_SLUG}`);
    
    const response = await fetch(`${SITE_URL}/api/journal/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postSlug: POST_SLUG })
    });
    
    const result = await response.json();
    
    if (response.ok && result.ok) {
      console.log(`✅ Success!`);
      console.log(`   Sent to: ${result.sent} subscribers`);
      if (result.failed > 0) {
        console.log(`   Failed: ${result.failed} subscribers`);
      }
      if (result.errors && result.errors.length > 0) {
        console.log(`   Errors:`, result.errors);
      }
    } else {
      console.error(`❌ Failed:`, result.error || 'Unknown error');
      process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Error:`, error.message);
    process.exit(1);
  }
}

sendNotification();

