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

import { createPortal } from 'react-dom';
import { createSwipeHandlers } from '../../../lib/ao/touchGestures.js';
import { PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import EpisodeDraftReview from './EpisodeDraftReview.jsx';
import TeamBoard from './TeamBoard.jsx';
import ChatMarkdown from './ChatMarkdown.jsx';
import { avatarFor } from './teamAvatars.js';
import { channelOfThread, groupByChannel } from '../../lib/channels.js';
import { splitBySpeaker } from '../../lib/speakerSplit.js';
import ImageZoom, { isZoomableImage } from './ImageZoom.jsx';
import { speakUpMessage } from '../../lib/speakUpMessage.js';
import { mentionedAgents, MENTION_CHOICES, pendingMention } from '../../lib/teamMentions.js';
import HeaderUploadToDraftTrigger from './HeaderUploadToDraftTrigger.jsx';
import StagedJournalPanel from './StagedJournalPanel.jsx';
import { resolveDraftArtifactSlug } from './draftArtifactSlug.js';
import { resolveUploadTargetSlug } from '../../../lib/ao/uploadTargetSlug.js';
import { findChatCaptionsMessage } from '../../../lib/ao/journalPanelData.js';
import { abortReasonFor, abortMessageFor } from '../../lib/autoStreamTimeouts.js';
import {
  buildDraftWordDiff,
  extractSlugFromDraftContent,
  formatVersionTimestamp,
} from './draftDiff.js';
import {
  parseArtifact,
  resolveArtifactPanelState,
} from './draftArtifactSync.js';
import { useKeyboardInset } from '../../hooks/useKeyboardInset';
import { metricsAlertKeyFor } from '../../lib/metricsAlertKey';
import { orderDesignImagesNewestFirst } from '../../lib/designImageOrder.js';
import { markdownTeamImages } from '../../lib/teamShownImages.js';
import { cardPackages } from '../../lib/cardPackages.js';
import CardPackages from './CardPackages.jsx';
import { KNOWN_REAL_SIGNALS } from '../../../lib/ao/enforceResponseRules.js';
import QueueFeed from './QueueFeed.jsx';
import { idleStatus } from '../../lib/teamStatus.js';
import { openQuestions, quotedReply } from '../../lib/openQuestions.js';
import {
  MAX_TOTAL_ATTACHMENT_BYTES,
  attachmentOverLimitMessage,
  packAttachmentsUnderLimit,
  resizeImageFileToDataUrl,
  totalAttachmentBytes,
} from './chatAttachmentLimits.js';

// parseArtifact / resolveArtifactPanelState live in draftArtifactSync.js (#131)

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
  // Cards a teammate showed in chat as a picture belong in the panel too.
  const seen = new Set(results.map((r) => r.url));
  for (const img of markdownTeamImages(text)) {
    if (!seen.has(img.url)) results.push(img);
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

/**
 * Extract LinkedIn Personal caption text for a specific card from thread history.
 * Used when scheduling cards so caption travels with the publish request.
 */
function extractCaptionForCard(cardNumber, messages) {
  const assistantMessages = (Array.isArray(messages) ? messages : [])
    .filter((m) => m.role === 'assistant');

  for (const m of [...assistantMessages].reverse()) {
    const text = String(m.content || '');
    const hasCard =
      new RegExp(`Card\\s+${cardNumber}\\s+of`, 'i').test(text) ||
      new RegExp(`\\*\\*Card\\s+${cardNumber}\\b`, 'i').test(text);
    if (!hasCard) continue;

    const captions = extractCardCaptionsFromArtifactContent(text);
    const linkedIn = captions[cardNumber]?.['LinkedIn Personal'] || '';
    if (linkedIn) {
      return linkedIn
        .replace(/\*\*/g, '')
        .replace(/^#+\s*/gm, '')
        .trim();
    }
  }

  return '';
}

function extractJournalPublishFromAssistantContent(content) {
  const text = String(content || '');
  const tagMatch = text.match(/\[PUBLISH_JOURNAL([^\]]*)\]/i);
  if (!tagMatch) return null;

  const attrs = parseImageGeneratedAttributes(tagMatch[1]);
  const contentMatch = text.match(/\[JOURNAL_CONTENT\]([\s\S]*?)\[\/JOURNAL_CONTENT\]/i);
  const journalContent = contentMatch ? contentMatch[1].trim() : '';
  const socialCaptionsMatch = text.match(/\[SOCIAL_CAPTIONS\][\s\S]*?\[\/SOCIAL_CAPTIONS\]/i);
  const socialCaptionsBlock = socialCaptionsMatch ? socialCaptionsMatch[0] : '';

  if (!attrs.slug || !attrs.title || !journalContent) return null;

  return { attrs, journalContent, socialCaptionsBlock };
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

function extractEpisodeGuestsIds(content) {
  const text = String(content || '');
  const match = text.match(/\[EPISODE_GUESTS\]([\s\S]*?)\[\/EPISODE_GUESTS\]/i);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1].trim());
    if (!Array.isArray(parsed)) return null;
    const ids = parsed.map((id) => String(id || '').trim()).filter(Boolean);
    return ids.length > 0 ? ids : null;
  } catch {
    return null;
  }
}

function extractNavigateToSignal(content) {
  const text = String(content || '');
  const match = text.match(/\[NAVIGATE_TO\s+path="([^"]+)"\]/i);
  return match ? match[1] : null;
}

function stripBareKnownSignalMentions(text) {
  return String(text || '').replace(/\[\/?([A-Z_]+)\]/g, (match, tagName) =>
    KNOWN_REAL_SIGNALS.has(tagName) ? '' : match
  );
}

function stripGeneratedImageBlocksFromChat(text) {
  const stripped = String(text || '')
    .replace(/\[IMAGES_GENERATED\][\s\S]*?\[\/IMAGES_GENERATED\]/g, '')
    .replace(/\[DALLE_GENERATE[^\]]*\]/gi, '')
    .replace(/\[IMAGE_GENERATED[^\]]*\]/gi, '')
    .replace(/\[PUBLISH_JOURNAL[^\]]*\]/gi, '')
    // Caption-update signal: strip markers only — Bart still needs to read the captions.
    .replace(/\[UPDATE_SCHEDULED_CAPTIONS[^\]]*\]/gi, '')
    .replace(/\[\/UPDATE_SCHEDULED_CAPTIONS\]/gi, '')
    // Draft bodies: strip bracket tags only. Never delete the content between them —
    // that is the journal/devotional text Bart must see and approve in-chat.
    .replace(/\[JOURNAL_CONTENT\]/gi, '')
    .replace(/\[\/JOURNAL_CONTENT\]/gi, '')
    .replace(/\[PUBLISH_DEVOTIONAL[^\]]*\]/gi, '')
    .replace(/\[DEVOTIONAL_CONTENT\]/gi, '')
    .replace(/\[\/DEVOTIONAL_CONTENT\]/gi, '')
    .replace(/\[EPISODE_PROCESS[^\]]*\]/gi, '')
    .replace(/\[EPISODE_GUESTS\][\s\S]*?\[\/EPISODE_GUESTS\]/gi, '')
    // Episode transcript is surfaced in the episode draft panel from raw message.content —
    // keep it out of the chat bubble to avoid a huge duplicate dump.
    .replace(/\[EPISODE_TRANSCRIPT\][\s\S]*?\[\/EPISODE_TRANSCRIPT\]/gi, '')
    .replace(/\[EPISODE_RESEARCH_COMPLETE[\s\S]*?\[\/EPISODE_RESEARCH_COMPLETE\]/gi, '')
    .replace(/\[RESEARCH_CONTEXT\][\s\S]*?\[\/RESEARCH_CONTEXT\]/gi, '')
    .replace(/\[NAVIGATE_TO[^\]]*\]/gi, '')
    .replace(/\[GUEST_ID:[^\]]*\]/gi, '')
    .replace(/\[EPISODE_DRAFT[^\]]*\]/gi, '')
    .replace(/\[CARD[\s\S]*?\[\/CARD\]/gi, '')
    .replace(/\[LINE[^\]]*\][\s\S]*?\[\/LINE\]/gi, '');

  // Well-formed blocks/signals are already handled above. Remove only exact,
  // attribute-less mentions of known real signal names that remain, such as a
  // conversational "[EPISODE_RESEARCH_COMPLETE]". Preserve all other brackets.
  return stripBareKnownSignalMentions(stripped).trim();
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
    const raw = String(msg.content || '');
    // Each speaker by name, and the team's own notes never shown as Bart's (2026-10-26).
    const teamNote = msg.role === 'user' && (msg.meta?.team_note || msg.meta?.team_task || /^\s*\[(TEAM|TEAM TASK|SYSTEM)[\] ]/.test(raw));
    const role = teamNote ? '**Team note**' : msg.role === 'user' ? '**Bart**' : `**${TEAM_NAMES[msg.meta?.agent || 'auto'] || 'Ada'}**`;
    // Strip internal tags that are not useful in a transcript
    const clean = raw
      .replace(/\[IMAGES_GENERATED\][\s\S]*?\[\/IMAGES_GENERATED\]/g, '[Images generated]')
      .replace(/\[IMAGE_GENERATED[^\]]*\]/gi, '[Image generated]')
      .replace(/\[DALLE_GENERATE[^\]]*\]/gi, '')
      .replace(/\[PUBLISH_JOURNAL[^\]]*\]/gi, '[Journal publish signal]')
      .replace(/\[JOURNAL_CONTENT\]/gi, '')
      .replace(/\[\/JOURNAL_CONTENT\]/gi, '')
      .replace(/\[PUBLISH_DEVOTIONAL[^\]]*\]/gi, '[Devotional publish signal]')
      .replace(/\[DEVOTIONAL_CONTENT\]/gi, '')
      .replace(/\[\/DEVOTIONAL_CONTENT\]/gi, '')
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

/**
 * The team's open questions, pinned above the message box until Bart answers
 * (2026-10-27: a question scrolled off the screen when the next teammate
 * spoke). One at a time with "1 of 2" so a phone screen stays calm; Yes
 * answers it in one tap, Answer quotes it into the box for a fuller reply.
 */
export function PinnedQuestions({ questions, onYes, onAnswer, disabled = false }) {
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const count = questions.length;
  const i = Math.min(index, count - 1);
  useEffect(() => setExpanded(false), [i, count]);
  if (!count) return null;
  const q = questions[i];
  return (
    <div className="mb-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2" role="region" aria-label="Questions waiting on you">
      <div className="flex items-start gap-2">
        <img src={avatarFor(q.agent)} alt="" aria-hidden="true" className="mt-0.5 h-6 w-6 flex-shrink-0 rounded-full object-cover" draggable={false} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-amber-900">
            {q.name} is waiting on you
            {count > 1 ? <span className="font-normal text-amber-800">{` · ${i + 1} of ${count}`}</span> : null}
          </p>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className={`mt-0.5 block w-full text-left text-sm leading-snug text-gray-900 ${expanded ? '' : 'line-clamp-2'}`}
          >
            {q.question}
          </button>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2 pl-8">
        {q.yesNo ? (
          <button type="button" disabled={disabled} onClick={() => onYes(q)} className="min-h-[36px] rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white disabled:opacity-50">
            Yes
          </button>
        ) : null}
        <button type="button" onClick={() => onAnswer(q)} className="min-h-[36px] rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-800">
          Answer
        </button>
        {count > 1 ? (
          <div className="ml-auto flex items-center gap-1">
            <button type="button" aria-label="Previous question" disabled={i === 0} onClick={() => setIndex(i - 1)} className="min-h-[36px] min-w-[36px] rounded-lg text-lg text-gray-600 disabled:opacity-30">
              ‹
            </button>
            <button type="button" aria-label="Next question" disabled={i === count - 1} onClick={() => setIndex(i + 1)} className="min-h-[36px] min-w-[36px] rounded-lg text-lg text-gray-600 disabled:opacity-30">
              ›
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** The still counterpart to the working animation: nobody is working, and what that means. */
function IdleStatus({ label }) {
  return (
    <div className="flex items-center gap-2 pl-11 text-xs text-gray-500" role="status" aria-live="polite">
      <span className="h-2 w-2 flex-shrink-0 rounded-full bg-gray-300" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

/**
 * The working animation. It always moves and counts the seconds, with or
 * without a label, so Bart can tell the team is still at it in the
 * background (2026-10-27: "I couldn't tell if Auto was still working").
 */
function TypingIndicator({ label = null, agent = 'auto' }) {
  const [startedAt] = useState(() => Date.now());
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const secs = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  const elapsed = secs < 60 ? `${secs}s` : `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  return (
    <div className="flex gap-3" role="status" aria-live="polite">
      <img
        src={avatarFor(agent)}
        alt=""
        aria-hidden="true"
        className="w-8 h-8 rounded-full flex-shrink-0 object-cover bg-orange-50 border border-orange-100 animate-pulse"
        draggable={false}
      />
      <div className="bg-gray-50 border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex gap-1 items-center h-4" aria-hidden="true">
            {[0, 150, 300].map((delay) => (
              <span
                key={delay}
                className="w-1.5 h-1.5 bg-ao-red rounded-full animate-bounce"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          </div>
          {label ? <p className="text-sm text-gray-600">{label}</p> : <p className="text-sm text-gray-500">Working…</p>}
          <span className="text-xs text-gray-400 tabular-nums">{elapsed}</span>
        </div>
      </div>
    </div>
  );
}

const TEAM_NAMES = { auto: 'Ada', jot: 'Jot', reach: 'Vox', producer: 'Cam', editor: 'Red', designer: 'Des', it: 'Bit' };

/** A background task's assignment or pass, shown as a team note rather than as Bart's words. */
function TeamTaskNote({ message }) {
  const [open, setOpen] = useState(false);
  const text = String(message.content || '');
  const firstLine = text.split('\n')[0].replace(/^\[TEAM TASK[^\]]*\]\s*/, '');
  const isAssignment = /^\[TEAM TASK from /.test(text);
  return (
    <div className="flex justify-center">
      <div className="max-w-[85%] w-full rounded-xl border border-dashed border-gray-300 bg-white px-3 py-2 text-xs text-gray-600">
        <button type="button" onClick={() => setOpen((v) => !v)} className="w-full text-left">
          <span className="font-semibold text-gray-700">{isAssignment ? 'Assignment' : 'Background pass'}</span>
          {message.meta?.pass > 1 ? ` · pass ${message.meta.pass}` : ''} · {firstLine.slice(0, 140)}
          <span className="text-gray-400"> {open ? 'Hide' : 'Show'}</span>
        </button>
        {open ? <div className="mt-2 whitespace-pre-wrap text-gray-700">{text}</div> : null}
      </div>
    </div>
  );
}

// What a reply did that Bart may want to go look at.
const QUEUE_TOOLS = ['trigger_reshare', 'generate_quote_card', 'generate_designed_card', 'generate_plate_card'];
const WEEK_TOOLS = ['schedule_captions', 'schedule_journal_publish', 'reach_move_post', 'reach_week', 'publish_journal'];

// Replies that used the CRM link to it, so Bart never has to go looking (2026-10-26).
const CRM_TOOLS = ['crm_today', 'crm_people', 'crm_person', 'crm_update', 'crm_add_contact'];

function ReplyLinks({ message, onNavigate }) {
  const used = Array.isArray(message.meta?.tools_used) ? message.meta.tools_used : [];
  const queue = used.some((t) => QUEUE_TOOLS.includes(t));
  const week = used.some((t) => WEEK_TOOLS.includes(t));
  const team = used.includes('assign_task');
  const crm = used.some((t) => CRM_TOOLS.includes(t));
  const emails = used.includes('draft_email');
  if (!onNavigate || (!queue && !week && !team && !crm && !emails)) return null;
  const chip = 'text-xs font-medium px-2.5 py-1 rounded-full border border-gray-300 bg-white text-gray-700 hover:bg-gray-50';
  return (
    <div className="mt-2 flex flex-wrap gap-2 pl-11">
      {queue ? (
        <button type="button" className={chip} onClick={() => onNavigate('/ao/analyst?queue=1')}>
          Open #queue
        </button>
      ) : null}
      {week ? (
        <button type="button" className={chip} onClick={() => onNavigate('/ao/library/review-queue#week')}>
          See the week
        </button>
      ) : null}
      {team ? (
        <button type="button" className={chip} onClick={() => message.__openTeam?.()}>
          Team board
        </button>
      ) : null}
      {emails ? (
        <button type="button" className={chip} onClick={() => onNavigate('/ao/analyst?queue=1')}>
          Emails waiting
        </button>
      ) : null}
      {crm ? (
        <button type="button" className={chip} onClick={() => onNavigate('/ao/crm')}>
          Open the CRM
        </button>
      ) : null}
    </div>
  );
}

export function MessageBubble({ message, onNavigate }) {
  const isUser = message.role === 'user';
  const raw = String(message.content || '');
  const agentKey = !isUser && message.meta?.agent && message.meta.agent !== 'auto' ? message.meta.agent : null;
  if (isUser && message.meta?.team_task) return <TeamTaskNote message={message} />;
  if (isUser && message.meta?.team_note) {
    return (
      <div className="flex justify-center">
        <p className="text-xs text-gray-500 italic">
          {message.meta?.huddle
            ? String(message.content || '').replace(/^\[TEAM\]\s*Huddle\.\s*/, '').split(/\. Speak to |\. Do not retell/)[0]
            : String(message.content || '').replace(/^\[TEAM\]\s*/, '').split('\n')[0]}
        </p>
      </div>
    );
  }
  const withoutImages = stripGeneratedImageBlocksFromChat(raw);
  const { cleanText } = parseArtifact(withoutImages);
  const text = cleanText || withoutImages;
  const reshareImageUrl =
    message.meta?.reshare_image_url && String(message.meta.reshare_image_url).startsWith('https://')
      ? message.meta.reshare_image_url
      : null;

  if (!text && !message.meta?.image_url && !reshareImageUrl) return null;

  // One bubble per teammate, like a real group chat (2026-10-26).
  const parts = isUser ? [{ agent: null, text }] : splitBySpeaker(text, agentKey || 'auto');
  const segments = parts.length ? parts : [{ agent: agentKey || 'auto', text: '' }];

  const bubble = (seg, i) => {
    const who = isUser ? null : seg.agent || 'auto';
    return (
      <div key={i} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {isUser ? (
          <div
            className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold select-none bg-gray-900 text-white"
            style={{ userSelect: 'none' }}
            aria-hidden="true"
          >
            B
          </div>
        ) : (
          <img
            src={avatarFor(who)}
            alt={TEAM_NAMES[who]}
            title={TEAM_NAMES[who]}
            className="w-8 h-8 rounded-full flex-shrink-0 object-cover bg-orange-50 border border-orange-100 select-none"
            draggable={false}
          />
        )}
        <div className="max-w-[75%] min-w-0">
          {!isUser && segments.length > 1 ? (
            <p className="mb-1 text-[11px] font-semibold text-gray-500">{TEAM_NAMES[who]}</p>
          ) : null}
          <div
            data-quotable={isUser ? undefined : '1'}
            className={`
              rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap
              ${isUser
                ? message.meta?.failed
                  ? 'bg-red-900 text-white rounded-tr-sm opacity-70'
                  : 'bg-gray-900 text-white rounded-tr-sm'
                : 'bg-gray-50 text-gray-900 border border-gray-200 rounded-tl-sm'
              }
            `}
          >
            {i === 0 && message.meta?.image_url && (
              <img
                src={message.meta.image_url}
                alt=""
                className="rounded-lg mb-2 max-w-full max-h-48 object-contain"
              />
            )}
            {isUser ? seg.text : <div className="whitespace-normal">{<ChatMarkdown text={seg.text} />}</div>}
            {i === segments.length - 1 && reshareImageUrl ? (
              <a
                href={reshareImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block mt-3"
              >
                <img
                  src={reshareImageUrl}
                  alt="Reshare image preview"
                  className="rounded-lg w-full h-auto block border border-gray-200"
                />
              </a>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  if (segments.length === 1) return bubble(segments[0], 0);
  return <div className="space-y-3">{segments.map(bubble)}</div>;
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

function DraftDiffBody({ priorContent, currentContent }) {
  const parts = useMemo(
    () => buildDraftWordDiff(priorContent, currentContent),
    [priorContent, currentContent]
  );
  return (
    <div
      className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap rounded-xl border border-gray-200 bg-white p-4 text-sm leading-relaxed text-gray-800"
      data-testid="draft-diff-body"
    >
      {parts.map((part, i) => {
        if (part.type === 'added') {
          return (
            <span
              key={i}
              data-diff="added"
              className="rounded-sm bg-emerald-100 text-emerald-950"
            >
              {part.value}
            </span>
          );
        }
        if (part.type === 'removed') {
          return (
            <span
              key={i}
              data-diff="removed"
              className="rounded-sm bg-rose-100/80 text-rose-900/80 line-through decoration-rose-400/80"
            >
              {part.value}
            </span>
          );
        }
        return <span key={i}>{part.value}</span>;
      })}
    </div>
  );
}

function DraftArtifact({ content, label, slug: slugProp = null }) {
  // Show changes needs a slug to find version history. Auto-written drafts have
  // no front matter, so without the resolved slug passed in it never had one.
  const slug = useMemo(() => slugProp || extractSlugFromDraftContent(content), [slugProp, content]);
  const [showChanges, setShowChanges] = useState(false);
  const [versions, setVersions] = useState([]);
  const [draftId, setDraftId] = useState(null);
  const [selectedVersionId, setSelectedVersionId] = useState('');
  const [priorContent, setPriorContent] = useState(null);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [priorLoading, setPriorLoading] = useState(false);
  const [versionsError, setVersionsError] = useState(null);

  useEffect(() => {
    if (!slug) {
      setVersions([]);
      setDraftId(null);
      setSelectedVersionId('');
      setPriorContent(null);
      setVersionsError(null);
      return undefined;
    }

    let cancelled = false;
    (async () => {
      setVersionsLoading(true);
      setVersionsError(null);
      try {
        const res = await fetch(
          `/api/ao/auto/draft-versions?slug=${encodeURIComponent(slug)}&kind=journal`
        );
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok || !json.ok) {
          setVersions([]);
          setDraftId(null);
          setSelectedVersionId('');
          setVersionsError(json.error || 'Could not load version history');
          return;
        }
        const list = Array.isArray(json.versions) ? json.versions : [];
        setVersions(list);
        setDraftId(json.draft_id || null);
        setSelectedVersionId(list[0]?.id || '');
      } catch (err) {
        if (!cancelled) {
          setVersionsError(err?.message || 'Could not load version history');
        }
      } finally {
        if (!cancelled) setVersionsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!showChanges || !selectedVersionId) {
      setPriorContent(null);
      return undefined;
    }

    let cancelled = false;
    (async () => {
      setPriorLoading(true);
      try {
        const res = await fetch(
          `/api/ao/auto/draft-versions?version_id=${encodeURIComponent(selectedVersionId)}`
        );
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok || !json.ok) {
          setPriorContent(null);
          setVersionsError(json.error || 'Could not load that version');
          return;
        }
        setPriorContent(json.version?.content ?? null);
        setVersionsError(null);
      } catch (err) {
        if (!cancelled) {
          setVersionsError(err?.message || 'Could not load that version');
        }
      } finally {
        if (!cancelled) setPriorLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [showChanges, selectedVersionId]);

  const hasHistory = versions.length > 0;
  const compareOptions = useMemo(() => {
    if (!versions.length) return [];
    const newest = versions[0];
    const oldest = versions[versions.length - 1];
    const opts = [
      {
        id: newest.id,
        label: `Most recent prior (${formatVersionTimestamp(newest.created_at)})`,
      },
    ];
    if (oldest.id !== newest.id) {
      opts.push({
        id: oldest.id,
        label: `First saved version (${formatVersionTimestamp(oldest.created_at)})`,
      });
    }
    for (const v of versions) {
      if (v.id === newest.id || v.id === oldest.id) continue;
      opts.push({
        id: v.id,
        label: formatVersionTimestamp(v.created_at),
      });
    }
    return opts;
  }, [versions]);

  return (
    <div className="flex flex-col flex-1 min-h-0 space-y-3">
      <div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-1.5 text-xs text-gray-600 select-none">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-gray-900 focus:ring-gray-400"
              checked={showChanges}
              disabled={!hasHistory || versionsLoading}
              onChange={(e) => setShowChanges(e.target.checked)}
              data-testid="draft-show-changes"
            />
            Show changes
          </label>
          {showChanges && hasHistory ? (
            <select
              className="max-w-[14rem] rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700"
              value={selectedVersionId}
              onChange={(e) => setSelectedVersionId(e.target.value)}
              aria-label="Compare to version"
              data-testid="draft-compare-version"
            >
              {compareOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      </div>
      {versionsError && showChanges ? (
        <p className="flex-shrink-0 text-xs text-rose-700">{versionsError}</p>
      ) : null}
      {!hasHistory && slug && !versionsLoading ? (
        <p className="flex-shrink-0 text-[11px] text-gray-400">
          No earlier saves yet — changes will highlight after the next edit.
        </p>
      ) : null}
      {showChanges && hasHistory ? (
        priorLoading || priorContent == null ? (
          <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-400">
            Loading changes…
          </div>
        ) : (
          <DraftDiffBody priorContent={priorContent} currentContent={content} />
        )
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap rounded-xl border border-gray-200 bg-white p-4 text-sm leading-relaxed text-gray-800">
          {content}
        </div>
      )}
      {draftId && showChanges ? (
        <p className="flex-shrink-0 text-[10px] text-gray-400">
          Green = added · Struck red = removed · Plain = unchanged
        </p>
      ) : null}
    </div>
  );
}

function GuestRecordPanel({ guest }) {
  if (!guest) return null;

  const sections = [
    { label: 'Company', value: guest.company },
    { label: 'Title', value: guest.role },
    { label: 'Website', value: guest.website_url },
    { label: 'LinkedIn', value: guest.linkedin_url },
  ].filter((s) => s.value);

  const postRecordingItems = [
    { label: 'What surprised you', value: guest.post_recording_surprise },
    { label: 'What landed', value: guest.post_recording_landed },
    { label: 'Follow-up needed', value: guest.post_recording_follow_up },
  ].filter((s) => s.value && s.value !== 'Not captured yet');

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto gap-6 p-1">
      {/* Header */}
      <div className="flex items-start gap-3">
        {guest.image_url ? (
          <img
            src={guest.image_url}
            alt={guest.name}
            className="h-14 w-14 shrink-0 rounded-full object-cover bg-gray-100"
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#E1DED8] font-serif text-lg font-bold text-[#8B7D72]">
            {String(guest.name || '').trim().split(/\s+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase() || '?'}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-serif text-base font-medium text-gray-900 leading-tight">{guest.name}</p>
          {guest.company && <p className="text-xs text-gray-500 mt-0.5">{guest.company}</p>}
          {sections.map((s) => (
            <p key={s.label} className="text-xs text-gray-400 mt-0.5">
              <span className="font-medium text-gray-500">{s.label}:</span>{' '}
              {s.label === 'Website' || s.label === 'LinkedIn' ? (
                <a href={s.value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">
                  {s.value}
                </a>
              ) : (
                s.value
              )}
            </p>
          ))}
        </div>
      </div>

      {/* Bio */}
      {guest.bio && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-2">Bio</p>
          <p className="text-xs leading-relaxed text-gray-700 whitespace-pre-wrap">{guest.bio}</p>
        </div>
      )}

      {/* Intake answers */}
      {[
        { key: 'question_1', label: "What people get wrong about them" },
        { key: 'question_2', label: "Where they are now vs 5 years ago" },
        { key: 'question_3', label: "A story they think about more than people guess" },
        { key: 'question_4', label: "What they're into right now" },
        { key: 'question_5', label: "What else they want us to know" },
      ].filter((q) => guest[q.key]).map((q) => (
        <div key={q.key}>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">{q.label}</p>
          <p className="text-xs leading-relaxed text-gray-700 whitespace-pre-wrap">{guest[q.key]}</p>
        </div>
      ))}

      {/* Research brief */}
      {guest.research_brief && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-2">Research brief</p>
          <p className="text-xs leading-relaxed text-gray-700 whitespace-pre-wrap">{guest.research_brief}</p>
        </div>
      )}

      {/* Suggested questions */}
      {guest.suggested_questions && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-2">Suggested questions</p>
          {guest.suggested_questions.person_specific?.length > 0 && (
            <div className="mb-3">
              <p className="text-[10px] font-medium text-gray-500 mb-1">Person-specific</p>
              <ol className="space-y-2">
                {guest.suggested_questions.person_specific.map((item, i) => (
                  <li key={i} className="text-xs text-gray-700 leading-relaxed">
                    <span className="font-medium">{i + 1}.</span> {item.question}
                  </li>
                ))}
              </ol>
            </div>
          )}
          {guest.suggested_questions.ao_theology?.length > 0 && (
            <div>
              <p className="text-[10px] font-medium text-gray-500 mb-1">AO connections</p>
              <ol className="space-y-2">
                {guest.suggested_questions.ao_theology.map((item, i) => (
                  <li key={i} className="text-xs text-gray-700 leading-relaxed">
                    <span className="font-medium">{i + 1}.</span> {item.question}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {/* Post-recording notes */}
      {postRecordingItems.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-2">Post-recording notes</p>
          {postRecordingItems.map((item) => (
            <div key={item.label} className="mb-2">
              <p className="text-[10px] font-medium text-gray-500">{item.label}</p>
              <p className="text-xs text-gray-700 leading-relaxed">{item.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Bart's notes */}
      {guest.bart_notes && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-2">Bart's notes</p>
          <p className="text-xs leading-relaxed text-gray-700 whitespace-pre-wrap">{guest.bart_notes}</p>
        </div>
      )}
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
  journalPendingPublish,
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
  onPublishJournal,
  currentCardIndex,
  onCardIndexChange,
  cardReviewMode,
  onCardReviewModeChange,
  seedManifestTotal,
  guestRecord,
  guestRecordLoading,
  chatCaptionsText = null,
  onStageApproved = null,
  stageRefreshKey = 0,
}) {
  const hasCards = generatedImages?.length > 0;
  const hasDesign = generatedDesignImages?.length > 0;
  const hasAnyGenerated = hasCards || hasDesign;
  // A journal draft gets the staged, tabbed panel (notes/AUTO_STAGED_WORKSPACE_SPEC.md).
  // Every other artifact type keeps the layout it has always had.
  // Front matter alone never identified an Auto-written draft, so the tabs
  // silently never engaged. See draftArtifactSlug.js.
  const stagedJournalSlug = resolveDraftArtifactSlug(artifact);
  const stagedJournal = Boolean(stagedJournalSlug);
  // A caption set for cards shows one card at a time with its picture (2026-10-28).
  const packages = !hasCards && artifact?.type === 'captions' ? cardPackages(artifact.content, generatedDesignImages) : [];
  const showPackages = packages.length > 0;
  // Tap any image in the panel to open it full screen and pinch to zoom (2026-10-27).
  const [zoomImage, setZoomImage] = useState(null);
  const openZoom = (e) => {
    if (!isZoomableImage(e.target)) return;
    e.preventDefault();
    setZoomImage({ src: e.target.currentSrc || e.target.src, alt: e.target.alt || '' });
  };
  return (
    <div data-quotable="1" onClick={openZoom} className="flex h-full min-h-0 min-w-0 w-full flex-shrink-0 flex-col border-l border-gray-200 bg-gray-50">
      {zoomImage ? <ImageZoom src={zoomImage.src} alt={zoomImage.alt} onClose={() => setZoomImage(null)} /> : null}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide truncate pr-2">
          {hasCards && (artifact?.type === 'captions' || artifact?.type === 'list')
            ? `Cards + Captions — ${generatedImages.length} in batch`
            : hasCards
            ? `Card ${(currentCardIndex ?? 0) + 1} of ${seedManifestTotal ?? generatedImages.length}`
            : guestRecord
            ? `${guestRecord.name} — Guest record`
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
        {journalPendingPublish && !journalPublishBanner && (
          <div className="shrink-0 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-medium mb-1">
              {`Schedule captions: ${journalPendingPublish.attrs?.title}`}
            </p>
            <p className="text-xs text-amber-700 mb-3">
              This entry is already live. Click to schedule social captions to the queue.
            </p>
            {(() => {
              const required = [
                'linkedin_personal',
                'instagram_business',
                'facebook_business',
                'twitter',
              ];
              const block = String(journalPendingPublish.socialCaptionsBlock || '');
              const missing = block
                ? required.filter(
                    (key) => !new RegExp(`\\[CAPTION\\s+platform="${key}"`, 'i').test(block)
                  )
                : required;
              if (!block) {
                return (
                  <p className="mb-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-900">
                    No social captions block found. Ask Auto to write LinkedIn Personal, Instagram
                    Business, Facebook Business, and X captions before scheduling.
                  </p>
                );
              }
              if (missing.length === 0) return null;
              return (
                <p className="mb-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-900">
                  Missing captions for: {missing.join(', ')}. Scheduling will queue whatever captions
                  are present — ask Auto for the missing ones so they can be queued too.
                </p>
              );
            })()}
            <button
              type="button"
              onClick={onPublishJournal}
              className="w-full py-2 px-3 bg-amber-900 text-white text-sm font-medium rounded-lg hover:bg-amber-800 transition-colors"
            >
              Schedule social posts
            </button>
          </div>
        )}
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
            {journalPublishBanner.captionsSummary ? (
              <p className="mt-2 text-xs text-green-950/80">{journalPublishBanner.captionsSummary}</p>
            ) : null}
            {Array.isArray(journalPublishBanner.warnings) && journalPublishBanner.warnings.length > 0 && (
              <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                <p className="font-medium mb-1">The entry is live, but part of this did not fully complete:</p>
                <ul className="list-disc pl-4 space-y-0.5">
                  {journalPublishBanner.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
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

        {/* In the staged panel, images live in the Image tab and nowhere else. */}
        {hasDesign && !stagedJournal && !showPackages && (
          <div className={hasCards ? 'min-h-0 flex-1 overflow-y-auto' : 'min-h-0 flex-1 overflow-y-auto'}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Generated Images</p>
            <div className="space-y-3">
              {orderDesignImagesNewestFirst(generatedDesignImages).map((img) => (
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
          guestRecord ? (
            <GuestRecordPanel guest={guestRecord} />
          ) : guestRecordLoading ? (
            <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
              <AOMark className="w-8 h-8 text-gray-200 mb-3 animate-pulse" />
              <p className="text-xs text-gray-400 leading-relaxed">Loading guest record…</p>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
              <AOMark className="w-8 h-8 text-gray-200 mb-3" />
              <p className="text-xs text-gray-400 leading-relaxed">
                Quote cards, drafts, and content will appear here as you work.
              </p>
            </div>
          )
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

        {stagedJournal && (
          <StagedJournalPanel
            slug={stagedJournalSlug}
            refreshKey={stageRefreshKey}
            postContent={artifact.content}
            chatCaptionsText={chatCaptionsText}
            onStageApproved={onStageApproved}
            designImages={generatedDesignImages}
            onImageError={onGeneratedDesignImageError}
            renderPost={(contentOverride) => (
              <div className="flex flex-col flex-1 min-h-0 gap-3">
                <DraftArtifact content={contentOverride || artifact.content} label={artifact.label} slug={stagedJournalSlug} />
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
          />
        )}

        {artifact?.type === 'draft' && !stagedJournal && (
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
            {showPackages ? (
              <CardPackages packages={packages} onImageError={onGeneratedDesignImageError} />
            ) : (
              <div className="flex flex-col flex-1 min-h-0 space-y-3">
                <p className="flex-shrink-0 text-xs font-semibold uppercase tracking-wide text-gray-500">{artifact.label}</p>
                <div className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap rounded-xl border border-gray-200 bg-white p-4 text-sm leading-relaxed text-gray-800">
                  {artifact.content}
                </div>
              </div>
            )}
            <div className="flex-shrink-0 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs leading-relaxed text-blue-700">
              {showPackages
                ? 'A spot check. These run on their own once the checks pass. Use Revise if something is off.'
                : 'Approve these captions to move them on.'}
            </div>
            <div className="flex shrink-0 flex-col gap-2">
              <button type="button" onClick={onApprove} className="w-full py-2 px-3 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors">
                {showPackages && packages.every((p) => p.image) ? 'Looks good, schedule them' : 'Approve captions'}
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

/**
 * The team, the way Slack shows a channel's members: a stack of overlapping
 * faces with a count, and a tap opens everyone with name and role. It holds
 * any number of teammates (2026-10-27: the row of five ran the roles together,
 * "I think there are going to be more agents").
 */
const FACEPILE_SHOWN = 5;
export function TeamFacepile({ members = MENTION_CHOICES.filter((c) => c.key !== 'team'), compact = false }) {
  const [open, setOpen] = useState(false);
  const shown = members.slice(0, FACEPILE_SHOWN);
  const extra = members.length - shown.length;
  return (
    <div className="px-1">
      <button
        type="button"
        data-testid="team-facepile"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-lg py-1 text-left hover:bg-gray-100"
      >
        <span className="flex -space-x-2">
          {shown.map((m) => (
            <img
              key={m.key}
              src={avatarFor(m.key)}
              alt=""
              aria-hidden="true"
              className="w-7 h-7 rounded-full object-cover bg-orange-50 ring-2 ring-gray-50"
              draggable={false}
            />
          ))}
          {extra > 0 ? (
            <span className="flex w-7 h-7 items-center justify-center rounded-full bg-gray-200 text-[10px] font-semibold text-gray-700 ring-2 ring-gray-50">+{extra}</span>
          ) : null}
        </span>
        <span className={compact ? 'sr-only' : 'min-w-0 flex-1 truncate text-xs text-gray-600'}>{members.length} teammates</span>
        <span className="text-[10px] text-gray-400" aria-hidden="true">{open ? '▲' : '▼'}</span>
      </button>
      {open ? (
        <ul data-testid="team-list" className="mt-1 space-y-0.5">
          {members.map((m) => (
            <li key={m.key} className="flex items-center gap-2 rounded-md px-1 py-1" title={`Bring ${m.handle} in with @${m.handle}.`}>
              <img src={avatarFor(m.key)} alt="" aria-hidden="true" className="w-6 h-6 rounded-full object-cover bg-orange-50" draggable={false} />
              <span className="text-xs font-medium text-gray-900">{m.handle}</span>
              <span className="min-w-0 truncate text-xs text-gray-500">{m.role}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * #queue at the top of the sidebar, with the count of what is waiting on Bart
 * (2026-10-27: "Need a way to easily see what needs my attention.").
 */
export function QueueChannelRow({ count = 0, active = false, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`mx-2 mb-3 flex w-[calc(100%-1rem)] items-center gap-2 rounded-lg px-2 py-2 text-left ${active ? 'bg-white shadow-sm' : 'hover:bg-white'}`}
    >
      <span className="flex-1 text-sm font-semibold text-gray-900"># queue</span>
      {count > 0 ? (
        <span className="min-w-[22px] rounded-full bg-red-600 px-1.5 py-0.5 text-center text-[11px] font-bold text-white" aria-label={`${count} waiting on you`}>
          {count}
        </span>
      ) : (
        <span className="text-[11px] text-gray-400">caught up</span>
      )}
    </button>
  );
}

export function ThreadSidebar({
  threads,
  archivedThreads,
  activeThreadId,
  onSelectThread,
  onNewThread,
  onNewAgentThread,
  onOpenTeam,
  teamNeedsCount = 0,
  onRefresh,
  className = '',
  showHeader = true,
  channels = null,
  onNewInChannel = null,
  onMoveThread = null,
  onNewChannel = null,
  onOpenQueue = null,
  queueCount = 0,
  queueOpen = false,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [openChannels, setOpenChannels] = useState({});
  const [expandedChannels, setExpandedChannels] = useState({});
  const [movingId, setMovingId] = useState(null);
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

  const byChannel = useMemo(() => {
    const grouped = groupByChannel(visibleMain);
    // A thread whose channel is not listed (a project set aside) shows under #general, never nowhere.
    const known = new Set([...(channels?.standing || []), ...(channels?.projects || [])].map((c) => c.key));
    for (const k of Object.keys(grouped)) {
      if (known.size && !known.has(k)) {
        grouped.general = [...(grouped.general || []), ...grouped[k]];
        delete grouped[k];
      }
    }
    return grouped;
  }, [visibleMain, channels]);
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
        className={`group relative flex items-stretch overflow-visible border-l-2 transition-colors ${
          isActive ? 'bg-white border-l-gray-900' : 'border-l-transparent hover:bg-white'
        } ${openMenuId === thread.id ? 'z-50' : ''}`}
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
          <div className="absolute right-1 top-1/2 -translate-y-1/2 z-50" ref={openMenuId === thread.id ? menuRef : null}>
            <button
              type="button"
              aria-label="Chat options"
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenuId((prev) => (prev === thread.id ? null : thread.id));
              }}
              className="p-1.5 rounded-md text-gray-400 opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:text-gray-700 hover:bg-gray-100 transition-opacity"
            >
              <DotsVerticalIcon />
            </button>
            {openMenuId === thread.id && (
              <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
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
                {onMoveThread && channels ? (
                  movingId === thread.id ? (
                    <div className="max-h-56 overflow-y-auto border-t border-gray-100 py-1">
                      {[...(channels.standing || []), ...(channels.projects || [])].map((c) => (
                        <button
                          key={c.key}
                          type="button"
                          className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 ${channelOfThread(thread) === c.key ? 'font-semibold text-gray-900' : 'text-gray-700'}`}
                          onClick={async () => {
                            setOpenMenuId(null);
                            setMovingId(null);
                            await onMoveThread(thread.id, c.key);
                          }}
                        >
                          # {c.name}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                      onClick={() => setMovingId(thread.id)}
                    >
                      Move to…
                    </button>
                  )
                ) : null}
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
        // One short row (2026-10-27, Bart: the sidebar "is a little bit messy").
        <div className="px-3 pt-3 pb-2 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <TeamFacepile compact />
            </div>
            {onOpenTeam ? (
              <button
                type="button"
                onClick={onOpenTeam}
                className="mt-0.5 flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-700"
              >
                <span>Team board</span>
                {teamNeedsCount > 0 ? (
                  <span className="rounded-full bg-amber-400 px-1.5 text-[11px] font-semibold text-gray-900" aria-label={`${teamNeedsCount} need you`}>
                    {teamNeedsCount}
                  </span>
                ) : null}
              </button>
            ) : null}
          </div>
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

        {channels && !searchQuery.trim() ? (
          <>
            {onOpenQueue ? (
              <QueueChannelRow count={queueCount} active={queueOpen} onOpen={onOpenQueue} />
            ) : null}
            {pinned.length > 0 && renderSection('Pinned', pinned)}
            {[
              ['Channels', channels.standing || []],
              ['Projects', channels.projects || []],
            ].map(([label, list]) => (
              <div key={label} className="mb-3">
                <div className="flex items-center justify-between px-4 py-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
                  {label === 'Projects' && onNewChannel ? (
                    <button type="button" onClick={onNewChannel} className="text-[11px] font-semibold text-gray-500 hover:text-gray-900" aria-label="New project channel">
                      + New
                    </button>
                  ) : null}
                </div>
                {list.map((c) => {
                  const items = (byChannel[c.key] || []).filter((t) => !t.pinned);
                  const open = !!openChannels[c.key];
                  const hasActive = items.some((t) => t.id === activeThreadId);
                  // Each channel is one line; only the one Bart is in shows its
                  // conversations unless he opens another (2026-10-27).
                  const expanded = expandedChannels[c.key] ?? hasActive;
                  const shown = !expanded ? [] : open ? items : items.slice(0, 3);
                  return (
                    <div key={c.key} className="mb-0.5">
                      <div className={`group flex items-center gap-2 px-3 py-1 ${hasActive ? 'text-gray-900' : 'text-gray-700'}`}>
                        <button
                          type="button"
                          onClick={() => setExpandedChannels((o) => ({ ...o, [c.key]: !expanded }))}
                          aria-expanded={expanded}
                          aria-label={`${expanded ? 'Hide' : 'Show'} conversations in #${c.name}`}
                          title={c.purpose}
                          className="flex min-h-[32px] min-w-0 flex-1 items-center gap-2 rounded-md text-left hover:bg-white"
                        >
                          <img src={avatarFor(c.lead)} alt="" aria-hidden="true" className="w-5 h-5 rounded-full object-cover bg-orange-50 flex-shrink-0" draggable={false} />
                          <span className="flex-1 min-w-0 truncate text-sm font-semibold"># {c.name}</span>
                          {items.length ? <span className="text-[11px] text-gray-400">{items.length}</span> : null}
                          {items.length ? (
                            <span className="text-[10px] text-gray-400" aria-hidden="true">
                              {expanded ? '▾' : '▸'}
                            </span>
                          ) : null}
                        </button>
                        {onNewInChannel ? (
                          <button
                            type="button"
                            onClick={() => onNewInChannel(c.key)}
                            aria-label={`New thread in ${c.name}`}
                            title={`New thread in #${c.name}`}
                            className="min-w-[32px] min-h-[32px] inline-flex items-center justify-center rounded-md text-gray-500 hover:bg-white hover:text-gray-900"
                          >
                            <PlusIcon />
                          </button>
                        ) : null}
                      </div>
                      {shown.map(renderThreadRow)}
                      {expanded && items.length > 3 ? (
                        <button
                          type="button"
                          onClick={() => setOpenChannels((o) => ({ ...o, [c.key]: !open }))}
                          className="w-full text-left px-4 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-800"
                        >
                          {open ? 'Show fewer' : `Show ${items.length - 3} more`}
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ))}
          </>
        ) : (
          <>
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
          </>
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

export default function AutoV2Panel({ onNavigate, className,
}) {
  const [messages, setMessages] = useState([]);
  const [threads, setThreads] = useState([]);
  const [channels, setChannels] = useState(null);
  const [archivedThreads, setArchivedThreads] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(null);
  useEffect(() => {
    activeThreadIdRef.current = activeThreadId;
  }, [activeThreadId]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [imageGenerating, setImageGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [artifact, setArtifact] = useState(null);
  const [artifactOpen, setArtifactOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [startingNew, setStartingNew] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [generatedImages, setGeneratedImages] = useState([]);
  const [generatedDesignImages, setGeneratedDesignImages] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [cardReviewMode, setCardReviewMode] = useState('single'); // 'single' | 'batch'
  const [seedManifestTotal, setSeedManifestTotal] = useState(null);
  const [journalPublishBanner, setJournalPublishBanner] = useState(null);
  const [journalPendingPublish, setJournalPendingPublish] = useState(null);
  const [linkedinTokenWarning, setLinkedinTokenWarning] = useState(null);
  const [metricsSyncAlerts, setMetricsSyncAlerts] = useState([]);
  // Dismissal is keyed to the alert text, not to time and not forever. The
  // LinkedIn engagement failure behind this banner is blocked on LinkedIn's own
  // review queue and has been for weeks, so an undismissable warning becomes
  // permanent furniture. Content-keyed means this exact failure stays dismissed
  // while a new or changed failure still gets through.
  const [dismissedMetricsAlertKey, setDismissedMetricsAlertKey] = useState(() => {
    try {
      return localStorage.getItem('ao_dismissed_metrics_alert_key') || null;
    } catch {
      return null;
    }
  });
  const metricsAlertKey = useMemo(() => metricsAlertKeyFor(metricsSyncAlerts), [metricsSyncAlerts]);
  const [devotionalPublishBanner, setDevotionalPublishBanner] = useState(null);
  const [episodeDraft, setEpisodeDraft] = useState(null);
  const [episodeProcessBanner, setEpisodeProcessBanner] = useState(null);
  const [splitPercent, setSplitPercent] = useState(50);
  const [dividerDragging, setDividerDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileTab, setMobileTab] = useState('chat');
  const [mobileArtifactOpen, setMobileArtifactOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileArtifactDrawerShown, setMobileArtifactDrawerShown] = useState(false);
  const [artifactUnread, setArtifactUnread] = useState(false);
  const [guestRecord, setGuestRecord] = useState(null);
  const [guestRecordLoading, setGuestRecordLoading] = useState(false);
  const keyboardInset = useKeyboardInset({ enabled: isMobile });
  const keyboardOpen = keyboardInset > 24;

  const splitContainerRef = useRef(null);
  const isMobileRef = useRef(false);
  const userAdjustedSplit = useRef(false);
  const processedJournalPublishKeys = useRef(new Set());
  const processedDevotionalPublishKeys = useRef(new Set());
  const processedEpisodeProcessKeys = useRef(new Set());
  const processedNavigateKeys = useRef(new Set());
  // Timestamp — images from messages before this time are hidden after Clear.
  const clearedAt = useRef(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  // Auto's team (2026-10-25): the team board, a reply that is still being
  // finished on the server after the screen lost the stream, and a passage
  // Bart highlighted to reply to.
  const [teamOpen, setTeamOpen] = useState(false);
  const [teamNeedsCount, setTeamNeedsCount] = useState(0);
  // #queue (2026-10-27): what is waiting on Bart, opened in place of the chat.
  const [queueOpen, setQueueOpen] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get('queue') === '1';
    } catch (_) {
      return false;
    }
  });
  // A link to /ao/analyst?queue=1 while the chat is already open (a teammate's
  // link, the old Queue menu) opens #queue too.
  useEffect(() => {
    const onNav = () => {
      try {
        if (new URLSearchParams(window.location.search).get('queue') === '1') setQueueOpen(true);
      } catch (_) {}
    };
    window.addEventListener('popstate', onNav);
    return () => window.removeEventListener('popstate', onNav);
  }, []);
  const [queueCount, setQueueCount] = useState(0);
  // Rechecked when the conversation changes too, so an approval made in a
  // post's panel takes the number down right away, not up to 30 seconds later.
  const [queueNudge, setQueueNudge] = useState(0);
  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const res = await fetch('/api/ao/queue');
        const json = await res.json().catch(() => ({}));
        if (alive && res.ok && json.ok) setQueueCount(Number(json.count) || 0);
      } catch (_) {}
    };
    check();
    const t = setInterval(check, 30000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [queueOpen, queueNudge]);
  useEffect(() => {
    const t = setTimeout(() => setQueueNudge((n) => n + 1), 1500);
    return () => clearTimeout(t);
  }, [messages.length]);
  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const res = await fetch('/api/ao/team/tasks?limit=40');
        const json = await res.json().catch(() => ({}));
        if (alive && res.ok && json.ok) setTeamNeedsCount((json.needs_bart || []).length + (Number(json.emails_waiting) || 0));
      } catch (_) {}
    };
    check();
    const t = setInterval(check, 30000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [teamOpen]);
  const [waitingNote, setWaitingNote] = useState('');
  // The team still working after the reply (teammates, huddles), shown with
  // the working animation; and Bart's messages typed while a reply was still
  // coming, sent in order as soon as it lands (2026-10-27).
  const [teamBusy, setTeamBusy] = useState(false);
  // The server's word that a huddle or a teammate's task is running here,
  // kept apart from teamBusy (the follow-ups this screen itself is running).
  const [serverWorking, setServerWorking] = useState(false);
  // Anthropic's spending limit paused the team (2026-10-28); shown above the chat.
  const [aiPause, setAiPause] = useState(null);
  const [queued, setQueued] = useState([]);
  const queueRef = useRef([]);
  const bgGenRef = useRef(0);
  const sendingRef = useRef(false);
  const sendMessageRef = useRef(null);
  const [quoteCandidate, setQuoteCandidate] = useState('');
  const activeThreadIdRef = useRef(null);
  const quoteClearTimer = useRef(null);
  const fileInputRef = useRef(null);
  const imageUploadInputRef = useRef(null);
  const [uploadingHeaderImage, setUploadingHeaderImage] = useState(false);

  const handleHeaderImageUpload = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      if (e.target) e.target.value = '';
      if (!file) return;

      // The post is usually open in the panel, and the thread names it either
      // way. Asking every time was pure friction (Bart, 2026-09-20: "Auto should
      // be intelligent enough to know what post we are adding an image to").
      const target = resolveUploadTargetSlug({
        artifactSlug: resolveDraftArtifactSlug(artifact),
        messages,
      });
      const slug =
        target.slug ||
        window.prompt('Which draft is this header image for? Enter the slug:', '') ||
        '';
      if (!slug.trim()) return;

      setUploadingHeaderImage(true);
      setError('');

      try {
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.onerror = () => reject(new Error('Could not read the selected file'));
          reader.readAsDataURL(file);
        });

        const commaIdx = dataUrl.indexOf(',');
        if (commaIdx === -1) throw new Error('Invalid file data');
        const header = dataUrl.slice(0, commaIdx);
        const base64Data = dataUrl.slice(commaIdx + 1);
        const mediaTypeMatch = header.match(/^data:([^;]+);/);
        const mediaType = mediaTypeMatch ? mediaTypeMatch[1] : file.type || 'image/png';

        const res = await fetch('/api/ao/auto/upload-header-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug: slug.trim(),
            image_base64: base64Data,
            media_type: mediaType,
            thread_id: activeThreadId || null,
          }),
        });
        const json = await res.json().catch(() => ({}));

        if (!res.ok || !json.ok) {
          throw new Error(json.error || 'Upload failed');
        }

        setGeneratedDesignImages((prev) => [
          ...prev,
          {
            url: json.image_url,
            label: `${json.title || json.slug} (your upload, direct to draft)`,
            addedAt: Date.now(),
            manualUpload: true,
          },
        ]);

        // The upload shows in the conversation straight away. Bart had to ask
        // whether Auto knew about his image (2026-09-20); now it is on screen
        // before he types anything.
        if (json.chat_message) {
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: json.chat_message,
              id: `manual-upload-${Date.now()}`,
              meta: { manual_header_upload: true },
            },
          ]);
        }

        if (json.thread_fact_recorded === false && json.thread_fact_error) {
          setError(
            `Image saved to the draft, but Auto was not notified (${json.thread_fact_error}). Tell Auto the slug and image URL if needed.`
          );
        }
      } catch (err) {
        setError(err?.message || 'Could not upload header image');
      } finally {
        setUploadingHeaderImage(false);
      }
    },
    [messages, activeThreadId, artifact]
  );

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
    () =>
      Array.isArray(messages)
        ? messages.filter((m) => m.role !== 'receipt' && m.role !== 'system')
        : [],
    [messages]
  );

  const contextPill = useMemo(() => extractContextPill(visibleChatMessages), [visibleChatMessages]);
  const idleLine = useMemo(() => idleStatus(visibleChatMessages), [visibleChatMessages]);
  // A question hides the moment Bart taps Yes or Answer (2026-10-27: "as soon
  // as I click it needs to go away"); his reply then closes it for good.
  const [dismissedQuestions, setDismissedQuestions] = useState(() => new Set());
  const pinnedQuestions = useMemo(
    () => openQuestions(visibleChatMessages).filter((q) => !dismissedQuestions.has(q.id)),
    [visibleChatMessages, dismissedQuestions]
  );
  const dismissQuestion = useCallback((q) => setDismissedQuestions((prev) => new Set(prev).add(q.id)), []);

  const hasArtifactContent = useMemo(
    () =>
      !!(
        artifact ||
        guestRecord ||
        generatedImages.length > 0 ||
        generatedDesignImages.length > 0 ||
        journalPublishBanner ||
        devotionalPublishBanner ||
        episodeDraft ||
        episodeProcessBanner
      ),
    [
      artifact,
      guestRecord,
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

  // What was in the panel when Bart closed it. The panel reopens on its own
  // only for something new, not for the same post or image rebuilt by the
  // next check for messages (2026-10-27: "I closed the artifact panel because
  // it was tied to Josiah. It re-opened on its own.").
  const artifactKey = artifact ? `${artifact.type}|${artifact.slug || resolveDraftArtifactSlug(artifact) || artifact.label || ''}` : null;
  const latestImageKey = [...generatedImages.map((g) => g?.url || g?.card), ...generatedDesignImages.map((g) => g?.url)].filter(Boolean).slice(-1)[0] || null;
  // Every item closed this visit is remembered, not just the last one: the
  // panel flips between two items while a reply loads, and remembering one
  // key let The Josiah Archetype reopen after every message (2026-10-28).
  const dismissedPanelRef = useRef({ artifacts: new Set(), images: new Set() });
  const closeArtifactPanel = useCallback(() => {
    if (artifactKey) dismissedPanelRef.current.artifacts.add(artifactKey);
    if (latestImageKey) dismissedPanelRef.current.images.add(latestImageKey);
    setArtifactOpen(false);
  }, [artifactKey, latestImageKey]);

  useEffect(() => {
    if (artifactKey && !dismissedPanelRef.current.artifacts.has(artifactKey)) signalNewArtifact();
  }, [artifactKey, signalNewArtifact]);

  useEffect(() => {
    if ((generatedImages.length > 0 || generatedDesignImages.length > 0) && !dismissedPanelRef.current.images.has(latestImageKey)) {
      signalNewArtifact();
      // Auto-advance to the newest card when new images arrive
      if (generatedImages.length > 0) {
        const sorted = [...generatedImages].sort((a, b) => a.card - b.card);
        setCurrentCardIndex(sorted.length - 1);
      }
    }
  }, [generatedImages, generatedDesignImages, latestImageKey, signalNewArtifact]);

  useEffect(() => {
    if (!Array.isArray(messages) || messages.length === 0) return;

    // Look back through the last several assistant replies for the most recent
    // one that actually contains a complete publish signal, instead of only
    // trusting the single most recent message. Auto's very next reply after
    // firing [PUBLISH_JOURNAL] is often an ordinary follow-up ("let me know if
    // you want changes") that does not repeat the tag -- checking only that
    // last message silently made the Publish button disappear with no error.
    const recentAssistantMessages = [...messages]
      .filter((m) => m.role === 'assistant')
      .reverse()
      .slice(0, 10);

    let parsed = null;
    for (const m of recentAssistantMessages) {
      parsed = extractJournalPublishFromAssistantContent(String(m.content || ''));
      if (parsed) break;
    }
    if (!parsed) return;

    const { attrs, journalContent, socialCaptionsBlock } = parsed;

    // In-memory success state from THIS session (survives until remount).
    const alreadyPublishedThisSession = journalPublishBanner?.status === 'success' &&
      journalPublishBanner?.journalUrl?.includes(attrs.slug);

    const categoriesRaw = String(attrs.categories || '')
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
    const notify =
      attrs.notify == null || attrs.notify === ''
        ? true
        : !/^(false|0|no)$/i.test(String(attrs.notify).trim());

    // In-memory session state resets on navigation/remount, but the real
    // published status doesn't -- confirmed live: navigating to Library and
    // back made an already-published post's "Ready to publish" bar reappear,
    // because journalPublishBanner had reset to null and nothing checked the
    // actual database. Verify against the real draft status before deciding.
    let cancelled = false;
    (async () => {
      let isActuallyPublished = alreadyPublishedThisSession;
      if (!isActuallyPublished && attrs.slug) {
        try {
          const res = await fetch(
            `/api/ao/auto/content-draft?slug=${encodeURIComponent(attrs.slug)}&kind=journal&include_published=1`
          );
          const json = await res.json();
          if (json?.ok && json.draft?.status === 'published') {
            isActuallyPublished = true;
          }
        } catch (statusCheckErr) {
          console.error('[AutoV2Panel] Could not verify real draft status (showing pending publish as a safe default):', statusCheckErr?.message || statusCheckErr);
        }
      }
      if (cancelled) return;

      if (isActuallyPublished) {
        // Already published -- check whether captions are ALSO already scheduled before
        // showing a "schedule captions" prompt. Confirmed live: this post's captions were
        // already fully scheduled (2 posted, 2 still queued for later today), but the bar
        // showed anyway with a button that had no dedup protection at all.
        try {
          const capRes = await fetch(`/api/ao/auto/scheduled-posts-status?slug=${encodeURIComponent(attrs.slug)}`);
          const capJson = await capRes.json();
          if (capJson?.ok && capJson.scheduled_count > 0) {
            if (cancelled) return;
            setJournalPendingPublish(null);
            return;
          }
        } catch (capCheckErr) {
          console.error('[AutoV2Panel] Could not verify scheduled-captions status (showing prompt as a safe default):', capCheckErr?.message || capCheckErr);
        }
      }

      if (cancelled) return;

      // Full first-time publish no longer uses a Ready-to-publish UI button.
      // Approving the draft + telling Auto to publish (publish_journal tool) is the gate.
      // Keep the amber bar only for caption-attach on an already-published entry
      // when captions are still missing (legacy [PUBLISH_JOURNAL] + schedule path).
      if (!isActuallyPublished) {
        setJournalPendingPublish(null);
        return;
      }

      setJournalPendingPublish({
        attrs,
        journalContent,
        socialCaptionsBlock,
        categoriesRaw,
        notify,
        captionAttachOnly: true,
      });
      signalNewArtifact();
    })();

    return () => {
      cancelled = true;
    };
  }, [messages, activeThreadId, signalNewArtifact, journalPublishBanner]);

  // Detect [UPDATE_SCHEDULED_CAPTIONS] signal and call the update route
  useEffect(() => {
    if (!Array.isArray(messages) || messages.length === 0) return;

    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
    if (!lastAssistant) return;

    const text = String(lastAssistant.content || '');
    const signalMatch = text.match(/\[UPDATE_SCHEDULED_CAPTIONS([^\]]*)\]/i);
    if (!signalMatch) return;

    // Extract slug from signal attributes
    const slugMatch = signalMatch[1]?.match(/slug="([^"]+)"/i);
    if (!slugMatch) return;
    const slug = slugMatch[1];

    // Extract caption blocks
    const captionsBlockMatch = text.match(/\[UPDATE_SCHEDULED_CAPTIONS[^\]]*\]([\s\S]*?)\[\/UPDATE_SCHEDULED_CAPTIONS\]/i);
    if (!captionsBlockMatch) return;

    const captionsBlock = captionsBlockMatch[1];
    const captions = {};
    const platformKeys = ['linkedin_personal', 'instagram_business', 'facebook_business', 'twitter'];

    for (const key of platformKeys) {
      const openTagPattern = new RegExp(`\\[CAPTION\\s+platform="${key}"([^\\]]*)\\]`, 'i');
      const openMatch = captionsBlock.match(openTagPattern);
      if (!openMatch) continue;

      const openTagEnd = captionsBlock.indexOf(openMatch[0]) + openMatch[0].length;
      const remaining = captionsBlock.slice(openTagEnd);
      const nextCaptionIdx = remaining.search(/\[CAPTION\s+platform=/i);
      const closingTagIdx = remaining.search(/\[\/CAPTION\]/i);
      const boundaries = [nextCaptionIdx, closingTagIdx].filter((idx) => idx >= 0);
      const endIdx = boundaries.length > 0 ? Math.min(...boundaries) : remaining.length;
      const capText = remaining.slice(0, endIdx).trim();
      if (capText) captions[key] = capText;
    }

    if (Object.keys(captions).length === 0) return;

    // Deduplicate — only fire once per signal per thread
    const updateKey = `update:${slug}:${Object.keys(captions).sort().join(',')}`;
    if (processedJournalPublishKeys.current.has(updateKey)) return;
    processedJournalPublishKeys.current.add(updateKey);

    // Call the update route
    (async () => {
      try {
        const res = await fetch('/api/ao/auto/update-scheduled-captions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug, captions }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.ok) {
          console.error('[AutoV2Panel] Caption update failed:', json?.message || json?.error);
        } else {
          console.log('[AutoV2Panel] Captions updated:', json.message);
        }
      } catch (err) {
        console.error('[AutoV2Panel] Caption update threw:', err?.message || err);
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

    // Only fire if the user's current message contains a transcript or explicitly
    // asks to process an episode. Do not fire based on old signals in thread history.
    const currentUserMessage = String(lastUser?.content || '').trim();
    // A long message is not a transcript: on 2026-10-24 a pasted journal series
    // brief was processed as a podcast episode because it ran past 500
    // characters. Only an explicit transcript or an explicit ask counts.
    const isEpisodeRequest =
      /\[EPISODE_TRANSCRIPT\]/i.test(currentUserMessage) ||
      /process.{0,20}episode/i.test(currentUserMessage) ||
      /episode.{0,20}transcript/i.test(currentUserMessage) ||
      /riverside/i.test(currentUserMessage) ||
      /\[Attached file:|--- Attached file:/i.test(currentUserMessage); // an uploaded transcript file

    if (!isEpisodeRequest) return;

    if (!transcript || transcript.length < 200) return;

    const processKey = `${activeThreadId || 'thread'}:${transcript.slice(0, 120)}`;
    if (processedEpisodeProcessKeys.current.has(processKey)) return;
    processedEpisodeProcessKeys.current.add(processKey);

    const episode_type = String(signal.episode_type || 'solo').toLowerCase() === 'guest' ? 'guest' : 'solo';
    const guestIdsFromBlock = extractEpisodeGuestsIds(String(lastAssistant.content || ''));
    const guest =
      !guestIdsFromBlock &&
      episode_type === 'guest' &&
      signal.guest_name
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
        const payload = {
          transcript,
          episode_type: guestIdsFromBlock?.length > 1 ? 'guest' : episode_type,
          episode_brief: signal.episode_brief || '',
          recorded_date: signal.recorded_date || '',
        };
        if (guestIdsFromBlock?.length) {
          payload.guest_ids = guestIdsFromBlock;
        } else {
          payload.guest = guest;
          payload.guest_id = signal.guest_id || '';
        }

        const res = await fetch('/api/ao/auto/episode-process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
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

    const path = extractNavigateToSignal(String(lastAssistant.content || ''));
    if (!path) return;

    const navKey = `${activeThreadId || 'thread'}:${lastAssistant.id || lastAssistant.content?.slice(0, 40)}`;
    if (processedNavigateKeys.current.has(navKey)) return;
    processedNavigateKeys.current.add(navKey);

    // Give the user a moment to read Auto's final message before navigating away.
    const timer = setTimeout(() => {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
      window.scrollTo({ top: 0, behavior: 'instant' });
    }, 1500);

    return () => clearTimeout(timer);
  }, [messages, activeThreadId]);

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
        // Set cleared timestamp to the manifest message time so images
        // from before the manifest are hidden
        const manifestTime = m.created_at
          ? new Date(m.created_at).getTime()
          : Date.now();
        clearedAt.current = manifestTime - 1; // just before manifest
        break;
      }
    }

    // Artifact panel: prefer latest tag; if missing, keep prior tag in thread.
    // Never blank the panel just because the latest reply was prose-only (#131).
    const resolved = resolveArtifactPanelState(allMsgs);
    if (resolved.clear) {
      setArtifact(null);
      // Do not clear images — they persist for the whole thread session
      // (still run image accumulation below when messages exist)
    } else if (resolved.artifact) {
      setArtifact(resolved.artifact);
      const slug = extractSlugFromDraftContent(resolved.artifact.content) || resolved.artifact.slug || null;
      if (slug && resolved.artifact.type === 'draft') {
        void (async () => {
          try {
            const res = await fetch(
              `/api/ao/auto/content-draft?slug=${encodeURIComponent(slug)}&kind=journal&include_published=1`
            );
            const json = await res.json().catch(() => ({}));
            if (!res.ok || !json?.ok || !json?.draft?.content) return;
            const live = String(json.draft.content || '').trim();
            if (!live) return;
            setArtifact((prev) => {
              if (!prev || prev.type !== 'draft') return prev;
              const prevSlug = extractSlugFromDraftContent(prev.content);
              if (prevSlug && prevSlug !== slug) return prev;
              return {
                ...prev,
                label: json.draft.title || prev.label || slug,
                content: live,
              };
            });
          } catch (_) {
            /* keep chat-derived artifact */
          }
        })();
      }
    }
    // source === 'none': leave existing artifact state untouched

    // Accumulate card images across messages, but skip any message that was
    // present at the time of the last Clear. This allows Clear to work correctly
    // even though thread history still contains old [IMAGES_GENERATED] blocks.
    setGeneratedImages((prev) => {
      const prevByUrl = new Map((prev || []).map((p) => [p.url, p]));
      const byCardNumber = new Map();
      const clearTime = clearedAt.current;
      for (const m of allMsgs) {
        if (m.role !== 'assistant') continue;
        // Skip messages that were created before the last Clear
        // Use created_at if available, otherwise assume message is new
        const msgTime = m.created_at ? new Date(m.created_at).getTime() : null;
        if (clearTime && msgTime && msgTime < clearTime) continue;
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
    // Design images: accumulate across messages (journal series accumulates), but
    // honor Clear the same way generatedImages already does above, never
    // silently discard an image that was manually uploaded rather than found in
    // a message, and never show an image Bart already rejected next to the one
    // that replaced it. Auto reuses the same `label` (the post's title) every
    // time it regenerates an image for the same post -- that never changes
    // between a rejected attempt and its replacement -- so keying on
    // label+size instead of url means the newer generation for that post
    // replaces the older one instead of both sitting in the panel forever.
    // A genuinely different post (different title) still gets its own entry
    // and still accumulates normally across a series.
    setGeneratedDesignImages((prev) => {
      const prevByUrl = new Map((prev || []).map((p) => [p.url, p]));
      const clearTime = clearedAt.current;
      const byLabel = new Map();
      for (const m of allMsgs) {
        if (m.role !== 'assistant') continue;
        // Skip messages that were created before the last Clear, same rule
        // already applied to generatedImages above.
        const msgTime = m.created_at ? new Date(m.created_at).getTime() : null;
        if (clearTime && msgTime && msgTime < clearTime) continue;
        const imgs = extractDesignImagesFromAssistantContent(String(m.content || ''));
        for (const img of imgs) {
          if (!img.url) continue;
          // allMsgs is in chronological order, so setting this key again for a
          // later message intentionally overwrites the earlier (rejected) one.
          const key = `${String(img.label || '').trim().toLowerCase()}::${img.size || ''}`;
          const older = prevByUrl.get(img.url);
          byLabel.set(key, {
            ...img,
            // The message's own time, not first-seen time. Manual uploads are
            // appended after these, so ordering has to come from real time.
            addedAt: msgTime || older?.addedAt || Date.now(),
          });
        }
      }
      const allDesign = Array.from(byLabel.values());
      const seenUrls = new Set(allDesign.map((d) => d.url));
      // Carry forward manually uploaded images that are not already in the list
      // above and were not themselves added before the last Clear.
      for (const p of prev || []) {
        if (!p?.manualUpload || !p.url || seenUrls.has(p.url)) continue;
        if (clearTime && p.addedAt && p.addedAt < clearTime) continue;
        seenUrls.add(p.url);
        allDesign.push(p);
      }
      return allDesign;
    });
    // If no images found in any message, leave existing images in place
    // Images only clear when starting a new thread (handled in startNewThread)
  }, [seedManifestTotal]);

  const loadThreadList = useCallback(async () => {
    setError('');
    try {
      const [sessionRes, draftsRes] = await Promise.all([
        fetch('/api/ao/auto/session'),
        fetch('/api/ao/auto/drafts?limit=80'),
      ]);
      // Channels (Phase 1). The chat still works if they cannot load.
      fetch('/api/ao/channels')
        .then((r) => r.json())
        .then((j) => (j?.ok ? setChannels({ standing: j.standing || [], projects: j.projects || [] }) : null))
        .catch(() => {});
      const sessionJson = await sessionRes.json().catch(() => ({}));
      const draftsJson = await draftsRes.json().catch(() => ({}));

      if (!sessionRes.ok || !sessionJson.ok) {
        throw new Error(sessionJson.error || 'Could not load Auto');
      }

      if (sessionJson.linkedin_token_status?.status === 'expired' ||
          sessionJson.linkedin_token_status?.status === 'expiring_soon') {
        setLinkedinTokenWarning(sessionJson.linkedin_token_status);
      } else {
        setLinkedinTokenWarning(null);
      }

      setMetricsSyncAlerts(
        Array.isArray(sessionJson.metrics_sync_alerts) ? sessionJson.metrics_sync_alerts : []
      );

      const { mainRows, archivedRows } = mergeThreadRows(sessionJson, draftsJson);

      setThreads(mainRows);
      setArchivedThreads(archivedRows);

      if (sessionJson.thread?.id) {
        setActiveThreadId(sessionJson.thread.id);
        // Restore the Clear point from the thread itself, not just whatever this
        // tab happened to have in memory -- on a fresh page load there is no
        // in-memory value at all, so without this every image ever generated in
        // the thread would reappear regardless of how many times Clear was
        // clicked in a previous session.
        const persistedClearedAt = sessionJson.thread?.state?.design_images_cleared_at;
        clearedAt.current = persistedClearedAt ? new Date(persistedClearedAt).getTime() : null;
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

  const loadThread = useCallback(
    async (thread) => {
      const threadId = thread?.id;
      if (!threadId || threadId === activeThreadId) return;
      setLoading(true);
      setArtifact(null);
      setArtifactOpen(false);
      setMobileArtifactOpen(false);
      setArtifactUnread(false);
      setGuestRecord(null);
      setGeneratedImages([]);
      setGeneratedDesignImages([]);
      setCurrentCardIndex(0);
      setCardReviewMode('single');
      setSeedManifestTotal(null);
      clearedAt.current = null;
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
        // Restore this conversation's own Clear point, the same reason as the
        // initial page load above -- each thread can have its own, and it must
        // not be lost just because we switched away and back.
        const persistedClearedAt = json.thread?.state?.design_images_cleared_at;
        clearedAt.current = persistedClearedAt ? new Date(persistedClearedAt).getTime() : null;
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

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadThreadList();

      // If a thread_id is in the URL, load that thread automatically.
      // Used when navigating from the Podcast Dashboard via "Build episode."
      const params = new URLSearchParams(window.location.search);
      const seedThreadId = params.get('thread');
      // "Talk it over" from the Queue opens Auto with Bart's note already started.
      const compose = params.get('compose');
      // A Queue item talked over opens in a conversation of its own (2026-10-27).
      const freshChannel = compose ? params.get('new') : null;
      if (freshChannel && !seedThreadId) {
        try {
          const res = await fetch('/api/ao/auto/thread/new', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ channel: freshChannel, title: params.get('topic') || '' }),
          });
          const json = await res.json().catch(() => ({}));
          if (res.ok && json.ok && json.thread?.id) {
            setActiveThreadId(json.thread.id);
            setMessages(Array.isArray(json.messages) ? json.messages : []);
            syncArtifactFromMessages(json.messages || []);
            await loadThreadList();
          }
        } catch (_) {
          // The note still starts in the open conversation.
        }
        params.delete('new');
        params.delete('topic');
      }
      if (compose) {
        setInput(compose.endsWith(' ') ? compose : `${compose} `);
        setTimeout(() => {
          const ta = textareaRef.current;
          if (ta) {
            ta.focus();
            ta.style.height = 'auto';
            ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
            ta.selectionStart = ta.selectionEnd = ta.value.length;
          }
        }, 300);
        try {
          params.delete('compose');
          const rest = params.toString();
          window.history.replaceState({}, '', `${window.location.pathname}${rest ? `?${rest}` : ''}`);
        } catch (_) {}
      }
      if (seedThreadId) {
        await loadThread({ id: seedThreadId });

        // After loading the seeded thread, check if it's a guest episode thread
        // by reading the first assistant message for the seed pattern
        try {
          const stateRes = await fetch(`/api/ao/auto/session?thread_id=${encodeURIComponent(seedThreadId)}`);
          const stateJson = await stateRes.json().catch(() => ({}));
          if (stateRes.ok && stateJson.ok && Array.isArray(stateJson.messages)) {
            const firstAssistant = stateJson.messages.find((m) => m.role === 'assistant');
            const content = String(firstAssistant?.content || '');
            if (content.startsWith('Guest episode context loaded.')) {
              const nameMatch = content.match(/\*\*Guest:\*\*\s*(.+)/);
              if (nameMatch) {
                const guestName = nameMatch[1].trim();
                setGuestRecordLoading(true);
                const guestRes = await fetch(`/api/ao/podcast/guest?name=${encodeURIComponent(guestName)}`);
                const guestJson = await guestRes.json().catch(() => ({}));
                if (guestRes.ok && guestJson.ok && guestJson.guest) {
                  const g = guestJson.guest;
                  const linkedin = Array.isArray(g.social_links)
                    ? g.social_links.find((l) => l.platform === 'linkedin')?.url
                    : '';
                  setGuestRecord({
                    ...g,
                    bio: g.bio || g.bio_md || '',
                    website_url: g.website_url || g.website || '',
                    linkedin_url: g.linkedin_url || linkedin || '',
                  });
                  setArtifactOpen(true);
                  setMobileArtifactOpen(true);
                }
                setGuestRecordLoading(false);
              }
            }
          }
        } catch (_) {
          setGuestRecordLoading(false);
        }

        // Clean the URL so refreshing doesn't re-load the same thread param
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
      }

      setLoading(false);
    })();
  }, [loadThreadList, loadThread]);

  const handleSelectThread = useCallback(
    async (thread) => {
      setQueueOpen(false);
      await loadThread(thread);
      setMobileTab('chat');
    },
    [loadThread]
  );
  const openQueue = useCallback(() => {
    setQueueOpen(true);
    setMobileTab('chat');
  }, []);
  const openThreadFromQueue = useCallback(
    (threadId) => {
      if (!threadId) return;
      setQueueOpen(false);
      handleSelectThread({ id: threadId });
    },
    [handleSelectThread]
  );

  const startNewThread = useCallback(async (agentArg, channelKey = null) => {
    if (startingNew || sending || loading) return;
    setQueueOpen(false);
    const agent = typeof agentArg === 'string' ? agentArg : null;
    const who = agent === 'jot' ? 'Jot' : agent === 'reach' ? 'Vox' : agent === 'producer' ? 'Cam' : agent === 'designer' ? 'Des' : agent === 'it' ? 'Bit' : null;
    // A thread started in a channel needs no warning: nothing is set aside that cannot be reopened.
    const ok = channelKey ? true : window.confirm(
      who
        ? `Start a conversation with ${who}? This chat will be set aside (not deleted).`
        : 'Start a new conversation? This chat will be set aside (not deleted). You will see an empty thread so you can begin fresh.'
    );
    if (!ok) return;
    setTeamOpen(false);
    setStartingNew(true);
    setError('');
    setArtifact(null);
    setArtifactOpen(false);
    setMobileArtifactOpen(false);
    setArtifactUnread(false);
    setGuestRecord(null);
    setPendingFiles([]);
    setGeneratedImages([]);
    setGeneratedDesignImages([]);
    setCurrentCardIndex(0);
    setCardReviewMode('single');
    setSeedManifestTotal(null);
    clearedAt.current = null;
    setJournalPublishBanner(null);
    setJournalPendingPublish(null);
    setDevotionalPublishBanner(null);
    processedJournalPublishKeys.current = new Set();
    processedDevotionalPublishKeys.current = new Set();
    try {
      const res = await fetch('/api/ao/auto/thread/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...(agent ? { agent } : {}), ...(channelKey ? { channel: channelKey } : {}) }),
      });
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

  const handleFileSelect = useCallback(async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    setError('');
    try {
      const results = [];
      for (const file of files) {
        const dataUrl = await resizeImageFileToDataUrl(file);
        const headerMatch = dataUrl.match(/^data:([^;]+);/);
        const actualType = headerMatch ? headerMatch[1] : file.type;
        results.push({
          file,
          name: file.name,
          dataUrl,
          type: actualType,
        });
      }

      const { kept, dropped } = packAttachmentsUnderLimit(pendingFiles, results);
      if (dropped.length > 0) {
        setError(attachmentOverLimitMessage());
      }
      setPendingFiles(kept);
    } catch (err) {
      setError(err?.message || 'Could not read the selected file');
    }
  }, [pendingFiles]);

  async function buildOutgoingMessage(text, fileSnaps) {
    let body = String(text || '').trim();
    const snaps = Array.isArray(fileSnaps) ? fileSnaps : (fileSnaps ? [fileSnaps] : []);

    for (const fileSnap of snaps) {
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
      } else if (!fileSnap?.type?.startsWith('image/') && fileSnap) {
        body = body || `[Attached file: ${fileSnap.name}]`;
      }
    }

    if (!body && snaps.some(s => s?.type?.startsWith('image/'))) {
      body = snaps.length === 1 ? 'I uploaded an image.' : `I uploaded ${snaps.length} images.`;
    }

    return body || '';
  }

  const waitForSavedReply = useCallback(
    async (threadId, sentAtMs, outgoingText) => {
      setWaitingNote('Still working on this. The reply will show up here when it is done, and you can switch to another chat in the meantime.');
      const deadline = Date.now() + 6 * 60 * 1000;
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 10000));
        try {
          const url = threadId ? `/api/ao/auto/session?thread_id=${encodeURIComponent(threadId)}` : '/api/ao/auto/session';
          const res = await fetch(url);
          const json = await res.json().catch(() => ({}));
          const msgs = Array.isArray(json.messages) ? json.messages : [];
          const last = msgs[msgs.length - 1];
          if (res.ok && last && last.role === 'assistant' && Date.parse(last.created_at || 0) >= sentAtMs - 2000) {
            if (!threadId || activeThreadIdRef.current === threadId || activeThreadIdRef.current === json.thread?.id) {
              setMessages(msgs);
              syncArtifactFromMessages(msgs);
            }
            setWaitingNote('');
            return;
          }
        } catch (_) {
          // Keep waiting
        }
      }
      setWaitingNote('');
      setError('The reply has not arrived after six minutes. Your message was saved. Tap Retry to send it again.');
      setInput(outgoingText || '');
    },
    [syncArtifactFromMessages]
  );

  // Highlight a passage in a reply or a draft, then tap "Reply to highlighted".
  useEffect(() => {
    const onSelectionChange = () => {
      const sel = typeof window !== 'undefined' && window.getSelection ? window.getSelection() : null;
      const text = sel ? String(sel.toString() || '').trim() : '';
      const node = sel?.anchorNode;
      const el = node ? (node.nodeType === 1 ? node : node.parentElement) : null;
      if (text && el?.closest && el.closest('[data-quotable="1"]')) {
        if (quoteClearTimer.current) clearTimeout(quoteClearTimer.current);
        setQuoteCandidate(text.slice(0, 4000));
      } else if (!text) {
        // Tapping the button clears the selection first, so keep the passage a moment.
        if (quoteClearTimer.current) clearTimeout(quoteClearTimer.current);
        quoteClearTimer.current = setTimeout(() => setQuoteCandidate(''), 6000);
      }
    };
    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, []);

  // Who this conversation is with: the last teammate who answered in it.
  const activeThread = useMemo(() => (threads || []).find((t) => t.id === activeThreadId) || null, [threads, activeThreadId]);
  const activeChannelKey = activeThread ? channelOfThread(activeThread) : 'general';
  const activeChannel = useMemo(
    () => [...(channels?.standing || []), ...(channels?.projects || [])].find((c) => c.key === activeChannelKey) || null,
    [channels, activeChannelKey]
  );

  const moveThread = useCallback(
    async (threadId, key) => {
      try {
        const res = await fetch('/api/ao/channels', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'move', thread_id: threadId, key }) });
        const json = await res.json().catch(() => ({}));
        if (!json.ok) throw new Error(json.error || 'Could not move it');
        await loadThreadList();
      } catch (e) {
        setError(e.message || 'Could not move it');
      }
    },
    [loadThreadList]
  );

  const newChannel = useCallback(async () => {
    const name = window.prompt('Name the new project channel');
    if (!name || !name.trim()) return;
    try {
      const res = await fetch('/api/ao/channels', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', name: name.trim() }) });
      const json = await res.json().catch(() => ({}));
      if (!json.ok) throw new Error(json.error || 'Could not make the channel');
      await loadThreadList();
    } catch (e) {
      setError(e.message || 'Could not make the channel');
    }
  }, [loadThreadList]);

  const activeAgent = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const m = messages[i];
      if (m?.role === 'assistant' && m.meta?.agent) return m.meta.agent;
    }
    return 'auto';
  }, [messages]);

  const replyToHighlighted = useCallback(() => {
    if (!quoteCandidate) return;
    const quoted = quoteCandidate
      .split('\n')
      .map((l) => `> ${l}`)
      .join('\n');
    setInput((prev) => `${prev && prev.trim() ? `${prev.replace(/\s*$/, '')}\n\n` : ''}${quoted}\n\n`);
    setQuoteCandidate('');
    try {
      window.getSelection()?.removeAllRanges();
    } catch (_) {}
    setTimeout(() => {
      const ta = textareaRef.current;
      if (ta) {
        ta.focus();
        ta.style.height = 'auto';
        ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
        ta.selectionStart = ta.selectionEnd = ta.value.length;
      }
    }, 0);
  }, [quoteCandidate]);

  const sendMessage = useCallback(
    async (messageText, opts = {}) => {
      const textInput = messageText !== undefined ? String(messageText) : input;
      const fileSnaps = opts.fromQueue ? [] : pendingFiles;

      if (!textInput.trim() && fileSnaps.length === 0) return;
      // A reply is still coming: hold this one and send it the moment that
      // reply lands, the way Bart can keep typing while I work (2026-10-27).
      if (sendingRef.current) {
        if (fileSnaps.length > 0) return;
        queueRef.current = [...queueRef.current, textInput.trim()];
        setQueued(queueRef.current);
        if (messageText === undefined) setInput('');
        if (textareaRef.current) textareaRef.current.style.height = '22px';
        return;
      }
      // Bart's word comes first: the team's background follow-ups stop updating the screen.
      bgGenRef.current += 1;
      setTeamBusy(false);
      setWaitingNote('');

      if (totalAttachmentBytes(fileSnaps) > MAX_TOTAL_ATTACHMENT_BYTES) {
        setError(attachmentOverLimitMessage());
        return;
      }

      let outgoing = '';
      try {
        outgoing = await buildOutgoingMessage(textInput, fileSnaps);
      } catch (_) {
        outgoing = textInput.trim() || (fileSnaps.length > 0 ? `[Attached: ${fileSnaps.map((f) => f.name).join(', ')}]` : '');
      }

      if (!String(outgoing).trim()) return;

      const displayText =
        textInput.trim() ||
        (fileSnaps.length === 1
          ? `[Attached: ${fileSnaps[0].name}]`
          : fileSnaps.length > 1
            ? `[Attached: ${fileSnaps.length} files]`
            : outgoing.slice(0, 200));

      const optimisticMsg = {
        role: 'user',
        content: displayText,
        id: `opt-${Date.now()}`,
        meta: fileSnaps[0]?.type?.startsWith('image/') ? { image_url: fileSnaps[0].dataUrl } : null,
      };

      setPendingFiles([]);
      // A message sent by a button (Yes on a pinned question) leaves what Bart
      // was typing in the box (2026-10-27: tapping Yes erased his comment).
      if (messageText === undefined) setInput('');
      setMessages((prev) => [...prev, optimisticMsg]);
      sendingRef.current = true;
      setSending(true);
      setImageGenerating(false);
      setError('');

      if (textareaRef.current) textareaRef.current.style.height = '22px';

      let stallTimer = null;
      // Which limit aborted the request, so the catch block can tell the user
      // what actually happened. Declared out here because the timer sets it and
      // the catch reads it.
      let abortReason = null;

      try {
        // Build attachments array for image uploads
        // Images are sent as base64 content blocks for the Anthropic vision API
        const attachments = [];
        for (const fileSnap of fileSnaps) {
          if (fileSnap?.dataUrl && String(fileSnap.type || '').startsWith('image/')) {
            try {
              const commaIdx = fileSnap.dataUrl.indexOf(',');
              if (commaIdx === -1) throw new Error('Invalid dataUrl format');
              const header = fileSnap.dataUrl.slice(0, commaIdx);
              const b64data = fileSnap.dataUrl.slice(commaIdx + 1);
              if (!b64data) throw new Error('Empty base64 data');
              // Detect the real image type from the actual encoded bytes, not from the
              // dataUrl header or file.type. Both of those come from the browser's OS-level,
              // extension-based MIME lookup, which macOS gets wrong for files whose extension
              // does not match their real content (e.g. a PNG saved or renamed with a .jpg
              // extension) -- the exact failure Anthropic's API caught and rejected.
              const detectRealImageType = (b64) => {
                if (b64.startsWith('iVBORw0KGgo')) return 'image/png';
                if (b64.startsWith('/9j/')) return 'image/jpeg';
                if (b64.startsWith('R0lGODdh') || b64.startsWith('R0lGODlh')) return 'image/gif';
                if (b64.startsWith('UklGR')) return 'image/webp';
                return null;
              };
              const detectedType = detectRealImageType(b64data);
              let mediaType = detectedType;
              if (!mediaType) {
                const mediaTypeMatch = header.match(/^data:([^;]+);/);
                if (!mediaTypeMatch) throw new Error('Could not parse mediaType from dataUrl header');
                mediaType = mediaTypeMatch[1];
              }
              attachments.push({
                type: 'image',
                mediaType,
                data: b64data,
              });
            } catch (err) {
              console.warn('[AutoV2Panel] Could not extract image base64:', err?.message || err);
            }
          }
        }

        const controller = new AbortController();
        // Stall timeout: if no SSE event arrives for 90s, abort and show a visible
        // error. This is the backstop for silent server kills / hung reader.read().
        //
        // 90 seconds of true silence is a real hang now that the server sends a
        // heartbeat every 15 seconds from the start of the request. It did not
        // used to: the heartbeat only began after model streaming finished, so
        // any thinking block or tool call over 90 seconds aborted a request the
        // server was still working on. That was the whole "Auto didn't respond
        // in time" bug, and the fix belongs on the server, not in a longer
        // timeout here.
        const startedAt = Date.now();
        let lastEventAt = Date.now();
        stallTimer = setInterval(() => {
          // Thresholds and the stall-vs-cap decision live in autoStreamTimeouts
          // so they can be tested without standing up a component.
          const reason = abortReasonFor({
            silentForMs: Date.now() - lastEventAt,
            elapsedMs: Date.now() - startedAt,
          });
          if (reason) {
            abortReason = reason;
            try {
              controller.abort();
            } catch (_) {
              /* ignore */
            }
          }
        }, 5_000);

        const res = await fetch('/api/ao/auto/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            thread_id: activeThreadId || null,
            message: outgoing,
            attachments: attachments.length > 0 ? attachments : undefined,
            retry: opts.retry ? true : undefined,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          clearInterval(stallTimer);
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error || 'Could not reach Auto');
        }

        // Read the SSE stream
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let streamingAssistantContent = '';
        let json = null;

        // Show streaming content in the chat as it arrives
        // Insert a streaming message placeholder
        let streamingMsgId = `streaming-${Date.now()}`;
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: '',
            id: streamingMsgId,
            meta: { streaming: true },
          },
        ]);

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            lastEventAt = Date.now();
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const parsed = JSON.parse(line.slice(6));
                  lastEventAt = Date.now();

                  if (parsed.finalize_segment !== undefined) {
                    // Pass 1 wrote something real before Auto asked for more source text.
                    // Lock the current bubble in as its own finished message (it's already
                    // saved server-side too) instead of erasing it, then open a new bubble
                    // for the synthesis reply that follows.
                    const finishedId = streamingMsgId;
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === finishedId
                          ? { ...m, content: parsed.finalize_segment, meta: { streaming: false } }
                          : m
                      )
                    );
                    streamingMsgId = `streaming-${Date.now()}`;
                    streamingAssistantContent = '';
                    setMessages((prev) => [
                      ...prev,
                      { role: 'assistant', content: '', id: streamingMsgId, meta: { streaming: true } },
                    ]);
                  } else if (parsed.reset) {
                    // Server discarded the in-progress reply (e.g. it fetched full corpus
                    // documents and is now streaming a fresh synthesis call). Clear the
                    // live buffer so the new generation doesn't get glued onto the old
                    // one in the same message bubble.
                    streamingAssistantContent = '';
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === streamingMsgId ? { ...m, content: '' } : m
                      )
                    );
                  } else if (parsed.assistant_message !== undefined && parsed.reply_replaced) {
                    // Legacy replace path (kept for older server events). Prefer reply_append.
                    streamingAssistantContent = String(parsed.assistant_message || '');
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === streamingMsgId
                          ? { ...m, content: streamingAssistantContent }
                          : m
                      )
                    );
                  } else if (parsed.image_generating) {
                    setImageGenerating(true);
                  } else if (parsed.reply_append && parsed.append_text !== undefined) {
                    // Action-claim gate: keep streamed content; append warning note only.
                    streamingAssistantContent += String(parsed.append_text || '');
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === streamingMsgId
                          ? { ...m, content: streamingAssistantContent }
                          : m
                      )
                    );
                  } else if (parsed.token !== undefined) {
                    // Text token — append to streaming display
                    streamingAssistantContent += parsed.token;
                    if (/\[IMAGE_GENERATED/i.test(streamingAssistantContent)) {
                      setImageGenerating(false);
                    }
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === streamingMsgId
                          ? { ...m, content: streamingAssistantContent }
                          : m
                      )
                    );
                  } else if (parsed.ok !== undefined) {
                    // Done event or error event with full state
                    setImageGenerating(false);
                    json = parsed;
                  }
                } catch (_) {
                  // Malformed SSE line — ignore
                }
              }
            }
          }
        } finally {
          clearInterval(stallTimer);
          reader.releaseLock();
        }

        if (!json || !json.ok) {
          throw new Error(json?.error || 'Auto could not complete the response');
        }

        // Replace streaming placeholder with final authoritative messages from server
        if (Array.isArray(json.messages) && json.messages.length > 0) {
          setMessages(json.messages);
          syncArtifactFromMessages(json.messages);
        } else {
          setMessages((prev) => {
            const withoutOptAndStreaming = prev.filter(
              (m) => m.id !== optimisticMsg.id && m.id !== streamingMsgId
            );
            return [
              ...withoutOptAndStreaming,
              { role: 'user', content: displayText },
              { role: 'assistant', content: json.assistant_message || streamingAssistantContent || '' },
            ];
          });
          const synthetic = [
            { role: 'user', content: displayText },
            { role: 'assistant', content: json.assistant_message || streamingAssistantContent || '' },
          ];
          syncArtifactFromMessages(synthetic);
        }

        if (json.thread?.id) setActiveThreadId(json.thread.id);

        // A Retry whose first send is still being answered on the server: wait for that reply.
        if (json.pending) {
          const firstSend = [...(Array.isArray(json.messages) ? json.messages : [])]
            .reverse()
            .find((m) => m.role === 'user' && String(m.content || '').trim() === String(outgoing).trim());
          const sentAtMs = firstSend ? Date.parse(firstSend.created_at) : Date.now();
          waitForSavedReply(json.thread?.id || activeThreadIdRef.current, sentAtMs, outgoing);
          return;
        }

        // The team's follow-ups (teammates Bart named, hand-offs, the speak-up
        // check and huddles) run in the background, so Bart can keep talking
        // (2026-10-27: "Auto forces me to wait until every agent is done
        // talking"). A new message from him stops them updating the screen.
        const myGen = bgGenRef.current;
        const live = () => bgGenRef.current === myGen;
        const showFromTeam = (msgs) => {
          if (!live() || !Array.isArray(msgs)) return;
          setMessages(msgs);
          syncArtifactFromMessages(msgs);
        };
        const noteIfLive = (note) => {
          if (live()) setWaitingNote(note);
        };
        if (!queueRef.current.length) {
          (async () => {
            setTeamBusy(true);
            try {

              // Everyone else Bart @mentioned answers in turn, each in their own voice.
              const replyThreadId = json.thread?.id || activeThreadId || null;
              const teammateTurn = async (teammate, message) => {
                try {
                  const r = await fetch('/api/ao/auto/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      thread_id: replyThreadId,
                      agent: teammate,
                      message,
                      message_meta: { team_note: true },
                    }),
                  });
                  const raw = await r.text();
                  const lines = raw.split('\n').filter((l) => l.startsWith('data: '));
                  for (let k = lines.length - 1; k >= 0; k -= 1) {
                    let payload = null;
                    try {
                      payload = JSON.parse(lines[k].slice(6));
                    } catch (_) {}
                    if (payload && payload.ok !== undefined) {
                      if (payload.ok && Array.isArray(payload.messages)) {
                        showFromTeam(payload.messages);
                      }
                      break;
                    }
                  }
                } catch (_) {
                  // One teammate not answering must not undo the reply already shown.
                }
              };
              const named = mentionedAgents(outgoing);
              // @team means the whole team is listening, not that everyone answers:
              // the first answers, the rest go through the speak-up check below
              // (2026-10-26: two teammates answered an editing request about their own areas).
              const teamCall = /(^|[^\w@])@team\b/i.test(outgoing);
              const explicit = teamCall ? mentionedAgents(outgoing.replace(/@team\b/gi, ' ')).filter((k) => k !== named[0]) : named.slice(1);
              for (const teammate of explicit) {
                if (!live()) return;
                const name = TEAM_NAMES[teammate] || 'Ada';
                await teammateTurn(teammate, `[TEAM] Bart brought ${name} in too. ${name}, add your part to Bart's last message above. Do not repeat what was already said, and do not speak for anyone else.`);
              }

              // Ada runs the team: a teammate she brings in by name in her reply
              // ("@Jot, take the outline") answers next, in their own bubble.
              // One level only, so teammates never set each other off in a loop.
              const answeredBy = (() => {
                const list = Array.isArray(json.messages) ? json.messages : [];
                for (let k = list.length - 1; k >= 0; k -= 1) if (list[k].role === 'assistant') return list[k].meta?.agent || 'auto';
                return 'auto';
              })();
              const handedTo = mentionedAgents(String(json.assistant_message || '').replace(/^\s*\w+:\s*/, ' ')).filter(
                (k) => k !== answeredBy && !named.includes(k)
              );
              for (const teammate of handedTo) {
                if (!live()) return;
                const name = TEAM_NAMES[teammate] || 'Ada';
                await teammateTurn(teammate, `[TEAM] ${name}, ${TEAM_NAMES[answeredBy] || 'Ada'} brought you in above. Do your part of what was asked, as yourself, and do not speak for anyone else.`);
              }

              // The whole team is in every thread: when nobody was named, anyone
              // with something real to add speaks up (Phase 1, 2026-10-26).
              if ((!named.length || teamCall) && !handedTo.length && replyThreadId) {
                try {
                  const r = await fetch('/api/ao/team/speak-up', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ thread_id: replyThreadId }),
                  });
                  const up = await r.json().catch(() => ({}));
                  if (up?.huddle) {
                    // The team huddles on the server; show each turn as it lands (2026-10-26).
                    const started = Date.now();
                    let seen = -1;
                    while (Date.now() - started < 12 * 60 * 1000) {
                      await new Promise((res) => setTimeout(res, 5000));
                      if (!live() || (activeThreadIdRef.current && activeThreadIdRef.current !== replyThreadId)) break;
                      const st = await fetch(`/api/ao/auto/session?thread_id=${encodeURIComponent(replyThreadId)}`).then((x) => x.json()).catch(() => null);
                      if (!st?.ok) continue;
                      const msgs = Array.isArray(st.messages) ? st.messages : [];
                      if (msgs.length !== seen) {
                        seen = msgs.length;
                        showFromTeam(msgs);
                      }
                      const h = st.thread?.state?.huddle;
                      if (!h?.active) break;
                      const who = TEAM_NAMES[h.closing ? 'auto' : h.last] || 'The team';
                      noteIfLive(h.closing ? 'Ada is wrapping up the huddle…' : h.turns ? `Team huddle: ${who} just spoke…` : 'The team is huddling…');
                    }
                  } else {
                    for (const sp of Array.isArray(up?.speakers) ? up.speakers : []) {
                      if (!live()) break;
                      noteIfLive(`${sp.name} has something to add…`);
                      await teammateTurn(sp.agent, speakUpMessage(sp));
                    }
                  }
                } catch (_) {
                  // The answer stands on its own if the check does not run.
                } finally {
                  noteIfLive('');
                }
              }
            } finally {
              if (live()) {
                setTeamBusy(false);
                setWaitingNote('');
              }
              loadThreadList();
            }
          })();
        }

        await loadThreadList();
      } catch (e) {
        // Do not remove the optimistic message or clear the input.
        // The user's message may already be in the database (persisted before the
        // model call). Show an error with a Retry button. Never make the user retype.
        const aborted = e?.name === 'AbortError' || /aborted/i.test(String(e?.message || ''));
        // The server now finishes and saves the reply even when the screen
        // loses the stream, so wait for it rather than asking Bart to retry.
        if (aborted) {
          const sentAtMs = Number(String(optimisticMsg.id).replace('opt-', '')) || Date.now();
          setMessages((prev) => prev.filter((m) => !String(m.id || '').startsWith('streaming-')));
          waitForSavedReply(activeThreadIdRef.current, sentAtMs, outgoing);
          return;
        }
        // Two different failures used to share one message, which is why this
        // read as intermittent for weeks. A stall means something is stuck; the
        // hard cap means Auto was genuinely still working and ran out of budget.
        // The user can act on those differently, so they should not say the same
        // thing.
        const errorText = aborted
          ? abortMessageFor(abortReason)
          : e.message || 'Auto could not be reached. Your message was saved. Tap Retry to try again.';
        setError(errorText);
        // Drop the empty streaming placeholder; keep the user's message marked failed.
        setMessages((prev) =>
          prev
            .filter((m) => !String(m.id || '').startsWith('streaming-'))
            .map((m) =>
              m.id === optimisticMsg.id ? { ...m, meta: { ...m.meta, failed: true } } : m
            )
        );
        // Restore the input text so the user can retry without retyping.
        if (messageText === undefined) setInput(outgoing);
      } finally {
        if (stallTimer) clearInterval(stallTimer);
        sendingRef.current = false;
        setSending(false);
        setImageGenerating(false);
        // Send what Bart typed while this reply was coming, in order.
        const next = queueRef.current[0];
        if (next) {
          queueRef.current = queueRef.current.slice(1);
          setQueued(queueRef.current);
          setTimeout(() => sendMessageRef.current?.(next, { fromQueue: true }), 0);
        }
      }
    },
    [input, sending, activeThreadId, pendingFiles, loadThreadList, syncArtifactFromMessages, isMobile, waitForSavedReply]
  );

  sendMessageRef.current = sendMessage;

  // Opening a conversation where the team is still at it (a huddle, a
  // teammate's task): show the working animation and their turns as they land.
  useEffect(() => {
    if (!activeThreadId) return undefined;
    let alive = true;
    const gen = bgGenRef.current;
    (async () => {
      // Keeps checking while the conversation is open, not only while someone
      // works, so work the team starts later shows up too (2026-10-27: "I
      // have no clue" whether the team was still at it).
      let seen = -1;
      let working = false;
      const started = Date.now();
      for (let i = 0; alive && Date.now() - started < 60 * 60000; i += 1) {
        if (i > 0) await new Promise((r) => setTimeout(r, working ? 6000 : 20000));
        if (!alive || bgGenRef.current !== gen) return;
        if (sendingRef.current) continue;
        const st = await fetch(`/api/ao/auto/session?thread_id=${encodeURIComponent(activeThreadId)}`).then((x) => x.json()).catch(() => null);
        if (!alive || bgGenRef.current !== gen) return;
        if (sendingRef.current || !st?.ok) continue;
        const msgs = Array.isArray(st.messages) ? st.messages : [];
        if (i > 0 && msgs.length !== seen) {
          setMessages(msgs);
          syncArtifactFromMessages(msgs);
        }
        seen = msgs.length;
        working = Boolean(st.team_working);
        setServerWorking(working);
        setAiPause(st.ai_pause?.paused ? st.ai_pause : null);
      }
    })();
    return () => {
      alive = false;
      setServerWorking(false);
    };
  }, [activeThreadId, syncArtifactFromMessages]);

  const handleKeyDown = useCallback(
    (e) => {
      // While the @ list is open, Enter or Tab picks the first match instead of
      // sending (2026-10-26: Bart's message went out cut off at "@tea").
      if ((e.key === 'Enter' || e.key === 'Tab') && !e.shiftKey) {
        const typed = pendingMention(e.currentTarget?.value ?? input);
        const pick = typed !== null ? MENTION_CHOICES.find((c) => c.handle.toLowerCase().startsWith(typed)) : null;
        if (pick) {
          e.preventDefault();
          setInput((prev) => prev.replace(/@(\w*)$/, `@${pick.handle} `));
          return;
        }
      }
      if (e.key === 'Enter') {
        if (isMobile) {
          // On mobile, Enter always inserts a newline.
          // The send button is the only submit trigger.
          return;
        }
        if (!e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      }
    },
    [sendMessage, isMobile, input]
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
      case 'captions': {
        // Cards are made before captions now, so the next step is scheduling,
        // not making images (Bart, 2026-10-28).
        const pk = cardPackages(artifact.content, generatedDesignImages);
        if (pk.length && pk.every((p) => p.image)) {
          sendMessage('The cards and captions look good. Schedule them as they are.');
        } else if (pk.length) {
          sendMessage('The captions look good. Make the card for any that has none, then schedule them.');
        } else {
          sendMessage('All captions approved.');
        }
        break;
      }
      case 'draft':
        sendMessage('Approved.');
        break;
      default:
        sendMessage('Approved.');
    }
  }, [sendMessage, artifact, generatedDesignImages]);

  const handlePublishJournal = useCallback(async () => {
    if (!journalPendingPublish) return;
    const { attrs, journalContent, socialCaptionsBlock, categoriesRaw, notify, captionAttachOnly } = journalPendingPublish;

    // Caption-attach mode — entry already published, just schedule captions
    if (captionAttachOnly) {
      setJournalPublishBanner({ status: 'loading', title: attrs.title });
      setJournalPendingPublish(null);

      // Parse captions from attrs if present
      const captions = {};
      if (attrs.linkedin_personal) captions.linkedin_personal = attrs.linkedin_personal;
      if (attrs.linkedin_business) captions.linkedin_business = attrs.linkedin_business;
      if (attrs.instagram_business) captions.instagram_business = attrs.instagram_business;
      if (attrs.facebook_business) captions.facebook_business = attrs.facebook_business;
      if (attrs.twitter) captions.twitter = attrs.twitter;

      try {
        const res = await fetch('/api/ao/auto/schedule-journal-launch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug: attrs.slug, title: attrs.title, captions }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.ok) throw new Error(json.error || 'Caption scheduling failed');
        setJournalPublishBanner({
          status: 'success',
          title: attrs.title,
          journalUrl: json.journal_url || '',
          message: `${json.total} social posts scheduled for ${json.launch_date ? new Date(json.launch_date).toLocaleDateString('en-US', { timeZone: 'America/Chicago', weekday: 'long', month: 'long', day: 'numeric' }) : 'the next open slot'}.`,
        });
      } catch (e) {
        setJournalPublishBanner({
          status: 'error',
          title: attrs.title,
          message: e.message || 'Could not schedule captions',
        });
      }
      return;
    }

    // Full publish mode -- if this particular signal did not repeat the image_url
    // attribute, look up the real, currently-saved image for this post instead of
    // asking Bart to gamble on a popup. Tonight's earlier fixes mean the database
    // now reliably has the real image_url for a post at all times.
    let resolvedImageUrl = attrs.image_url || '';
    if (!resolvedImageUrl) {
      try {
        const draftRes = await fetch(`/api/ao/auto/content-draft?slug=${encodeURIComponent(attrs.slug)}`);
        const draftJson = await draftRes.json().catch(() => ({}));
        if (draftRes.ok && draftJson.ok && draftJson.draft?.image_url) {
          resolvedImageUrl = draftJson.draft.image_url;
        }
      } catch (_) {
        // Fall through -- resolvedImageUrl stays empty and the server will report the real error.
      }
    }

    if (!resolvedImageUrl) {
      setError(
        `No image is saved yet for "${attrs.title}". Generate or upload a header image before publishing.`
      );
      return;
    }

    setJournalPublishBanner({ status: 'loading', title: attrs.title });
    setJournalPendingPublish(null);

    try {
      const res = await fetch('/api/ao/auto/publish-journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: attrs.slug,
          title: attrs.title,
          content: socialCaptionsBlock ? `${journalContent}\n\n${socialCaptionsBlock}` : journalContent,
          summary: attrs.summary || '',
          publish_date: attrs.publish_date || '',
          categories: categoriesRaw,
          featured_image: attrs.featured_image || '',
          image_url: resolvedImageUrl,
          takeaways: [],
          notify,
          notify_delay_ms: 300000,
          series_slug: attrs.series_slug || undefined,
          part_number: attrs.part_number || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Publish failed');

      // Caption scheduling can partially succeed. Always surface coverage so a
      // "1 of 4 scheduled" publish never looks identical to a full success.
      const warnings = [];
      const expected = Number(json.captions_expected) || 4;
      const scheduled = Number(json.captions_scheduled) || 0;
      const missing = Array.isArray(json.captions_missing) ? json.captions_missing : [];
      const coverage =
        json.captions_coverage_message ||
        (json.captions_has_block || socialCaptionsBlock
          ? `Scheduled ${scheduled} of ${expected} social posts${
              missing.length ? ` — missing captions for: ${missing.join(', ')}` : ''
            }.`
          : null);

      if (json.captions_error) {
        warnings.push(json.captions_error);
      } else if (coverage && (missing.length > 0 || (socialCaptionsBlock && scheduled === 0 && !json.captions_skipped_as_duplicate))) {
        warnings.push(coverage);
      } else if (socialCaptionsBlock && scheduled === 0 && !json.captions_skipped_as_duplicate) {
        warnings.push(
          'Social captions were expected but 0 were scheduled. Check the [SOCIAL_CAPTIONS] block with Auto.'
        );
      } else if (scheduled > 0 && scheduled < expected) {
        warnings.push(
          coverage ||
            `Scheduled ${scheduled} of ${expected} social posts — some channels are still missing. Ask Auto to write the rest.`
        );
      }

      if (json.draft_mark_error) {
        warnings.push(`Draft status update failed: ${json.draft_mark_error}. It may still show as pending to Auto.`);
      }
      if (json.corpus_embed_error) {
        warnings.push(`Not added to Auto's search corpus: ${json.corpus_embed_error}. Auto may not find this piece later.`);
      }
      if (json.editorial_memory_error) {
        warnings.push(`Editorial memory was not rebuilt: ${json.editorial_memory_error}. Auto may not know this piece was just published until the next scheduled rebuild.`);
      }

      setJournalPublishBanner({
        status: 'success',
        title: attrs.title,
        journalUrl: json.journal_url || '',
        captionsSummary:
          json.captions_has_block || socialCaptionsBlock
            ? coverage || `Scheduled ${scheduled} of ${expected} social posts.`
            : scheduled > 0
              ? `Scheduled ${scheduled} social post${scheduled === 1 ? '' : 's'}.`
              : null,
        warnings,
      });
    } catch (e) {
      setJournalPublishBanner({
        status: 'error',
        title: attrs.title,
        message: e.message || 'Could not publish journal entry',
      });
    }
  }, [journalPendingPublish]);

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
    clearedAt.current = Date.now();
    setGeneratedImages([]);
    setGeneratedDesignImages([]);
    setCurrentCardIndex(0);
    setSeedManifestTotal(null);

    // Persist this onto the thread itself so it survives a page reload -- the
    // ref alone only lives in this browser tab's memory and resets to nothing
    // the moment the page remounts, which previously made Clear look like it
    // never worked at all after a refresh.
    if (activeThreadId) {
      fetch('/api/ao/auto/thread-clear-design-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thread_id: activeThreadId }),
      }).catch(() => {
        // Best-effort -- the in-memory ref still clears the panel immediately
        // either way, this only affects whether it stays cleared after a reload.
      });
    }
  }, [activeThreadId]);

  const publishCards = useCallback(async () => {
    if (!generatedImages || generatedImages.length === 0) {
      setError('No generated images found. Generate card images before publishing.');
      return;
    }

    const cards = generatedImages.map((img) => {
      const caption = extractCaptionForCard(img.card, messages);
      return {
        card_index: img.card,
        image_url: img.url,
        caption: caption || '',
      };
    });

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
  }, [generatedImages, activeThreadId, messages, sendMessage]);

  // Gestures. Spatial only: the artifact is a panel that lives off the right
  // edge, the menu is a sheet that rises from the bottom. Nothing here picks
  // between threads, and nothing starts at a screen edge iOS has claimed.
  // Every one of these keeps its button. See lib/ao/touchGestures.js.
  const messageSwipe = useMemo(
    () =>
      createSwipeHandlers(
        (dir) => {
          if (dir === 'left') {
            setMobileArtifactOpen(true);
            setArtifactUnread(false);
          } else if (dir === 'right') {
            setMobileArtifactOpen(false);
          }
        },
        { allowFromEdge: true }
      ),
    []
  );

  const composerSwipe = useMemo(
    () => createSwipeHandlers((dir) => { if (dir === 'up') setMobileMenuOpen(true); }),
    []
  );

  const sheetSwipe = useMemo(
    () => createSwipeHandlers((dir) => { if (dir === 'down') setMobileMenuOpen(false); }),
    []
  );

  // The artifact is a side panel. It lives just off the right edge, comes in
  // when you pull it in and goes back when you push it away. It was a bottom
  // sheet until Bart pointed out that swiping in from the right to raise
  // something from the bottom makes no sense. The gesture was right; the panel
  // was wrong.
  const artifactSwipe = useMemo(
    () =>
      createSwipeHandlers(
        (dir) => { if (dir === 'right') setMobileArtifactOpen(false); },
        { allowFromEdge: true }
      ),
    []
  );

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

  // Captions Auto wrote in chat for the post in the panel, before anything was
  // saved or scheduled. Plain computation rather than a hook, so it cannot
  // disturb hook order in this component.
  const chatCaptionsSlug = resolveDraftArtifactSlug(artifact);
  const chatCaptionsText = chatCaptionsSlug
    ? findChatCaptionsMessage(messages, { slug: chatCaptionsSlug, title: artifact?.label })
    : null;

  // When Bart approves a step in the panel, tell Auto in the conversation, the
  // same way the Post tab's Approve button always has, so the chat and the
  // recorded approval agree.
  const handleStageApproved = (stage) => {
    if (stage === 'image') {
      sendMessage('Image approved.');
    } else if (stage === 'captions') {
      // Schedule comes before Captions (2026-10-27), so the times are already
      // approved here. The old wording ("the schedule is the next approval")
      // made the team ask Bart to approve the schedule a second time.
      sendMessage('Captions approved. The schedule is already approved, so queue the automatic captions at those times now.');
    }
  };

  const artifactPanelProps = {
    artifact,
    chatCaptionsText,
    // Auto can record an approval in chat (approve_stage). The panel refetches
    // its stage after each finished turn so it moves on without a reload.
    stageRefreshKey: messages.filter((m) => m?.role === 'assistant' && !m?.meta?.streaming).length,
    onStageApproved: handleStageApproved,
    generatedImages,
    generatedDesignImages,
    journalPublishBanner,
    journalPendingPublish,
    devotionalPublishBanner,
    episodeDraft,
    episodeProcessBanner,
    onEpisodeDraftUpdated: setEpisodeDraft,
    onEpisodePublished: () => setEpisodeProcessBanner(null),
    onApprove: handleApprove,
    onRevise: handleRevise,
    onViewAll: handleViewAll,
    onClearGenerated: handleClearGenerated,
    onPublishJournal: handlePublishJournal,
    onGeneratedImageError: handleGeneratedImageError,
    onGeneratedDesignImageError: handleGeneratedDesignImageError,
    currentCardIndex,
    onCardIndexChange: setCurrentCardIndex,
    cardReviewMode,
    onCardReviewModeChange: setCardReviewMode,
    seedManifestTotal,
    guestRecord,
    guestRecordLoading,
  };

  // Portalled to <body> on purpose. ArchySlideContainer wraps the whole app in a
  // 200vw track that always carries a transform, and a transformed ancestor
  // becomes the containing block for position:fixed. Rendered in place, this bar
  // spanned 200vw instead of the screen, so Artifact and Chats sat off the right
  // edge and Bart could never reach his other chats from his phone.
  // src/components/Header.jsx does the same thing for the public mobile drawer.
  // Auto's own toolbar actions are published up to AOHeader so they can live in
  // the mobile menu instead of a toolbar row. Library is already a tab there.
  // Deps are primitives on purpose: the effect must not re-run because of the
  // array it just handed up.
  // Everything the header used to hold, in a sheet that rises from the thumb.
  const mobileMenuSheet = isMobile && mobileMenuOpen ? (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Menu">
      <button
        type="button"
        className="absolute inset-0 bg-black/30"
        aria-label="Close menu"
        onClick={() => setMobileMenuOpen(false)}
      />
      <div
        className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white shadow-2xl"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)' }}
        {...sheetSwipe}
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-gray-300" aria-hidden />

        {/* Threads first, grouped by channel like the desktop sidebar (2026-10-26:
            the phone still showed a flat list of old chats). */}
        <div className="pt-1">
          <ThreadSidebar
            threads={threads}
            archivedThreads={archivedThreads}
            activeThreadId={activeThreadId}
            onSelectThread={(t) => {
              setMobileMenuOpen(false);
              loadThread(t);
            }}
            onNewThread={startNewThread}
            onRefresh={loadThreadList}
            channels={channels}
            onNewInChannel={(key) => {
              setMobileMenuOpen(false);
              startNewThread(null, key);
            }}
            onMoveThread={moveThread}
            onNewChannel={newChannel}
            showHeader={false}
            className="w-full"
          />
        </div>
        <div className="mx-4 my-2 h-px bg-gray-200" />

        <div className="p-2">
          <button
            type="button"
            disabled={startingNew || sending || loading}
            onClick={() => {
              setMobileMenuOpen(false);
              startNewThread();
            }}
            className="block w-full rounded-xl px-4 py-3.5 text-left text-[15px] text-gray-800 hover:bg-gray-50 disabled:opacity-40"
          >
            New chat
          </button>
          {[
            { key: 'team', label: teamNeedsCount > 0 ? `Team board (${teamNeedsCount} need${teamNeedsCount === 1 ? 's' : ''} you)` : 'Team board', run: () => setTeamOpen(true) },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              disabled={startingNew || sending || loading}
              onClick={() => {
                setMobileMenuOpen(false);
                item.run();
              }}
              className="block w-full rounded-xl px-4 py-3.5 text-left text-[15px] text-gray-800 hover:bg-gray-50 disabled:opacity-40"
            >
              {item.label}
            </button>
          ))}
          {[
            { key: 'transcript', label: 'Download transcript', disabled: visibleChatMessages.length === 0, run: () => downloadTranscriptAsMd(messages, activeThreadId) },
            { key: 'publish', label: generatedImages?.length ? `Publish ${generatedImages.length} cards` : 'Publish cards', disabled: !generatedImages?.length, run: () => publishCards() },
            { key: 'library', label: 'Library', run: () => onNavigate?.('/ao/library') },
            { key: 'queue', label: 'Queue', run: () => onNavigate?.('/ao/analyst?queue=1') },
            { key: 'podcast', label: 'Podcast', run: () => onNavigate?.('/ao/podcast') },
            { key: 'settings', label: 'Settings', run: () => onNavigate?.('/ao/settings') },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              disabled={item.disabled}
              onClick={() => {
                setMobileMenuOpen(false);
                item.run();
              }}
              className="block w-full rounded-xl px-4 py-3.5 text-left text-[15px] text-gray-800 hover:bg-gray-50 disabled:opacity-40"
            >
              {item.label}
            </button>
          ))}
          <div className="my-1 h-px bg-gray-200" />
          <button
            type="button"
            onClick={async () => {
              setMobileMenuOpen(false);
              try {
                await fetch('/api/ao/auth/logout', { method: 'POST' });
              } catch (e) {}
              onNavigate?.('/ao/login');
            }}
            className="block w-full rounded-xl px-4 py-3.5 text-left text-[15px] text-gray-500 hover:bg-gray-50"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  ) : null;

  // Portalled to <body>: ArchySlideContainer wraps the app in a 200vw
  // transformed track, and a transformed ancestor becomes the containing block
  // for position:fixed. Rendered in place this sheet would span two screens.
  const mobileBottomNav =
    typeof document !== 'undefined' && mobileMenuSheet
      ? createPortal(mobileMenuSheet, document.body)
      : null;

  return (
    <div
      className={`flex h-full overflow-hidden bg-white ${className || ''}`}
      style={{ maxWidth: '100vw' }}
    >

      {!isMobile && sidebarOpen && (
        <ThreadSidebar
          threads={threads}
          archivedThreads={archivedThreads}
          activeThreadId={activeThreadId}
          onSelectThread={handleSelectThread}
          onNewThread={startNewThread}
          onNewAgentThread={(a) => startNewThread(a)}
          onOpenQueue={openQueue}
          queueCount={queueCount}
          queueOpen={queueOpen}
          onOpenTeam={() => setTeamOpen(true)}
          teamNeedsCount={teamNeedsCount}
          onRefresh={loadThreadList}
          channels={channels}
          onNewInChannel={(key) => startNewThread(null, key)}
          onMoveThread={moveThread}
          onNewChannel={newChannel}
          className="w-64 xl:w-72 flex-shrink-0 border-r border-gray-200"
        />
      )}

      {isMobile && mobileTab === 'chats' ? (
        <ThreadSidebar
          threads={threads}
          archivedThreads={archivedThreads}
          activeThreadId={activeThreadId}
          onSelectThread={handleSelectThread}
          onNewThread={startNewThread}
          onOpenQueue={openQueue}
          queueCount={queueCount}
          queueOpen={queueOpen}
          onRefresh={loadThreadList}
          channels={channels}
          onNewInChannel={(key) => startNewThread(null, key)}
          onMoveThread={moveThread}
          onNewChannel={newChannel}
          className="flex-1 w-full min-h-0 overflow-y-auto"
          showHeader={false}
        />
      ) : (
      <div
        ref={splitContainerRef}
        className="flex flex-1 min-h-0 min-w-0 flex-row overflow-hidden"
      >
        <div
          className={`relative flex min-h-0 min-w-0 flex-col overflow-hidden ${dividerDragging ? 'select-none' : ''} ${
            !isMobile && artifactOpen ? '' : 'flex-1'
          }`}
          style={!isMobile && artifactOpen ? { width: `${splitPercent}%`, flexShrink: 0 } : undefined}
        >
        {queueOpen ? (
          <div className="absolute inset-0 z-30 flex flex-col bg-white">
            {isMobile ? (
              <button type="button" onClick={() => setMobileTab('chats')} className="flex-shrink-0 border-b border-gray-100 px-4 py-2 text-left text-xs font-semibold text-gray-500">
                ‹ Channels
              </button>
            ) : null}
            <QueueFeed onOpenThread={openThreadFromQueue} onCount={setQueueCount} />
          </div>
        ) : null}
        {aiPause ? (
          <div className="flex-shrink-0 flex items-center justify-between gap-3 px-4 py-2 text-xs bg-red-50 border-b border-red-200 text-red-800">
            <span>The team is paused: the monthly AI spending limit was reached. Raise or lift it in Anthropic and the team picks up again.</span>
            <a href={aiPause.url} target="_blank" rel="noopener noreferrer" className="font-medium underline flex-shrink-0 text-red-700">
              Open the limit
            </a>
          </div>
        ) : null}
        {linkedinTokenWarning && (
          <div className={`flex-shrink-0 flex items-center justify-between gap-3 px-4 py-2 text-xs ${
            linkedinTokenWarning.status === 'expired'
              ? 'bg-red-50 border-b border-red-200 text-red-800'
              : 'bg-amber-50 border-b border-amber-200 text-amber-800'
          }`}>
            <span>
              {linkedinTokenWarning.status === 'expired'
                ? 'LinkedIn token expired — all LinkedIn posts are failing. Reconnect now.'
                : `LinkedIn token expires in ${linkedinTokenWarning.daysRemaining} days — reconnect before posts start failing.`}
            </span>
            <a
              href="/ao/analyst#settings"
              className={`font-medium underline flex-shrink-0 ${
                linkedinTokenWarning.status === 'expired' ? 'text-red-700' : 'text-amber-700'
              }`}
            >
              Reconnect
            </a>
          </div>
        )}
        {metricsSyncAlerts.length > 0 && metricsAlertKey !== dismissedMetricsAlertKey && (
          <div className="flex-shrink-0 flex items-start justify-between gap-3 px-4 py-2 text-xs bg-amber-50 border-b border-amber-200 text-amber-900">
            <div>
              <p className="font-medium mb-1">Engagement numbers are not updating on some channels:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                {metricsSyncAlerts.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
            <button
              type="button"
              onClick={() => {
                setDismissedMetricsAlertKey(metricsAlertKey);
                try {
                  localStorage.setItem('ao_dismissed_metrics_alert_key', metricsAlertKey);
                } catch {
                  /* best-effort only — dismissal is a UI nicety, not data */
                }
              }}
              className="flex-shrink-0 text-amber-700 hover:text-amber-900"
              aria-label="Dismiss"
              title="Dismiss until this changes"
            >
              <X className="h-3.5 w-3.5" aria-hidden strokeWidth={2} />
            </button>
          </div>
        )}
        <div
          className={`flex flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 ${
            isMobile ? (contextPill ? 'py-1.5' : 'hidden') : 'py-3'
          }`}
        >
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
            ) : isMobile ? null : (
              <span className="flex items-center gap-2 text-sm font-medium text-gray-600" title={activeChannel?.purpose || ''}>
                {activeChannel ? <span className="font-semibold text-gray-900"># {activeChannel.name}</span> : null}
                <img src={avatarFor(activeChannel?.lead || activeAgent)} alt="" aria-hidden="true" className="w-6 h-6 rounded-full object-cover bg-orange-50" draggable={false} />
                {TEAM_NAMES[activeChannel?.lead || activeAgent] || 'Ada'}
                <span className="text-xs font-normal text-gray-400">leads, whole team in</span>
              </span>
            )}
          </div>
          <div className="hidden md:flex items-center gap-2">
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

        <div
          className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-5 min-h-0 relative md:px-4"
          style={isMobile ? { touchAction: 'pan-y', paddingLeft: 12, paddingRight: 12 } : undefined}
          {...(isMobile ? messageSwipe : {})}
        >
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
            <React.Fragment key={msg.id || `${msg.role}-${i}-${msg.created_at}`}>
              <MessageBubble message={msg} />
              {msg.role === 'assistant' ? (
                <ReplyLinks message={{ ...msg, __openTeam: () => setTeamOpen(true) }} onNavigate={onNavigate} />
              ) : null}
            </React.Fragment>
          ))}

          {sending && !imageGenerating && <TypingIndicator agent={activeAgent} />}

          {waitingNote && !sending ? <TypingIndicator label={waitingNote} agent={activeAgent} /> : null}

          {(teamBusy || serverWorking) && !waitingNote && !sending ? <TypingIndicator label="The team is still working. You can keep typing." agent={activeAgent} /> : null}

          {!teamBusy && !serverWorking && !waitingNote && !sending && !imageGenerating && queued.length === 0 && idleLine ? <IdleStatus label={idleLine} /> : null}

          {queued.map((text, qi) => (
            <div key={`queued-${qi}`} className="flex flex-row-reverse gap-3 opacity-60">
              <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold bg-gray-900 text-white" aria-hidden="true">
                B
              </div>
              <div className="max-w-[75%] min-w-0">
                <div className="rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap bg-gray-900 text-white">{text}</div>
                <p className="mt-1 text-right text-[11px] text-gray-400">Sends as soon as this reply lands</p>
              </div>
            </div>
          ))}

          {imageGenerating && (
            <TypingIndicator label="Generating your image — this may take a moment…" />
          )}

          {error && (
            <div className="flex flex-col gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
              <div className="flex items-start gap-3">
                <span className="font-medium">Error:</span> {error}
                <button type="button" onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600 flex-shrink-0" aria-label="Dismiss">
                  <CloseIcon />
                </button>
              </div>
              {input.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setMessages((prev) => prev.filter((m) => !m.meta?.failed));
                    sendMessage(input, { retry: true });
                  }}
                  className="self-start px-3 py-1.5 bg-red-700 text-white text-xs font-semibold rounded-lg hover:bg-red-800 transition-colors"
                >
                  Retry
                </button>
              )}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {pendingFiles.length > 0 && (
          <div className="px-4 pb-2 flex flex-wrap items-center gap-2">
            {pendingFiles.map((pf, idx) => (
              <div key={`${pf.name}-${idx}`} className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700 max-w-xs">
                {pf.type?.startsWith('image/') && (
                  <img src={pf.dataUrl} alt="" className="w-8 h-8 object-cover rounded" />
                )}
                <span className="truncate">{pf.name}</span>
                <button
                  type="button"
                  onClick={() => setPendingFiles((prev) => prev.filter((_, i) => i !== idx))}
                  className="ml-auto text-blue-400 hover:text-blue-600 flex-shrink-0"
                  aria-label="Remove attachment"
                >
                  <CloseIcon />
                </button>
              </div>
            ))}
          </div>
        )}

        {isMobile && artifactUnread && hasArtifactContent && !mobileArtifactOpen ? (
          <button
            type="button"
            onClick={() => {
              setMobileArtifactOpen(true);
              setArtifactUnread(false);
            }}
            className="flex-shrink-0 mx-4 mb-1 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-left text-[13px] font-medium text-blue-700"
          >
            <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500" aria-hidden />
            <span className="truncate">{artifact?.label || 'Draft ready'}</span>
            <span className="ml-auto flex-shrink-0 text-blue-400">Open</span>
          </button>
        ) : null}

        <div
          className="flex-shrink-0 px-4 pb-4 pt-2 border-t border-gray-100 bg-white"
          style={{
            ...(keyboardInset > 0 ? { paddingBottom: `max(1rem, ${keyboardInset}px)` } : null),
            ...(isMobile ? { touchAction: 'pan-y' } : null),
          }}
          {...(isMobile ? composerSwipe : {})}
        >
          {!queueOpen ? (
            <PinnedQuestions
              questions={pinnedQuestions}
              disabled={sending}
              onYes={(q) => {
                dismissQuestion(q);
                sendMessageRef.current?.(quotedReply(q.question, 'Yes.'));
              }}
              onAnswer={(q) => {
                dismissQuestion(q);
                // What he was typing stays first; the question is quoted under it.
                setInput((prev) => `${prev && prev.trim() ? `${prev.replace(/\s*$/, '')}\n\n` : ''}${quotedReply(q.question)}`);
                focusChatInput();
              }}
            />
          ) : null}
          {pendingMention(input) !== null ? (
            <div className="mb-2 flex flex-wrap gap-2">
              {MENTION_CHOICES.filter((c) => c.handle.toLowerCase().startsWith(pendingMention(input) || '')).map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setInput((prev) => prev.replace(/@(\w*)$/, `@${c.handle} `));
                    setTimeout(() => textareaRef.current?.focus(), 0);
                  }}
                  className="flex items-center gap-2 rounded-full border border-gray-300 bg-white pl-1 pr-3 py-1 text-xs text-gray-800 hover:bg-gray-50"
                >
                  <img src={avatarFor(c.key)} alt="" aria-hidden="true" className="w-6 h-6 rounded-full object-cover bg-orange-50" />
                  <span className="font-semibold">@{c.handle}</span>
                  <span className="text-gray-500">{c.role}</span>
                </button>
              ))}
            </div>
          ) : null}
          {quoteCandidate ? (
            <div className="mb-2 flex items-center gap-2">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={replyToHighlighted}
                className="flex-1 min-w-0 text-left text-xs bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-3 py-2"
              >
                <span className="font-semibold">Reply to highlighted:</span>{' '}
                <span className="italic">“{quoteCandidate.length > 90 ? `${quoteCandidate.slice(0, 90)}…` : quoteCandidate}”</span>
              </button>
              <button type="button" onClick={() => setQuoteCandidate('')} className="text-xs text-gray-400 px-2" aria-label="Dismiss">
                ×
              </button>
            </div>
          ) : null}
          <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-3 focus-within:border-gray-400 focus-within:bg-white transition-colors">

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending || startingNew}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded disabled:opacity-40"
              aria-label="Attach file"
              title="Attach image or file to this message (Auto can see it)"
            >
              <PaperclipIcon />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.txt,.md,.csv"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />

            <HeaderUploadToDraftTrigger
              inputRef={imageUploadInputRef}
              onPickFile={() => imageUploadInputRef.current?.click()}
              onChange={handleHeaderImageUpload}
              disabled={sending || startingNew}
              uploading={uploadingHeaderImage}
            />

            {isMobile && (
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded"
                aria-label="Menu, chats and actions"
                title="Chats and actions"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
                </svg>
              </button>
            )}

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
              }}
              onKeyDown={handleKeyDown}
              placeholder={`${activeChannel ? `Message #${activeChannel.name}` : `Talk to ${TEAM_NAMES[activeAgent] || 'Ada'}`}… (@ brings in a teammate, @team everyone)`}
              rows={1}
              disabled={startingNew}
              className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 resize-none outline-none leading-relaxed disabled:opacity-50"
              style={{ minHeight: '22px', height: '22px' }}
              aria-label="Message Auto"
            />

            <button
              type="button"
              onClick={() => sendMessage()}
              disabled={(!input.trim() && pendingFiles.length === 0) || (sending && pendingFiles.length > 0) || startingNew}
              className="flex-shrink-0 w-8 h-8 bg-gray-900 text-white rounded-lg flex items-center justify-center hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Send message"
            >
              <SendIcon />
            </button>
          </div>
          {!isMobile && (
            <p className="text-xs text-gray-400 mt-2 text-center">Shift + Enter for new line</p>
          )}
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
                onClose={closeArtifactPanel}
              />
            </div>
          </>
        )}
      </div>
      )}

      {mobileBottomNav}

      {isMobile && mobileArtifactOpen && typeof document !== 'undefined' ? (
        createPortal(
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
            className={`absolute inset-y-0 right-0 flex w-[94%] flex-col border-l border-gray-200 bg-white shadow-2xl transition-transform duration-300 ease-out ${
              mobileArtifactDrawerShown ? 'translate-x-0' : 'translate-x-full'
            }`}
            style={{ touchAction: 'pan-y' }}
            {...artifactSwipe}
          >
            <div
              className="flex-shrink-0 px-4 flex items-center justify-between border-b border-gray-200"
              style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 8px)', paddingBottom: 8 }}
            >
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
        </div>,
        document.body
        )
      ) : null}

      {teamOpen && typeof document !== 'undefined'
        ? createPortal(
            <div className="fixed inset-0 z-[80] flex justify-end bg-black/30" onClick={() => setTeamOpen(false)}>
              <div className="h-full w-full sm:w-[420px] shadow-xl" onClick={(e) => e.stopPropagation()}>
                <TeamBoard
                  onClose={() => setTeamOpen(false)}
                  onOpenThread={(id) => {
                    setTeamOpen(false);
                    handleSelectThread({ id });
                  }}
                />
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
