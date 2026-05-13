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

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
  const withoutImages = raw.replace(/\[IMAGES_GENERATED\][\s\S]*?\[\/IMAGES_GENERATED\]/g, '').trim();
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
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed bg-white border border-gray-200 rounded-xl p-4 max-h-80 overflow-y-auto">
        {content}
      </div>
    </div>
  );
}

function DraftArtifact({ content, label }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed bg-white border border-gray-200 rounded-xl p-4 max-h-80 overflow-y-auto">
        {content}
      </div>
    </div>
  );
}

function ArtifactPanel({ artifact, generatedImages, onApprove, onRevise, onViewAll, onClose }) {
  return (
    <div className="w-64 flex-shrink-0 border-l border-gray-200 bg-gray-50 flex flex-col">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide truncate pr-2">
          {artifact?.label || (generatedImages?.length > 0 ? 'Generated cards' : 'Artifact')}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
          aria-label="Close artifact panel"
        >
          <CloseIcon />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {generatedImages?.length > 0 && (
          <div className="space-y-3">
            {generatedImages.map((img) => (
              <div key={img.card} className="rounded-xl overflow-hidden border border-gray-200 bg-black">
                <img src={img.url} alt={`Card ${img.card}`} className="w-full h-auto block" />
              </div>
            ))}
          </div>
        )}

        {!artifact && (!generatedImages || generatedImages.length === 0) && (
          <div className="flex flex-col items-center justify-center text-center py-10">
            <AOMark className="w-8 h-8 text-gray-200 mb-3" />
            <p className="text-xs text-gray-400 leading-relaxed">
              Quote cards, drafts, and content will appear here as you work.
            </p>
          </div>
        )}

        {artifact?.type === 'quote_card' && (
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
                <span className="font-medium text-gray-600 text-right">LinkedIn · Facebook · X · IG</span>
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
          <>
            <ListArtifact content={artifact.content} label={artifact.label} />
            <div className="flex flex-col gap-2">
              <button type="button" onClick={onApprove} className="w-full py-2 px-3 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors">
                Approve all
              </button>
              <button type="button" onClick={onRevise} className="w-full py-2 px-3 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                Revise
              </button>
            </div>
          </>
        )}

        {artifact?.type === 'draft' && (
          <>
            <DraftArtifact content={artifact.content} label={artifact.label} />
            <div className="flex flex-col gap-2">
              <button type="button" onClick={onApprove} className="w-full py-2 px-3 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors">
                Approve
              </button>
              <button type="button" onClick={onRevise} className="w-full py-2 px-3 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                Revise
              </button>
            </div>
          </>
        )}

        {artifact?.type === 'captions' && (
          <>
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{artifact.label}</p>
              <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed bg-white border border-gray-200 rounded-xl p-4 max-h-80 overflow-y-auto">
                {artifact.content}
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700 leading-relaxed">
              Approve these captions to send the full package to Design.
            </div>
            <div className="flex flex-col gap-2">
              <button type="button" onClick={onApprove} className="w-full py-2 px-3 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors">
                Approve captions — ready for Design
              </button>
              <button type="button" onClick={onRevise} className="w-full py-2 px-3 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                Revise captions
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ThreadSidebar({ threads, activeThreadId, onSelectThread, onNewThread }) {
  return (
    <div className="w-56 flex-shrink-0 border-r border-gray-200 bg-gray-50 flex flex-col">
      <div className="px-4 py-4 border-b border-gray-200">
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
      <div className="flex-1 overflow-y-auto py-2">
        {threads.length === 0 && (
          <p className="text-xs text-gray-400 px-4 py-3">No conversations yet.</p>
        )}
        {threads.map((thread) => (
          <button
            key={thread.id}
            type="button"
            onClick={() => onSelectThread(thread)}
            className={`
              w-full text-left px-4 py-3 transition-colors border-l-2
              ${thread.id === activeThreadId
                ? 'bg-white border-l-gray-900'
                : 'border-l-transparent hover:bg-white'
              }
            `}
          >
            <p className="text-xs font-medium text-gray-800 truncate leading-snug">
              {threadTitle(thread)}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {formatRelativeDate(thread.updated_at || thread.created_at)}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function AutoV2Panel({ onNavigate, className }) {
  const [messages, setMessages] = useState([]);
  const [threads, setThreads] = useState([]);
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

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visibleChatMessages, sending]);

  /** Keep the message field focused whenever Auto is idle (after load, send, or new thread). */
  useEffect(() => {
    if (loading || startingNew || sending) return;
    focusChatInput();
  }, [loading, startingNew, sending, focusChatInput]);

  useEffect(() => {
    if (artifact) setArtifactOpen(true);
  }, [artifact]);

  useEffect(() => {
    if (generatedImages.length > 0) setArtifactOpen(true);
  }, [generatedImages]);

  const mergeThreadRows = useCallback((sessionJson, draftsJson) => {
    const active = sessionJson?.thread || null;
    const drafts = Array.isArray(draftsJson?.drafts) ? draftsJson.drafts : [];
    const rows = [];
    if (active?.id) {
      rows.push({
        ...active,
        preview: active.preview || drafts.find((d) => d.id === active.id)?.preview,
      });
    }
    for (const d of drafts) {
      if (active?.id && d.id === active.id) continue;
      rows.push(d);
    }
    return rows;
  }, []);

  const syncArtifactFromMessages = useCallback((msgs) => {
    const allMsgs = msgs || [];

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

    // Images: scan ALL assistant messages and accumulate unique URLs
    // This makes images persist across messages in the same thread
    const seen = new Set();
    const allImages = [];
    for (const m of allMsgs) {
      if (m.role !== 'assistant') continue;
      const imgs = extractGeneratedImagesFromAssistantContent(String(m.content || ''));
      for (const img of imgs) {
        const key = img.url;
        if (!seen.has(key)) {
          seen.add(key);
          allImages.push(img);
        }
      }
    }
    if (allImages.length > 0) {
      setGeneratedImages(allImages);
    }
    // If no images found in any message, leave existing images in place
    // Images only clear when starting a new thread (handled in startNewThread)
  }, []);

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

      setThreads(mergeThreadRows(sessionJson, draftsJson));

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
      setGeneratedImages([]);
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
    setPendingFile(null);
    setGeneratedImages([]);
    try {
      const res = await fetch('/api/ao/auto/thread/new', { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Could not start a new chat');
      setInput('');
      setActiveThreadId(json.thread?.id || null);
      setMessages(Array.isArray(json.messages) ? json.messages : []);
      syncArtifactFromMessages(json.messages);
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
    sendMessage('Approve this and move to the next.');
  }, [sendMessage]);

  const handleRevise = useCallback(() => {
    setInput('Revise — ');
    textareaRef.current?.focus();
  }, []);

  const handleViewAll = useCallback(() => {
    sendMessage('Show me all cards in this batch.');
  }, [sendMessage]);

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

  return (
    <div className={`flex h-full overflow-hidden bg-white ${className || ''}`}>

      {sidebarOpen && (
        <ThreadSidebar
          threads={threads}
          activeThreadId={activeThreadId}
          onSelectThread={loadThread}
          onNewThread={startNewThread}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">

        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen((o) => !o)}
              className="text-gray-400 hover:text-gray-700 transition-colors md:hidden"
              aria-label="Toggle sidebar"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            {contextPill ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                {contextPill}
              </span>
            ) : (
              <span className="text-sm font-medium text-gray-400">Auto</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {artifact && !artifactOpen && (
              <button
                type="button"
                onClick={() => setArtifactOpen(true)}
                className="text-xs font-medium text-gray-600 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                View artifact
              </button>
            )}
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

      {artifactOpen && (
        <ArtifactPanel
          artifact={artifact}
          generatedImages={generatedImages}
          onApprove={handleApprove}
          onRevise={handleRevise}
          onViewAll={handleViewAll}
          onClose={() => setArtifactOpen(false)}
        />
      )}

    </div>
  );
}
