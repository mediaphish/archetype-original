import React from 'react';
import { OptimizedImage } from './OptimizedImage';

function renderMarkdownBlocks(post) {
  if (!post?.body) return [];

// Clean the body - remove RTF code first, then remove title and duplicate image if they appear
let bodyText = post.body.trim();

// Step 1: Remove entire RTF header block (everything from {\rtf to the first real content)
// This handles the case where the entire file is RTF-encoded
bodyText = bodyText.replace(/\{\\rtf[^}]*\}/gi, '');

// Step 2: Remove RTF control sequences comprehensively
// Remove all RTF control words (patterns like \rtf1, \ansi, etc.)
bodyText = bodyText.replace(/\\[a-z]+\d*\s*/gi, '');

// Step 3: Remove RTF tables and formatting blocks
bodyText = bodyText.replace(/\\fonttbl[^}]*\}\s*/gi, '');
bodyText = bodyText.replace(/\\colortbl[^}]*\}\s*/gi, '');
bodyText = bodyText.replace(/\\\*\\expandedcolortbl[^}]*\}\s*/gi, '');
bodyText = bodyText.replace(/\{[^}]*\}/g, '');

// Step 4: Fix RTF escape sequences to proper characters
bodyText = bodyText.replace(/\\'92/g, "'"); // RTF right single quote (apostrophe)
bodyText = bodyText.replace(/\\'97/g, "-"); // RTF em dash
bodyText = bodyText.replace(/\\'85/g, "…"); // RTF ellipsis
bodyText = bodyText.replace(/\\'/g, "'"); // RTF apostrophe (generic)

// Step 5: Convert RTF line breaks to newlines
bodyText = bodyText.replace(/\\par\s*/gi, '\n');
bodyText = bodyText.replace(/\\\s*\n\s*/g, '\n');

// Step 6: Remove frontmatter blocks (handle both normal and RTF-escaped versions)
// Normal frontmatter: --- ... --- (with proper newlines)
bodyText = bodyText.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/gm, '');
// Frontmatter without proper newlines (single line or escaped)
bodyText = bodyText.replace(/^---[\s\S]*?^---\s*/gm, '');
// RTF-escaped frontmatter: ---\ ... ---\
bodyText = bodyText.replace(/---\\[\s\S]*?---\\/g, '');
// Also handle frontmatter that might have escaped newlines or be on single lines
bodyText = bodyText.replace(/---[\\\s]*title:[\s\S]*?---[\\\s]*/gi, '');
// Remove any remaining frontmatter-like content at the start
bodyText = bodyText.replace(/^---.*?---/s, '');

// Step 7: Remove any remaining standalone backslashes (but preserve markdown)
// Only remove backslashes that aren't part of markdown syntax
bodyText = bodyText.replace(/\\(?![!*_`\[\]()#-])/g, '');

// Step 8: Clean up whitespace while preserving paragraph structure
bodyText = bodyText.replace(/[ \t]+/g, ' '); // Collapse spaces/tabs to single space
bodyText = bodyText.replace(/\n{3,}/g, '\n\n'); // Max 2 consecutive newlines
bodyText = bodyText.trim();

// Step 9: If body still looks like it starts with frontmatter, extract and remove it
const frontmatterMatch = bodyText.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
if (frontmatterMatch) {
  bodyText = bodyText.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');
}

// Helper function to normalize strings for comparison
// Removes all punctuation, normalizes whitespace, converts to lowercase
const normalizeForComparison = (str) => {
  return str
    .toLowerCase()
    .trim()
    .replace(/['"'"''""]/g, "'") // Normalize all quote types to standard apostrophe
    .replace(/[^\w\s]/g, '') // Remove all punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
};

const titleNormalized = normalizeForComparison(post.title);

// Split into lines for line-by-line processing
const lines = bodyText.split('\n');
const filteredLines = [];

for (let i = 0; i < lines.length; i++) {
  const originalLine = lines[i];
  const trimmedLine = originalLine.trim();
  
  // Skip empty lines (preserve them for paragraph structure)
  if (!trimmedLine) {
    filteredLines.push(originalLine);
    continue;
  }
  
  // Check if this line is a heading that matches the title
  const headingMatch = trimmedLine.match(/^(#+)\s*(.+)$/);
  if (headingMatch) {
    const headingContent = headingMatch[2].trim();
    const headingNormalized = normalizeForComparison(headingContent);
    
    // Skip if heading matches title (normalized comparison)
    if (headingNormalized === titleNormalized) {
      continue; // Skip this heading line
    }
  }
  
  // Check if this is a standalone line that matches the title
  const lineNormalized = normalizeForComparison(trimmedLine);
  if (lineNormalized === titleNormalized) {
    continue; // Skip this line
  }
  
  // Keep the line
  filteredLines.push(originalLine);
}

bodyText = filteredLines.join('\n');

// Clean up any triple+ newlines, but keep double newlines (paragraph breaks)
bodyText = bodyText.replace(/\n{4,}/g, '\n\n\n').trim();

// Remove image markdown if it matches the post.image metadata
if (post.image) {
  const imageSlug = post.image.replace(/^\/images\//, '').replace(/\.(jpg|jpeg|png|webp)$/i, '');
  const imagePattern = new RegExp(`^!\\[([^\\]]*)\\]\\([^\\)]*${imageSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\)]*\\)\\s*\\n?`, 'im');
  bodyText = bodyText.replace(imagePattern, '');
}

// Parse markdown into blocks
const markdownLines = bodyText.split('\n');
const blocks = [];
let currentParagraph = [];
let currentList = [];
let inBlockquote = false;
let inList = false;

// Reuse the same normalization function for consistency
const titleNormalizedForParsing = normalizeForComparison(post.title);

const flushParagraph = () => {
  if (currentParagraph.length > 0) {
    const text = currentParagraph.join(' ').trim();
    if (text) {
      blocks.push({ type: 'paragraph', content: text });
    }
    currentParagraph = [];
  }
};

const flushBlockquote = () => {
  if (inBlockquote && currentParagraph.length > 0) {
    const text = currentParagraph.join(' ').trim();
    if (text) {
      blocks.push({ type: 'blockquote', content: text });
    }
    currentParagraph = [];
    inBlockquote = false;
  }
};

const flushList = () => {
  if (currentList.length > 0) {
    blocks.push({ type: 'ul', items: [...currentList] });
    currentList = [];
  }
};

for (let i = 0; i < markdownLines.length; i++) {
  const originalLine = markdownLines[i];
  const line = originalLine.trim();
  
  // Empty line - this creates paragraph breaks
  if (!line) {
    flushParagraph();
    flushBlockquote();
    flushList();
    inList = false;
    continue;
  }

  // Heading - check for any heading level
  if (line.match(/^#+\s+/)) {
    flushParagraph();
    flushBlockquote();
    flushList();
    const headingContent = line.replace(/^#+\s+/, '').trim();
    
    // Use the same normalization for comparison
    const headingNormalized = normalizeForComparison(headingContent);
    
    // Skip if heading matches title
    if (headingNormalized === titleNormalizedForParsing) {
      continue;
    }
    
    // Determine heading level
    const levelMatch = line.match(/^(#+)/);
    const level = levelMatch ? levelMatch[1].length : 1;
    
    if (level === 1) {
      blocks.push({ type: 'h1', content: headingContent });
    } else if (level === 2) {
      blocks.push({ type: 'h2', content: headingContent });
    } else {
      blocks.push({ type: 'h3', content: headingContent });
    }
    continue;
  }

  // Blockquote
  if (line.startsWith('> ')) {
    flushParagraph();
    flushList();
    if (!inBlockquote) {
      flushBlockquote();
      inBlockquote = true;
    }
    currentParagraph.push(line.substring(2).trim());
    continue;
  } else if (inBlockquote) {
    flushBlockquote();
  }

  // Horizontal rule
  if (line === '---' || line === '***') {
    flushParagraph();
    flushBlockquote();
    flushList();
    blocks.push({ type: 'hr' });
    continue;
  }

  // Image markdown: ![alt](path)
  const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
  if (imageMatch) {
    flushParagraph();
    flushBlockquote();
    flushList();
    const [, alt, imagePath] = imageMatch;
    // Convert relative paths to absolute
    const fullImagePath = imagePath.startsWith('../images/') 
      ? imagePath.replace('../images/', '/images/')
      : imagePath.startsWith('images/')
      ? `/${imagePath}`
      : imagePath;
    
    // Skip if this image matches the post.image from metadata (avoid duplication)
    // Normalize both paths for comparison - extract just the filename/slug
    const extractSlug = (path) => {
      return path.split('/').pop().replace(/\.(jpg|jpeg|png|webp)$/i, '').toLowerCase();
    };
    const bodyImageSlug = extractSlug(fullImagePath);
    const postImageSlug = post.image ? extractSlug(post.image) : '';
    if (bodyImageSlug === postImageSlug && postImageSlug) {
      continue; // Skip this image, it's already shown at top
    }
    
    blocks.push({ type: 'image', alt, src: fullImagePath });
    continue;
  }

  // List item
  if (line.match(/^[-*]\s+/)) {
    flushParagraph();
    flushBlockquote();
    if (!inList) {
      flushList();
      inList = true;
    }
    const content = line.replace(/^[-*]\s+/, '');
    currentList.push(content);
    continue;
  } else if (line.match(/^\d+\.\s+/)) {
    flushParagraph();
    flushBlockquote();
    if (!inList) {
      flushList();
      inList = true;
    }
    const content = line.replace(/^\d+\.\s+/, '');
    currentList.push(content);
    continue;
  } else if (inList) {
    flushList();
    inList = false;
  }

  // Regular paragraph - skip if it's just the title
  const lineNormalized = normalizeForComparison(line);
  
  // Skip if line matches title
  if (lineNormalized === titleNormalizedForParsing) {
    continue; // Skip title lines
  }
  // Use original line to preserve spacing
  currentParagraph.push(originalLine.trim());
}

flushParagraph();
flushBlockquote();
flushList();

// Helper function to process inline markdown (bold, italic, links)
// Uses a simple recursive approach to handle nested markdown
const processInlineMarkdown = (text) => {
  if (!text || typeof text !== 'string') return text;
  
  // Simple regex-based replacement approach
  // Process links first (they can contain other markdown)
  let processed = text;
  const parts = [];
  let lastIndex = 0;
  let keyCounter = 0;
  
  // Find all markdown patterns with their positions
  const patterns = [];
  
  // Find links [text](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let linkMatch;
  while ((linkMatch = linkRegex.exec(text)) !== null) {
    patterns.push({
      type: 'link',
      start: linkMatch.index,
      end: linkMatch.index + linkMatch[0].length,
      text: linkMatch[1],
      url: linkMatch[2]
    });
  }
  
  // Find bold **text** or __text__
  const boldRegex = /(\*\*|__)(.+?)\1/g;
  let boldMatch;
  while ((boldMatch = boldRegex.exec(text)) !== null) {
    // Skip if this bold is inside a link
    const isInsideLink = patterns.some(p => p.type === 'link' && boldMatch.index > p.start && boldMatch.index < p.end);
    if (!isInsideLink) {
      patterns.push({
        type: 'bold',
        start: boldMatch.index,
        end: boldMatch.index + boldMatch[0].length,
        content: boldMatch[2]
      });
    }
  }
  
  // Find italic *text* or _text_ (but not **text** or __text__)
  const italicRegex = /(?<!\*)\*(?!\*)([^*\n]+?)(?<!\*)\*(?!\*)|(?<!_)_(?!_)([^_\n]+?)(?<!_)_(?!_)/g;
  let italicMatch;
  while ((italicMatch = italicRegex.exec(text)) !== null) {
    // Skip if this italic is inside a link or bold
    const isInsideOther = patterns.some(p => italicMatch.index > p.start && italicMatch.index < p.end);
    if (!isInsideOther) {
      patterns.push({
        type: 'italic',
        start: italicMatch.index,
        end: italicMatch.index + italicMatch[0].length,
        content: italicMatch[1] || italicMatch[2]
      });
    }
  }
  
  // Sort patterns by start position
  patterns.sort((a, b) => a.start - b.start);
  
  // Remove overlapping patterns (keep the first one)
  const nonOverlapping = [];
  for (let i = 0; i < patterns.length; i++) {
    const current = patterns[i];
    const overlaps = nonOverlapping.some(p => 
      (current.start >= p.start && current.start < p.end) ||
      (current.end > p.start && current.end <= p.end) ||
      (current.start <= p.start && current.end >= p.end)
    );
    if (!overlaps) {
      nonOverlapping.push(current);
    }
  }
  
  // Build React elements from non-overlapping patterns
  const result = [];
  let currentIndex = 0;
  
  nonOverlapping.forEach((pattern, idx) => {
    // Add text before this pattern
    if (pattern.start > currentIndex) {
      const beforeText = text.substring(currentIndex, pattern.start);
      if (beforeText) {
        result.push(beforeText);
      }
    }
    
    // Add the pattern as a React element
    if (pattern.type === 'link') {
      result.push(
        <a key={`link-${keyCounter++}`} href={pattern.url} className="text-[#DB0812] hover:text-[#b30610] underline" target="_blank" rel="noopener noreferrer">
          {pattern.text}
        </a>
      );
    } else if (pattern.type === 'bold') {
      result.push(<strong key={`bold-${keyCounter++}`}>{pattern.content}</strong>);
    } else if (pattern.type === 'italic') {
      result.push(<em key={`italic-${keyCounter++}`}>{pattern.content}</em>);
    }
    
    currentIndex = pattern.end;
  });
  
  // Add remaining text
  if (currentIndex < text.length) {
    const remainingText = text.substring(currentIndex);
    if (remainingText) {
      result.push(remainingText);
    }
  }
  
  // Return single element if only one, array if multiple, or original text if none
  if (result.length === 0) {
    return text;
  } else if (result.length === 1) {
    return result[0];
  } else {
    return result;
  }
};

// Render blocks
return blocks.map((block, index) => {
  switch (block.type) {
    case 'h1':
      // Skip if heading matches the title (already shown at top)
      const h1Content = block.content.trim();
      const h1Normalized = normalizeForComparison(h1Content);
      
      // Skip if heading matches title
      if (h1Normalized === titleNormalizedForParsing) {
        return null;
      }
      return (
        <div key={index} className="flex items-center mb-4 sm:mb-6 mt-8">
          <div className="w-1 h-10 sm:h-12 md:h-14 bg-[#DB0812] mr-4 sm:mr-6"></div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-[#1A1A1A] font-serif tracking-tight">{h1Content}</h1>
        </div>
      );
    case 'h2':
      return (
        <div key={index} className="flex items-center mb-3 sm:mb-4 mt-6">
          <div className="w-1 h-8 sm:h-10 md:h-12 bg-[#DB0812] mr-4 sm:mr-6"></div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] font-serif tracking-tight">{block.content}</h2>
        </div>
      );
    case 'h3':
      return <h3 key={index} className="text-xl sm:text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-2 sm:mb-3 mt-4 font-serif tracking-tight">{block.content}</h3>;
    case 'blockquote':
      return (
        <blockquote key={index} className="border-l-[6px] border-[#DB0812] pl-6 sm:pl-8 py-4 my-6 sm:my-8 bg-[#FAFAF9]">
          <p className="text-xl sm:text-2xl md:text-3xl italic text-[#1A1A1A] leading-tight font-serif">
            "{block.content}"
          </p>
        </blockquote>
      );
    case 'hr':
      return <hr key={index} className="my-8 sm:my-10 border-[#1A1A1A]/10" />;
    case 'image':
      return (
        <div key={index} className="my-8 sm:my-10 flex justify-center py-6 bg-[#FAFAF9]">
          <OptimizedImage
            src={block.src}
            alt={block.alt || post.title}
            className="max-w-2xl w-full h-auto object-contain"
          />
        </div>
      );
    case 'ul':
      return (
        <ul key={index} className="list-disc mb-3 sm:mb-4 space-y-3 pl-6 sm:pl-8 marker:text-[#DB0812]">
          {block.items.map((item, itemIndex) => {
            const processedItem = processInlineMarkdown(item);
            return (
              <li key={itemIndex} className="text-base sm:text-lg leading-normal text-[#1A1A1A] marker:text-[#DB0812]">
                {processedItem}
              </li>
            );
          })}
        </ul>
      );
    case 'paragraph':
      // Skip if paragraph matches the title (case-insensitive)
      let paraContent = block.content.trim();
      if (!paraContent) {
        return null;
      }
      
      const paraNormalized = normalizeForComparison(paraContent);
      
      // Skip if paragraph matches title
      if (paraNormalized === titleNormalizedForParsing) {
        return null;
      }
      
      const processedContent = processInlineMarkdown(paraContent);
      
      return (
        <p key={index} className="text-base sm:text-lg leading-normal text-[#1A1A1A] mb-3 sm:mb-4 text-pretty">
          {processedContent}
        </p>
      );
    default:
      return null;
  }
}).filter(Boolean);
}

export default function JournalMarkdownBody({ post }) {
  if (!post?.body) return null;
  const blocks = renderMarkdownBlocks(post);
  return <>{blocks}</>;
}
