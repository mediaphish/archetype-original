import React, { useState, useEffect, useCallback, useRef } from 'react';
import AOHeader from '../../components/ao/AOHeader';
import LoadingSpinner from '../../components/operators/LoadingSpinner';

function Pill({ tone = 'gray', children }) {
  const tones = {
    gray: 'bg-gray-100 text-gray-700 border-gray-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    yellow: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    green: 'bg-green-50 text-green-800 border-green-200',
    blue: 'bg-blue-50 text-blue-800 border-blue-200',
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${tones[tone] || tones.gray}`}>
      {children}
    </span>
  );
}

function safeUrl(u) {
  try {
    if (!u) return null;
    const url = new URL(String(u));
    return url.toString();
  } catch {
    return null;
  }
}

function getParam(name) {
  try {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
  } catch {
    return null;
  }
}

function moveLabel(move) {
  const m = String(move || '').toLowerCase().trim();
  const map = {
    pull_quote_card: 'Quote card + caption',
    ao_angle_post: 'Short AO take (text post)',
    question_post: 'Self-audit question (spark comments)',
    third_party_summary: 'Share + interpret (with attribution)',
    journal_topic: 'Journal seed (long-form idea)',
    thread: 'Thread (multi-step)',
    carousel: 'Carousel outline',
    mini_framework: 'Mini framework (3 steps)',
    story_post: 'Story + takeaway',
    discard: 'Discard',
  };
  return map[m] || (m ? m.replace(/_/g, ' ') : 'Move');
}

function safeText(x, max = 400) {
  const s = String(x ?? '').trim();
  if (!s) return '';
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function whatItIsLabel(q) {
  const kind = safeText(q?.content_kind, 40).toLowerCase();
  if (kind) return kind.replace(/_/g, ' ');
  if (q?.is_internal) return 'internal';
  return 'signal';
}

function buildUseIdeasBullets(q) {
  const out = [];

  const best = safeText(q?.best_move, 40).toLowerCase();
  if (best && best !== 'discard') out.push(moveLabel(best));

  const angles = Array.isArray(q?.studio_playbook?.angles) ? q.studio_playbook.angles : [];
  for (const a of angles.slice(0, 3)) {
    const s = safeText(a, 220);
    if (s) out.push(s);
  }

  const altMoves = Array.isArray(q?.alt_moves) ? q.alt_moves : [];
  for (const m of altMoves.slice(0, 4)) {
    const mv = safeText(m?.move, 40).toLowerCase();
    const why = safeText(m?.why, 140);
    if (!mv || mv === 'discard') continue;
    out.push(why ? `${moveLabel(mv)} — ${why}` : moveLabel(mv));
  }

  const fallback = [
    'Turn it into a short AO takeaway (what it means + one practical move).',
    'Convert it into a self-audit question leaders can answer publicly.',
    'Use it as a seed for a longer journal entry.',
  ];
  for (const f of fallback) out.push(f);

  const seen = new Set();
  const uniq = [];
  for (const s of out) {
    const k = String(s || '').trim().toLowerCase();
    if (!k) continue;
    if (seen.has(k)) continue;
    seen.add(k);
    uniq.push(String(s).trim());
    if (uniq.length >= 5) break;
  }
  return uniq;
}

const TABS = [
  { key: 'social', label: 'Social signals' },
  { key: 'held', label: 'Held' },
  { key: 'journal', label: 'Journal topics' },
  { key: 'expandable', label: 'Long-form drafts' },
];

export default function Review() {
  const [email, setEmail] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const [activeTab, setActiveTab] = useState('social');
  const [quotes, setQuotes] = useState([]);
  const [quotesPage, setQuotesPage] = useState({ status: 'pending', limit: 10, offset: 0, total: null });
  const [pageSize, setPageSize] = useState(10);
  const [pageOffset, setPageOffset] = useState(0);

  const [heldQuotes, setHeldQuotes] = useState([]);
  const [heldPage, setHeldPage] = useState({ status: 'held', limit: 10, offset: 0, total: null });
  const [heldOffset, setHeldOffset] = useState(0);
  const [topics, setTopics] = useState([]);
  const [writing, setWriting] = useState([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);
  const [actionError, setActionError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [briefPrep, setBriefPrep] = useState({ running: false, total: 0, done: 0 });
  const preparingRef = useRef(new Set());

  // Analyst Workroom (chat) — stored locally (per device) for MVP.
  const [workroomOpen, setWorkroomOpen] = useState(false);
  const [workroomKind, setWorkroomKind] = useState('quote'); // quote | idea
  const [workroomId, setWorkroomId] = useState(null);
  const [workroomTitle, setWorkroomTitle] = useState('');
  const [workroomMessages, setWorkroomMessages] = useState([]);
  const [workroomInput, setWorkroomInput] = useState('');
  const [workroomSending, setWorkroomSending] = useState(false);
  const [workroomExecuting, setWorkroomExecuting] = useState(false);
  const [workroomError, setWorkroomError] = useState('');
  const [workroomDraftTitle, setWorkroomDraftTitle] = useState('');
  const [workroomDraftText, setWorkroomDraftText] = useState('');
  const [workroomCreating, setWorkroomCreating] = useState(false);

  const handleNavigate = useCallback((path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const workroomStorageKey = useCallback((kind, id) => {
    const k = String(kind || '').trim() || 'quote';
    const i = String(id || '').trim();
    return `ao_workroom_v1:${k}:${i}`;
  }, []);

  const openWorkroomForQuote = useCallback((q) => {
    const id = q?.id;
    if (!id) return;
    setWorkroomKind('quote');
    setWorkroomId(id);
    setWorkroomTitle(q?.source_title || q?.source_name || (q?.is_internal ? 'AO internal' : 'Item'));
    setWorkroomError('');
    setWorkroomInput('');
    try {
      const raw = window.localStorage.getItem(workroomStorageKey('quote', id));
      const parsed = raw ? JSON.parse(raw) : null;
      setWorkroomMessages(Array.isArray(parsed?.messages) ? parsed.messages : []);
    } catch {
      setWorkroomMessages([]);
    }
    setWorkroomOpen(true);
  }, [workroomStorageKey]);

  const openWorkroomForNewIdea = useCallback(() => {
    setWorkroomKind('idea');
    setWorkroomId('new');
    setWorkroomTitle('New idea');
    setWorkroomMessages([]);
    setWorkroomError('');
    setWorkroomInput('');
    setWorkroomDraftTitle('');
    setWorkroomDraftText('');
    setWorkroomOpen(true);
  }, []);

  const saveWorkroomMessages = useCallback((kind, id, messages) => {
    try {
      window.localStorage.setItem(workroomStorageKey(kind, id), JSON.stringify({ messages: Array.isArray(messages) ? messages : [] }));
    } catch (_) {}
  }, [workroomStorageKey]);

  const appendWorkroomMessage = useCallback((kind, id, msg) => {
    if (!kind || !id) return;
    setWorkroomMessages((prev) => {
      const next = [...(Array.isArray(prev) ? prev : []), msg];
      saveWorkroomMessages(kind, id, next);
      return next;
    });
  }, [saveWorkroomMessages]);

  const runWorkroomAction = useCallback(async (a) => {
    const action = String(a?.action || '').trim();
    const payload = a?.payload && typeof a.payload === 'object' ? a.payload : {};

    if (workroomKind !== 'quote' || !workroomId) {
      return { ok: false, message: 'This action is only available for quote threads right now.' };
    }

    if (action === 'generate_studio_assets') {
      const only = String(payload?.only || '').trim().toLowerCase();
      const qs = only === 'quote_card' ? '?only=quote_card' : '';
      const res = await fetch(`/api/ao/quotes/${encodeURIComponent(workroomId)}/studio-assets${qs}`, { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) return { ok: false, message: json.error || 'Could not generate Studio assets.' };
      return { ok: true, message: only === 'quote_card' ? 'Quote card refreshed.' : 'Drafts (and quote card when needed) are ready.' };
    }

    if (action === 'approve_to_studio') {
      const studioPrompt = String(payload?.studio_prompt || '').trim();
      act('quote-approve', workroomId, { next_stage: 'studio', studio_prompt: studioPrompt });
      return { ok: true, message: 'Sending to Studio…' };
    }

    if (action === 'approve_to_publisher') {
      act('quote-approve', workroomId, { next_stage: 'publisher', go_to_publisher: true });
      return { ok: true, message: 'Sending to Publisher…' };
    }

    if (action === 'add_hunt_goal') {
      const topic = String(payload?.topic || '').trim();
      const why = String(payload?.why || '').trim();
      if (!topic) return { ok: false, message: 'Missing a hunt goal topic.' };
      const res = await fetch('/api/ao/scout/hunt-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, why }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) return { ok: false, message: json.error || 'Could not add hunt goal.' };
      return { ok: true, message: 'Added a hunt goal for Scout.' };
    }

    return { ok: false, message: 'Unknown action.' };
  }, [workroomKind, workroomId, act]);

  const runWorkroomExecution = useCallback(async ({ execution, fallbackActions }) => {
    const should = !!execution?.should_execute_now;
    if (!should) return;

    const actions = Array.isArray(execution?.actions) && execution.actions.length
      ? execution.actions
      : (Array.isArray(fallbackActions) ? fallbackActions : []);

    if (!actions.length) return;

    const risk = String(execution?.risk_tier || '').toLowerCase().trim();
    if (risk === 'high') {
      const ok = window.confirm('This is a public or hard-to-undo step. Run it now?');
      if (!ok) return;
    }

    if (workroomExecuting) return;
    setWorkroomExecuting(true);
    try {
      appendWorkroomMessage(workroomKind, workroomId, {
        role: 'assistant',
        at: new Date().toISOString(),
        content: 'Working…',
      });
      for (const a of actions.slice(0, 3)) {
        const r = await runWorkroomAction(a);
        appendWorkroomMessage(workroomKind, workroomId, {
          role: 'assistant',
          at: new Date().toISOString(),
          content: r.ok ? String(r.message || 'Done.') : `Could not do that: ${String(r.message || 'Error')}`,
        });
        if (!r.ok) break;
      }
    } finally {
      setWorkroomExecuting(false);
    }
  }, [appendWorkroomMessage, runWorkroomAction, workroomExecuting, workroomKind, workroomId]);

  const sendWorkroom = useCallback(async () => {
    if (!authChecked) return;
    if (!workroomOpen) return;
    if (!workroomKind || !workroomId) return;
    if (String(workroomId) === 'new') return;
    const text = String(workroomInput || '').trim();
    if (!text) return;
    if (workroomSending) return;
    setWorkroomSending(true);
    setWorkroomError('');
    const nextMessages = [
      ...(Array.isArray(workroomMessages) ? workroomMessages : []),
      { role: 'user', at: new Date().toISOString(), content: text },
    ];
    setWorkroomMessages(nextMessages);
    saveWorkroomMessages(workroomKind, workroomId, nextMessages);
    setWorkroomInput('');
    try {
      const res = await fetch('/api/ao/analyst/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thread_kind: workroomKind,
          thread_id: workroomId,
          messages: nextMessages.slice(-12),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Could not get Analyst reply');
      const assistant = {
        role: 'assistant',
        at: new Date().toISOString(),
        content: String(json.assistant_message || '').trim(),
        suggestions: Array.isArray(json.suggestions) ? json.suggestions : [],
        go_actions: Array.isArray(json.go_actions) ? json.go_actions : [],
      };
      const after = [...nextMessages, assistant];
      setWorkroomMessages(after);
      saveWorkroomMessages(workroomKind, workroomId, after);
      await runWorkroomExecution({ execution: json.execution, fallbackActions: assistant.go_actions });
    } catch (e) {
      setWorkroomError(e.message || 'Could not send message');
    } finally {
      setWorkroomSending(false);
    }
  }, [authChecked, workroomOpen, workroomKind, workroomId, workroomInput, workroomSending, workroomMessages, saveWorkroomMessages, runWorkroomExecution]);

  const createIdeaAndStartWorkroom = useCallback(async () => {
    if (!authChecked) return;
    if (workroomCreating) return;
    const raw = String(workroomDraftText || '').trim();
    const title = String(workroomDraftTitle || '').trim();
    if (raw.length < 5) {
      setWorkroomError('Add a little more detail for the idea.');
      return;
    }
    setWorkroomCreating(true);
    setWorkroomError('');
    try {
      const res = await fetch('/api/ao/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: 'idea_seed', raw_input: raw, title: title || null }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok || !json.idea?.id) throw new Error(json.error || 'Could not create idea');
      const ideaId = json.idea.id;
      setWorkroomId(ideaId);
      setWorkroomTitle(json.idea.title || 'Idea');
      const seed = [{ role: 'user', at: new Date().toISOString(), content: raw }];
      setWorkroomMessages(seed);
      saveWorkroomMessages('idea', ideaId, seed);
      setWorkroomDraftText('');
      setWorkroomDraftTitle('');
      const chatRes = await fetch('/api/ao/analyst/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thread_kind: 'idea', thread_id: ideaId, messages: seed }),
      });
      const chatJson = await chatRes.json().catch(() => ({}));
      if (!chatRes.ok || !chatJson.ok) throw new Error(chatJson.error || 'Could not get Analyst reply');
      const assistant = {
        role: 'assistant',
        at: new Date().toISOString(),
        content: String(chatJson.assistant_message || '').trim(),
        suggestions: Array.isArray(chatJson.suggestions) ? chatJson.suggestions : [],
        go_actions: Array.isArray(chatJson.go_actions) ? chatJson.go_actions : [],
      };
      const after = [...seed, assistant];
      setWorkroomMessages(after);
      saveWorkroomMessages('idea', ideaId, after);
      await runWorkroomExecution({ execution: chatJson.execution, fallbackActions: assistant.go_actions });
    } catch (e) {
      setWorkroomError(e.message || 'Could not create idea');
    } finally {
      setWorkroomCreating(false);
    }
  }, [authChecked, workroomCreating, workroomDraftText, workroomDraftTitle, saveWorkroomMessages, runWorkroomExecution]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/ao/me');
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.ok) {
          window.location.replace('/ao/login');
          return;
        }
        if (!cancelled) {
          setEmail(json.email || '');
          setAuthChecked(true);
        }
      } catch (_) {
        window.location.replace('/ao/login');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    if (!email) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [quotesRes, heldRes, journalRes, writingRes] = await Promise.all([
          fetch(`/api/ao/quotes/list?status=pending&limit=${encodeURIComponent(pageSize)}&offset=${encodeURIComponent(pageOffset)}`),
          fetch(`/api/ao/quotes/list?status=held&limit=${encodeURIComponent(pageSize)}&offset=${encodeURIComponent(heldOffset)}`),
          fetch(`/api/ao/journal-topics/list`),
          fetch(`/api/ao/writing/list`),
        ]);
        if (cancelled) return;
        const q = await quotesRes.json().catch(() => ({}));
        const h = await heldRes.json().catch(() => ({}));
        const j = await journalRes.json().catch(() => ({}));
        const w = await writingRes.json().catch(() => ({}));
        if (q.ok && Array.isArray(q.quotes)) {
          setQuotes(q.quotes);
          if (q.page) setQuotesPage(q.page);
        }
        if (h.ok && Array.isArray(h.quotes)) {
          setHeldQuotes(h.quotes);
          if (h.page) setHeldPage(h.page);
        }
        if (j.ok && Array.isArray(j.topics)) setTopics(j.topics);
        if (w.ok && Array.isArray(w.writing)) setWriting(w.writing);
      } catch (_) {}
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [authChecked, email, pageSize, pageOffset, heldOffset]);

  const needsBrief = useCallback((q) => {
    if (!q) return false;
    // If key Analyst fields are missing, it’s not decision-ready yet.
    return !(q.why_it_matters && q.summary_interpretation && q.ao_lane && q.best_move);
  }, []);

  // Background: prepare a few briefs automatically so Analyst is decision-ready when you arrive.
  useEffect(() => {
    if (!authChecked) return;
    if (activeTab !== 'social') return;
    if (!Array.isArray(quotes) || quotes.length === 0) return;

    const candidates = quotes
      .filter((q) => q && q.status === 'pending')
      .filter((q) => needsBrief(q))
      .filter((q) => !preparingRef.current.has(q.id))
      .slice(0, 5);

    if (candidates.length === 0) return;

    let cancelled = false;
    setBriefPrep({ running: true, total: candidates.length, done: 0 });

    (async () => {
      let done = 0;
      for (const q of candidates) {
        if (cancelled) break;
        preparingRef.current.add(q.id);
        try {
          const res = await fetch(`/api/ao/quotes/${q.id}/brief`, { method: 'POST' });
          const json = await res.json().catch(() => ({}));
          if (res.ok && json.ok && json.quote) {
            setQuotes((prev) => prev.map((x) => (x.id === q.id ? json.quote : x)));
          }
        } catch (_) {}
        done += 1;
        if (!cancelled) setBriefPrep((p) => ({ ...p, done }));
      }
      if (!cancelled) setBriefPrep((p) => ({ ...p, running: false }));
    })();

    return () => { cancelled = true; };
  }, [authChecked, activeTab, quotes, needsBrief]);

  const act = useCallback(async (kind, id, extra) => {
    if (!authChecked || acting) return;
    setActing(id);
    setActionError('');
    setActionMessage('');
    try {
      // Enforce the Analyst → Studio playbook: if a user approves to Studio and
      // the playbook is missing, refresh the brief first (single click).
      if (kind === 'quote-approve' && extra?.next_stage === 'studio') {
        const row = (quotes || []).find((x) => x.id === id) || (heldQuotes || []).find((x) => x.id === id) || null;
        const hasPlaybook = !!row?.studio_playbook;
        if (!hasPlaybook) {
          try {
            const briefRes = await fetch(`/api/ao/quotes/${id}/brief`, { method: 'POST' });
            const briefJson = await briefRes.json().catch(() => ({}));
            if (briefRes.ok && briefJson.ok && briefJson.quote) {
              setQuotes((prev) => prev.map((x) => (x.id === id ? briefJson.quote : x)));
              setHeldQuotes((prev) => prev.map((x) => (x.id === id ? briefJson.quote : x)));
            }
          } catch (_) {}
        }
      }

      const base = `/api/ao`;
      let url = '';
      if (kind === 'quote-approve') url = `${base}/quotes/${id}/approve`;
      else if (kind === 'quote-brief') url = `${base}/quotes/${id}/brief`;
      else if (kind === 'quote-reject') url = `${base}/quotes/${id}/reject`;
      else if (kind === 'quote-hold') url = `${base}/quotes/${id}/hold`;
      else if (kind === 'quote-unhold') url = `${base}/quotes/${id}/unhold`;
      else if (kind === 'topic-approve') url = `${base}/journal-topics/${id}/approve`;
      else if (kind === 'topic-reject') url = `${base}/journal-topics/${id}/reject`;
      else if (kind === 'topic-approve-draft') url = `${base}/journal-topics/${id}/approve-and-draft`;
      else if (kind === 'writing-draft') url = `${base}/writing/${id}/draft`;
      else if (kind === 'writing-discard') url = `${base}/writing/${id}/discard`;
      if (!url) return;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: extra ? JSON.stringify(extra) : undefined,
      });

      const rawText = await res.text().catch(() => '');
      let json = {};
      try {
        json = rawText ? JSON.parse(rawText) : {};
      } catch {
        json = {};
      }

      if (!res.ok || !json.ok) {
        const fallback = rawText ? rawText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 220) : '';
        setActionError(json.error || fallback || 'Action failed');
        return;
      }

      if (json.ok) {
        if (kind === 'quote-approve' || kind === 'quote-reject') setQuotes((prev) => prev.filter((x) => x.id !== id));
        if (kind === 'quote-brief' && json.quote) {
          setQuotes((prev) => prev.map((x) => (x.id === id ? json.quote : x)));
          setHeldQuotes((prev) => prev.map((x) => (x.id === id ? json.quote : x)));
        }
        if (kind === 'quote-hold') {
          setQuotes((prev) => prev.filter((x) => x.id !== id));
          window.location.reload();
        }
        if (kind === 'quote-unhold') {
          setHeldQuotes((prev) => prev.filter((x) => x.id !== id));
          window.location.reload();
        }
        if (kind === 'topic-approve' || kind === 'topic-reject' || kind === 'topic-approve-draft') setTopics((prev) => prev.filter((x) => x.id !== id));
        if (kind === 'topic-approve-draft' && json.writing) setWriting((prev) => [json.writing, ...prev]);
        if (kind === 'writing-draft' || kind === 'writing-discard') setWriting((prev) => prev.filter((x) => x.id !== id));

        if (kind === 'quote-brief') {
          setActionMessage('Brief refreshed.');
        } else if (kind === 'quote-approve') {
          const saved = String(json?.quote?.next_stage || '').toLowerCase();
          setActionMessage(saved === 'publisher' ? 'Approved and sent to Publisher.' : saved === 'studio' ? 'Approved and sent to Studio.' : 'Approved.');
          if (saved === 'studio') {
            const prompt = extra?.studio_prompt ? String(extra.studio_prompt) : '';
            const qs = new URLSearchParams();
            qs.set('open', String(id));
            qs.set('from', 'analyst');
            if (prompt.trim()) qs.set('prompt', prompt);
            window.history.pushState({}, '', `/ao/studio?${qs.toString()}`);
            window.dispatchEvent(new PopStateEvent('popstate'));
            window.scrollTo({ top: 0, behavior: 'instant' });
            return;
          }
          if (saved === 'publisher' && extra?.go_to_publisher) {
            window.history.pushState({}, '', `/ao/publisher`);
            window.dispatchEvent(new PopStateEvent('popstate'));
            window.scrollTo({ top: 0, behavior: 'instant' });
            return;
          }
        } else if (kind === 'quote-reject') {
          setActionMessage('Rejected.');
        } else if (kind === 'topic-approve') {
          setActionMessage('Topic approved.');
        } else if (kind === 'topic-approve-draft') {
          setActionMessage('Topic approved and sent to drafting.');
        }
      }
    } finally {
      setActing(null);
    }
  }, [authChecked, acting]);

  const pendingQuotes = quotes.filter((q) => q.status === 'pending');
  const heldList = heldQuotes.filter((q) => q.status === 'held');
  const pendingTopics = topics.filter((t) => t.status === 'pending');
  const pendingWriting = writing.filter((w) => w.status === 'pending' || w.status === 'drafting');

  useEffect(() => {
    // If URL includes ?open=<id>, open Workroom for that quote (best-effort).
    const open = getParam('open');
    if (!open) return;
    const id = String(open).trim();
    if (!id) return;
    const row = (quotes || []).find((x) => String(x?.id) === id) || (heldQuotes || []).find((x) => String(x?.id) === id) || null;
    if (row?.id) {
      openWorkroomForQuote(row);
    }
  }, [quotes, heldQuotes, openWorkroomForQuote]);


  const canPrev = pageOffset > 0;
  const canNext = typeof quotesPage.total === 'number' ? (pageOffset + pageSize) < quotesPage.total : pendingQuotes.length === pageSize;

  const canHeldPrev = heldOffset > 0;
  const canHeldNext = typeof heldPage.total === 'number' ? (heldOffset + pageSize) < heldPage.total : heldList.length === pageSize;

  return (
    <div className="min-h-screen bg-gray-50">
      <AOHeader active="analyst" email={email} onNavigate={handleNavigate} />
      <main className="container mx-auto px-4 py-6 md:py-8 max-w-7xl pb-44 md:pb-8">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h1 className="text-3xl font-bold text-gray-900">Analyst</h1>
          <button
            type="button"
            onClick={openWorkroomForNewIdea}
            className="min-h-[44px] px-3 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800"
          >
            New
          </button>
        </div>
        <p className="text-gray-600 mb-8">Decision desk: approve, reject, or hold. This is where items get their next home.</p>
        {briefPrep.running ? (
          <div className="mb-6 p-3 rounded border border-blue-200 bg-blue-50 text-blue-900 text-sm flex items-center justify-between gap-3">
            <span>
              Preparing Analyst briefs in the background… {briefPrep.done}/{briefPrep.total}
            </span>
            <span className="text-xs text-blue-800">You can keep reviewing while this runs.</span>
          </div>
        ) : null}
        {actionError ? (
          <div className="mb-6 p-3 rounded border border-red-200 bg-red-50 text-red-800 text-sm">
            {actionError}
          </div>
        ) : null}
        {actionMessage ? (
          <div className="mb-6 p-3 rounded border border-green-200 bg-green-50 text-green-800 text-sm">
            {actionMessage}
          </div>
        ) : null}

        <div className="mb-6 border-b border-gray-200">
          <div className="flex gap-2 overflow-x-auto pb-2 -mb-px">
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={[
                  'shrink-0 px-3 py-2 text-sm font-medium rounded-full border',
                  'min-h-[44px]',
                  activeTab === key
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-8">
          {loading ? (
            <LoadingSpinner />
          ) : activeTab === 'social' && (
            <>
              <p className="text-gray-600 text-sm mb-4">
                First comment supported on: Facebook Page, Instagram, LinkedIn, X. You can add, edit, or remove an optional first comment in <button type="button" onClick={() => handleNavigate('/ao/publisher')} className="text-blue-600 hover:underline">Publisher</button> when scheduling posts.
              </p>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="font-medium">Show</span>
                  <select
                    value={String(pageSize >= 200 ? 'all' : pageSize)}
                    onChange={(e) => {
                      const v = String(e.target.value);
                      const n = v === 'all' ? 200 : Number.parseInt(v, 10);
                      setPageSize(Number.isFinite(n) ? n : 10);
                      setPageOffset(0);
                    }}
                    className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value="all">All</option>
                  </select>
                  <span>per page</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!canPrev}
                    onClick={() => setPageOffset((x) => Math.max(0, x - pageSize))}
                    className="px-3 py-1.5 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    disabled={!canNext}
                    onClick={() => setPageOffset((x) => x + pageSize)}
                    className="px-3 py-1.5 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                  {typeof quotesPage.total === 'number' ? (
                    <span className="text-xs text-gray-500">
                      {Math.min(quotesPage.total, pageOffset + 1)}–{Math.min(quotesPage.total, pageOffset + pendingQuotes.length)} of {quotesPage.total}
                    </span>
                  ) : null}
                </div>
              </div>
              {pendingQuotes.length === 0 ? (
                <p className="text-gray-500">No pending social items. Run a scan in Scout to add candidates.</p>
              ) : (
                <ul className="space-y-4">
                  {pendingQuotes.map((q) => (
                    <li key={q.id} className="border border-gray-200 rounded p-4 bg-white">
                      <div className="text-xs text-gray-500 uppercase tracking-wide">{whatItIsLabel(q)}</div>

                      <div className="mt-1 text-base font-semibold text-gray-900">
                        {q.source_title || q.source_name || (q.is_internal ? 'AO internal' : 'External')}
                      </div>

                      <div className="mt-1 text-sm text-gray-700">
                        <span className="font-medium text-gray-900">
                          {q.source_name || (q.is_internal ? 'Archetype Original' : 'External')}
                        </span>
                        {safeUrl(q.source_url || q.source_slug_or_url) ? (
                          <>
                            {' '}
                            ·{' '}
                            <a
                              className="text-blue-700 hover:underline"
                              href={safeUrl(q.source_url || q.source_slug_or_url)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              open
                            </a>
                          </>
                        ) : null}
                      </div>

                      <div className="mt-3">
                        <div className="text-xs font-semibold text-gray-900">Why it matters for AO</div>
                        <div className="mt-1 text-sm text-gray-800 whitespace-pre-wrap">
                          {q.why_it_matters ? q.why_it_matters : 'Preparing…'}
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="text-xs font-semibold text-gray-900">Ideas for how to use it</div>
                        <ul className="mt-1 text-sm text-gray-800 space-y-1">
                          {buildUseIdeasBullets(q).map((x, idx) => (
                            <li key={idx} className="whitespace-pre-wrap">- {x}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => openWorkroomForQuote(q)}
                          className="min-h-[44px] px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm hover:bg-gray-50"
                        >
                          Discuss
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const reason = window.prompt('Why are you holding this? (required)', '');
                            if (!reason || !String(reason).trim()) return;
                            act('quote-hold', q.id, { reason: String(reason).trim() });
                          }}
                          disabled={acting === q.id}
                          className="min-h-[44px] px-3 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-50"
                        >
                          Hold
                        </button>
                        <button
                          type="button"
                          onClick={() => act('quote-reject', q.id)}
                          disabled={acting === q.id}
                          className="min-h-[44px] px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          {!loading && activeTab === 'held' && (
            <>
              <p className="text-gray-600 text-sm mb-4">
                Held items stay here and do not expire. Bring them back to Pending when you’re ready.
              </p>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="text-xs text-gray-500">
                  {typeof heldPage.total === 'number' ? `${heldPage.total} held item(s)` : null}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!canHeldPrev}
                    onClick={() => setHeldOffset((x) => Math.max(0, x - pageSize))}
                    className="px-3 py-1.5 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    disabled={!canHeldNext}
                    onClick={() => setHeldOffset((x) => x + pageSize)}
                    className="px-3 py-1.5 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
              {heldList.length === 0 ? (
                <p className="text-gray-500">No held items.</p>
              ) : (
                <ul className="space-y-4">
                  {heldList.map((q) => (
                    <li key={q.id} className="border border-gray-200 rounded p-4 bg-white">
                      <div className="text-xs text-gray-500 uppercase tracking-wide">{whatItIsLabel(q)}</div>

                      <div className="mt-1 text-base font-semibold text-gray-900">
                        {q.source_title || q.source_name || (q.is_internal ? 'AO internal' : 'External')}
                      </div>

                      <div className="mt-1 text-sm text-gray-700">
                        <span className="font-medium text-gray-900">
                          {q.source_name || (q.is_internal ? 'Archetype Original' : 'External')}
                        </span>
                        {safeUrl(q.source_url || q.source_slug_or_url) ? (
                          <>
                            {' '}
                            ·{' '}
                            <a
                              className="text-blue-700 hover:underline"
                              href={safeUrl(q.source_url || q.source_slug_or_url)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              open
                            </a>
                          </>
                        ) : null}
                      </div>

                      <div className="mt-3">
                        <div className="text-xs font-semibold text-gray-900">Why it matters for AO</div>
                        <div className="mt-1 text-sm text-gray-800 whitespace-pre-wrap">
                          {q.why_it_matters ? q.why_it_matters : 'Preparing…'}
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="text-xs font-semibold text-gray-900">Ideas for how to use it</div>
                        <ul className="mt-1 text-sm text-gray-800 space-y-1">
                          {buildUseIdeasBullets(q).map((x, idx) => (
                            <li key={idx} className="whitespace-pre-wrap">- {x}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => openWorkroomForQuote(q)}
                          className="min-h-[44px] px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm hover:bg-gray-50"
                        >
                          Discuss
                        </button>
                        <button
                          type="button"
                          onClick={() => act('quote-unhold', q.id)}
                          disabled={acting === q.id}
                          className="min-h-[44px] px-3 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-50"
                        >
                          Unhold
                        </button>
                        <button
                          type="button"
                          onClick={() => act('quote-reject', q.id)}
                          disabled={acting === q.id}
                          className="min-h-[44px] px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          {!loading && activeTab === 'journal' && (
            <>
              {pendingTopics.length === 0 ? (
                <p className="text-gray-500">No pending journal topics.</p>
              ) : (
                <ul className="space-y-4">
                  {pendingTopics.map((t) => (
                    <li key={t.id} className="border border-gray-200 rounded p-4">
                      <h3 className="font-medium text-gray-900">{t.topic_title}</h3>
                      <p className="text-gray-600 text-sm mt-1">{t.why_it_matters?.slice(0, 200)}</p>
                      <div className="flex gap-2 mt-3">
                        <button type="button" onClick={() => act('topic-approve', t.id)} disabled={acting === t.id} className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50">Approve</button>
                        <button type="button" onClick={() => act('topic-approve-draft', t.id)} disabled={acting === t.id} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50">Approve & draft</button>
                        <button type="button" onClick={() => act('topic-reject', t.id)} disabled={acting === t.id} className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50">Reject</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          {!loading && activeTab === 'expandable' && (
            <>
              {pendingWriting.length === 0 ? (
                <p className="text-gray-500">No items in the writing queue. Approve journal topics with “Approve & draft” to add them.</p>
              ) : (
                <ul className="space-y-4">
                  {pendingWriting.map((w) => (
                    <li key={w.id} className="border border-gray-200 rounded p-4">
                      <h3 className="font-medium text-gray-900">{w.title || 'Untitled'}</h3>
                      <p className="text-gray-600 text-sm mt-1">Status: {w.status}</p>
                      <div className="flex gap-2 mt-3">
                        <button type="button" onClick={() => act('writing-draft', w.id)} disabled={acting === w.id || w.status === 'drafting'} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50">Draft</button>
                        <button type="button" onClick={() => act('writing-discard', w.id)} disabled={acting === w.id} className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-50">Discard</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </main>

      {workroomOpen ? (
        <div className="fixed inset-0 z-40 bg-black/40">
          <div className="absolute inset-x-0 bottom-0 top-0 md:inset-10 md:rounded-xl bg-white shadow-xl flex flex-col">
            <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-900 truncate">Analyst Workroom</div>
                <div className="text-xs text-gray-600 truncate">
                  {workroomTitle || 'Discussion'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setWorkroomOpen(false);
                  setWorkroomError('');
                }}
                className="min-h-[44px] px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
              {workroomError ? (
                <div className="p-3 rounded border border-red-200 bg-red-50 text-red-800 text-sm">
                  {workroomError}
                </div>
              ) : null}

              {workroomKind === 'idea' && String(workroomId) === 'new' ? (
                <div className="p-3 rounded border border-gray-200 bg-white">
                  <div className="text-sm font-semibold text-gray-900">Add an idea</div>
                  <div className="mt-2 grid gap-2">
                    <input
                      value={workroomDraftTitle}
                      onChange={(e) => setWorkroomDraftTitle(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="Title (optional)"
                    />
                    <textarea
                      value={workroomDraftText}
                      onChange={(e) => setWorkroomDraftText(e.target.value)}
                      rows={5}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="Paste the idea here…"
                    />
                    <button
                      type="button"
                      onClick={createIdeaAndStartWorkroom}
                      disabled={workroomCreating || String(workroomDraftText || '').trim().length < 5}
                      className="min-h-[44px] px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                    >
                      {workroomCreating ? 'Creating…' : 'Create + discuss'}
                    </button>
                  </div>
                </div>
              ) : null}

              {workroomMessages.length === 0 ? (
                <div className="text-sm text-gray-600">
                  Talk it out here. When you’re ready, just say what you want done (for example: “make the quote card”, “draft this for LinkedIn”, “send to Studio”).
                </div>
              ) : null}

              {workroomMessages.map((m, idx) => {
                const isAssistant = String(m?.role) === 'assistant';
                const suggestions = Array.isArray(m?.suggestions) ? m.suggestions : [];
                const actions = Array.isArray(m?.go_actions) ? m.go_actions : [];
                return (
                  <div key={m?.at || idx} className={isAssistant ? '' : 'text-right'}>
                    <div className={`inline-block max-w-[92%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${isAssistant ? 'bg-white border border-gray-200 text-gray-900' : 'bg-gray-900 text-white'}`}>
                      {String(m?.content || '')}
                    </div>
                    {isAssistant && suggestions.length ? (
                      <div className="mt-2 text-left">
                        <div className="text-xs font-semibold text-gray-700 mb-1">Suggestions</div>
                        <ul className="text-xs text-gray-700 space-y-1">
                          {suggestions.slice(0, 6).map((s, i) => <li key={i}>- {String(s)}</li>)}
                        </ul>
                      </div>
                    ) : null}
                    {isAssistant && actions.length ? (
                      <div className="mt-2 text-left flex flex-wrap gap-2">
                        {actions.slice(0, 4).map((a, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => runWorkroomExecution({ execution: { should_execute_now: true, risk_tier: 'low', actions: [a] }, fallbackActions: [] })}
                            disabled={workroomExecuting || workroomSending}
                            className="min-h-[44px] px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                          >
                            {String(a?.label || 'Go')}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="border-t border-gray-200 px-4 py-3 bg-white">
              <div className="flex items-end gap-2">
                <textarea
                  value={workroomInput}
                  onChange={(e) => setWorkroomInput(e.target.value)}
                  rows={2}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Talk to Analyst…"
                />
                <button
                  type="button"
                  onClick={sendWorkroom}
                  disabled={workroomSending || !String(workroomInput || '').trim()}
                  className="min-h-[44px] px-4 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-50"
                >
                  {workroomSending ? '…' : 'Send'}
                </button>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                When you ask for work, it will run. Anything public will always ask for confirmation first.
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
