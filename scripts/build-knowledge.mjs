#!/usr/bin/env node
// scripts/build-knowledge.mjs
// Automated knowledge corpus builder that runs daily at 11pm

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const KNOWLEDGE_DIR = 'ao-knowledge-hq-kit/knowledge';
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
