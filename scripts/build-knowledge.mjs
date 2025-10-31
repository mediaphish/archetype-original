#!/usr/bin/env node
// scripts/build-knowledge.mjs
// Automated knowledge corpus builder that runs daily at 11pm

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const KNOWLEDGE_DIR = 'ao-knowledge-hq-kit/knowledge';
const JOURNAL_DIR = 'ao-knowledge-hq-kit/journal';
const OUTPUT_FILE = 'public/knowledge.json';

// Recursively find all markdown files
function findMarkdownFiles(dir) {
  const files = [];
  
  function walkDir(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        walkDir(fullPath);
      } else if (item.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  }
  
  walkDir(dir);
  return files;
}

// Process a single markdown file
function processMarkdownFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const { data: frontmatter, content: body } = matter(content);
    
    // Extract relative path for slug if not provided
    const relativePath = path.relative(KNOWLEDGE_DIR, filePath);
    const slug = frontmatter.slug || relativePath.replace('.md', '').replace(/\//g, '-');
    
    return {
      title: frontmatter.title || 'Untitled',
      slug: slug,
      type: frontmatter.type || 'article',
      tags: frontmatter.tags || [],
      status: frontmatter.status || 'draft',
      created_at: frontmatter.created_at || new Date().toISOString(),
      updated_at: frontmatter.updated_at || new Date().toISOString(),
      summary: frontmatter.summary || '',
      source: frontmatter.source || { kind: 'internal' },
      takeaways: frontmatter.takeaways || [],
      applications: frontmatter.applications || [],
      related: frontmatter.related || [],
      body: body.trim()
    };
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return null;
  }
}

// Main build function
async function buildKnowledgeCorpus() {
  console.log('🔍 Scanning for knowledge files...');
  
  if (!fs.existsSync(KNOWLEDGE_DIR)) {
    console.error(`❌ Knowledge directory not found: ${KNOWLEDGE_DIR}`);
    process.exit(1);
  }
  
  const markdownFiles = findMarkdownFiles(KNOWLEDGE_DIR);
  console.log(`📄 Found ${markdownFiles.length} markdown files`);
  
  const docs = [];
  let processed = 0;
  let skipped = 0;
  
  for (const filePath of markdownFiles) {
    const doc = processMarkdownFile(filePath);
    if (doc) {
      docs.push(doc);
      processed++;
    } else {
      skipped++;
    }
  }
  
  // Process journal posts
  if (fs.existsSync(JOURNAL_DIR)) {
    // Recursively find all markdown files in journal directory
    const findAllJournalFiles = (dir) => {
      const files = [];
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Recursively search subdirectories
          files.push(...findAllJournalFiles(fullPath));
        } else if (item.endsWith('.md')) {
          files.push(fullPath);
        }
      }
      
      return files;
    };
    
    const allJournalFiles = findAllJournalFiles(JOURNAL_DIR);
    console.log(`📁 Found ${allJournalFiles.length} total markdown files in journal directory`);
    
    const journalFiles = allJournalFiles.filter(filePath => {
      const fileName = path.basename(filePath);
      
      // Only process .md files, exclude templates and malformed files
      const isTemplate = fileName.toLowerCase().includes('template') || fileName === 'template.md';
      const isMalformed = fileName.endsWith('.md.md') || fileName.endsWith('.rtf');
      const isHidden = fileName.startsWith('.');
      
      if (isTemplate) {
        console.log(`⏭️  Skipping template file: ${fileName}`);
        return false;
      }
      
      if (isMalformed) {
        console.log(`⏭️  Skipping malformed file: ${fileName}`);
        return false;
      }
      
      if (isHidden) {
        console.log(`⏭️  Skipping hidden file: ${fileName}`);
        return false;
      }
      
      return true;
    });
      
    console.log(`📝 Processing ${journalFiles.length} journal posts`);
    
    let processedCount = 0;
    let skippedCount = 0;
    let futurePosts = 0;
    let draftPosts = 0;
    let errorCount = 0;
    
    for (const filePath of journalFiles) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Skip empty files
        if (!content || !content.trim()) {
          console.warn(`⚠️  Skipping empty file: ${path.basename(filePath)}`);
          skippedCount++;
          continue;
        }
        
        const { data: frontmatter, content: body } = matter(content);
        
        // Check if post should be published
        let publishDate = null;
        if (frontmatter.publish_date) {
          try {
            publishDate = new Date(frontmatter.publish_date);
            // Validate date
            if (isNaN(publishDate.getTime())) {
              console.warn(`⚠️  Invalid publish_date for "${frontmatter.title || path.basename(filePath)}", using current date`);
              publishDate = null;
            }
          } catch (e) {
            console.warn(`⚠️  Error parsing publish_date for "${frontmatter.title || path.basename(filePath)}":`, e.message);
            publishDate = null;
          }
        }
        
        const now = new Date();
        
        // Skip future posts
        if (publishDate && publishDate > now) {
          console.log(`⏰ Skipping future post: "${frontmatter.title || path.basename(filePath)}" (scheduled for ${publishDate.toISOString()})`);
          futurePosts++;
          continue;
        }
        
        // Check status - only skip if explicitly set to 'draft'
        const status = frontmatter.status === 'draft' ? 'draft' : 'published';
        if (status === 'draft') {
          console.log(`📝 Skipping draft post: "${frontmatter.title || path.basename(filePath)}"`);
          draftPosts++;
          continue;
        }
        
        const slug = frontmatter.slug || path.basename(filePath, '.md');
        
        // Check for matching image (try multiple formats)
        let imagePath = null;
        const imageFormats = ['jpg', 'jpeg', 'png', 'webp'];
        for (const format of imageFormats) {
          const imageFile = path.join(process.cwd(), 'public', 'images', `${slug}.${format}`);
          if (fs.existsSync(imageFile)) {
            imagePath = `/images/${slug}.${format}`;
            break;
          }
        }
        
        const journalDoc = {
          title: frontmatter.title || 'Untitled Journal Post',
          slug: slug,
          type: 'journal-post',
          tags: ['journal', 'blog', ...(frontmatter.tags || [])],
          categories: frontmatter.categories || ['general'],
          status: status,
          created_at: frontmatter.created_at || new Date().toISOString(),
          updated_at: frontmatter.updated_at || new Date().toISOString(),
          publish_date: frontmatter.publish_date || new Date().toISOString(),
          summary: frontmatter.summary || (body ? body.substring(0, 200).trim() + '...' : ''),
          image: imagePath,
          source: { 
            kind: 'journal',
            original_source: frontmatter.original_source || null,
            original_url: frontmatter.original_url || null
          },
          takeaways: frontmatter.takeaways || [],
          applications: frontmatter.applications || [],
          related: frontmatter.related || [],
          body: body ? body.trim() : ''
        };
        
        docs.push(journalDoc);
        processedCount++;
        console.log(`✅ Processed journal post: ${frontmatter.title || slug}`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Error processing journal ${path.basename(filePath)}:`, error.message);
        console.error(`   Full path: ${filePath}`);
      }
    }
    
    console.log(`📊 Journal Processing Summary:`);
    console.log(`   ✅ Published: ${processedCount}`);
    console.log(`   📝 Drafts: ${draftPosts}`);
    console.log(`   ⏰ Future posts: ${futurePosts}`);
    console.log(`   ⏭️  Skipped: ${skippedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
  }
  
  // Sort by updated_at (newest first)
  docs.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  
  const knowledgeCorpus = {
    generated_at: new Date().toISOString(),
    count: docs.length,
    docs: docs
  };
  
  // Write to output file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(knowledgeCorpus, null, 2));
  
  console.log(`✅ Knowledge corpus built successfully!`);
  console.log(`   📊 Processed: ${processed} files`);
  console.log(`   ⚠️  Skipped: ${skipped} files`);
  console.log(`   📁 Output: ${OUTPUT_FILE}`);
  console.log(`   🕐 Generated: ${knowledgeCorpus.generated_at}`);
  
  return knowledgeCorpus;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  buildKnowledgeCorpus()
    .then(() => {
      console.log('🎉 Build complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Build failed:', error);
      process.exit(1);
    });
}

export default buildKnowledgeCorpus;
