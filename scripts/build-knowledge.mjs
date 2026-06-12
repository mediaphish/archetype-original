#!/usr/bin/env node
// scripts/build-knowledge.mjs
// Automated knowledge corpus builder that runs daily at 11pm

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import {
  shouldSkipFutureScheduledMarkdown,
  publishDateCalendarOnly,
  calendarTodayPublicationTz,
  filterPublishedScheduledDocs,
  publicationTimeZone,
} from '../lib/publish-eligibility.mjs';

const KNOWLEDGE_DIR = 'ao-knowledge-hq-kit/knowledge';
const JOURNAL_DIR = 'ao-knowledge-hq-kit/journal';
const PODCAST_DIR = path.join(JOURNAL_DIR, 'podcast');
const FAQ_DIR = 'ao-knowledge-hq-kit/faqs';
const OUTPUT_FILE = 'public/knowledge.json';

/** Journal-only category cleanup (see journal implementation plan). Not applied to FAQs. */
const JOURNAL_CATEGORY_NORMALIZE = {
  neuroscience: 'psychology',
  'organizational-psychology': 'psychology',
  'organizational-dynamics': 'psychology',
  'emotional-dynamics': 'psychology',
  'emotional-intelligence': 'psychology',
  'data-research': 'psychology',
  power: 'power-control',
  'team-building': 'culture',
  collaboration: 'culture',
  'culture-values': 'culture',
  formation: 'culture',
  'leadership-development': 'leadership',
  'leadership-principles': 'leadership',
  'high-performance': 'leadership',
  'decision-making': 'leadership',
  advisory: 'leadership',
  consulting: 'leadership',
  'case-studies': 'leadership',
  teams: 'leadership',
  editorial: null,
  journal: null,
  'personal-reflection': null,
  balance: 'leadership',
  boundaries: 'leadership',
  fear: 'psychology',
  burnout: 'psychology',
  innovation: 'leadership',
  systems: 'leadership',
  legacy: 'servant-leadership',
  purpose: 'servant-leadership',
  identity: 'servant-leadership',
  faith: 'servant-leadership',
  ethics: 'accountability',
  authoritarianism: 'narcissism',
  empathy: 'psychology',
  trust: 'leadership',
  communication: 'leadership',
  development: 'leadership',
  'scoreboard-leadership': 'leadership',
};

function normalizeJournalCategories(categories) {
  if (!Array.isArray(categories)) return [];
  const normalized = categories
    .map((cat) => {
      const raw = String(cat ?? '').trim();
      if (!raw) return null;
      const key = raw.toLowerCase();
      const mapped = JOURNAL_CATEGORY_NORMALIZE[key];
      if (mapped === null) return null;
      if (mapped !== undefined) return mapped;
      return raw;
    })
    .filter(Boolean);
  return [...new Set(normalized)];
}

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
  console.log(`📅 Publication calendar: ${publicationTimeZone()} (override with PUBLICATION_TIME_ZONE)`);
  
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

      if (filePath.includes(`${path.sep}podcast${path.sep}`)) {
        return false;
      }
      
      return true;
    });
      
    console.log(`📝 Processing ${journalFiles.length} journal posts`);
    
    let processedCount = 0;
    let skippedCount = 0;
    let futurePosts = 0;
    let draftPosts = 0;
    /** Journal articles (not devotionals) missing explicit status: published */
    let awaitingJournalApproval = 0;
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

        const fileName = path.basename(filePath);
        
        // gray-matter already removes frontmatter, but check if there's any leftover
        // Only remove frontmatter at the very start of the string (not line-by-line)
        // This preserves --- separators used as section dividers in devotional content
        if (body.trim().startsWith('---')) {
          const firstEnd = body.indexOf('\n---', 4);
          if (firstEnd > 0) {
            body = body.substring(firstEnd + 5); // Remove the frontmatter block
          }
        }
        body = body.trim();

        const isDevotional = filePath.includes('devotionals') || frontmatter.type === 'devotional';

        if (!isDevotional && /\{\\rtf|\\rtf1\b/i.test(body)) {
          console.warn(
            `⚠️  Skipping journal file (RTF still present in body after cleanup — repair source): ${path.basename(filePath)}`,
          );
          skippedCount++;
          continue;
        }

        if (frontmatter.publish_date) {
          try {
            const pd = new Date(frontmatter.publish_date);
            if (isNaN(pd.getTime())) {
              console.warn(`⚠️  Invalid publish_date for "${frontmatter.title || path.basename(filePath)}"`);
            }
          } catch (e) {
            console.warn(`⚠️  Error parsing publish_date for "${frontmatter.title || path.basename(filePath)}":`, e.message);
          }
        }

        // Skip future journal + devotional by calendar day (single TZ: publicationTimeZone())
        if (
          shouldSkipFutureScheduledMarkdown(frontmatter, {
            isJournalOrDevotional: true,
          })
        ) {
          const pub = publishDateCalendarOnly(frontmatter.publish_date ?? frontmatter.date);
          const today = calendarTodayPublicationTz();
          console.log(
            `⏰ Skipping future ${isDevotional ? 'devotional' : 'journal post'}: "${frontmatter.title || path.basename(filePath)}" (scheduled for ${pub}, today is ${today})`
          );
          futurePosts++;
          continue;
        }

        const statusNorm = String(frontmatter.status ?? '').trim().toLowerCase();

        if (statusNorm === 'draft') {
          console.log(
            `📝 Skipping draft ${isDevotional ? 'devotional' : 'post'}: "${frontmatter.title || path.basename(filePath)}"`
          );
          draftPosts++;
          continue;
        }

        // Long-form journal only: require an explicit `status: published` so drafts/seeds
        // never go live by omission. Devotionals keep the old rule (non-draft = ok).
        if (!isDevotional && statusNorm !== 'published') {
          console.log(
            `🔒 Skipping journal article (not approved for public Journal): "${frontmatter.title || path.basename(filePath)}" — add status: published when ready.`
          );
          awaitingJournalApproval++;
          continue;
        }

        const status = 'published';

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

        // Preserve publish_date as YYYY-MM-DD string if it's in that format
        // Don't convert to ISO string to avoid timezone issues
        let publishDateValue = frontmatter.publish_date || frontmatter.date;

        if (!publishDateValue) {
          if (isDevotional) {
            publishDateValue = new Date().toISOString();
          } else {
            console.warn(
              `⚠️  Skipping journal post (missing publish_date and date in frontmatter): "${frontmatter.title || path.basename(filePath)}"`,
            );
            skippedCount++;
            continue;
          }
        } else if (typeof publishDateValue === 'string' && publishDateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
          // Keep as YYYY-MM-DD string, don't convert
          publishDateValue = publishDateValue;
        } else {
          // For other formats, convert to ISO
          publishDateValue = new Date(publishDateValue).toISOString();
        }
        
        const journalDoc = {
          title: frontmatter.title || (isDevotional ? 'Untitled Devotional' : 'Untitled Journal Post'),
          slug: slug,
          type: postType,
          tags: frontmatter.tags || [],
          categories: normalizeJournalCategories(frontmatter.categories || []),
          status: status,
          created_at: frontmatter.created_at || new Date().toISOString(),
          updated_at: frontmatter.updated_at || new Date().toISOString(),
          publish_date: publishDateValue,
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
    console.log(`   🔒 Journal articles waiting for status: published: ${awaitingJournalApproval}`);
    console.log(`   ⏰ Future posts: ${futurePosts}`);
    console.log(`   ⏭️  Skipped: ${skippedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
  }

  // Process podcast episodes (separate from journal loop)
  if (fs.existsSync(PODCAST_DIR)) {
    console.log(`\n🎙️  Processing podcast episodes...`);
    const podcastFiles = fs
      .readdirSync(PODCAST_DIR)
      .filter((name) => name.endsWith('.md') && !name.toLowerCase().includes('template'))
      .map((name) => path.join(PODCAST_DIR, name));

    let podcastProcessed = 0;
    let podcastSkipped = 0;

    for (const filePath of podcastFiles) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        if (!content.trim()) {
          podcastSkipped++;
          continue;
        }

        const { data: frontmatter, content: body } = matter(content);
        const statusNorm = String(frontmatter.status ?? '').trim().toLowerCase();

        if (statusNorm === 'draft') {
          console.log(`📝 Skipping draft podcast episode: ${frontmatter.title || path.basename(filePath)}`);
          podcastSkipped++;
          continue;
        }

        if (statusNorm !== 'published') {
          console.log(
            `🔒 Skipping podcast episode (not published): ${frontmatter.title || path.basename(filePath)}`
          );
          podcastSkipped++;
          continue;
        }

        if (
          shouldSkipFutureScheduledMarkdown(frontmatter, {
            isJournalOrDevotional: true,
          })
        ) {
          const pub = publishDateCalendarOnly(frontmatter.publish_date ?? frontmatter.date);
          const today = calendarTodayPublicationTz();
          console.log(
            `⏰ Skipping future podcast episode: "${frontmatter.title || path.basename(filePath)}" (scheduled for ${pub}, today is ${today})`
          );
          podcastSkipped++;
          continue;
        }

        const slug = frontmatter.slug || path.basename(filePath, '.md');
        let publishDateValue = frontmatter.publish_date || frontmatter.date;
        if (publishDateValue && String(publishDateValue).includes('T')) {
          publishDateValue = String(publishDateValue).split('T')[0];
        }

        const youtubeId = frontmatter.youtube_id || frontmatter.youtubeId || null;
        const imagePath = youtubeId ? `/images/podcast/${slug}.jpg` : null;

        const episodeDoc = {
          title: frontmatter.title || 'Untitled Episode',
          slug,
          type: 'podcast-episode',
          tags: frontmatter.tags || [],
          categories: frontmatter.categories || [],
          status: 'published',
          created_at: frontmatter.created_at || publishDateValue || new Date().toISOString(),
          updated_at: frontmatter.updated_at || publishDateValue || new Date().toISOString(),
          publish_date: publishDateValue,
          date: publishDateValue,
          summary: frontmatter.summary || '',
          episode_type: frontmatter.episode_type || frontmatter.episodeType || 'solo',
          duration: frontmatter.duration || '',
          youtube_id: youtubeId,
          spotify_embed_url: frontmatter.spotify_embed_url || frontmatter.spotifyEmbedUrl || '',
          show_notes: Array.isArray(frontmatter.show_notes)
            ? frontmatter.show_notes
            : Array.isArray(frontmatter.showNotes)
              ? frontmatter.showNotes
              : [],
          body: body.trim(),
          transcript: frontmatter.transcript || '',
          key_takeaways: Array.isArray(frontmatter.key_takeaways)
            ? frontmatter.key_takeaways
            : Array.isArray(frontmatter.keyTakeaways)
              ? frontmatter.keyTakeaways
              : [],
          guest: frontmatter.guest || null,
          related: frontmatter.related || [],
          image: imagePath,
          source: {
            kind: 'podcast',
            original_source: 'Archetype Original Podcast',
          },
        };

        docs.push(episodeDoc);

        const journalCrossPost = {
          title: episodeDoc.title,
          slug: episodeDoc.slug,
          type: 'journal-post',
          tags: [...(episodeDoc.tags || []), 'podcast'],
          categories: [...(episodeDoc.categories || []), 'podcast'],
          status: 'published',
          created_at: episodeDoc.created_at,
          updated_at: episodeDoc.updated_at,
          publish_date: episodeDoc.publish_date,
          date: episodeDoc.date,
          summary: episodeDoc.summary,
          body: episodeDoc.summary || episodeDoc.body.substring(0, 500),
          image: imagePath,
          podcast_slug: slug,
          episode_type: episodeDoc.episode_type,
          duration: episodeDoc.duration,
          youtube_id: youtubeId,
          related: episodeDoc.related,
          source: {
            kind: 'podcast',
            original_source: 'Archetype Original Podcast',
          },
        };

        docs.push(journalCrossPost);
        podcastProcessed++;
        console.log(`✅ Processed podcast episode: ${episodeDoc.title}`);
      } catch (error) {
        console.error(`❌ Error processing podcast ${path.basename(filePath)}:`, error.message);
      }
    }

    console.log(`📊 Podcast Processing Summary:`);
    console.log(`   ✅ Published: ${podcastProcessed}`);
    console.log(`   ⏭️  Skipped: ${podcastSkipped}`);
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
  
  // Sort: journal posts and devotionals by publish_date, everything else by updated_at
  docs.sort((a, b) => {
    const aIsJournal = a.type === 'journal-post' || a.type === 'devotional';
    const bIsJournal = b.type === 'journal-post' || b.type === 'devotional';

    if (aIsJournal && bIsJournal) {
      // Both journal/devotional: sort by publish_date descending
      const aDate = a.publish_date || a.date || a.updated_at || '';
      const bDate = b.publish_date || b.date || b.updated_at || '';
      return bDate.localeCompare(aDate);
    }

    if (aIsJournal && !bIsJournal) return -1;
    if (!aIsJournal && bIsJournal) return 1;

    // Both non-journal: sort by updated_at descending
    return new Date(b.updated_at) - new Date(a.updated_at);
  });

  const beforeGuard = docs.length;
  const scheduleSafeDocs = filterPublishedScheduledDocs(docs);
  const droppedGuard = beforeGuard - scheduleSafeDocs.length;
  if (droppedGuard > 0) {
    console.warn(
      `⚠️  Schedule guardrail (output): removed ${droppedGuard} future journal/devotional entr(y/ies) still present before write — check sources or merges`
    );
  }

  const knowledgeCorpus = {
    generated_at: new Date().toISOString(),
    count: scheduleSafeDocs.length,
    docs: scheduleSafeDocs,
  };
  
  // Write to output file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(knowledgeCorpus, null, 2));

  try {
    const { auditPublicationEvent } = await import('../lib/ao/auditPublicationEvent.js');
    const journalPostCount = scheduleSafeDocs.filter((d) => d.type === 'journal-post').length;
    const devotionalCount = scheduleSafeDocs.filter((d) => d.type === 'devotional').length;
    await auditPublicationEvent({
      source: 'script:build-knowledge',
      action: 'write_public_knowledge_json',
      outcome: 'success',
      actor_email: null,
      resource_paths: [OUTPUT_FILE],
      detail: {
        doc_count: scheduleSafeDocs.length,
        journal_post_count: journalPostCount,
        devotional_count: devotionalCount,
        publication_tz: publicationTimeZone(),
        dropped_future_scheduled: droppedGuard || 0,
      },
    });
  } catch (auditErr) {
    console.warn('[build-knowledge] audit log skipped:', auditErr?.message || auditErr);
  }
  
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
