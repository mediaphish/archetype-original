import React from 'react';
import InlineContactForm from './InlineContactForm.jsx';
import { OptimizedImage } from '../../components/OptimizedImage';

// Simple markdown parser for basic formatting
function parseMarkdown(text) {
  if (!text) return '';
  
  // Split into lines for list processing
  const lines = text.split('\n');
  const processedLines = [];
  let inList = false;
  let listType = null; // 'ol' or 'ul'
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check for numbered list (1. item)
    const numberedMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (numberedMatch) {
      if (!inList || listType !== 'ol') {
        if (inList) processedLines.push(`</${listType}>`);
        processedLines.push('<ol>');
        inList = true;
        listType = 'ol';
      }
      processedLines.push(`<li>${numberedMatch[2]}</li>`);
      continue;
    }
    
    // Check for bullet list (- item or • item)
    const bulletMatch = line.match(/^[-•]\s+(.+)$/);
    if (bulletMatch) {
      if (!inList || listType !== 'ul') {
        if (inList) processedLines.push(`</${listType}>`);
        processedLines.push('<ul>');
        inList = true;
        listType = 'ul';
      }
      processedLines.push(`<li>${bulletMatch[1]}</li>`);
      continue;
    }
    
    // Not a list item - close any open list
    if (inList) {
      processedLines.push(`</${listType}>`);
      inList = false;
      listType = null;
    }
    
    // Process regular line
    if (line.trim()) {
      processedLines.push(line);
    } else {
      processedLines.push('<br>');
    }
  }
  
  // Close any remaining list
  if (inList) {
    processedLines.push(`</${listType}>`);
  }
  
  // Join lines
  let html = processedLines.join('\n');
  
  // Escape HTML to prevent XSS (but we'll restore our safe tags)
  // First, mark our safe tags with placeholders
  html = html
    .replace(/<ol>/g, '___OL_START___')
    .replace(/<\/ol>/g, '___OL_END___')
    .replace(/<ul>/g, '___UL_START___')
    .replace(/<\/ul>/g, '___UL_END___')
    .replace(/<li>/g, '___LI_START___')
    .replace(/<\/li>/g, '___LI_END___')
    .replace(/<br>/g, '___BR___');
  
  // Now escape all HTML
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Restore our safe tags
  html = html
    .replace(/___OL_START___/g, '<ol>')
    .replace(/___OL_END___/g, '</ol>')
    .replace(/___UL_START___/g, '<ul>')
    .replace(/___UL_END___/g, '</ul>')
    .replace(/___LI_START___/g, '<li>')
    .replace(/___LI_END___/g, '</li>')
    .replace(/___BR___/g, '<br>');
  
  // Convert markdown bold **text** to <strong> first
  html = html.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
  
  // Convert markdown italic *text* to <em> (after bold, so remaining * are italic)
  html = html.replace(/\*([^*\n]+?)\*/g, '<em>$1</em>');
  
  // Convert remaining line breaks to <br>
  html = html.replace(/\n/g, '<br>');
  
  return html;
}

export default function MessageBubble({
  message,
  isUser = false,
  showButtons = false,
  buttonOptions = [],
  onButtonClick,
  showContactForm = false,
  onContactSuccess,
  drawerVariant = 'default',
  assistantAvatarSrc,
}) {
  const renderedMessage = isUser ? message : parseMarkdown(message);
  const isDrawer = drawerVariant === 'marketing' || drawerVariant === 'remaining-human';
  const isRh = drawerVariant === 'remaining-human';
  const avatar = assistantAvatarSrc || '/images/archy-avatar.png';

  const bubbleUser = isDrawer
    ? isRh
      ? 'max-w-[240px] rounded-[2px] bg-[#8EE4D8] text-[#03211F] border-transparent'
      : 'max-w-[240px] rounded-[2px] bg-ao-dark text-white border-transparent'
    : 'max-w-[min(92vw,36rem)] rounded-2xl rounded-br-md bg-ao-red text-white';

  const bubbleAssistant = isDrawer
    ? isRh
      ? 'max-w-[260px] rounded-[2px] border border-[#95DACE]/15 bg-[#0F2E2C] text-[#E7F1EE]'
      : 'max-w-[260px] rounded-[2px] border border-[rgba(26,26,26,0.06)] bg-[#FAFAF9] text-[#1A1A1A]'
    : 'flex-1 rounded-2xl rounded-bl-md border border-warm-border bg-white text-warm-charcoal';

  const avatarClass = isDrawer
    ? isRh
      ? 'h-7 w-7 shrink-0 rounded-[2px] border border-[#95DACE]/20 object-cover mt-0.5'
      : 'h-7 w-7 shrink-0 rounded-[2px] border border-[rgba(26,26,26,0.1)] object-cover mt-0.5'
    : 'w-8 h-8 sm:w-10 sm:h-10 rounded-full flex-shrink-0 object-cover border-0 mt-0.5';

  const bodyText = isDrawer
    ? 'text-sm leading-[1.7] break-words [&_a]:break-all'
    : 'text-base sm:text-lg leading-relaxed break-words [&_a]:break-all';

  const rowGap = isDrawer ? 'gap-2.5' : 'gap-2 sm:gap-3';
  const rowAnim = isDrawer ? 'archy-msg-in' : '';

  return (
    <div
      className={`flex w-full min-w-0 ${isUser ? 'justify-end' : 'justify-start'} ${isDrawer ? 'mb-4 px-0' : 'mb-6 px-1 sm:px-2'}`}
    >
      <div
        className={
          isUser
            ? isDrawer
              ? 'w-fit max-w-[min(92%,17rem)] text-right'
              : 'w-fit max-w-[min(92%,36rem)] text-right'
            : 'w-full max-w-[min(100%,36rem)] sm:max-w-[min(92%,36rem)] text-left'
        }
      >
        <div
          className={`flex items-start ${rowGap} ${rowAnim} ${isUser ? 'flex-row-reverse w-fit max-w-full' : 'flex-row w-full'}`}
        >
          {!isUser && (
            <OptimizedImage
              src={avatar}
              alt="Archy"
              className={avatarClass}
              width={isDrawer ? 28 : 40}
              height={isDrawer ? 28 : 40}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          )}
          <div
            className={`min-w-0 break-words px-4 py-3 ${isDrawer ? '' : 'rounded-2xl'} ${isUser ? bubbleUser : `${bubbleAssistant} ${!isDrawer ? 'flex-1' : ''}`}`}
          >
            {isUser ? (
              <p className={`${bodyText} whitespace-pre-wrap`} style={isDrawer ? { lineHeight: 1.7 } : { lineHeight: '1.6' }}>
                {message}
              </p>
            ) : (
              <div
                className={bodyText}
                style={isDrawer ? { lineHeight: 1.7 } : { lineHeight: '1.6' }}
                dangerouslySetInnerHTML={{ __html: renderedMessage }}
              />
            )}
          </div>
        </div>

        {showContactForm && !isUser && (
          <div className="mt-3">
            <InlineContactForm onSuccess={onContactSuccess} />
          </div>
        )}

        {showButtons && buttonOptions && buttonOptions.length > 0 && (
          <div className={`mt-3 space-y-2 ${isUser ? 'text-right' : 'text-left'}`}>
            {buttonOptions.map((option, index) => (
              <button
                key={index}
                onClick={() => onButtonClick(option.value)}
                className={`block min-h-[44px] w-full border px-4 py-2 text-base transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ao-red focus:ring-offset-2 ${
                  isDrawer
                    ? isRh
                      ? 'rounded-[2px] border-[#9ADBD2]/35 bg-[#061312] text-left text-[#E7F1EE] hover:border-[#9ADBD2]/55 hover:bg-[#0A2422]'
                      : 'rounded-[2px] border-[rgba(26,26,26,0.14)] bg-white text-left text-[#1A1A1A] hover:bg-ao-cream hover:border-[rgba(26,26,26,0.22)]'
                    : `rounded-lg border-warm-border bg-warm-offWhite text-warm-charcoal hover:border-ao-red/40 hover:bg-ao-cream/40 ${isUser ? 'text-right' : 'text-left'}`
                }`}
                aria-label={option.text}
              >
                {option.text}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
