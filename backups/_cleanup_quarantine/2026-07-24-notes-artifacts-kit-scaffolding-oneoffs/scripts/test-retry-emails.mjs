#!/usr/bin/env node

/**
 * Test script to retry failed emails
 * Usage: node scripts/test-retry-emails.mjs
 */

const siteUrl = process.env.PUBLIC_SITE_URL || 'https://www.archetypeoriginal.com';

async function retryFailedEmails() {
  try {
    console.log('🔄 Calling retry endpoint for failed emails with 429 errors...\n');
    
    const response = await fetch(`${siteUrl}/api/journal/retry-failed-emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'pending',
        error_code: 429,
        limit: 100
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error:', response.status, errorText);
      process.exit(1);
    }

    const result = await response.json();
    
    console.log('✅ Retry Results:');
    console.log(`   Total processed: ${result.total_processed || 0}`);
    console.log(`   Successfully retried: ${result.retried || 0}`);
    console.log(`   Still failed: ${result.failed || 0}`);
    
    if (result.errors && result.errors.length > 0) {
      console.log(`\n❌ Errors (showing first 5):`);
      result.errors.slice(0, 5).forEach(err => {
        console.log(`   - ${err.email}: ${err.error?.message || err.error || 'Unknown error'}`);
      });
    }
    
    if (result.retried > 0) {
      console.log(`\n✅ Successfully retried ${result.retried} email(s)!`);
    } else if (result.total_processed === 0) {
      console.log(`\nℹ️  No pending failed emails with 429 errors found.`);
    } else {
      console.log(`\n⚠️  ${result.failed} email(s) still failed after retry.`);
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

retryFailedEmails();

