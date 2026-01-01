#!/usr/bin/env node

/**
 * List all Journal entries with publication information
 * 
 * Extracts:
 * 1. Title
 * 2. Categories
 * 3. Previous release date on Facebook (from body text or original_source)
 * 4. Previous release date on the Journal (publish_date)
 * 5. Future release date if it hasn't been published anywhere yet
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const journalDir = join(rootDir, 'ao-knowledge-hq-kit', 'journal');

// Parse Facebook date from body text
function extractFacebookDate(body) {
  if (!body) return null;
  
  // Look for patterns like "*Originally published on Facebook on [date]*"
  const patterns = [
    /\*Originally published on Facebook on ([^*]+)\*/i,
    /Originally published on Facebook on ([^\.\*]+)/i,
    /Facebook.*?([A-Z][a-z]+ \d{1,2}, \d{4})/i,
    /Facebook.*?(\d{1,2}\/\d{1,2}\/\d{4})/i,
  ];
  
  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  return null;
}

// Format date for display
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // Return as-is if invalid
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  } catch {
    return dateString;
  }
}

// Check if date is in the future
function isFutureDate(dateString) {
  if (!dateString) return false;
  
  try {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return date > today;
  } catch {
    return false;
  }
}

// Get all journal markdown files (excluding devotionals)
function getJournalFiles() {
  const files = readdirSync(journalDir);
  return files
    .filter(file => file.endsWith('.md') && !file.endsWith('.md.md'))
    .filter(file => !file.includes('devotionals'))
    .filter(file => file !== 'TEMPLATE.md')
    .map(file => join(journalDir, file));
}

// Process a single journal file
function processJournalFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const { data: frontmatter, content: body } = matter(content);
    
    const title = frontmatter.title || 'Untitled';
    const categories = Array.isArray(frontmatter.categories) 
      ? frontmatter.categories.join(', ') 
      : (frontmatter.categories || 'N/A');
    
    const publishDate = frontmatter.publish_date || null;
    const journalDate = publishDate ? formatDate(publishDate) : 'Not published';
    
    // Check if originally from Facebook
    const isFromFacebook = frontmatter.original_source === 'Facebook';
    const facebookDateText = extractFacebookDate(body);
    const facebookDate = facebookDateText || (isFromFacebook ? 'Published (date unknown)' : null);
    
    // Determine status
    const isFuture = publishDate ? isFutureDate(publishDate) : true;
    const futureDate = isFuture && publishDate ? formatDate(publishDate) : null;
    
    return {
      title,
      categories,
      facebookDate: facebookDate || 'N/A',
      journalDate: journalDate === 'Not published' && !isFuture ? 'Not published' : journalDate,
      futureDate: futureDate || 'N/A',
      slug: frontmatter.slug || null,
      status: frontmatter.status || 'published',
      isFromFacebook
    };
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return null;
  }
}

// Main function
function listJournalEntries() {
  console.log('📋 Journal Entries Summary\n');
  console.log('='.repeat(100));
  
  const files = getJournalFiles();
  const entries = files
    .map(processJournalFile)
    .filter(entry => entry !== null)
    .sort((a, b) => {
      // Sort by publish_date if available, otherwise by title
      if (a.futureDate !== 'N/A' && b.futureDate !== 'N/A') {
        return new Date(a.futureDate) - new Date(b.futureDate);
      }
      return a.title.localeCompare(b.title);
    });
  
  console.log(`\nTotal entries: ${entries.length}\n`);
  
  // Format output as a table-like structure
  entries.forEach((entry, index) => {
    console.log(`\n${index + 1}. ${entry.title}`);
    console.log(`   Categories: ${entry.categories}`);
    console.log(`   Facebook Release: ${entry.facebookDate}`);
    console.log(`   Journal Release: ${entry.journalDate}`);
    if (entry.futureDate !== 'N/A') {
      console.log(`   ⏰ Scheduled Release: ${entry.futureDate}`);
    }
    if (entry.status !== 'published') {
      console.log(`   Status: ${entry.status}`);
    }
  });
  
  // Summary statistics
  const published = entries.filter(e => e.journalDate !== 'Not published' && e.futureDate === 'N/A').length;
  const future = entries.filter(e => e.futureDate !== 'N/A').length;
  const facebookOnly = entries.filter(e => e.facebookDate !== 'N/A' && e.journalDate === 'Not published').length;
  const unpublished = entries.filter(e => e.journalDate === 'Not published' && e.futureDate === 'N/A').length;
  
  console.log('\n' + '='.repeat(100));
  console.log('\n📊 Summary Statistics:');
  console.log(`   Published on Journal: ${published}`);
  console.log(`   Scheduled for Future: ${future}`);
  console.log(`   Facebook Only (not on Journal): ${facebookOnly}`);
  console.log(`   Unpublished: ${unpublished}`);
}

// Run
listJournalEntries();

