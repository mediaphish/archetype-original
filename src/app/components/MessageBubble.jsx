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

export default function MessageBubble({ message, isUser = false, showButtons = false, buttonOptions = [], onButtonClick, showContactForm = false, onContactSuccess }) {
  const renderedMessage = isUser ? message : parseMarkdown(message);
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6 px-2`}>
      <div className={`max-w-[60%] ${isUser ? 'text-right' : 'text-left'}`}>
        <div className={`flex ${isUser ? 'flex-row-reverse' : 'flex-row'} gap-3`}>
          {!isUser && (
            <OptimizedImage
              src="/images/archy-avatar.png"
              alt="Archy"
              className="w-10 h-10 rounded-full flex-shrink-0 object-cover border-0"
              width={40}
              height={40}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          )}
          <div className={`px-4 py-3 rounded-2xl ${isUser 
            ? 'bg-amber text-white rounded-br-md' 
            : 'bg-warm-offWhiteAlt text-warm-charcoal rounded-bl-md border border-warm-border'
          }`}>
            {isUser ? (
              <p className="text-base sm:text-lg whitespace-pre-wrap leading-relaxed" style={{ lineHeight: '1.6' }}>
                {message}
              </p>
            ) : (
              <div 
                className="text-base sm:text-lg leading-relaxed" 
                style={{ lineHeight: '1.6' }}
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
                className={`block w-full px-4 py-2 text-base border border-warm-border bg-warm-offWhite text-warm-charcoal hover:bg-warm-offWhiteAlt hover:border-amber transition-all duration-300 rounded-lg min-h-[44px] focus:outline-none focus:ring-2 focus:ring-amber focus:ring-offset-2 ${
                  isUser ? 'text-right' : 'text-left'
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
