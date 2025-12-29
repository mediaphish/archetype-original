#!/usr/bin/env node
// scripts/build-knowledge.mjs
// Automated knowledge corpus builder that runs daily at 11pm

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const KNOWLEDGE_DIR = 'ao-knowledge-hq-kit/knowledge';
const JOURNAL_DIR = 'ao-knowledge-hq-kit/journal';
const FAQ_DIR = 'ao-knowledge-hq-kit/faqs';
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
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Skip empty files
        if (!content || !content.trim()) {
          console.warn(`⚠️  Skipping empty file: ${path.basename(filePath)}`);
          skippedCount++;
          continue;
        }
        
        // Clean RTF code from content BEFORE parsing frontmatter
        if (content.includes('\\rtf') || content.includes('{\\rtf')) {
          // Remove RTF header block
          content = content.replace(/\{\\rtf[^}]*\}/gi, '');
          // Remove RTF control sequences
          content = content.replace(/\\[a-z]+\d*\s*/gi, '');
          // Remove RTF tables
          content = content.replace(/\\fonttbl[^}]*\}\s*/gi, '');
          content = content.replace(/\\colortbl[^}]*\}\s*/gi, '');
          content = content.replace(/\\\*\\expandedcolortbl[^}]*\}\s*/gi, '');
          content = content.replace(/\{[^}]*\}/g, '');
          // Fix RTF escape sequences
          content = content.replace(/\\'92/g, "'");
          content = content.replace(/\\'97/g, "—");
          content = content.replace(/\\'85/g, "…");
          content = content.replace(/\\'/g, "'");
          // Convert RTF line breaks to newlines
          content = content.replace(/\\par\s*/gi, '\n');
          content = content.replace(/\\\s*\n\s*/g, '\n');
          // Remove remaining backslashes (but preserve markdown syntax)
          content = content.replace(/\\(?![!*_`\[\]()#-])/g, '');
          // Clean up whitespace
          content = content.replace(/[ \t]+/g, ' ');
          content = content.replace(/\n{3,}/g, '\n\n');
          content = content.trim();
        }
        
        // Now parse frontmatter from cleaned content
        let { data: frontmatter, content: body } = matter(content);
        
        // Remove any frontmatter that might still be in body (only at the start)
        // Don't remove --- separators that are used as section dividers in content
        body = body.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/m, '');
        body = body.trim();
        
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
        
        // Skip future posts (but allow devotionals to be published even if dated in the future)
        const isDevotional = filePath.includes('devotionals') || frontmatter.type === 'devotional';
        if (publishDate && publishDate > now && !isDevotional) {
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
        
        // Determine if this is a devotional (check if file is in devotionals subdirectory)
        // Note: isDevotional was already determined above for future post check
        const postType = isDevotional ? 'devotional' : 'journal-post';
        
        // Check for image - prioritize featured_image from frontmatter
        // Devotionals typically don't have images
        let imagePath = null;
        
        // First, check if featured_image is specified in frontmatter
        if (frontmatter.featured_image) {
          // Convert relative paths to absolute
          let featuredImage = frontmatter.featured_image;
          if (featuredImage.startsWith('../images/')) {
            imagePath = featuredImage.replace('../images/', '/images/');
          } else if (featuredImage.startsWith('images/')) {
            imagePath = `/${featuredImage}`;
          } else if (featuredImage.startsWith('/images/')) {
            imagePath = featuredImage;
          } else {
            // Try to find it in public/images
            imagePath = `/images/${featuredImage.replace(/^.*\//, '')}`;
          }
        } else {
          // Fallback: Check for matching image based on slug (try multiple formats)
          const imageFormats = ['jpg', 'jpeg', 'png', 'webp'];
          for (const format of imageFormats) {
            const imageFile = path.join(process.cwd(), 'public', 'images', `${slug}.${format}`);
            if (fs.existsSync(imageFile)) {
              imagePath = `/images/${slug}.${format}`;
              break;
            }
          }
        }
        
        // Generate email-friendly summary
        // Priority: frontmatter.summary > first paragraph > first 300 chars
        let emailSummary = frontmatter.summary || '';
        
        if (!emailSummary && body) {
          // Try to extract first paragraph (text between newlines)
          const paragraphs = body.split(/\n\s*\n/).filter(p => p.trim().length > 0);
          if (paragraphs.length > 0) {
            // Use first paragraph, but limit to 400 chars for email readability
            const firstPara = paragraphs[0].trim();
            emailSummary = firstPara.length > 400 
              ? firstPara.substring(0, 397).trim() + '...'
              : firstPara;
          } else {
            // Fallback: first 300 chars of body
            emailSummary = body.length > 300 
              ? body.substring(0, 297).trim() + '...'
              : body.trim();
          }
        }
        
        // Clean up summary - remove markdown syntax for email readability
        emailSummary = emailSummary
          .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
          .replace(/\*(.+?)\*/g, '$1') // Remove italic
          .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Remove links, keep text
          .replace(/#{1,6}\s+/g, '') // Remove heading markers
          .replace(/>\s+/g, '') // Remove blockquote markers
          .replace(/\n+/g, ' ') // Replace newlines with spaces
          .replace(/\s+/g, ' ') // Collapse multiple spaces
          .trim();

        const journalDoc = {
          title: frontmatter.title || (isDevotional ? 'Untitled Devotional' : 'Untitled Journal Post'),
          slug: slug,
          type: postType,
          tags: frontmatter.tags || [],
          categories: frontmatter.categories || [],
          status: status,
          created_at: frontmatter.created_at || new Date().toISOString(),
          updated_at: frontmatter.updated_at || new Date().toISOString(),
          publish_date: frontmatter.publish_date || frontmatter.date || new Date().toISOString(),
          date: frontmatter.date || frontmatter.publish_date || null, // For devotionals
          summary: frontmatter.summary || (body ? body.substring(0, 200).trim() + '...' : ''),
          email_summary: emailSummary, // Email-specific summary (longer, cleaner)
          image: imagePath,
          scripture_reference: frontmatter.scripture_reference || null, // For devotionals
          source: { 
            kind: isDevotional ? 'devotional' : 'journal',
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
        const postLabel = isDevotional ? 'devotional' : 'journal post';
        console.log(`✅ Processed ${postLabel}: ${frontmatter.title || slug}`);
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
  
  // Process FAQs
  if (fs.existsSync(FAQ_DIR)) {
    console.log(`\n❓ Processing FAQs...`);
    const faqFiles = findMarkdownFiles(FAQ_DIR);
    console.log(`📋 Found ${faqFiles.length} FAQ files`);
    
    let faqProcessed = 0;
    let faqSkipped = 0;
    
    for (const filePath of faqFiles) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const { data: frontmatter, content: body } = matter(content);
        
        // Only process published FAQs
        if (frontmatter.status !== 'published') {
          console.log(`⏭️  Skipping draft FAQ: ${frontmatter.title || path.basename(filePath)}`);
          faqSkipped++;
          continue;
        }
        
        const slug = frontmatter.slug || path.basename(filePath, '.md');
        
        const faqDoc = {
          title: frontmatter.title || 'Untitled FAQ',
          slug: slug,
          type: 'faq',
          tags: frontmatter.tags || frontmatter.categories || [],
          categories: frontmatter.categories || [],
          status: frontmatter.status || 'published',
          created_at: frontmatter.created_at || new Date().toISOString(),
          updated_at: frontmatter.updated_at || new Date().toISOString(),
          summary: frontmatter.summary || (body ? body.substring(0, 200).trim() + '...' : ''),
          featured: frontmatter.featured || false,
          featured_on: frontmatter.featured_on || [],
          source: {
            kind: 'faq',
            original_source: 'site-content'
          },
          body: body ? body.trim() : ''
        };
        
        docs.push(faqDoc);
        faqProcessed++;
        console.log(`✅ Processed FAQ: ${frontmatter.title || slug}`);
      } catch (error) {
        faqSkipped++;
        console.error(`❌ Error processing FAQ ${path.basename(filePath)}:`, error.message);
      }
    }
    
    console.log(`📊 FAQ Processing Summary:`);
    console.log(`   ✅ Published: ${faqProcessed}`);
    console.log(`   ⏭️  Skipped: ${faqSkipped}`);
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
  console.log(`\n💡 To send email notifications for new posts, use:`);
  console.log(`   node scripts/send-journal-notification.mjs <post-slug>`);
  console.log(`   Or call POST /api/journal/notify with { postSlug: "<slug>" }`);
  
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
