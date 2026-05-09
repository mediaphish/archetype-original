/**
 * AutoV2Panel — Conversation-first UI for Auto V2
 *
 * Three-panel layout:
 *   Left   — Thread history (active + archived conversation drafts)
 *   Center — Live conversation with Auto
 *   Right  — Artifact panel (quote card preview, actions)
 *
 * Calls `/api/ao/auto/chat` with `{ thread_id, message }` and reads the same
 * response shape as AutoHubPanel: `{ ok, thread, messages, attachments, assistant_message, ... }`.
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatRelativeDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now - d;
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function extractContextPill(messages) {
  const list = Array.isArray(messages) ? messages : [];
  if (list.length === 0) return null;
  const last = [...list].reverse().find((m) => m.role === 'assistant');
  if (!last) return null;
  const text = String(last.content || '');
  const cardMatch = text.match(/(?:card|Card)\s+(\d+)\s+(?:of|\/)\s+(\d+)/);
  if (cardMatch) return `Working on: card ${cardMatch[1]} of ${cardMatch[2]}`;
  const seriesMatch = text.match(/(?:part|Part|chapter|Chapter)\s+(\d+)/i);
  if (seriesMatch) return `Working on: part ${seriesMatch[1]}`;
  return null;
}

function extractArtifact(messages) {
  const list = Array.isArray(messages) ? messages : [];
  if (list.length === 0) return null;
  const last = [...list].reverse().find((m) => m.role === 'assistant');
  if (!last) return null;
  const text = String(last.content || '');

  const multiLine = text.match(
    /Power says?[:\s]+(.+?)\s*\n\s*Servant leadership says?[:\s]+(.+?)(?:[.\n]|$)/i
  );
  if (multiLine) {
    return {
      type: 'quote_card',
      line1: multiLine[1]?.trim(),
      line2: multiLine[2]?.trim(),
    };
  }

  const singleLine = text.match(
    /Power says?[:\s]+(.+?)\.\s*Servant leadership says?[:\s]+(.+?)\.?/i
  );
  if (singleLine) {
    return {
      type: 'quote_card',
      line1: singleLine[1]?.trim(),
      line2: singleLine[2]?.trim(),
    };
  }

  const revisedMatch = text.match(
    /(?:\*\*Card\s+\d+.*?\*\*|Card\s+\d+[^.]*?(?:—|:))\s*\n+(.{10,80})\n(.{10,80})/
  );
  if (revisedMatch) {
    return {
      type: 'quote_card',
      line1: revisedMatch[1]?.trim(),
      line2: revisedMatch[2]?.trim(),
    };
  }

  return null;
}

function threadTitle(thread) {
  if (!thread) return 'Conversation';
  if (thread.title && String(thread.title).trim() && thread.title !== 'Auto') {
    return String(thread.title).slice(0, 80);
  }
  const preview = thread.preview || thread.first_message;
  if (preview) {
    const s = String(preview).slice(0, 50);
    return s.length < String(preview).length ? `${s}…` : s;
  }
  return 'New conversation';
}

// ─── Sub-components ──────────────────────────────────────────────────────────

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

function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  const text = String(message.content || '');

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div
        className={`
          w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-medium
          ${isUser
            ? 'bg-gray-900 text-white'
            : 'bg-gray-100 text-gray-600 border border-gray-200'
          }
        `}
        aria-hidden="true"
      >
        {isUser ? 'B' : <AOMark className="w-3.5 h-3.5" />}
      </div>

      <div
        className={`
          max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed
          ${isUser
            ? 'bg-gray-900 text-white rounded-tr-sm'
            : 'bg-gray-50 text-gray-900 border border-gray-200 rounded-tl-sm'
          }
        `}
      >
        {text.split('\n').map((line, i, arr) => (
          <span key={`${i}-${line.slice(0, 12)}`}>
            {line}
            {i < arr.length - 1 && <br />}
          </span>
        ))}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center bg-gray-100 border border-gray-200">
        <AOMark className="w-3.5 h-3.5 text-gray-600" />
      </div>
      <div className="bg-gray-50 border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex gap-1 items-center h-4">
          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

function QuoteCardPreview({ artifact }) {
  if (!artifact) return null;
  const a = String(artifact.line1 || '').trim();
  const b = String(artifact.line2 || '').trim();
  return (
    <div className="bg-black rounded-xl p-5 flex flex-col items-center justify-center min-h-[160px] text-center">
      <p className="text-white text-sm font-medium leading-relaxed mb-4">
        {a && b ? (
          <>
            {a}
            <br />
            {b}
          </>
        ) : (
          a || b
        )}
      </p>
      <AOMark className="w-4 h-4 text-white opacity-40" />
    </div>
  );
}

function ArtifactPanel({ artifact, onApprove, onRevise, onViewAll, onClose }) {
  return (
    <div className="w-64 flex-shrink-0 border-l border-gray-200 bg-gray-50 flex flex-col">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
          Artifact
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors p-0.5 rounded"
          aria-label="Close artifact panel"
        >
          <CloseIcon />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {artifact?.type === 'quote_card' && (
          <>
            <QuoteCardPreview artifact={artifact} />

            <div className="text-xs text-gray-500 space-y-1">
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
              <button
                type="button"
                onClick={onApprove}
                className="w-full py-2 px-3 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
              >
                Approve &amp; next card
              </button>
              <button
                type="button"
                onClick={onRevise}
                className="w-full py-2 px-3 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Revise this card
              </button>
              <button
                type="button"
                onClick={onViewAll}
                className="w-full py-2 px-3 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                View all cards
              </button>
            </div>
          </>
        )}

        {!artifact && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
            <AOMark className="w-8 h-8 text-gray-200 mb-3" />
            <p className="text-xs text-gray-400 leading-relaxed">
              Quote cards, drafts, and content will appear here as you work.
            </p>
          </div>
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
            onClick={() => onSelectThread(thread.id)}
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

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AutoV2Panel({ onNavigate, className }) {
  const [messages, setMessages] = useState([]);
  const [threads, setThreads] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [artifactOpen, setArtifactOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [startingNew, setStartingNew] = useState(false);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const visibleChatMessages = useMemo(
    () => (Array.isArray(messages) ? messages.filter((m) => m.role !== 'receipt') : []),
    [messages]
  );

  const contextPill = useMemo(() => extractContextPill(visibleChatMessages), [visibleChatMessages]);
  const artifact = useMemo(() => extractArtifact(visibleChatMessages), [visibleChatMessages]);

  useEffect(() => {
    if (artifact) setArtifactOpen(true);
  }, [artifact]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visibleChatMessages, sending]);

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
        setMessages(Array.isArray(sessionJson.messages) ? sessionJson.messages : []);
      } else {
        setActiveThreadId(null);
        setMessages([]);
      }
    } catch (e) {
      setError(e.message || 'Could not load Auto');
    }
  }, [mergeThreadRows]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadThreadList();
      setLoading(false);
    })();
  }, [loadThreadList]);

  const loadThread = useCallback(
    async (threadId) => {
      if (!threadId || threadId === activeThreadId) return;
      setLoading(true);
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
        setMessages(Array.isArray(json.messages) ? json.messages : []);
        await loadThreadList();
      } catch (e) {
        setError(e.message || 'Could not open conversation');
      } finally {
        setLoading(false);
      }
    },
    [activeThreadId, loadThreadList]
  );

  const startNewThread = useCallback(async () => {
    if (startingNew || sending || loading) return;
    const ok = window.confirm(
      'Start a new conversation? This chat will be set aside (not deleted). You will see an empty thread so you can begin fresh.'
    );
    if (!ok) return;
    setStartingNew(true);
    setError('');
    setArtifactOpen(false);
    try {
      const res = await fetch('/api/ao/auto/thread/new', { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Could not start a new chat');
      setInput('');
      setActiveThreadId(json.thread?.id || null);
      setMessages(Array.isArray(json.messages) ? json.messages : []);
      await loadThreadList();
    } catch (e) {
      setError(e.message || 'Could not start a new chat');
    } finally {
      setStartingNew(false);
    }
  }, [startingNew, sending, loading, loadThreadList]);

  const sendMessage = useCallback(
    async (messageText) => {
      const text = String(messageText !== undefined ? messageText : input).trim();
      if (!text || sending) return;

      setSending(true);
      setError('');

      try {
        const res = await fetch('/api/ao/auto/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            thread_id: activeThreadId || null,
            message: text,
          }),
        });
        const json = await res.json().catch(() => ({}));

        if (!res.ok || !json.ok) {
          throw new Error(json.error || 'Could not reach Auto');
        }

        const tid = json.thread?.id;
        if (tid) setActiveThreadId(tid);

        setMessages(Array.isArray(json.messages) ? json.messages : []);
        if (messageText === undefined) setInput('');

        await loadThreadList();
      } catch (e) {
        setError(e.message || 'Something went wrong');
      } finally {
        setSending(false);
      }
    },
    [input, sending, activeThreadId, loadThreadList]
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
    sendMessage('Approve this card and move to the next one.');
  }, [sendMessage]);

  const handleRevise = useCallback(() => {
    sendMessage('Revise this card — ');
    textareaRef.current?.focus();
  }, [sendMessage]);

  const handleViewAll = useCallback(() => {
    sendMessage('Show me all cards in this batch.');
  }, [sendMessage]);

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
    <div className={`flex h-full overflow-hidden bg-white rounded-xl border border-gray-200 shadow-sm ${className || ''}`}>

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
              <span className="text-sm font-medium text-gray-500">Auto</span>
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
            <button
              type="button"
              onClick={() => onNavigate?.('/ao/library')}
              className="text-xs font-medium text-gray-600 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Library
            </button>
            <button
              type="button"
              onClick={() => onNavigate?.('/ao/publisher')}
              className="text-xs font-medium text-gray-600 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
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
                Talk to Auto the same way you&apos;d talk to your CMO. No commands. No trigger phrases. Just tell it what you need.
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
                    className="w-full text-left text-xs text-gray-600 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-colors leading-snug"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {visibleChatMessages.map((msg) => (
            <MessageBubble key={msg.id || `${msg.role}-${msg.created_at}-${msg.content?.slice(0, 20)}`} message={msg} />
          ))}

          {sending && <TypingIndicator />}

          {error && (
            <div className="flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
              <span className="font-medium">Error:</span> {error}
              <button
                type="button"
                onClick={() => setError('')}
                className="ml-auto text-red-400 hover:text-red-600 flex-shrink-0"
                aria-label="Dismiss error"
              >
                <CloseIcon />
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="flex-shrink-0 px-4 pb-4 pt-2 border-t border-gray-100 bg-white">
          <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus-within:border-gray-400 focus-within:bg-white transition-colors">
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
              className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 resize-none outline-none leading-relaxed disabled:opacity-50 min-h-[24px]"
              style={{ height: '24px' }}
              aria-label="Message Auto"
            />
            <button
              type="button"
              onClick={() => sendMessage()}
              disabled={!input.trim() || sending || startingNew}
              className="flex-shrink-0 w-8 h-8 bg-gray-900 text-white rounded-lg flex items-center justify-center hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Send message"
            >
              <SendIcon />
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            Shift + Enter for new line
          </p>
        </div>
      </div>

      {artifactOpen && (
        <ArtifactPanel
          artifact={artifact}
          onApprove={handleApprove}
          onRevise={handleRevise}
          onViewAll={handleViewAll}
          onClose={() => setArtifactOpen(false)}
        />
      )}

    </div>
  );
}
