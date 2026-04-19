import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

function safeText(v, maxLen = 0) {
  const s = String(v || '').trim();
  if (!s) return '';
  return maxLen ? s.slice(0, maxLen) : s;
}

function modeLabel(mode) {
  const m = String(mode || '').toLowerCase().trim();
  if (m === 'write') return 'Writing';
  if (m === 'package') return 'Packaging';
  if (m === 'publish') return 'Publishing';
  if (m === 'recall') return 'Recall';
  if (m === 'training') return 'Training';
  if (m === 'plan') return 'Planning';
  return 'Auto';
}

async function fileToPayload(file) {
  const mimeType = String(file?.type || '').toLowerCase();
  const fileName = String(file?.name || 'file').trim();
  const isImage = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(mimeType);
  const isText = mimeType === 'text/plain' || mimeType === 'text/markdown' || fileName.endsWith('.txt') || fileName.endsWith('.md');
  if (!isImage && !isText) return null;

  if (isText) {
    const text = await file.text();
    return {
      kind: 'text',
      file_name: fileName,
      mime_type: mimeType || 'text/plain',
      extracted_text: text,
      content_base64: '',
      label: '',
      preview_url: '',
    };
  }

  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return {
    kind: 'image',
    file_name: fileName,
    mime_type: mimeType || 'image/jpeg',
    extracted_text: '',
    content_base64: btoa(binary),
    label: '',
    preview_url: URL.createObjectURL(file),
  };
}

export default function AutoHubPanel({ onNavigate, draftsAnchorId = 'auto-drafts' }) {
  const [loading, setLoading] = useState(true);
  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [bundles, setBundles] = useState([]);
  const [guardrails, setGuardrails] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [successTip, setSuccessTip] = useState('');
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [phraseLegendOpen, setPhraseLegendOpen] = useState(false);
  const [activityLogOpen, setActivityLogOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [startingNew, setStartingNew] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const composerDraftKey = (threadId) => `ao-auto-composer:${threadId || 'none'}`;
  /** Only show the bundle card for this thread’s active bundle — not the latest global Library item. */
  const latestBundle = useMemo(() => {
    const bid =
      thread?.state && typeof thread.state === 'object' ? thread.state.bundle_id : null;
    if (!bid) return null;
    const list = Array.isArray(bundles) ? bundles : [];
    return list.find((b) => String(b?.id) === String(bid)) || null;
  }, [thread, bundles]);

  const publishPlanBanner = useMemo(() => {
    const st = thread?.state && typeof thread.state === 'object' ? thread.state : null;
    if (!st || st.publish_wizard?.step !== 'await_confirm') return null;
    const n = st.publish_wizard?.pending?.items?.length || 0;
    const gap = st.publish_wizard?.pending?.gap_days;
    return { n, gap };
  }, [thread]);

  const rapidWriteBanner = useMemo(() => {
    const st = thread?.state && typeof thread.state === 'object' ? thread.state : null;
    if (!st?.rapid_write?.active) return null;
    const n = Array.isArray(st.rapid_write.seeds) ? st.rapid_write.seeds.length : 0;
    const d = st.rapid_write.drafts_by_seed_id;
    const draftCount = d && typeof d === 'object' ? Object.keys(d).length : 0;
    return { n, draftCount };
  }, [thread]);

  /** Main transcript only — system receipts are kept in thread state (activity log), not as chat bubbles. */
  const visibleChatMessages = useMemo(
    () => (Array.isArray(messages) ? messages.filter((m) => m.role !== 'receipt') : []),
    [messages]
  );

  const activityLogEntries = useMemo(() => {
    const st = thread?.state && typeof thread.state === 'object' ? thread.state : null;
    const log = st?.receipt_log;
    return Array.isArray(log) ? log : [];
  }, [thread]);

  const loadSession = useCallback(async (opts = {}) => {
    const silent = opts.silent === true;
    if (!silent) setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ao/auto/session');
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Could not load Auto');
      setThread(json.thread || null);
      setMessages(Array.isArray(json.messages) ? json.messages : []);
      setAttachments(Array.isArray(json.attachments) ? json.attachments : []);
      setBundles(Array.isArray(json.bundles) ? json.bundles : []);
      setGuardrails(Array.isArray(json.guardrails) ? json.guardrails : []);
    } catch (e) {
      setError(e.message || 'Could not load Auto');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  /** When the active thread changes, restore that thread’s saved composer draft (if any). */
  useEffect(() => {
    const tid = thread?.id;
    if (!tid) return;
    try {
      const saved = sessionStorage.getItem(composerDraftKey(tid));
      if (saved) setInput(String(saved));
    } catch (_) {}
  }, [thread?.id]);

  /** Persist composer while typing so a failed send or refresh does not wipe long text. */
  useEffect(() => {
    const tid = thread?.id;
    if (!tid) return undefined;
    const t = setTimeout(() => {
      try {
        const s = String(input || '').trim();
        if (s) sessionStorage.setItem(composerDraftKey(tid), input);
        else sessionStorage.removeItem(composerDraftKey(tid));
      } catch (_) {}
    }, 400);
    return () => clearTimeout(t);
  }, [input, thread?.id]);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        } catch (_) {}
      });
    });
    return () => cancelAnimationFrame(id);
  }, [messages]);

  useEffect(() => {
    if (!mobileMoreOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setMobileMoreOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileMoreOpen]);

  const attachmentsByMessage = useMemo(() => {
    const map = new Map();
    for (const item of attachments) {
      const key = item.message_id || 'unassigned';
      const arr = map.get(key) || [];
      arr.push(item);
      map.set(key, arr);
    }
    return map;
  }, [attachments]);

  const onFiles = useCallback(async (fileList) => {
    const files = Array.from(fileList || []);
    const next = [];
    for (const file of files.slice(0, 8)) {
      // eslint-disable-next-line no-await-in-loop
      const payload = await fileToPayload(file);
      if (payload) next.push(payload);
    }
    setPendingFiles((prev) => [...prev, ...next]);
  }, []);

  const send = useCallback(async () => {
    if (sending) return;
    const message = String(input || '').trim();
    if (!message && pendingFiles.length === 0) return;
    setSending(true);
    setError('');
    try {
      let attachmentIds = [];
      if (pendingFiles.length) {
        const uploadRes = await fetch('/api/ao/auto/attachments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            thread_id: thread?.id || null,
            attachments: pendingFiles.map((item, idx) => ({
              ...item,
              sort_order: idx,
            })),
          }),
        });
        const uploadJson = await uploadRes.json().catch(() => ({}));
        if (!uploadRes.ok || !uploadJson.ok) throw new Error(uploadJson.error || 'Could not upload files');
        attachmentIds = Array.isArray(uploadJson.attachments) ? uploadJson.attachments.map((x) => x.id) : [];
      }

      const res = await fetch('/api/ao/auto/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thread_id: thread?.id || null,
          message: message || 'Use these files.',
          attachment_ids: attachmentIds,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Could not send message');
      setThread(json.thread || null);
      setMessages(Array.isArray(json.messages) ? json.messages : []);
      setAttachments(Array.isArray(json.attachments) ? json.attachments : []);
      setInput('');
      setPendingFiles([]);
      try {
        if (thread?.id) sessionStorage.removeItem(composerDraftKey(thread.id));
      } catch (_) {}
      await loadSession({ silent: true });
    } catch (e) {
      setError(e.message || 'Could not send message');
    } finally {
      setSending(false);
    }
  }, [input, pendingFiles, sending, thread, loadSession]);

  const toggleGuardrail = useCallback(async (id, enabled) => {
    try {
      const res = await fetch(`/api/ao/auto/guardrails/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Could not update guardrail');
      setGuardrails((prev) => prev.map((g) => (g.id === id ? json.guardrail : g)));
    } catch (e) {
      setError(e.message || 'Could not update guardrail');
    }
  }, []);

  const markBundleUsed = useCallback(async (bundle) => {
    try {
      await fetch(`/api/ao/auto/bundles/${encodeURIComponent(bundle.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mark_used: true }),
      });
      setInput(bundle.original_input || bundle.title || '');
      setLibraryOpen(false);
    } catch (_) {
      setInput(bundle.original_input || bundle.title || '');
      setLibraryOpen(false);
    }
  }, []);

  const rateBundle = useCallback(async (bundle, rating) => {
    try {
      let ratingReason = '';
      if (rating === 'meh' || rating === 'bad') {
        ratingReason = window.prompt('Why?', '') || '';
      }
      const bundleDna = rating === 'good'
        ? {
            title_length: safeText(bundle.title, 200).length,
            channel_count: Object.keys(bundle.channel_drafts?.drafts_by_channel || {}).length,
            has_companions: Array.isArray(bundle.pull_quote_companions) && bundle.pull_quote_companions.length > 0,
          }
        : null;
      const res = await fetch(`/api/ao/auto/bundles/${encodeURIComponent(bundle.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, rating_reason: ratingReason, bundle_dna: bundleDna }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Could not save rating');
      setBundles((prev) => prev.map((b) => (b.id === bundle.id ? json.bundle : b)));
    } catch (e) {
      setError(e.message || 'Could not save rating');
    }
  }, []);

  const proceedBundle = useCallback(async () => {
    setInput('Proceed');
    await new Promise((resolve) => setTimeout(resolve, 0));
    try {
      const res = await fetch('/api/ao/auto/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thread_id: thread?.id || null, message: 'Proceed' }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Could not proceed');
      setThread(json.thread || null);
      setMessages(Array.isArray(json.messages) ? json.messages : []);
      setAttachments(Array.isArray(json.attachments) ? json.attachments : []);
      setInput('');
    } catch (e) {
      setError(e.message || 'Could not proceed');
    }
  }, [thread]);

  const sendBundleToImport = useCallback(async (bundle) => {
    const ideaId = bundle?.source_idea_id;
    if (!ideaId) {
      setError('No linked Ready Post for this bundle yet.');
      return;
    }
    setError('');
    setSuccessTip('');
    try {
      const res = await fetch(`/api/ao/ideas/${encodeURIComponent(ideaId)}/send-to-import`, { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Could not send to Import');
      setSuccessTip(json.message || 'Sent to Import. Open Import in AO to review and publish.');
    } catch (e) {
      setError(e.message || 'Could not send to Import');
    }
  }, []);

  const undoLastAction = useCallback(async () => {
    const actionLogId = thread?.state?.last_action_log_id;
    if (!actionLogId) return;
    try {
      const res = await fetch('/api/ao/auto/undo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action_log_id: actionLogId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Could not undo');
      await loadSession();
    } catch (e) {
      setError(e.message || 'Could not undo');
    }
  }, [thread, loadSession]);

  const startNewChat = useCallback(async () => {
    if (startingNew || savingDraft || sending || loading) return;
    const ok = window.confirm(
      'Start a new conversation? This chat will be set aside (not deleted). You will see an empty thread so you can begin fresh.'
    );
    if (!ok) return;
    setStartingNew(true);
    setError('');
    setSuccessTip('');
    try {
      const res = await fetch('/api/ao/auto/thread/new', { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Could not start a new chat');
      setInput('');
      setPendingFiles([]);
      await loadSession();
    } catch (e) {
      setError(e.message || 'Could not start a new chat');
    } finally {
      setStartingNew(false);
    }
  }, [startingNew, savingDraft, sending, loading, loadSession]);

  const saveDraft = useCallback(async () => {
    if (savingDraft || startingNew || sending || loading) return;
    setSavingDraft(true);
    setError('');
    setSuccessTip('');
    try {
      const res = await fetch('/api/ao/auto/drafts/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Could not save draft');
      setThread(json.thread || null);
      setMessages(Array.isArray(json.messages) ? json.messages : []);
      setAttachments(Array.isArray(json.attachments) ? json.attachments : []);
      setInput('');
      setPendingFiles([]);
      const sessionRes = await fetch('/api/ao/auto/session');
      const sessionJson = await sessionRes.json().catch(() => ({}));
      if (sessionRes.ok && sessionJson.ok) {
        setBundles(Array.isArray(sessionJson.bundles) ? sessionJson.bundles : []);
        setGuardrails(Array.isArray(sessionJson.guardrails) ? sessionJson.guardrails : []);
      }
      setSuccessTip('Saved as a draft. You’re in a fresh thread — open Drafts below to resume anytime.');
      try {
        window.dispatchEvent(new CustomEvent('ao-auto-draft-saved'));
      } catch (_) {}
    } catch (e) {
      setError(e.message || 'Could not save draft');
    } finally {
      setSavingDraft(false);
    }
  }, [savingDraft, startingNew, sending, loading]);

  return (
    <section className="mb-6 border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-4 border-b border-gray-200 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-3">
        <div className="min-w-0">
          <div className="text-2xl font-bold text-gray-900">Auto</div>
          <div className="text-sm text-gray-600 mt-1">
            Internal research and packaging — not the public Archy chat. One conversation at a time; use New chat for a clean thread.
          </div>
        </div>
        {/* Mobile: badges + single More — avoids horizontal button sprawl */}
        <div className="flex md:hidden flex-wrap items-center gap-2">
          <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
            Mode: {modeLabel(thread?.current_mode)}
          </span>
          {rapidWriteBanner && (
            <span
              className="px-2 py-1 rounded-full bg-amber-50 text-amber-900 text-xs font-semibold"
              title="Rapid Write recipe — ask Auto to revise drafts by seed id"
            >
              Rapid Write · {rapidWriteBanner.n} seed(s)
              {rapidWriteBanner.draftCount > 0 ? ` · ${rapidWriteBanner.draftCount} draft(s)` : ''}
            </span>
          )}
          <button
            type="button"
            onClick={() => setMobileMoreOpen(true)}
            className="min-h-[44px] px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-900 hover:bg-gray-50"
          >
            More
          </button>
        </div>
        {/* Desktop: full toolbar */}
        <div className="hidden md:flex flex-wrap items-center justify-end gap-2">
          <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
            Mode: {modeLabel(thread?.current_mode)}
          </span>
          {rapidWriteBanner && (
            <span
              className="px-2 py-1 rounded-full bg-amber-50 text-amber-900 text-xs font-semibold"
              title="Rapid Write recipe — ask Auto to revise drafts by seed id"
            >
              Rapid Write · {rapidWriteBanner.n} seed(s)
              {rapidWriteBanner.draftCount > 0 ? ` · ${rapidWriteBanner.draftCount} draft(s)` : ''}
            </span>
          )}
          <button
            type="button"
            onClick={saveDraft}
            disabled={savingDraft || startingNew || sending || loading}
            className="min-h-[44px] px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {savingDraft ? 'Saving…' : 'Save draft'}
          </button>
          <button
            type="button"
            onClick={startNewChat}
            disabled={startingNew || savingDraft || sending || loading}
            className="min-h-[44px] px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {startingNew ? 'Starting…' : 'New chat'}
          </button>
          <button
            type="button"
            onClick={() => setLibraryOpen(true)}
            className="min-h-[44px] px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm hover:bg-gray-50"
          >
            Library
          </button>
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById(draftsAnchorId);
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className="min-h-[44px] px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm hover:bg-gray-50"
          >
            Drafts
          </button>
          <button
            type="button"
            onClick={() => setAdvancedOpen(true)}
            className="min-h-[44px] px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm hover:bg-gray-50"
          >
            Advanced tools
          </button>
        </div>
      </div>

      <div className="border-t border-gray-100 bg-stone-50/90">
        <button
          type="button"
          onClick={() => setPhraseLegendOpen((o) => !o)}
          className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-800 flex items-center justify-between gap-2 hover:bg-stone-100/80 min-h-[44px]"
        >
          <span>How phrases work (quote cards and corpus)</span>
          <span className="text-gray-500 shrink-0" aria-hidden>
            {phraseLegendOpen ? '−' : '+'}
          </span>
        </button>
        {phraseLegendOpen ? (
          <div className="px-4 pb-3 text-sm text-gray-600 space-y-2 border-b border-gray-100">
            <p>
              <span className="font-semibold text-gray-800">Pull ideas from your published library: </span>
              include the word <em>corpus</em> (any capitalization). For example: “pull quote cards from my corpus on
              power,” “build the corpus,” “search the corpus for lines about culture.”
            </p>
            <p>
              <span className="font-semibold text-gray-800">Use your own text on the square cards: </span>
              paste your quotes in the same message, then ask to generate or make the cards. You do not need to say{' '}
              <em>corpus</em> for that.
            </p>
          </div>
        ) : null}
      </div>

      {successTip ? (
        <div className="mx-4 mt-4 p-3 rounded border border-emerald-200 bg-emerald-50 text-emerald-900 text-sm">
          {successTip}
        </div>
      ) : null}
      {error ? (
        <div
          className="mx-4 mt-4 p-3 rounded-lg border-2 border-red-300 bg-red-50 text-red-900 text-base font-medium"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {latestBundle ? (
        <div className="mx-4 mt-4 p-4 rounded-xl border border-gray-200 bg-white">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-gray-900">Ready-to-publish bundle</div>
              <div className="text-lg font-bold text-gray-900 mt-1">{latestBundle.title || 'Untitled bundle'}</div>
              <div className="text-sm text-gray-700 mt-2">{safeText(latestBundle.summary, 220) || 'No summary yet.'}</div>
            </div>
            <div className="text-xs text-gray-500">
              Nothing goes live until you say Proceed.
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-600">
            Channels: {Object.keys(latestBundle.channel_drafts?.drafts_by_channel || {}).join(', ') || 'none'} ·
            Companions: {Array.isArray(latestBundle.pull_quote_companions) ? latestBundle.pull_quote_companions.length : 0}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={proceedBundle} className="min-h-[44px] px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">
              Proceed
            </button>
            {latestBundle.source_idea_id ? (
              <button
                type="button"
                onClick={() => sendBundleToImport(latestBundle)}
                className="min-h-[44px] px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm hover:bg-gray-50"
              >
                Send journal to Import
              </button>
            ) : null}
            {thread?.state?.last_action_log_id ? (
              <button type="button" onClick={undoLastAction} className="min-h-[44px] px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm hover:bg-gray-50">
                Undo last action
              </button>
            ) : null}
            <button type="button" onClick={() => rateBundle(latestBundle, 'good')} className="min-h-[44px] px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm hover:bg-gray-50">
              Good
            </button>
            <button type="button" onClick={() => rateBundle(latestBundle, 'meh')} className="min-h-[44px] px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm hover:bg-gray-50">
              Meh
            </button>
            <button type="button" onClick={() => rateBundle(latestBundle, 'bad')} className="min-h-[44px] px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm hover:bg-gray-50">
              Bad
            </button>
          </div>
        </div>
      ) : null}

      {publishPlanBanner ? (
        <div className="mx-4 mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          <span className="font-semibold">Publish plan ready:</span>{' '}
          {publishPlanBanner.n} card(s)
          {publishPlanBanner.gap != null ? ` · ${publishPlanBanner.gap} day(s) between posts` : ''}. Reply{' '}
          <strong>CONFIRM PUBLISH</strong>, <strong>CANCEL</strong>, or ask to change spacing (e.g. every 2–3 days).
        </div>
      ) : null}

      {/* Single page scroll: no max-height inner scroll (avoids scroll-within-scroll on phones) */}
      <div className="px-4 py-4 bg-gray-50 space-y-3">
        {loading ? (
          <div className="text-sm text-gray-500">Loading Auto…</div>
        ) : null}

        {!loading && visibleChatMessages.length === 0 ? (
          <div className="text-sm text-gray-600">
            Try:
            <div className="mt-2 space-y-1 text-xs text-gray-500">
              <div>
                <span className="font-medium text-gray-700">Quote cards:</span> pull quotes (say <strong>corpus</strong> + topic) or paste lines → pick numbers (e.g. 1, 3, 5) → cards
                generate. Corpus pulls return a few lines at a time with per-message build limits; pasted batches can be larger—if the count looks wrong, ask{' '}
                <strong>“list all quotes in this thread.”</strong> Ask <strong>“Show card 3”</strong> or <strong>“What’s the text on card 2?”</strong> anytime—the reply includes the quote and caption text; optional image previews
                appear below when available.
              </div>
              <div>“CORPUS TL;DR: [topic]” — landscape, corpus gaps, AO fit (briefing).</div>
              <div>“CORPUS outline: [topic]” — section skeleton only.</div>
              <div>“Let’s plan this.” / “Let’s write this post.” / “I have a post ready to go out.”</div>
              <div>“Save this brief to drafts” after a CORPUS reply.</div>
              <div>“Switch to training mode.”</div>
            </div>
          </div>
        ) : null}

        {visibleChatMessages.map((m) => {
          const isAssistant = m.role === 'assistant' || m.role === 'system';
          const linked = attachmentsByMessage.get(m.id) || [];
          const multiPreviews = Array.isArray(m.meta?.quote_card_previews) ? m.meta.quote_card_previews : null;
          const previewSvg = m.meta?.quote_card_preview_svg;
          const previewPng = m.meta?.quote_card_preview_image_url;
          const cardBlocks =
            multiPreviews && multiPreviews.length
              ? multiPreviews
              : previewSvg
                ? [{ svg: previewSvg, image_url: previewPng, caption: '', index: 1 }]
                : [];
          return (
            <div key={m.id} className={isAssistant ? '' : 'text-right'}>
              <div
                className={[
                  'inline-block max-w-[94%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap',
                  isAssistant ? 'bg-white border border-gray-200 text-gray-900' : 'bg-gray-900 text-white',
                ].join(' ')}
              >
                {m.content}
              </div>
              {isAssistant && cardBlocks.length ? (
                <div className="mt-2 space-y-3 max-w-lg mx-auto text-left">
                  {cardBlocks.map((block, bi) => (
                    <div key={`${m.id}-card-${bi}`} className="border border-gray-200 rounded-lg overflow-hidden bg-neutral-100">
                      <div className="px-3 py-2.5 bg-white border-b border-gray-100">
                        <div className="text-sm font-semibold text-gray-800">
                          {multiPreviews && multiPreviews.length > 1
                            ? `Card ${block.index != null ? block.index : bi + 1}`
                            : 'Minimal card preview'}
                        </div>
                        {block.caption ? (
                          <div className="font-normal text-gray-900 mt-2 text-[15px] sm:text-base leading-relaxed whitespace-normal">
                            {block.caption}
                          </div>
                        ) : null}
                        {block.image_url ? (
                          <div className="text-[11px] text-gray-500 mt-1">Preview matches the image sent to social (server PNG).</div>
                        ) : null}
                      </div>
                      <img
                        src={
                          block.image_url && String(block.image_url).startsWith('https://')
                            ? block.image_url
                            : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(block.svg)}`
                        }
                        alt={block.caption ? 'Quote card with caption' : 'Quote card preview'}
                        className="w-full h-auto block"
                      />
                    </div>
                  ))}
                </div>
              ) : null}
              {linked.length ? (
                <div className={`mt-2 flex flex-wrap gap-2 ${isAssistant ? '' : 'justify-end'}`}>
                  {linked.map((a) => (
                    a.kind === 'image' ? (
                      <div key={a.id} className="border border-gray-200 rounded-lg bg-white p-2">
                        {a.public_url ? (
                          <img src={a.public_url} alt={a.label || a.file_name} className="w-24 h-24 object-cover rounded" />
                        ) : null}
                        <div className="mt-1 text-xs text-gray-600">{a.label || a.file_name}</div>
                      </div>
                    ) : (
                      <div key={a.id} className="border border-gray-200 rounded-lg bg-white p-2 max-w-[min(220px,85vw)] text-left">
                        <div className="text-xs font-semibold text-gray-900">{a.label || a.file_name}</div>
                        <div className="mt-1 text-xs text-gray-600 whitespace-pre-wrap">
                          {safeText(a.extracted_text, 180) || 'Text file'}
                        </div>
                      </div>
                    )
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
        <div ref={messagesEndRef} className="h-px w-full shrink-0" aria-hidden />
      </div>

      {activityLogEntries.length ? (
        <div className="mx-4 mb-2 rounded-lg border border-gray-200 bg-white text-xs">
          <button
            type="button"
            onClick={() => setActivityLogOpen((o) => !o)}
            className="w-full text-left px-3 py-2 font-medium text-gray-700 flex justify-between items-center gap-2 hover:bg-gray-50 rounded-lg"
          >
            <span>
              Activity log — what Auto recorded this session ({activityLogEntries.length}). Optional; does not add to your main thread.
            </span>
            <span className="shrink-0 text-gray-500">{activityLogOpen ? 'Hide' : 'Show'}</span>
          </button>
          {activityLogOpen ? (
            <ul className="px-3 pb-3 space-y-2 max-h-44 overflow-y-auto text-gray-600 border-t border-gray-100">
              {[...activityLogEntries].reverse().map((e, i) => {
                let when = '';
                try {
                  when = new Date(e.at).toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  });
                } catch (_) {
                  when = '';
                }
                return (
                  <li key={`${e.at}-${i}`} className="whitespace-pre-wrap pt-2 first:pt-0 border-t border-gray-100 first:border-0">
                    {when ? <span className="text-gray-400 block mb-0.5">{when}</span> : null}
                    {e.text}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div
        className="border-t border-gray-200 px-4 py-3 bg-white md:static max-md:sticky max-md:z-30 max-md:bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] max-md:shadow-[0_-8px_28px_rgba(0,0,0,0.07)]"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void onFiles(e.dataTransfer?.files || []);
        }}
      >
        {error ? (
          <div
            className="mb-3 md:hidden p-3 rounded-lg border-2 border-red-400 bg-red-50 text-red-950 text-base font-medium"
            role="alert"
          >
            {error}
          </div>
        ) : null}
        {pendingFiles.length ? (
          <div className="mb-3 flex flex-wrap gap-2">
            {pendingFiles.map((f, idx) => (
              <div key={`${f.file_name}-${idx}`} className="border border-gray-200 rounded-lg bg-gray-50 p-2 text-xs">
                {f.kind === 'image' && f.preview_url ? (
                  <img src={f.preview_url} alt={f.file_name} className="w-16 h-16 object-cover rounded mb-1" />
                ) : null}
                <input
                  value={f.label}
                  onChange={(e) => setPendingFiles((prev) => prev.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)))}
                  className="w-full border border-gray-300 rounded px-2 py-1 mb-1"
                  placeholder="Label"
                />
                <div className="text-gray-700">{f.file_name}</div>
                <div className="mt-1 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPendingFiles((prev) => prev.filter((_, i) => i !== idx))}
                    className="px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50"
                  >
                    Remove
                  </button>
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => setPendingFiles((prev) => {
                      const next = [...prev];
                      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                      return next;
                    })}
                    className="px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    disabled={idx === pendingFiles.length - 1}
                    onClick={() => setPendingFiles((prev) => {
                      const next = [...prev];
                      [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
                      return next;
                    })}
                    className="px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Down
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[44px] px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm hover:bg-gray-50"
          >
            Add file
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,image/jpeg,image/jpg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => {
              void onFiles(e.target.files || []);
              e.target.value = '';
            }}
          />
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={3}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-base md:text-sm"
            placeholder="Talk to Auto…"
          />
          <button
            type="button"
            onClick={send}
            disabled={sending || (!String(input || '').trim() && pendingFiles.length === 0)}
            className="min-h-[44px] px-4 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-50"
          >
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          Drag and drop works here too. Images and text files will show in the thread.
        </div>
      </div>

      {libraryOpen ? (
        <div className="fixed inset-0 z-40 bg-black/40">
          <div className="absolute inset-x-0 bottom-0 top-0 md:inset-12 md:rounded-xl bg-white shadow-xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-gray-900">Library</div>
                <div className="text-xs text-gray-600">Saved bundles, learned guardrails, and series memory.</div>
              </div>
              <button type="button" onClick={() => setLibraryOpen(false)} className="min-h-[44px] px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm hover:bg-gray-50">Close</button>
            </div>
            <div className="px-4 py-4 grid gap-6 lg:grid-cols-2">
              <div>
                <div className="text-sm font-semibold text-gray-900 mb-2">Saved bundles</div>
                <div className="space-y-2">
                  {bundles.length === 0 ? <div className="text-sm text-gray-500">No saved bundles yet.</div> : null}
                  {bundles.map((bundle) => (
                    <div key={bundle.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="font-medium text-gray-900">{bundle.title || 'Untitled bundle'}</div>
                      <div className="text-xs text-gray-500 mt-1">{bundle.series_name || 'No series'}</div>
                      <div className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{safeText(bundle.summary, 180) || 'No summary yet.'}</div>
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => markBundleUsed(bundle)}
                          className="min-h-[44px] px-3 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800"
                        >
                          Use in chat
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900 mb-2">Guardrails</div>
                <div className="space-y-2">
                  {guardrails.length === 0 ? <div className="text-sm text-gray-500">No learned guardrails yet.</div> : null}
                  {guardrails.map((g) => (
                    <div key={g.id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-medium text-gray-900">{g.title || 'Learned guardrail'}</div>
                          <div className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{g.rule_text}</div>
                        </div>
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input type="checkbox" checked={!!g.enabled} onChange={(e) => toggleGuardrail(g.id, e.target.checked)} />
                          Enabled
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {mobileMoreOpen ? (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Auto actions">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close menu"
            onClick={() => setMobileMoreOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-white shadow-2xl border-t border-gray-200 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-2">
            <div className="text-sm font-semibold text-gray-900 pb-1">Actions</div>
            <button
              type="button"
              onClick={() => {
                setMobileMoreOpen(false);
                saveDraft();
              }}
              disabled={savingDraft || startingNew || sending || loading}
              className="w-full min-h-[48px] px-4 py-3 rounded-xl border border-gray-300 bg-white text-left text-sm font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-50"
            >
              {savingDraft ? 'Saving…' : 'Save draft'}
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMoreOpen(false);
                startNewChat();
              }}
              disabled={startingNew || savingDraft || sending || loading}
              className="w-full min-h-[48px] px-4 py-3 rounded-xl border border-gray-300 bg-white text-left text-sm font-medium text-gray-900 hover:bg-gray-50 disabled:opacity-50"
            >
              {startingNew ? 'Starting…' : 'New chat'}
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMoreOpen(false);
                setLibraryOpen(true);
              }}
              className="w-full min-h-[48px] px-4 py-3 rounded-xl border border-gray-300 bg-white text-left text-sm font-medium text-gray-900 hover:bg-gray-50"
            >
              Library
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMoreOpen(false);
                const el = document.getElementById(draftsAnchorId);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="w-full min-h-[48px] px-4 py-3 rounded-xl border border-gray-300 bg-white text-left text-sm font-medium text-gray-900 hover:bg-gray-50"
            >
              Jump to Drafts
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMoreOpen(false);
                setAdvancedOpen(true);
              }}
              className="w-full min-h-[48px] px-4 py-3 rounded-xl border border-gray-300 bg-white text-left text-sm font-medium text-gray-900 hover:bg-gray-50"
            >
              Advanced tools
            </button>
            <button
              type="button"
              onClick={() => setMobileMoreOpen(false)}
              className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-gray-100 text-sm font-medium text-gray-800"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {advancedOpen ? (
        <div className="fixed inset-0 z-40 bg-black/40">
          <div className="absolute inset-x-0 bottom-0 top-auto md:inset-auto md:right-12 md:top-20 md:w-[360px] bg-white shadow-xl border border-gray-200 rounded-t-xl md:rounded-xl">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-900">Advanced tools</div>
              <button type="button" onClick={() => setAdvancedOpen(false)} className="text-sm text-gray-600 hover:text-gray-900">Close</button>
            </div>
            <div className="p-3 space-y-2">
              <button type="button" onClick={() => onNavigate?.('/ao/scout')} className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-gray-300 bg-white text-left text-sm hover:bg-gray-50">Open Scout</button>
              <button type="button" onClick={() => onNavigate?.('/ao/studio')} className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-gray-300 bg-white text-left text-sm hover:bg-gray-50">Open Studio</button>
              <button type="button" onClick={() => onNavigate?.('/ao/publisher')} className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-gray-300 bg-white text-left text-sm hover:bg-gray-50">Open Publisher</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
