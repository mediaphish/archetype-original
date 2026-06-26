/**
 * AutoV2Panel — Conversation-first UI for Auto V2
 *
 * V3: artifact tags [ARTIFACT]...[/ARTIFACT], API messages as source of truth,
 * paperclip attachments (filename + text extraction for plain text), thread list
 * with resume / new conversation.
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';

import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import EpisodeDraftReview from './EpisodeDraftReview.jsx';

// ─── Artifact parsing ─────────────────────────────────────────────────────────

function parseArtifact(text) {
  if (!text) return { artifact: null, cleanText: text };

  const tagPattern = /\[ARTIFACT([^\]]*)\]([\s\S]*?)\[\/ARTIFACT\]/i;
  const match = text.match(tagPattern);

  if (!match) return { artifact: null, cleanText: text };

  const attrString = match[1] || '';
  const content = match[2]?.trim() || '';

  const typeMatch = attrString.match(/type="([^"]+)"/i);
  const labelMatch = attrString.match(/label="([^"]+)"/i);

  const artifact = {
    type: typeMatch?.[1] || 'draft',
    label: labelMatch?.[1] || 'Artifact',
    content,
  };

  const cleanText = text.replace(tagPattern, '').trim();
  return { artifact, cleanText };
}

function extractGeneratedImagesFromAssistantContent(content) {
  const m = String(content || '').match(/\[IMAGES_GENERATED\]([\s\S]*?)\[\/IMAGES_GENERATED\]/);
  if (!m) return [];
  return m[1]
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const mm = line.match(/Card (\d+): (.+)/);
      return mm ? { card: parseInt(mm[1], 10), url: mm[2].trim() } : null;
    })
    .filter(Boolean);
}

function parseImageGeneratedAttributes(attrString) {
  const attrs = {};
  const pattern = /(\w+)="([^"]*)"/g;
  let match;
  while ((match = pattern.exec(attrString)) !== null) {
    attrs[match[1]] = match[2];
  }
  return attrs;
}

function extractDesignImagesFromAssistantContent(content) {
  const text = String(content || '');
  const pattern = /\[IMAGE_GENERATED([^\]]*)\]/gi;
  const results = [];
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const attrs = parseImageGeneratedAttributes(match[1]);
    if (attrs.url) {
      results.push({
        label: attrs.label || 'Generated Image',
        url: attrs.url,
        size: attrs.size || '',
      });
    }
  }
  return results;
}

/**
 * Extracts per-card caption blocks from the artifact content or raw assistant text.
 * Returns a map of card number -> { channelName: captionText }
 * Used to pair captions with generated card images in the artifact panel.
 */
function extractCardCaptionsFromArtifactContent(content) {
  if (!content) return {};
  const text = String(content);
  const result = {};

  // Find all "Card N of M" blocks
  const cardBlocks = text.split(/(?=\*{0,2}Card\s+\d+\s+of\s+\d+)/i);

  for (const block of cardBlocks) {
    const cardNumMatch = block.match(/Card\s+(\d+)\s+of\s+\d+/i);
    if (!cardNumMatch) continue;
    const cardNum = parseInt(cardNumMatch[1], 10);

    const channels = {};
    const channelNames = [
      'LinkedIn Personal',
      'LinkedIn Business',
      'Instagram Business',
      'Facebook Business',
      'X',
      'Facebook Personal',
      'Instagram Personal',
    ];

    for (let i = 0; i < channelNames.length; i++) {
      const name = channelNames[i];
      const nextName = channelNames[i + 1];
      const startPattern = new RegExp(
        `\\*{0,2}${name.replace(/[()]/g, '\\$&')}\\*{0,2}\\s*\\n([\\s\\S]*?)`,
        'i'
      );
      const endPattern = nextName
        ? new RegExp(`\\*{0,2}${nextName.replace(/[()]/g, '\\$&')}\\*{0,2}`, 'i')
        : null;

      const startMatch = startPattern.exec(block);
      if (!startMatch) continue;

      const startIdx = startMatch.index + startMatch[0].length - startMatch[1].length;
      const remaining = block.slice(startIdx);

      let captionText;
      if (endPattern) {
        const endMatch = endPattern.exec(remaining);
        captionText = endMatch
          ? remaining.slice(0, endMatch.index).trim()
          : remaining.trim();
      } else {
        captionText = remaining.trim();
      }

      if (captionText) {
        channels[name] = captionText
          .replace(/^---+\s*/m, '')
          .replace(/\s*---+$/m, '')
          .trim();
      }
    }

    if (Object.keys(channels).length > 0) {
      result[cardNum] = channels;
    }
  }

  return result;
}

function extractJournalPublishFromAssistantContent(content) {
  const text = String(content || '');
  const tagMatch = text.match(/\[PUBLISH_JOURNAL([^\]]*)\]/i);
  if (!tagMatch) return null;

  const attrs = parseImageGeneratedAttributes(tagMatch[1]);
  const contentMatch = text.match(/\[JOURNAL_CONTENT\]([\s\S]*?)\[\/JOURNAL_CONTENT\]/i);
  const journalContent = contentMatch ? contentMatch[1].trim() : '';

  if (!attrs.slug || !attrs.title || !journalContent) return null;

  return { attrs, journalContent };
}

function extractDevotionalPublishFromAssistantContent(content) {
  const text = String(content || '');
  const tagMatch = text.match(/\[PUBLISH_DEVOTIONAL([^\]]*)\]/i);
  if (!tagMatch) return null;

  const attrs = parseImageGeneratedAttributes(tagMatch[1]);
  const contentMatch = text.match(/\[DEVOTIONAL_CONTENT\]([\s\S]*?)\[\/DEVOTIONAL_CONTENT\]/i);
  const devotionalContent = contentMatch ? contentMatch[1].trim() : '';

  if (!attrs.slug || !attrs.title || !devotionalContent) return null;

  return { attrs, devotionalContent };
}

function extractEpisodeTranscriptBlock(content) {
  const text = String(content || '');
  const match = text.match(/\[EPISODE_TRANSCRIPT\]([\s\S]*?)\[\/EPISODE_TRANSCRIPT\]/i);
  return match ? match[1].trim() : '';
}

function extractEpisodeProcessSignal(content) {
  const text = String(content || '');
  const tagMatch = text.match(/\[EPISODE_PROCESS([^\]]*)\]/i);
  if (!tagMatch) return null;
  return parseImageGeneratedAttributes(tagMatch[1]);
}

function stripGeneratedImageBlocksFromChat(text) {
  return String(text || '')
    .replace(/\[IMAGES_GENERATED\][\s\S]*?\[\/IMAGES_GENERATED\]/g, '')
    .replace(/\[DALLE_GENERATE[^\]]*\]/gi, '')
    .replace(/\[IMAGE_GENERATED[^\]]*\]/gi, '')
    .replace(/\[PUBLISH_JOURNAL[^\]]*\]/gi, '')
    .replace(/\[JOURNAL_CONTENT\][\s\S]*?\[\/JOURNAL_CONTENT\]/gi, '')
    .replace(/\[PUBLISH_DEVOTIONAL[^\]]*\]/gi, '')
    .replace(/\[DEVOTIONAL_CONTENT\][\s\S]*?\[\/DEVOTIONAL_CONTENT\]/gi, '')
    .replace(/\[EPISODE_PROCESS[^\]]*\]/gi, '')
    .replace(/\[EPISODE_TRANSCRIPT\][\s\S]*?\[\/EPISODE_TRANSCRIPT\]/gi, '')
    .replace(/\[EPISODE_DRAFT[^\]]*\]/gi, '')
    .replace(/\[CARD[\s\S]*?\[\/CARD\]/gi, '')
    .replace(/\[LINE[^\]]*\][\s\S]*?\[\/LINE\]/gi, '')
    .trim();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatImageAddedTime(timestampMs) {
  if (timestampMs == null || !Number.isFinite(timestampMs)) return '';
  try {
    return new Date(timestampMs).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

function formatRelativeDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor((now - d) / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function downloadTranscriptAsMd(messages, threadId) {
  if (!Array.isArray(messages) || messages.length === 0) return;

  const visibleMessages = messages.filter(
    (m) => m.role === 'user' || m.role === 'assistant'
  );

  if (visibleMessages.length === 0) return;

  const dateStr = new Date().toISOString().split('T')[0];
  const lines = [`# Auto Transcript — ${dateStr}\n`];

  for (const msg of visibleMessages) {
    const role = msg.role === 'user' ? '**Bart**' : '**Auto**';
    const raw = String(msg.content || '');
    // Strip internal tags that are not useful in a transcript
    const clean = raw
      .replace(/\[IMAGES_GENERATED\][\s\S]*?\[\/IMAGES_GENERATED\]/g, '[Images generated]')
      .replace(/\[IMAGE_GENERATED[^\]]*\]/gi, '[Image generated]')
      .replace(/\[DALLE_GENERATE[^\]]*\]/gi, '')
      .replace(/\[PUBLISH_JOURNAL[^\]]*\]/gi, '[Journal publish signal]')
      .replace(/\[JOURNAL_CONTENT\][\s\S]*?\[\/JOURNAL_CONTENT\]/gi, '')
      .replace(/\[PUBLISH_DEVOTIONAL[^\]]*\]/gi, '[Devotional publish signal]')
      .replace(/\[DEVOTIONAL_CONTENT\][\s\S]*?\[\/DEVOTIONAL_CONTENT\]/gi, '')
      .replace(/\[EPISODE_PROCESS[^\]]*\]/gi, '')
      .replace(/\[EPISODE_TRANSCRIPT\][\s\S]*?\[\/EPISODE_TRANSCRIPT\]/gi, '')
      .trim();

    if (!clean) continue;

    lines.push(`${role}\n\n${clean}\n\n---\n`);
  }

  const content = lines.join('\n');
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `auto-transcript-${dateStr}${threadId ? `-${threadId.slice(0, 8)}` : ''}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function threadTitle(thread) {
  if (!thread) return 'Conversation';
  if (thread.title && String(thread.title).trim() && thread.title !== 'Auto') {
    return String(thread.title).slice(0, 80);
  }
  const preview = thread.preview || thread.first_message;
  if (preview) {
    const s = String(preview).slice(0, 52);
    return s.length < String(preview).length ? `${s}…` : s;
  }
  return 'New conversation';
}

function extractContextPill(messages) {
  const list = Array.isArray(messages) ? messages : [];
  if (!list.length) return null;
  const last = [...list].reverse().find((m) => m.role === 'assistant');
  if (!last) return null;
  const raw = String(last.content || '');
  const { artifact: a, cleanText } = parseArtifact(raw);
  if (a?.label && /card/i.test(a.label)) {
    return `Working on: ${a.label}`;
  }
  const text = cleanText || raw;
  const cardMatch = text.match(/[Cc]ard\s+(\d+)\s+(?:of|\/)\s+(\d+)/);
  if (cardMatch) return `Working on: card ${cardMatch[1]} of ${cardMatch[2]}`;
  const partMatch = text.match(/[Pp]art\s+(\d+)/);
  if (partMatch) return `Working on: part ${partMatch[1]}`;
  return null;
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function AOMark({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
      <path d="M16 2C8.268 2 2 8.268 2 16s6.268 14 14 14 14-6.268 14-14S23.732 2 16 2zm0 4a10 10 0 0 1 0 20A10 10 0 0 1 16 6z" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" aria-hidden="true">
      <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function PaperclipIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center bg-gray-100 border border-gray-200">
        <AOMark className="w-3.5 h-3.5 text-gray-500" />
      </div>
      <div className="bg-gray-50 border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex gap-1 items-center h-4">
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  const raw = String(message.content || '');
  const withoutImages = stripGeneratedImageBlocksFromChat(raw);
  const { cleanText } = parseArtifact(withoutImages);
  const text = cleanText || withoutImages;

  if (!text && !message.meta?.image_url) return null;

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div
        className={`
          w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold
          ${isUser ? 'bg-gray-900 text-white' : 'bg-gray-100 border border-gray-200 text-gray-500'}
        `}
        aria-hidden="true"
      >
        {isUser ? 'B' : <AOMark className="w-3.5 h-3.5" />}
      </div>
      <div
        className={`
          max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap
          ${isUser
            ? 'bg-gray-900 text-white rounded-tr-sm'
            : 'bg-gray-50 text-gray-900 border border-gray-200 rounded-tl-sm'
          }
        `}
      >
        {message.meta?.image_url && (
          <img
            src={message.meta.image_url}
            alt=""
            className="rounded-lg mb-2 max-w-full max-h-48 object-contain"
          />
        )}
        {text}
      </div>
    </div>
  );
}

function QuoteCardPreview({ content }) {
  const lines = content.split('\n').filter(Boolean);
  return (
    <div className="bg-black rounded-xl p-5 flex flex-col items-center justify-center min-h-[160px] text-center">
      <div className="text-white text-sm font-medium leading-relaxed mb-4 space-y-0.5">
        {lines.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
      <AOMark className="w-4 h-4 text-white opacity-30" />
    </div>
  );
}

function ListArtifact({ content, label }) {
  return (
    <div className="flex flex-col flex-1 min-h-0 space-y-3">
      <p className="flex-shrink-0 text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <div className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap rounded-xl border border-gray-200 bg-white p-4 text-sm leading-relaxed text-gray-800">
        {content}
      </div>
    </div>
  );
}

function DraftArtifact({ content, label }) {
  return (
    <div className="flex flex-col flex-1 min-h-0 space-y-3">
      <p className="flex-shrink-0 text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <div className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap rounded-xl border border-gray-200 bg-white p-4 text-sm leading-relaxed text-gray-800">
        {content}
      </div>
    </div>
  );
}

const CHANNEL_LABELS = [
  'LinkedIn Personal',
  'LinkedIn Business',
  'Instagram Business',
  'Facebook Business',
  'X',
];

const MANUAL_CHANNEL_LABELS = [
  'Facebook Personal',
  'Instagram Personal',
];

function CardBatchReview({ generatedImages, captionContent, onImageError }) {
  const [expandedCard, setExpandedCard] = useState(null);
  const captionsByCard = useMemo(
    () => extractCardCaptionsFromArtifactContent(captionContent),
    [captionContent]
  );

  const sortedImages = useMemo(
    () => [...(generatedImages || [])].sort((a, b) => a.card - b.card),
    [generatedImages]
  );

  if (sortedImages.length === 0) return null;

  return (
    <div className="flex flex-col min-h-0 flex-1 overflow-y-auto gap-4">
      <p className="flex-shrink-0 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Cards — {sortedImages.length} in batch
      </p>
      {sortedImages.map((img) => {
        const captions = captionsByCard[img.card] || {};
        const hasAnyCaptions = Object.keys(captions).length > 0;
        const isExpanded = expandedCard === img.card;

        return (
          <div
            key={`${img.card}-${img.url}`}
            className="rounded-xl border border-gray-200 overflow-hidden bg-white flex-shrink-0"
          >
            {/* Card image */}
            <div className="bg-black">
              <img
                src={img.url}
                alt={`Card ${img.card}`}
                className="block h-auto w-full"
                onError={() => onImageError?.(img.url)}
              />
            </div>

            {/* Caption toggle */}
            {hasAnyCaptions && (
              <div className="border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setExpandedCard(isExpanded ? null : img.card)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <span>Captions — {Object.keys(captions).filter(k => CHANNEL_LABELS.includes(k)).length} automated + {Object.keys(captions).filter(k => MANUAL_CHANNEL_LABELS.includes(k)).length} manual</span>
                  <svg
                    className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {isExpanded && (
                  <div className="px-3 pb-3 space-y-3 border-t border-gray-100">
                    {/* Automated channels */}
                    {CHANNEL_LABELS.filter(ch => captions[ch]).map((channel) => (
                      <div key={channel} className="pt-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">
                          {channel}
                        </p>
                        <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                          {captions[channel]}
                        </p>
                      </div>
                    ))}

                    {/* Manual channels */}
                    {MANUAL_CHANNEL_LABELS.filter(ch => captions[ch]).length > 0 && (
                      <div className="pt-2 border-t border-dashed border-gray-200">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-2">
                          Manual copy — paste yourself
                        </p>
                        {MANUAL_CHANNEL_LABELS.filter(ch => captions[ch]).map((channel) => (
                          <div key={channel} className="pt-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">
                              {channel}
                            </p>
                            <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                              {captions[channel]}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ArtifactPanel({
  artifact,
  generatedImages,
  generatedDesignImages,
  journalPublishBanner,
  devotionalPublishBanner,
  episodeDraft,
  episodeProcessBanner,
  onEpisodeDraftUpdated,
  onEpisodePublished,
  onApprove,
  onRevise,
  onViewAll,
  onClose,
  onClearGenerated,
  onGeneratedImageError,
  onGeneratedDesignImageError,
  currentCardIndex,
  onCardIndexChange,
  cardReviewMode,
  onCardReviewModeChange,
  seedManifestTotal,
}) {
  const hasCards = generatedImages?.length > 0;
  const hasDesign = generatedDesignImages?.length > 0;
  const hasAnyGenerated = hasCards || hasDesign;
  return (
    <div className="flex h-full min-h-0 min-w-0 w-full flex-shrink-0 flex-col border-l border-gray-200 bg-gray-50">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide truncate pr-2">
          {hasCards && (artifact?.type === 'captions' || artifact?.type === 'list')
            ? `Cards + Captions — ${generatedImages.length} in batch`
            : hasCards
            ? `Card ${(currentCardIndex ?? 0) + 1} of ${seedManifestTotal ?? generatedImages.length}`
            : artifact?.label || (hasDesign ? 'Generated images' : 'Artifact')}
        </span>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={onClearGenerated}
            disabled={!hasAnyGenerated}
            className="text-xs font-medium text-gray-600 px-2 py-1 rounded-md hover:bg-gray-200/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            aria-label="Clear generated cards and images"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
            aria-label="Close artifact panel"
          >
            <CloseIcon />
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4">
        {journalPublishBanner?.status === 'loading' && (
          <div className="shrink-0 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            Publishing journal entry…
          </div>
        )}
        {journalPublishBanner?.status === 'success' && (
          <div className="shrink-0 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
            <p className="font-medium">
              Published: {journalPublishBanner.title}
            </p>
            {journalPublishBanner.journalUrl ? (
              <a
                href={journalPublishBanner.journalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-green-800 underline hover:text-green-950"
              >
                {journalPublishBanner.journalUrl}
              </a>
            ) : null}
          </div>
        )}
        {journalPublishBanner?.status === 'error' && (
          <div className="shrink-0 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            <p className="font-medium">Publish failed</p>
            <p className="mt-1">{journalPublishBanner.message}</p>
          </div>
        )}
        {devotionalPublishBanner?.status === 'loading' && (
          <div className="shrink-0 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            Publishing devotional…
          </div>
        )}
        {devotionalPublishBanner?.status === 'success' && (
          <div className="shrink-0 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
            <p className="font-medium">
              Devotional published: {devotionalPublishBanner.title}
            </p>
            {devotionalPublishBanner.devotionalUrl ? (
              <a
                href={devotionalPublishBanner.devotionalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-green-800 underline hover:text-green-950"
              >
                {devotionalPublishBanner.devotionalUrl}
              </a>
            ) : null}
          </div>
        )}
        {devotionalPublishBanner?.status === 'error' && (
          <div className="shrink-0 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            <p className="font-medium">Devotional publish failed</p>
            <p className="mt-1">{devotionalPublishBanner.message}</p>
          </div>
        )}
        {hasCards && (
          artifact?.type === 'captions' || artifact?.type === 'list' ? (
            <div className="min-h-0 flex-1 overflow-hidden">
              <CardBatchReview
                generatedImages={generatedImages}
                captionContent={artifact.content}
                onImageError={onGeneratedImageError}
              />
            </div>
          ) : (
            <div className="min-h-0 flex-1 flex flex-col gap-3 overflow-hidden">
              {/* Card navigation header */}
              <div className="flex-shrink-0 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Card {(currentCardIndex ?? 0) + 1} of {generatedImages.length}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onCardIndexChange?.(Math.max(0, (currentCardIndex ?? 0) - 1))}
                    disabled={(currentCardIndex ?? 0) === 0}
                    className="px-2 py-1 text-xs text-gray-500 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Previous card"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => onCardIndexChange?.(Math.min(generatedImages.length - 1, (currentCardIndex ?? 0) + 1))}
                    disabled={(currentCardIndex ?? 0) >= generatedImages.length - 1}
                    className="px-2 py-1 text-xs text-gray-500 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Next card"
                  >
                    →
                  </button>
                </div>
              </div>

              {/* Current card display */}
              {(() => {
                const sortedImgs = [...generatedImages].sort((a, b) => a.card - b.card);
                const idx = Math.min(currentCardIndex ?? 0, sortedImgs.length - 1);
                const img = sortedImgs[idx];
                if (!img) return null;
                return (
                  <div className="flex-1 min-h-0 overflow-y-auto">
                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-black">
                      <img
                        src={img.url}
                        alt={`Card ${img.card}`}
                        className="block h-auto w-full"
                        onError={() => onGeneratedImageError?.(img.url)}
                      />
                      <p className="border-t border-gray-800 bg-black/80 py-1.5 text-center text-xs text-gray-400">
                        Card {img.card} {formatImageAddedTime(img.addedAt) ? `· ${formatImageAddedTime(img.addedAt)}` : ''}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          )
        )}

        {hasDesign && (
          <div className={hasCards ? 'min-h-0 flex-1 overflow-y-auto' : 'min-h-0 flex-1 overflow-y-auto'}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Generated Images</p>
            <div className="space-y-3">
              {generatedDesignImages.slice().reverse().map((img) => (
                <div key={img.url} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                  <p className="border-b border-gray-100 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700">
                    {img.label}
                  </p>
                  <img
                    src={img.url}
                    alt={img.label}
                    className="block h-auto w-full"
                    onError={() => onGeneratedDesignImageError?.(img.url)}
                  />
                  {formatImageAddedTime(img.addedAt) ? (
                    <p className="border-t border-gray-100 py-1.5 text-center text-xs text-gray-400">
                      {formatImageAddedTime(img.addedAt)}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}

        {!artifact && !hasAnyGenerated && (
          <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
            <AOMark className="w-8 h-8 text-gray-200 mb-3" />
            <p className="text-xs text-gray-400 leading-relaxed">
              Quote cards, drafts, and content will appear here as you work.
            </p>
          </div>
        )}

        {devotionalPublishBanner?.status === 'error' && (
          <div className="shrink-0 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            <p className="font-medium">Devotional publish failed</p>
            <p className="mt-1">{devotionalPublishBanner.message}</p>
          </div>
        )}

        {episodeProcessBanner?.status === 'loading' && (
          <div className="shrink-0 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            Processing episode transcript…
          </div>
        )}
        {episodeProcessBanner?.status === 'error' && (
          <div className="shrink-0 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            <p className="font-medium">Episode processing failed</p>
            <p className="mt-1">{episodeProcessBanner.message}</p>
          </div>
        )}

        {episodeDraft ? (
          <EpisodeDraftReview
            draft={episodeDraft}
            onDraftUpdated={onEpisodeDraftUpdated}
            onPublished={onEpisodePublished}
          />
        ) : null}

        {!episodeDraft && artifact?.type === 'quote_card' && (
          <>
            {(!generatedImages || generatedImages.length === 0) && (
              <QuoteCardPreview content={artifact.content} />
            )}
            <div className="text-xs space-y-1.5">
              <div className="flex justify-between gap-2">
                <span className="text-gray-400">Status</span>
                <span className="font-medium text-amber-600">Pending approval</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-gray-400">Channels</span>
                <span className="font-medium text-gray-600 text-right">LinkedIn · Facebook · IG</span>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700 leading-relaxed">
              Corpus check: no overlap with previously published cards.
            </div>
            <div className="flex flex-col gap-2">
              <button type="button" onClick={onApprove} className="w-full py-2 px-3 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors">
                Approve &amp; next card
              </button>
              <button type="button" onClick={onRevise} className="w-full py-2 px-3 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                Revise this card
              </button>
              <button type="button" onClick={onViewAll} className="w-full py-2 px-3 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                View all cards
              </button>
            </div>
          </>
        )}

        {artifact?.type === 'list' && (
          <div className="flex flex-col flex-1 min-h-0 gap-3">
            <ListArtifact content={artifact.content} label={artifact.label} />
            <div className="flex shrink-0 flex-col gap-2">
              <button type="button" onClick={onApprove} className="w-full py-2 px-3 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors">
                Approve all
              </button>
              <button type="button" onClick={onRevise} className="w-full py-2 px-3 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                Revise
              </button>
            </div>
          </div>
        )}

        {artifact?.type === 'draft' && (
          <div className="flex flex-col flex-1 min-h-0 gap-3">
            <DraftArtifact content={artifact.content} label={artifact.label} />
            <div className="flex shrink-0 flex-col gap-2">
              <button type="button" onClick={onApprove} className="w-full py-2 px-3 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors">
                Approve
              </button>
              <button type="button" onClick={onRevise} className="w-full py-2 px-3 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                Revise
              </button>
            </div>
          </div>
        )}

        {artifact?.type === 'captions' && (
          <div className="flex flex-col flex-1 min-h-0 gap-3">
            <div className="flex flex-col flex-1 min-h-0 space-y-3">
              <p className="flex-shrink-0 text-xs font-semibold uppercase tracking-wide text-gray-500">{artifact.label}</p>
              <div className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap rounded-xl border border-gray-200 bg-white p-4 text-sm leading-relaxed text-gray-800">
                {artifact.content}
              </div>
            </div>
            <div className="flex-shrink-0 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs leading-relaxed text-blue-700">
              Approve these captions to send the full package to Design.
            </div>
            <div className="flex shrink-0 flex-col gap-2">
              <button type="button" onClick={onApprove} className="w-full py-2 px-3 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors">
                Approve captions — ready for Design
              </button>
              <button type="button" onClick={onRevise} className="w-full py-2 px-3 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                Revise captions
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function threadIsUserArchived(thread) {
  return !!(thread?.state && typeof thread.state === 'object' && thread.state.user_archived === true);
}

function getThreadSortDate(thread) {
  const raw = thread?.updated_at || thread?.last_message_at || thread?.created_at;
  const d = raw ? new Date(raw) : null;
  return d && !Number.isNaN(d.getTime()) ? d : new Date(0);
}

function bucketThreadsByRecency(threads) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(startOfToday);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const pinned = [];
  const today = [];
  const previous7Days = [];
  const older = [];

  for (const thread of threads) {
    if (thread.pinned) {
      pinned.push(thread);
      continue;
    }
    const d = getThreadSortDate(thread);
    if (d >= startOfToday) today.push(thread);
    else if (d >= sevenDaysAgo) previous7Days.push(thread);
    else older.push(thread);
  }

  return { pinned, today, previous7Days, older };
}

function PinIcon({ className = 'w-3 h-3' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16 3v2h2.005a1 1 0 0 1 .117 1.994L18 7v7.5l1.293 1.293a1 1 0 0 1 .083 1.32l-.083.094a1 1 0 0 1-1.32.083L16.415 17H7.586l-1.293 1.293a1 1 0 0 1-1.32.083l-.094-.083a1 1 0 0 1-.083-1.32L5 14.5V7l-.005-.006A1 1 0 0 1 5.117 5H8V3H6a1 1 0 0 1-.117-1.994L6 1h12l.117.006A1 1 0 0 1 18 3h-2z" />
    </svg>
  );
}

function DotsVerticalIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="12" cy="19" r="1.75" />
    </svg>
  );
}

function ThreadSidebar({
  threads,
  archivedThreads,
  activeThreadId,
  onSelectThread,
  onNewThread,
  onRefresh,
  className = '',
  showHeader = true,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showOlder, setShowOlder] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [actionError, setActionError] = useState('');
  const menuRef = useRef(null);
  const renameInputRef = useRef(null);

  useEffect(() => {
    if (!openMenuId) return undefined;
    const onDocClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [openMenuId]);

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  const filterBySearch = useCallback((list) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return (Array.isArray(list) ? list : []).filter((thread) => {
      const title = String(threadTitle(thread) || '').toLowerCase();
      const preview = String(thread.preview || '').toLowerCase();
      return title.includes(q) || preview.includes(q);
    });
  }, [searchQuery]);

  const visibleMain = useMemo(() => filterBySearch(threads), [threads, filterBySearch]);
  const visibleArchived = useMemo(
    () => (showArchived ? filterBySearch(archivedThreads) : []),
    [archivedThreads, showArchived, filterBySearch]
  );

  const { pinned, today, previous7Days, older } = useMemo(
    () => bucketThreadsByRecency(visibleMain),
    [visibleMain]
  );

  const handlePinToggle = async (thread) => {
    setActionError('');
    setOpenMenuId(null);
    const endpoint = thread.pinned ? '/api/ao/auto/thread/unpin' : '/api/ao/auto/thread/pin';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thread_id: thread.id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setActionError(json.error || 'Could not update pin');
        return;
      }
      await onRefresh?.();
    } catch (e) {
      setActionError(e.message || 'Could not update pin');
    }
  };

  const handleArchive = async (thread) => {
    setActionError('');
    setOpenMenuId(null);
    try {
      const res = await fetch('/api/ao/auto/thread/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thread_id: thread.id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setActionError(json.error || 'Could not archive chat');
        return;
      }
      await onRefresh?.();
    } catch (e) {
      setActionError(e.message || 'Could not archive chat');
    }
  };

  const saveRename = async (threadId) => {
    const title = renameValue.trim();
    if (!title) {
      setRenamingId(null);
      return;
    }
    setActionError('');
    try {
      const res = await fetch('/api/ao/auto/thread/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thread_id: threadId, title }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setActionError(json.error || 'Could not rename chat');
        return;
      }
      setRenamingId(null);
      await onRefresh?.();
    } catch (e) {
      setActionError(e.message || 'Could not rename chat');
    }
  };

  const renderThreadRow = (thread) => {
    const isActive = thread.id === activeThreadId;
    const isRenaming = renamingId === thread.id;

    return (
      <div
        key={thread.id}
        className={`group relative flex items-stretch border-l-2 transition-colors ${
          isActive ? 'bg-white border-l-gray-900' : 'border-l-transparent hover:bg-white'
        }`}
      >
        <button
          type="button"
          onClick={() => {
            if (!isRenaming) onSelectThread(thread);
          }}
          className="flex-1 min-w-0 text-left px-4 py-3 pr-10"
        >
          {isRenaming ? (
            <input
              ref={renameInputRef}
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  saveRename(thread.id);
                }
                if (e.key === 'Escape') {
                  e.preventDefault();
                  setRenamingId(null);
                }
              }}
              onBlur={() => saveRename(thread.id)}
              onClick={(e) => e.stopPropagation()}
              className="w-full text-xs font-medium text-gray-800 border border-gray-300 rounded px-2 py-1"
            />
          ) : (
            <>
              <p className="text-xs font-medium text-gray-800 truncate leading-snug flex items-center gap-1.5">
                {thread.pinned && <PinIcon className="w-3 h-3 text-gray-500 flex-shrink-0" />}
                <span className="truncate">{threadTitle(thread)}</span>
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {formatRelativeDate(thread.updated_at || thread.last_message_at || thread.created_at)}
              </p>
            </>
          )}
        </button>

        {!isRenaming && (
          <div className="absolute right-1 top-1/2 -translate-y-1/2" ref={openMenuId === thread.id ? menuRef : null}>
            <button
              type="button"
              aria-label="Chat options"
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenuId((prev) => (prev === thread.id ? null : thread.id));
              }}
              className="p-1.5 rounded-md text-gray-400 opacity-0 group-hover:opacity-100 hover:text-gray-700 hover:bg-gray-100 transition-opacity"
            >
              <DotsVerticalIcon />
            </button>
            {openMenuId === thread.id && (
              <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                  onClick={() => {
                    setOpenMenuId(null);
                    setRenamingId(thread.id);
                    setRenameValue(threadTitle(thread));
                  }}
                >
                  Rename
                </button>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                  onClick={() => handlePinToggle(thread)}
                >
                  {thread.pinned ? 'Unpin' : 'Pin'}
                </button>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50"
                  onClick={() => handleArchive(thread)}
                >
                  Archive
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderSection = (label, items) => {
    if (!items.length) return null;
    return (
      <div className="mb-2">
        <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
        {items.map(renderThreadRow)}
      </div>
    );
  };

  return (
    <div className={`flex flex-col min-h-0 bg-gray-50 ${className}`}>
      {showHeader && (
        <div className="px-4 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <AOMark className="w-5 h-5 text-gray-900" />
            <span className="text-sm font-semibold text-gray-900">Auto</span>
          </div>
          <button
            type="button"
            onClick={onNewThread}
            className="w-full flex items-center gap-2 py-2 px-3 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <PlusIcon />
            New conversation
          </button>
        </div>
      )}

      <div className="px-3 py-2 flex-shrink-0 border-b border-gray-100">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search chats…"
          className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white placeholder:text-gray-400"
        />
      </div>

      {actionError && (
        <p className="mx-3 mt-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-2 py-1.5 flex-shrink-0">
          {actionError}
        </p>
      )}

      <div className="flex-1 overflow-y-auto py-2 min-h-0">
        {visibleMain.length === 0 && !showArchived && (
          <p className="text-xs text-gray-400 px-4 py-3">No conversations yet.</p>
        )}

        {pinned.length > 0 && renderSection('Pinned', pinned)}
        {renderSection('Today', today)}
        {renderSection('Previous 7 days', previous7Days)}

        {older.length > 0 && (
          <div className="mb-2">
            <button
              type="button"
              onClick={() => setShowOlder((v) => !v)}
              className="w-full text-left px-4 py-2 text-xs font-medium text-gray-500 hover:text-gray-800"
            >
              {showOlder ? 'Hide older chats' : `Show older chats (${older.length})`}
            </button>
            {showOlder && older.map(renderThreadRow)}
          </div>
        )}

        <div className="mt-2 border-t border-gray-200 pt-2">
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            className="w-full text-left px-4 py-2 text-xs font-medium text-gray-500 hover:text-gray-800"
          >
            {showArchived
              ? 'Hide archived'
              : `Show archived${archivedThreads?.length ? ` (${archivedThreads.length})` : ''}`}
          </button>
          {showArchived && (
            <>
              {visibleArchived.length === 0 && (
                <p className="text-xs text-gray-400 px-4 py-2">No archived chats.</p>
              )}
              {visibleArchived.map(renderThreadRow)}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function AutoV2Panel({ onNavigate, className }) {
  const [messages, setMessages] = useState([]);
  const [threads, setThreads] = useState([]);
  const [archivedThreads, setArchivedThreads] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [artifact, setArtifact] = useState(null);
  const [artifactOpen, setArtifactOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [startingNew, setStartingNew] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [generatedDesignImages, setGeneratedDesignImages] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [cardReviewMode, setCardReviewMode] = useState('single'); // 'single' | 'batch'
  const [seedManifestTotal, setSeedManifestTotal] = useState(null);
  const [journalPublishBanner, setJournalPublishBanner] = useState(null);
  const [devotionalPublishBanner, setDevotionalPublishBanner] = useState(null);
  const [episodeDraft, setEpisodeDraft] = useState(null);
  const [episodeProcessBanner, setEpisodeProcessBanner] = useState(null);
  const [splitPercent, setSplitPercent] = useState(50);
  const [dividerDragging, setDividerDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileTab, setMobileTab] = useState('chat');
  const [mobileArtifactOpen, setMobileArtifactOpen] = useState(false);
  const [mobileArtifactDrawerShown, setMobileArtifactDrawerShown] = useState(false);
  const [artifactUnread, setArtifactUnread] = useState(false);

  const splitContainerRef = useRef(null);
  const isMobileRef = useRef(false);
  const userAdjustedSplit = useRef(false);
  const processedJournalPublishKeys = useRef(new Set());
  const processedDevotionalPublishKeys = useRef(new Set());
  const processedEpisodeProcessKeys = useRef(new Set());
  // Tracks message IDs that existed at the time of the last Clear.
  // syncArtifactFromMessages ignores messages with these IDs so cleared
  // cards do not re-appear when new responses arrive.
  const clearedMessageIds = useRef(new Set());
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const isJournalEntry = useMemo(() => {
    if (!artifact) return false;
    const label = String(artifact.label || '').toLowerCase();
    const content = artifact.content || '';
    const draftWithFm = artifact.type === 'draft' && content.startsWith('---') && content.includes('publish_date');
    return (
      artifact.type === 'journal' ||
      draftWithFm ||
      label.includes('journal') ||
      label.includes('ali series') ||
      label.includes('conditions') ||
      (content.startsWith('---') && content.includes('publish_date'))
    );
  }, [artifact]);

  useEffect(() => {
    if (userAdjustedSplit.current) return;
    if (!artifactOpen) {
      setSplitPercent(50);
      return;
    }
    if (isJournalEntry) setSplitPercent(30);
    else setSplitPercent(50);
  }, [isJournalEntry, artifactOpen]);

  const handleDividerMouseDown = useCallback((e) => {
    e.preventDefault();
    userAdjustedSplit.current = true;
    const container = splitContainerRef.current;
    if (!container) return;

    setDividerDragging(true);
    const prevBodyCursor = document.body.style.cursor;
    document.body.style.cursor = 'col-resize';

    const onMouseMove = (moveEvent) => {
      const rect = container.getBoundingClientRect();
      const newPercent = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      setSplitPercent(Math.min(80, Math.max(20, newPercent)));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      setDividerDragging(false);
      document.body.style.cursor = prevBodyCursor || '';
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  const focusChatInput = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        textareaRef.current?.focus({ preventScroll: true });
      });
    });
  }, []);

  const visibleChatMessages = useMemo(
    () => (Array.isArray(messages) ? messages.filter((m) => m.role !== 'receipt') : []),
    [messages]
  );

  const contextPill = useMemo(() => extractContextPill(visibleChatMessages), [visibleChatMessages]);

  const hasArtifactContent = useMemo(
    () =>
      !!(
        artifact ||
        generatedImages.length > 0 ||
        generatedDesignImages.length > 0 ||
        journalPublishBanner ||
        devotionalPublishBanner ||
        episodeDraft ||
        episodeProcessBanner
      ),
    [
      artifact,
      generatedImages,
      generatedDesignImages,
      journalPublishBanner,
      devotionalPublishBanner,
      episodeDraft,
      episodeProcessBanner,
    ]
  );

  useEffect(() => {
    isMobileRef.current = isMobile;
  }, [isMobile]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!mobileArtifactOpen) {
      setMobileArtifactDrawerShown(false);
      return undefined;
    }
    const frame = requestAnimationFrame(() => setMobileArtifactDrawerShown(true));
    return () => cancelAnimationFrame(frame);
  }, [mobileArtifactOpen]);

  const signalNewArtifact = useCallback(() => {
    if (isMobileRef.current) {
      setArtifactUnread(true);
    } else {
      setArtifactOpen(true);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visibleChatMessages, sending]);

  /** Keep the message field focused whenever Auto is idle (after load, send, or new thread). */
  useEffect(() => {
    if (loading || startingNew || sending) return;
    focusChatInput();
  }, [loading, startingNew, sending, focusChatInput]);

  useEffect(() => {
    if (artifact) signalNewArtifact();
  }, [artifact, signalNewArtifact]);

  useEffect(() => {
    if (generatedImages.length > 0 || generatedDesignImages.length > 0) {
      signalNewArtifact();
      // Auto-advance to the newest card when new images arrive
      if (generatedImages.length > 0) {
        const sorted = [...generatedImages].sort((a, b) => a.card - b.card);
        setCurrentCardIndex(sorted.length - 1);
      }
    }
  }, [generatedImages, generatedDesignImages, signalNewArtifact]);

  useEffect(() => {
    if (!Array.isArray(messages) || messages.length === 0) return;

    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
    if (!lastAssistant) return;

    const parsed = extractJournalPublishFromAssistantContent(String(lastAssistant.content || ''));
    if (!parsed) return;

    const { attrs, journalContent } = parsed;
    const publishKey = `${activeThreadId || 'thread'}:${attrs.slug}:${journalContent.slice(0, 120)}`;
    if (processedJournalPublishKeys.current.has(publishKey)) return;
    processedJournalPublishKeys.current.add(publishKey);

    const categoriesRaw = String(attrs.categories || '')
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
    const notify =
      attrs.notify == null || attrs.notify === ''
        ? true
        : !/^(false|0|no)$/i.test(String(attrs.notify).trim());

    signalNewArtifact();
    setJournalPublishBanner({ status: 'loading', title: attrs.title });

    (async () => {
      try {
        const res = await fetch('/api/ao/auto/publish-journal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug: attrs.slug,
            title: attrs.title,
            content: journalContent,
            summary: attrs.summary || '',
            publish_date: attrs.publish_date || '',
            categories: categoriesRaw,
            featured_image: attrs.featured_image || '',
            takeaways: [],
            notify,
            notify_delay_ms: 300000,
          }),
        });
        const json = await res.json().catch(() => ({}));

        if (!res.ok || !json.ok) {
          throw new Error(json.error || 'Publish failed');
        }

        setJournalPublishBanner({
          status: 'success',
          title: attrs.title,
          journalUrl: json.journal_url || '',
        });
      } catch (e) {
        setJournalPublishBanner({
          status: 'error',
          title: attrs.title,
          message: e.message || 'Could not publish journal entry',
        });
      }
    })();
  }, [messages, activeThreadId]);

  useEffect(() => {
    if (!Array.isArray(messages) || messages.length === 0) return;

    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
    if (!lastAssistant) return;

    const signal = extractEpisodeProcessSignal(String(lastAssistant.content || ''));
    if (!signal) return;

    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    let transcript =
      extractEpisodeTranscriptBlock(String(lastAssistant.content || '')) ||
      extractEpisodeTranscriptBlock(String(lastUser?.content || ''));

    if (!transcript && lastUser) {
      const plain = String(lastUser.content || '').trim();
      if (plain.length >= 200) transcript = plain;
    }

    if (!transcript || transcript.length < 200) return;

    const processKey = `${activeThreadId || 'thread'}:${transcript.slice(0, 120)}`;
    if (processedEpisodeProcessKeys.current.has(processKey)) return;
    processedEpisodeProcessKeys.current.add(processKey);

    const episode_type = String(signal.episode_type || 'solo').toLowerCase() === 'guest' ? 'guest' : 'solo';
    const guest =
      episode_type === 'guest' && signal.guest_name
        ? {
            name: signal.guest_name,
            title: signal.guest_title || '',
            bio: signal.guest_bio || '',
          }
        : null;

    signalNewArtifact();
    setEpisodeProcessBanner({ status: 'loading' });

    (async () => {
      try {
        const res = await fetch('/api/ao/auto/episode-process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcript,
            episode_type,
            guest,
            recorded_date: signal.recorded_date || '',
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.ok) throw new Error(json.error || 'Episode processing failed');
        setEpisodeDraft(json.draft);
        setEpisodeProcessBanner(null);
      } catch (e) {
        setEpisodeProcessBanner({
          status: 'error',
          message: e.message || 'Could not process episode transcript',
        });
      }
    })();
  }, [messages, activeThreadId, signalNewArtifact]);

  useEffect(() => {
    if (!Array.isArray(messages) || messages.length === 0) return;

    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
    if (!lastAssistant) return;

    const parsed = extractDevotionalPublishFromAssistantContent(String(lastAssistant.content || ''));
    if (!parsed) return;

    const { attrs, devotionalContent } = parsed;
    const publishKey = `${activeThreadId || 'thread'}:${attrs.slug}:${devotionalContent.slice(0, 120)}`;
    if (processedDevotionalPublishKeys.current.has(publishKey)) return;
    processedDevotionalPublishKeys.current.add(publishKey);

    signalNewArtifact();
    setDevotionalPublishBanner({ status: 'loading', title: attrs.title });

    (async () => {
      try {
        const res = await fetch('/api/ao/auto/publish-devotional', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug: attrs.slug,
            title: attrs.title,
            date: attrs.date || '',
            scripture_reference: attrs.scripture_reference || '',
            content: devotionalContent,
            summary: attrs.summary || '',
          }),
        });
        const json = await res.json().catch(() => ({}));

        if (!res.ok || !json.ok) {
          throw new Error(json.error || 'Publish failed');
        }

        setDevotionalPublishBanner({
          status: 'success',
          title: attrs.title,
          devotionalUrl: json.devotional_url || '',
        });
      } catch (e) {
        setDevotionalPublishBanner({
          status: 'error',
          title: attrs.title,
          message: e.message || 'Could not publish devotional',
        });
      }
    })();
  }, [messages, activeThreadId, signalNewArtifact]);

  const mergeThreadRows = useCallback((sessionJson, draftsJson) => {
    const active = sessionJson?.thread || null;
    const drafts = Array.isArray(draftsJson?.drafts) ? draftsJson.drafts : [];
    const mainRows = [];
    const archivedRows = [];
    if (active?.id) {
      mainRows.push({
        ...active,
        preview: active.preview || drafts.find((d) => d.id === active.id)?.preview,
      });
    }
    for (const d of drafts) {
      if (active?.id && d.id === active.id) continue;
      if (threadIsUserArchived(d)) archivedRows.push(d);
      else mainRows.push(d);
    }
    return { mainRows, archivedRows };
  }, []);

  const syncArtifactFromMessages = useCallback((msgs) => {
    const allMsgs = msgs || [];

    // Read seed manifest from thread history to establish max card count
    for (const m of allMsgs) {
      if (m.role !== 'assistant') continue;
      const manifestMatch = String(m.content || '').match(/\[SEED_MANIFEST\s+total="(\d+)"\]/i);
      if (manifestMatch) {
        setSeedManifestTotal(parseInt(manifestMatch[1], 10));
        break;
      }
    }

    // Artifact: read from last assistant message only
    const lastAssistant = [...allMsgs].reverse().find((m) => m.role === 'assistant');
    if (!lastAssistant) {
      setArtifact(null);
      // Do not clear images — they persist for the whole thread session
      return;
    }
    const raw = String(lastAssistant.content || '');
    const { artifact: a } = parseArtifact(raw);
    setArtifact(a || null);

    // Accumulate card images across messages, but skip any message that was
    // present at the time of the last Clear. This allows Clear to work correctly
    // even though thread history still contains old [IMAGES_GENERATED] blocks.
    setGeneratedImages((prev) => {
      const prevByUrl = new Map((prev || []).map((p) => [p.url, p]));
      const byCardNumber = new Map();
      const cleared = clearedMessageIds.current;
      for (const m of allMsgs) {
        if (m.role !== 'assistant') continue;
        // Skip messages that existed at the time of the last clear
        const msgId = m.id || `${m.role}:${String(m.content || '').slice(0, 40)}`;
        if (cleared.size > 0 && cleared.has(msgId)) continue;
        const imgs = extractGeneratedImagesFromAssistantContent(String(m.content || ''));
        for (const img of imgs) {
          if (!img.url || !img.card) continue;
          const older = prevByUrl.get(img.url);
          byCardNumber.set(img.card, {
            ...img,
            addedAt: older?.addedAt ?? Date.now(),
          });
        }
      }
      const allImages = Array.from(byCardNumber.values());
      if (allImages.length > 0) {
        // Never exceed the seed manifest total if one exists
        // This prevents phantom cards from inflating the panel count
        const manifest = seedManifestTotal;
        if (manifest != null && allImages.length > manifest) {
          console.warn(`[AutoV2Panel] Panel has ${allImages.length} cards but manifest says ${manifest}. Capping.`);
          // Keep only cards whose slot numbers are within the manifest
          const capped = allImages.filter(img => img.card <= manifest);
          return capped.length > 0 ? capped : prev;
        }
        return allImages;
      }
      return prev;
    });
    // Design images: always append across messages (journal series accumulates)
    setGeneratedDesignImages((prev) => {
      const prevByUrl = new Map((prev || []).map((p) => [p.url, p]));
      const seenUrls = new Set();
      const allDesign = [];
      for (const m of allMsgs) {
        if (m.role !== 'assistant') continue;
        const imgs = extractDesignImagesFromAssistantContent(String(m.content || ''));
        for (const img of imgs) {
          const key = img.url;
          if (!key || seenUrls.has(key)) continue;
          seenUrls.add(key);
          const older = prevByUrl.get(key);
          allDesign.push({
            ...img,
            addedAt: older?.addedAt ?? Date.now(),
          });
        }
      }
      if (allDesign.length > 0) return allDesign;
      return prev;
    });
    // If no images found in any message, leave existing images in place
    // Images only clear when starting a new thread (handled in startNewThread)
  }, [seedManifestTotal]);

  const loadThreadList = useCallback(async () => {
    setError('');
    try {
      const [sessionRes, draftsRes] = await Promise.all([
        fetch('/api/ao/auto/session'),
        fetch('/api/ao/auto/drafts?limit=40'),
      ]);
      const sessionJson = await sessionRes.json().catch(() => ({}));
      const draftsJson = await draftsRes.json().catch(() => ({}));

      if (!sessionRes.ok || !sessionJson.ok) {
        throw new Error(sessionJson.error || 'Could not load Auto');
      }

      const { mainRows, archivedRows } = mergeThreadRows(sessionJson, draftsJson);

      setThreads(mainRows);
      setArchivedThreads(archivedRows);

      if (sessionJson.thread?.id) {
        setActiveThreadId(sessionJson.thread.id);
        const msgs = Array.isArray(sessionJson.messages) ? sessionJson.messages : [];
        setMessages(msgs);
        syncArtifactFromMessages(msgs);
      } else {
        setActiveThreadId(null);
        setMessages([]);
        setArtifact(null);
        setGeneratedImages([]);
        setGeneratedDesignImages([]);
      }
    } catch (e) {
      setError(e.message || 'Could not load Auto');
    }
  }, [mergeThreadRows, syncArtifactFromMessages]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadThreadList();
      setLoading(false);
    })();
  }, [loadThreadList]);

  const loadThread = useCallback(
    async (thread) => {
      const threadId = thread?.id;
      if (!threadId || threadId === activeThreadId) return;
      setLoading(true);
      setArtifact(null);
      setArtifactOpen(false);
      setMobileArtifactOpen(false);
      setArtifactUnread(false);
      setGeneratedImages([]);
      setGeneratedDesignImages([]);
      setCurrentCardIndex(0);
      setCardReviewMode('single');
      setSeedManifestTotal(null);
      clearedMessageIds.current = new Set();
      setError('');
      try {
        const res = await fetch('/api/ao/auto/thread/resume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ thread_id: threadId }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.ok) throw new Error(json.error || 'Could not open conversation');
        setActiveThreadId(json.thread?.id || threadId);
        const msgs = Array.isArray(json.messages) ? json.messages : [];
        setMessages(msgs);
        syncArtifactFromMessages(msgs);
        await loadThreadList();
      } catch (e) {
        setError(e.message || 'Could not open conversation');
      } finally {
        setLoading(false);
      }
    },
    [activeThreadId, loadThreadList, syncArtifactFromMessages]
  );

  const handleSelectThread = useCallback(
    async (thread) => {
      await loadThread(thread);
      setMobileTab('chat');
    },
    [loadThread]
  );

  const startNewThread = useCallback(async () => {
    if (startingNew || sending || loading) return;
    const ok = window.confirm(
      'Start a new conversation? This chat will be set aside (not deleted). You will see an empty thread so you can begin fresh.'
    );
    if (!ok) return;
    setStartingNew(true);
    setError('');
    setArtifact(null);
    setArtifactOpen(false);
    setMobileArtifactOpen(false);
    setArtifactUnread(false);
    setPendingFile(null);
    setGeneratedImages([]);
    setGeneratedDesignImages([]);
    setCurrentCardIndex(0);
    setCardReviewMode('single');
    setSeedManifestTotal(null);
    clearedMessageIds.current = new Set();
    setJournalPublishBanner(null);
    setDevotionalPublishBanner(null);
    processedJournalPublishKeys.current = new Set();
    processedDevotionalPublishKeys.current = new Set();
    try {
      const res = await fetch('/api/ao/auto/thread/new', { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Could not start a new chat');
      setInput('');
      setActiveThreadId(json.thread?.id || null);
      setMessages(Array.isArray(json.messages) ? json.messages : []);
      syncArtifactFromMessages(json.messages);
      setMobileTab('chat');
      await loadThreadList();
    } catch (e) {
      setError(e.message || 'Could not start a new chat');
    } finally {
      setStartingNew(false);
    }
  }, [startingNew, sending, loading, loadThreadList, syncArtifactFromMessages]);

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPendingFile({
        file,
        name: file.name,
        dataUrl: ev.target.result,
        type: file.type,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, []);

  async function buildOutgoingMessage(text, fileSnap) {
    let body = String(text || '').trim();
    const mime = String(fileSnap?.type || '').toLowerCase();
    const isText =
      mime === 'text/plain' ||
      mime === 'text/markdown' ||
      /\.(txt|md)$/i.test(fileSnap?.name || '');
    if (fileSnap?.file && isText) {
      try {
        const raw = await fileSnap.file.text();
        const clipped = raw.length > 12000 ? `${raw.slice(0, 12000)}\n…` : raw;
        body = body
          ? `${body}\n\n--- Attached file: ${fileSnap.name} ---\n${clipped}`
          : `[Attached file: ${fileSnap.name}]\n\n${clipped}`;
      } catch (_) {
        body = body || `[Attached file: ${fileSnap.name}]`;
      }
    } else if (fileSnap) {
      body = body || `[Attached file: ${fileSnap.name}]`;
    }
    return body;
  }

  const sendMessage = useCallback(
    async (messageText) => {
      const textInput = messageText !== undefined ? String(messageText) : input;
      const fileSnap = pendingFile;

      if ((!textInput.trim() && !fileSnap) || sending) return;

      let outgoing = '';
      try {
        outgoing = await buildOutgoingMessage(textInput, fileSnap);
      } catch (_) {
        outgoing = textInput.trim() || (fileSnap ? `[Attached file: ${fileSnap.name}]` : '');
      }

      if (!String(outgoing).trim()) return;

      const displayText =
        textInput.trim() ||
        (fileSnap ? `[Attached: ${fileSnap.name}]` : outgoing.slice(0, 200));

      const optimisticMsg = {
        role: 'user',
        content: displayText,
        id: `opt-${Date.now()}`,
        meta: fileSnap?.type?.startsWith('image/') ? { image_url: fileSnap.dataUrl } : null,
      };

      setPendingFile(null);
      setInput('');
      setMessages((prev) => [...prev, optimisticMsg]);
      setSending(true);
      setError('');

      if (textareaRef.current) textareaRef.current.style.height = '22px';

      try {
        const res = await fetch('/api/ao/auto/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            thread_id: activeThreadId || null,
            message: outgoing,
          }),
        });
        const json = await res.json().catch(() => ({}));

        if (!res.ok || !json.ok) {
          throw new Error(json.error || 'Could not reach Auto');
        }

        if (Array.isArray(json.messages) && json.messages.length > 0) {
          setMessages(json.messages);
          syncArtifactFromMessages(json.messages);
        } else {
          setMessages((prev) => {
            const withoutOpt = prev.filter((m) => m.id !== optimisticMsg.id);
            return [
              ...withoutOpt,
              { role: 'user', content: displayText },
              { role: 'assistant', content: json.assistant_message || '' },
            ];
          });
          const synthetic = [
            { role: 'user', content: displayText },
            { role: 'assistant', content: json.assistant_message || '' },
          ];
          syncArtifactFromMessages(synthetic);
        }

        if (json.thread?.id) setActiveThreadId(json.thread.id);

        await loadThreadList();
      } catch (e) {
        setError(e.message || 'Something went wrong');
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      } finally {
        setSending(false);
      }
    },
    [input, sending, activeThreadId, pendingFile, loadThreadList, syncArtifactFromMessages]
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  const handleApprove = useCallback(() => {
    if (!artifact) {
      sendMessage('Approved.');
      return;
    }
    switch (artifact.type) {
      case 'list':
        // Batch of seeds or final copy list — approve everything and move to next stage
        sendMessage(`All ${artifact.label || 'cards'} approved. Develop final copy for all of them now.`);
        break;
      case 'quote_card':
        // Single card review
        sendMessage('Approved. Move to the next card.');
        break;
      case 'captions':
        // Caption review — next stage is image generation
        sendMessage(`All captions approved. Generate the card images now.`);
        break;
      case 'draft':
        sendMessage('Approved.');
        break;
      default:
        sendMessage('Approved.');
    }
  }, [sendMessage, artifact]);

  const handleRevise = useCallback(() => {
    setInput('Revise — ');
    textareaRef.current?.focus();
  }, []);

  const handleViewAll = useCallback(() => {
    sendMessage('Show me all cards in this batch.');
  }, [sendMessage]);

  const handleGeneratedImageError = useCallback((url) => {
    setGeneratedImages((prev) => prev.filter((img) => img.url !== url));
  }, []);

  const handleGeneratedDesignImageError = useCallback((url) => {
    setGeneratedDesignImages((prev) => prev.filter((img) => img.url !== url));
  }, []);

  const handleClearGenerated = useCallback(() => {
    // Record the IDs of all current messages so syncArtifactFromMessages
    // knows to ignore [IMAGES_GENERATED] blocks from these messages going forward.
    // New messages arriving after this clear will not be in the set and will render normally.
    const currentIds = new Set(
      (messages || []).map((m) => m.id || `${m.role}:${String(m.content || '').slice(0, 40)}`)
    );
    clearedMessageIds.current = currentIds;
    setGeneratedImages([]);
    setGeneratedDesignImages([]);
    setCurrentCardIndex(0);
    setSeedManifestTotal(null);
  }, [messages]);

  const publishCards = useCallback(async () => {
    if (!generatedImages || generatedImages.length === 0) {
      setError('No generated images found. Generate card images before publishing.');
      return;
    }

    const cards = generatedImages.map((img) => ({
      card_index: img.card,
      image_url: img.url,
    }));

    setError('');
    try {
      const res = await fetch('/api/ao/auto/schedule-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cards, thread_id: activeThreadId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setError(json.error || 'Publishing failed');
        return;
      }
      await sendMessage(
        `Publishing confirmed. ${json.total} posts scheduled across all platforms.`
      );
    } catch (e) {
      setError(e.message || 'Publishing failed');
    }
  }, [generatedImages, activeThreadId, sendMessage]);

  if (loading && !activeThreadId && visibleChatMessages.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full ${className || ''}`}>
        <div className="flex flex-col items-center gap-3">
          <AOMark className="w-8 h-8 text-gray-300 animate-pulse" />
          <p className="text-sm text-gray-400">Loading Auto…</p>
        </div>
      </div>
    );
  }

  const artifactPanelProps = {
    artifact,
    generatedImages,
    generatedDesignImages,
    journalPublishBanner,
    devotionalPublishBanner,
    episodeDraft,
    episodeProcessBanner,
    onEpisodeDraftUpdated: setEpisodeDraft,
    onEpisodePublished: () => setEpisodeProcessBanner(null),
    onApprove: handleApprove,
    onRevise: handleRevise,
    onViewAll: handleViewAll,
    onClearGenerated: handleClearGenerated,
    onGeneratedImageError: handleGeneratedImageError,
    onGeneratedDesignImageError: handleGeneratedDesignImageError,
    currentCardIndex,
    onCardIndexChange: setCurrentCardIndex,
    cardReviewMode,
    onCardReviewModeChange: setCardReviewMode,
    seedManifestTotal,
  };

  const mobileBottomNav = isMobile ? (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom,0px)]"
      aria-label="Auto navigation"
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', width: '100%' }}>
        <button
          type="button"
          onClick={startNewThread}
          disabled={startingNew || sending || loading}
          className="flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium text-gray-600 disabled:opacity-40"
          style={{ minWidth: 0 }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          New
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('chat')}
          className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium ${
            mobileTab === 'chat' ? 'text-gray-900' : 'text-gray-500'
          }`}
          style={{ minWidth: 0 }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinejoin="round" />
          </svg>
          Chat
        </button>
        <button
          type="button"
          onClick={() => {
            setMobileTab('chat');
            setMobileArtifactOpen(true);
            setArtifactUnread(false);
          }}
          className={`relative flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium ${
            mobileArtifactOpen ? 'text-gray-900' : 'text-gray-500'
          }`}
          style={{ minWidth: 0 }}
        >
          <span className="relative">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M7 7h10M7 12h10M7 17h6" strokeLinecap="round" />
            </svg>
            {artifactUnread && hasArtifactContent ? (
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-red-500" aria-hidden />
            ) : null}
          </span>
          Artifact
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('chats')}
          className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium ${
            mobileTab === 'chats' ? 'text-gray-900' : 'text-gray-500'
          }`}
          style={{ minWidth: 0 }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round" />
          </svg>
          Chats
        </button>
      </div>
    </nav>
  ) : null;

  return (
    <div className={`flex h-full overflow-hidden bg-white ${className || ''}`}>

      {!isMobile && sidebarOpen && (
        <ThreadSidebar
          threads={threads}
          archivedThreads={archivedThreads}
          activeThreadId={activeThreadId}
          onSelectThread={loadThread}
          onNewThread={startNewThread}
          onRefresh={loadThreadList}
          className="w-56 flex-shrink-0 border-r border-gray-200"
        />
      )}

      {isMobile && mobileTab === 'chats' ? (
        <ThreadSidebar
          threads={threads}
          archivedThreads={archivedThreads}
          activeThreadId={activeThreadId}
          onSelectThread={handleSelectThread}
          onNewThread={startNewThread}
          onRefresh={loadThreadList}
          className="flex-1 w-full min-h-0 pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))]"
          showHeader={false}
        />
      ) : (
      <div
        ref={splitContainerRef}
        className={`flex flex-1 min-h-0 min-w-0 flex-row overflow-hidden ${
          isMobile ? 'pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))]' : ''
        }`}
      >
        <div
          className={`flex min-h-0 min-w-0 flex-col overflow-hidden ${dividerDragging ? 'select-none' : ''} ${
            !isMobile && artifactOpen ? '' : 'flex-1'
          }`}
          style={!isMobile && artifactOpen ? { width: `${splitPercent}%`, flexShrink: 0 } : undefined}
        >
        <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            {!isMobile && (
            <button
              type="button"
              onClick={() => setSidebarOpen((o) => !o)}
              className="text-gray-400 transition-colors hover:text-gray-700"
              aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {sidebarOpen ? (
                <PanelLeftClose className="h-4 w-4" aria-hidden strokeWidth={2} />
              ) : (
                <PanelLeftOpen className="h-4 w-4" aria-hidden strokeWidth={2} />
              )}
            </button>
            )}
            {contextPill ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                {contextPill}
              </span>
            ) : (
              <span className="text-sm font-medium text-gray-400">Auto</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isMobile && artifact && !artifactOpen && (
              <button
                type="button"
                onClick={() => setArtifactOpen(true)}
                className="text-xs font-medium text-gray-600 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                View artifact
              </button>
            )}
            <button
              type="button"
              onClick={() => downloadTranscriptAsMd(messages, activeThreadId)}
              disabled={visibleChatMessages.length === 0}
              className="text-xs font-medium text-gray-600 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="Download conversation as markdown"
              aria-label="Download transcript"
            >
              ↓ Transcript
            </button>
            <button type="button" onClick={() => onNavigate?.('/ao/library')} className="text-xs font-medium text-gray-600 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              Library
            </button>
            <button
              type="button"
              onClick={publishCards}
              disabled={!generatedImages || generatedImages.length === 0}
              className="text-xs font-medium text-gray-600 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title={
                generatedImages?.length > 0
                  ? `Publish ${generatedImages.length} cards`
                  : 'Generate card images first'
              }
            >
              Publish
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-5 min-h-0 relative">
          {loading && (
            <div className="absolute inset-0 z-10 bg-white/60 flex items-center justify-center pointer-events-none">
              <AOMark className="w-6 h-6 text-gray-300 animate-pulse" />
            </div>
          )}

          {visibleChatMessages.length === 0 && !sending && (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
              <AOMark className="w-10 h-10 text-gray-200 mb-4" />
              <h2 className="text-base font-semibold text-gray-800 mb-2">Good to go.</h2>
              <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
                Talk to Auto the same way you&apos;d talk to your CMO. No commands. No trigger phrases.
              </p>
              <div className="mt-6 flex flex-col gap-2 w-full max-w-xs">
                {[
                  'Give me 20 quote card seeds on power vs servant leadership',
                  "Let's plan the next journal series",
                  'What have I written about accountability?',
                ].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => sendMessage(prompt)}
                    className="w-full text-left text-xs text-gray-600 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors leading-snug"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {visibleChatMessages.map((msg, i) => (
            <MessageBubble key={msg.id || `${msg.role}-${i}-${msg.created_at}`} message={msg} />
          ))}

          {sending && <TypingIndicator />}

          {error && (
            <div className="flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
              <span className="font-medium">Error:</span> {error}
              <button type="button" onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600 flex-shrink-0" aria-label="Dismiss">
                <CloseIcon />
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {pendingFile && (
          <div className="px-4 pb-2 flex items-center gap-2">
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700 max-w-xs">
              {pendingFile.type?.startsWith('image/') && (
                <img src={pendingFile.dataUrl} alt="" className="w-8 h-8 object-cover rounded" />
              )}
              <span className="truncate">{pendingFile.name}</span>
              <button type="button" onClick={() => setPendingFile(null)} className="ml-auto text-blue-400 hover:text-blue-600 flex-shrink-0" aria-label="Remove attachment">
                <CloseIcon />
              </button>
            </div>
          </div>
        )}

        <div className="flex-shrink-0 px-4 pb-4 pt-2 border-t border-gray-100 bg-white">
          <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 focus-within:border-gray-400 focus-within:bg-white transition-colors">

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending || startingNew}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded disabled:opacity-40"
              aria-label="Attach file"
              title="Attach image or file"
            >
              <PaperclipIcon />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.txt,.md,.csv"
              className="hidden"
              onChange={handleFileSelect}
            />

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
              }}
              onKeyDown={handleKeyDown}
              placeholder="Talk to Auto…"
              rows={1}
              disabled={sending || startingNew}
              className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 resize-none outline-none leading-relaxed disabled:opacity-50"
              style={{ minHeight: '22px', height: '22px' }}
              aria-label="Message Auto"
            />

            <button
              type="button"
              onClick={() => sendMessage()}
              disabled={(!input.trim() && !pendingFile) || sending || startingNew}
              className="flex-shrink-0 w-8 h-8 bg-gray-900 text-white rounded-lg flex items-center justify-center hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Send message"
            >
              <SendIcon />
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">Shift + Enter for new line</p>
        </div>
        </div>

        {artifactOpen && !isMobile && (
          <>
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize panels"
              className={`w-1 shrink-0 cursor-col-resize select-none bg-gray-200 transition-colors hover:bg-ao-red ${
                dividerDragging ? 'bg-ao-red' : ''
              }`}
              onMouseDown={handleDividerMouseDown}
            />
            <div
              className={`flex min-h-0 min-w-0 shrink-0 flex-col overflow-hidden ${dividerDragging ? 'select-none' : ''}`}
              style={{ width: `${100 - splitPercent}%`, flexShrink: 0 }}
            >
              <ArtifactPanel
                {...artifactPanelProps}
                onClose={() => setArtifactOpen(false)}
              />
            </div>
          </>
        )}
      </div>
      )}

      {mobileBottomNav}

      {isMobile && mobileArtifactOpen ? (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Artifact">
          <button
            type="button"
            className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${
              mobileArtifactDrawerShown ? 'opacity-100' : 'opacity-0'
            }`}
            aria-label="Close artifact"
            onClick={() => setMobileArtifactOpen(false)}
          />
          <div
            className={`absolute bottom-0 left-0 right-0 flex flex-col bg-white rounded-t-2xl shadow-2xl border-t border-gray-200 transition-transform duration-300 ease-out ${
              mobileArtifactDrawerShown ? 'translate-y-0' : 'translate-y-full'
            }`}
            style={{ height: '85vh', maxHeight: '85dvh' }}
          >
            <div className="flex-shrink-0 flex items-center justify-center py-2">
              <div className="w-10 h-1 rounded-full bg-gray-300" aria-hidden />
            </div>
            <div className="flex-shrink-0 px-4 py-2 flex items-center justify-between border-b border-gray-200">
              <span className="text-sm font-semibold text-gray-900">Artifact</span>
              <button
                type="button"
                onClick={() => setMobileArtifactOpen(false)}
                className="text-xs font-medium text-gray-600 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              <ArtifactPanel
                {...artifactPanelProps}
                onClose={() => setMobileArtifactOpen(false)}
              />
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
}
