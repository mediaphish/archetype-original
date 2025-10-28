#!/usr/bin/env node
// scripts/manage-journal.mjs
// Journal post management system with scheduling

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const JOURNAL_DIR = 'ao-knowledge-hq-kit/journal';
const OUTPUT_FILE = 'public/knowledge.json';

// Process journal posts
function processJournalPosts() {
  if (!fs.existsSync(JOURNAL_DIR)) {
    console.log('📝 No journal directory found, skipping journal posts');
    return [];
  }
  
  const journalFiles = fs.readdirSync(JOURNAL_DIR)
    .filter(file => file.endsWith('.md'))
    .map(file => path.join(JOURNAL_DIR, file));
    
  console.log(`📝 Found ${journalFiles.length} journal posts`);
  
  const posts = [];
  
  for (const filePath of journalFiles) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const { data: frontmatter, content: body } = matter(content);
      
      // Check if post should be published
      const publishDate = frontmatter.publish_date ? new Date(frontmatter.publish_date) : null;
      const now = new Date();
      
      if (publishDate && publishDate > now) {
        console.log(`⏰ Post "${frontmatter.title}" scheduled for ${publishDate.toISOString()}`);
        continue; // Skip future posts
      }
      
      const slug = frontmatter.slug || path.basename(filePath, '.md');
      
      posts.push({
        title: frontmatter.title || 'Untitled Journal Post',
        slug: `journal-${slug}`,
        type: 'journal-post',
        tags: ['journal', 'blog', ...(frontmatter.tags || [])],
        status: 'published',
        created_at: frontmatter.created_at || new Date().toISOString(),
        updated_at: frontmatter.updated_at || new Date().toISOString(),
        publish_date: frontmatter.publish_date || new Date().toISOString(),
        summary: frontmatter.summary || body.substring(0, 200) + '...',
        source: { kind: 'journal' },
        takeaways: frontmatter.takeaways || [],
        applications: frontmatter.applications || [],
        related: frontmatter.related || [],
        body: body.trim()
      });
      
      console.log(`✅ Processed journal post: ${frontmatter.title}`);
    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error.message);
    }
  }
  
  return posts;
}

// Main function to update knowledge with journal posts
async function updateKnowledgeWithJournal() {
  console.log('🔍 Updating knowledge corpus with journal posts...');
  
  // Load existing knowledge
  let knowledgeCorpus = { docs: [] };
  if (fs.existsSync(OUTPUT_FILE)) {
    const existingData = fs.readFileSync(OUTPUT_FILE, 'utf8');
    knowledgeCorpus = JSON.parse(existingData);
  }
  
  // Process journal posts
  const journalPosts = processJournalPosts();
  
  // Filter out existing journal posts
  const existingJournalSlugs = knowledgeCorpus.docs
    .filter(doc => doc.type === 'journal-post')
    .map(doc => doc.slug);
    
  const newJournalPosts = journalPosts.filter(post => 
    !existingJournalSlugs.includes(post.slug)
  );
  
  // Add new journal posts
  knowledgeCorpus.docs = [
    ...knowledgeCorpus.docs.filter(doc => doc.type !== 'journal-post'),
    ...journalPosts
  ];
  
  // Update metadata
  knowledgeCorpus.generated_at = new Date().toISOString();
  knowledgeCorpus.count = knowledgeCorpus.docs.length;
  
  // Write updated knowledge corpus
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(knowledgeCorpus, null, 2));
  
  console.log(`✅ Knowledge corpus updated!`);
  console.log(`   📊 Total documents: ${knowledgeCorpus.count}`);
  console.log(`   📝 New journal posts: ${newJournalPosts.length}`);
  console.log(`   📁 Output: ${OUTPUT_FILE}`);
  
  return knowledgeCorpus;
}

// CLI commands
const command = process.argv[2];

switch (command) {
  case 'update':
    updateKnowledgeWithJournal()
      .then(() => {
        console.log('🎉 Journal update complete!');
        process.exit(0);
      })
      .catch((error) => {
        console.error('❌ Journal update failed:', error);
        process.exit(1);
      });
    break;
    
  case 'list':
    const posts = processJournalPosts();
    console.log('\n📝 Journal Posts:');
    posts.forEach(post => {
      console.log(`   • ${post.title} (${post.publish_date})`);
    });
    break;
    
  default:
    console.log('Usage: node scripts/manage-journal.mjs [update|list]');
    process.exit(1);
}

export default updateKnowledgeWithJournal;
