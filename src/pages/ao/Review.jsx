import React, { useState, useEffect, useCallback, useRef } from 'react';
import AOHeader from '../../components/ao/AOHeader';
import AutoHubPanel from '../../components/ao/AutoHubPanel';
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
    weekly_pull_bundle: 'Weekly corpus pull quotes',
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

function fmtFoundShort(iso) {
  try {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(-2);
    return `${mm}/${dd}/${yy}`;
  } catch {
    return '';
  }
}

function fmtAgoShort(iso) {
  try {
    if (!iso) return '';
    const ms = Date.now() - new Date(iso).getTime();
    if (!Number.isFinite(ms) || ms < 0) return '';
    const mins = Math.round(ms / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours} hr ago`;
    const days = Math.round(hours / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  } catch {
    return '';
  }
}

function whatItIsLabel(q) {
  const kind = safeText(q?.content_kind, 40).toLowerCase();
  if (kind === 'weekly_corpus_bundle') return 'weekly pull bundle';
  if (kind) return kind.replace(/_/g, ' ');
  if (q?.is_internal) return 'internal';
  return 'signal';
}

function competitorLabel(q) {
  const st = safeText(q?.source_type, 120).toLowerCase();
  const sn = safeText(q?.source_name, 220).toLowerCase();
  const isComp = st.startsWith('competitor_') || sn.startsWith('competitor') || sn.startsWith('friendly competitor');
  if (!isComp) return '';
  if (sn.startsWith('friendly competitor')) return 'Friendly competitor';
  return 'Competitor';
}

function competitorWhatDoing(q) {
  const title = safeText(q?.source_title, 180);
  if (title) return title;
  const s = safeText(q?.summary_interpretation, 240);
  if (!s) return '';
  const line = s.split('\n').map((x) => x.trim()).filter(Boolean)[0] || '';
  return safeText(line, 180);
}

function workroomSeedIdeasMessage(q) {
  const ideas = Array.isArray(q?.studio_playbook?.inbox_ideas) ? q.studio_playbook.inbox_ideas : [];
  if (!ideas.length) return '';

  const lines = [];
  lines.push('Here are the ideas I see for this item.');
  lines.push('');
  let idx = 1;
  for (const idea of ideas.slice(0, 5)) {
    const label = safeText(idea?.label, 120);
    const why = safeText(idea?.why, 220);
    const evidence = safeText(idea?.evidence, 220);
    const quote = safeText(idea?.quote, 220);
    const outline = Array.isArray(idea?.outline) ? idea.outline.map((x) => safeText(x, 140)).filter(Boolean).slice(0, 6) : [];

    const parts = [];
    if (label) parts.push(label);
    if (why) parts.push(why);
    if (quote) parts.push(`Quote: “${quote}”`);
    if (outline.length) parts.push(`Outline: ${outline.map((x) => `- ${x}`).join('\\n')}`);
    if (evidence) parts.push(`Why this fits: ${evidence}`);

    lines.push(`${idx}) ${parts.filter(Boolean).join('\\n')}`.trim());
    lines.push('');
    idx += 1;
  }

  lines.push('Reply with what you want to build (for example: “Let’s do 1 and 3”).');
  return lines.join('\n').trim();
}

function buildUseIdeasBullets(q) {
  const out = [];

  const inboxIdeas = Array.isArray(q?.studio_playbook?.inbox_ideas) ? q.studio_playbook.inbox_ideas : [];
  for (const idea of inboxIdeas.slice(0, 5)) {
    const label = safeText(idea?.label, 120);
    const why = safeText(idea?.why, 180);
    const evidence = safeText(idea?.evidence, 220);
    const quote = safeText(idea?.quote, 200);
    const outline = Array.isArray(idea?.outline) ? idea.outline.map((x) => safeText(x, 80)).filter(Boolean).slice(0, 4) : [];

    const bits = [];
    if (label) bits.push(label);
    if (quote) bits.push(`“${quote}”`);
    else if (outline.length) bits.push(`Outline: ${outline.join(' / ')}`);
    if (why) bits.push(why);
    if (evidence) bits.push(`Because: ${evidence}`);
    const line = bits.filter(Boolean).join(' — ');
    if (line) out.push(line);
  }

  // If the structured inbox ideas are missing, derive a grounded fallback from existing fields.
  // This avoids generic filler while preventing “Preparing…” from sticking on real briefs.
  if (!out.length) {
    const pull = safeText(q?.pull_quote || q?.quote_text, 240);
    const summary = safeText(q?.summary_interpretation, 240);

    const best = safeText(q?.best_move, 40).toLowerCase();
    if (best && best !== 'discard') {
      if (best === 'pull_quote_card' && pull) out.push(`Quote card + caption — “${pull}”`);
      else if (best) out.push(moveLabel(best));
    }

    const altMoves = Array.isArray(q?.alt_moves) ? q.alt_moves : [];
    for (const m of altMoves.slice(0, 4)) {
      const mv = safeText(m?.move, 40).toLowerCase();
      const why = safeText(m?.why, 180);
      if (!mv || mv === 'discard') continue;
      const label = moveLabel(mv);
      if (mv === 'pull_quote_card' && pull) out.push(`${label} — “${pull}”`);
      else if (why) out.push(`${label} — ${why}`);
      else out.push(label);
    }

    // As a last resort, if we have a real summary, present a single “short take” idea grounded in it.
    if (out.length === 0 && summary) {
      out.push(`Short AO take (text post) — ${summary}`);
    }
  }

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
  { key: 'drafts', label: 'Drafts' },
  { key: 'held', label: 'Held' },
  { key: 'profiles', label: 'Profiles' },
];

export default function Review() {
  const [email, setEmail] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const [activeTab, setActiveTab] = useState('drafts');
  const [quotes, setQuotes] = useState([]);
  const [quotesPage, setQuotesPage] = useState({ status: 'pending', limit: 10, offset: 0, total: null });
  const [pageSize, setPageSize] = useState(10);
  const [pageOffset, setPageOffset] = useState(0);

  const [heldQuotes, setHeldQuotes] = useState([]);
  const [heldPage, setHeldPage] = useState({ status: 'held', limit: 10, offset: 0, total: null });
  const [heldOffset, setHeldOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);
  const [actionError, setActionError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const [autoDrafts, setAutoDrafts] = useState([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [draftActingId, setDraftActingId] = useState(null);
  const [autoHubKey, setAutoHubKey] = useState(0);

  // Profiles (Phase 2 starter): people/brands view inside Analyst
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [profilesError, setProfilesError] = useState('');
  const [profilesPeople, setProfilesPeople] = useState([]);
  const [profilesShowAll, setProfilesShowAll] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [profileQuotesLoading, setProfileQuotesLoading] = useState(false);
  const [profileQuotesError, setProfileQuotesError] = useState('');
  const [profileQuotes, setProfileQuotes] = useState([]);
  const [profileDeletingId, setProfileDeletingId] = useState(null);

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

  const loadProfilesPeople = useCallback(async () => {
    if (!authChecked) return;
    setProfilesLoading(true);
    setProfilesError('');
    try {
      const res = await fetch('/api/ao/brain-trust');
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Could not load profiles');
      const rows = Array.isArray(json.people) ? json.people : [];
      setProfilesPeople(rows);
    } catch (e) {
      setProfilesPeople([]);
      setProfilesError(e.message || 'Could not load profiles');
    } finally {
      setProfilesLoading(false);
    }
  }, [authChecked]);

  const loadProfileQuotes = useCallback(async (person) => {
    if (!authChecked || !person?.name) return;
    setProfileQuotesLoading(true);
    setProfileQuotesError('');
    setProfileQuotes([]);
    try {
      const q = encodeURIComponent(String(person.name || '').trim());
      const res = await fetch(`/api/ao/quotes/by-source?q=${q}&status=all&competitor_only=true&limit=80`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Could not load opportunities for this profile');
      setProfileQuotes(Array.isArray(json.quotes) ? json.quotes : []);
    } catch (e) {
      setProfileQuotes([]);
      setProfileQuotesError(e.message || 'Could not load opportunities for this profile');
    } finally {
      setProfileQuotesLoading(false);
    }
  }, [authChecked]);

  const deleteProfileTarget = useCallback(async (person) => {
    if (!authChecked || profileDeletingId || !person?.id) return;
    const ok = window.confirm(`Delete "${person.name || 'this target'}" from Watch Targets? This does not delete any opportunities already found.`);
    if (!ok) return;
    setProfileDeletingId(person.id);
    setProfilesError('');
    try {
      const res = await fetch(`/api/ao/brain-trust/${encodeURIComponent(person.id)}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Could not delete');
      if (selectedProfile?.id === person.id) {
        setSelectedProfile(null);
        setProfileQuotes([]);
        setProfileQuotesError('');
      }
      await loadProfilesPeople();
    } catch (e) {
      setProfilesError(e.message || 'Could not delete');
    } finally {
      setProfileDeletingId(null);
    }
  }, [authChecked, profileDeletingId, loadProfilesPeople, selectedProfile]);

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
      const existing = Array.isArray(parsed?.messages) ? parsed.messages : [];
      if (existing.length) {
        setWorkroomMessages(existing);
      } else {
        const seedText = workroomSeedIdeasMessage(q);
        setWorkroomMessages(seedText ? [{ role: 'assistant', at: new Date().toISOString(), content: seedText }] : []);
      }
    } catch {
      const seedText = workroomSeedIdeasMessage(q);
      setWorkroomMessages(seedText ? [{ role: 'assistant', at: new Date().toISOString(), content: seedText }] : []);
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
    if (activeTab !== 'profiles') return;
    loadProfilesPeople();
  }, [authChecked, activeTab, loadProfilesPeople]);

  const loadAutoDrafts = useCallback(async () => {
    if (!authChecked) return;
    setDraftsLoading(true);
    try {
      const res = await fetch('/api/ao/auto/drafts');
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok && Array.isArray(json.drafts)) {
        setAutoDrafts(json.drafts);
      } else {
        setAutoDrafts([]);
      }
    } catch (_) {
      setAutoDrafts([]);
    } finally {
      setDraftsLoading(false);
    }
  }, [authChecked]);

  useEffect(() => {
    if (!authChecked || activeTab !== 'drafts') return;
    loadAutoDrafts();
  }, [authChecked, activeTab, loadAutoDrafts]);

  useEffect(() => {
    const onSaved = () => {
      loadAutoDrafts();
    };
    window.addEventListener('ao-auto-draft-saved', onSaved);
    return () => window.removeEventListener('ao-auto-draft-saved', onSaved);
  }, [loadAutoDrafts]);

  const resumeAutoDraft = useCallback(
    async (threadId) => {
      const id = String(threadId || '').trim();
      if (!id) return;
      setDraftActingId(id);
      setActionError('');
      try {
        const res = await fetch('/api/ao/auto/thread/resume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ thread_id: id }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.ok) throw new Error(json.error || 'Could not open draft');
        setAutoHubKey((k) => k + 1);
        setActionMessage('Draft opened in Auto above.');
        try {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (_) {}
      } catch (e) {
        setActionError(e.message || 'Could not open draft');
      } finally {
        setDraftActingId(null);
      }
    },
    []
  );

  const deleteAutoDraft = useCallback(
    async (threadId) => {
      const id = String(threadId || '').trim();
      if (!id) return;
      const ok = window.confirm('Are you sure you want to delete this draft?');
      if (!ok) return;
      setDraftActingId(id);
      setActionError('');
      try {
        const res = await fetch(`/api/ao/auto/thread/${encodeURIComponent(id)}`, { method: 'DELETE' });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.ok) throw new Error(json.error || 'Could not delete draft');
        setActionMessage('Draft deleted.');
        await loadAutoDrafts();
      } catch (e) {
        setActionError(e.message || 'Could not delete draft');
      } finally {
        setDraftActingId(null);
      }
    },
    [loadAutoDrafts]
  );

  useEffect(() => {
    if (!authChecked) return;
    if (!email) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [quotesRes, heldRes] = await Promise.all([
          fetch(`/api/ao/quotes/list?status=pending&limit=${encodeURIComponent(pageSize)}&offset=${encodeURIComponent(pageOffset)}`),
          fetch(`/api/ao/quotes/list?status=held&limit=${encodeURIComponent(pageSize)}&offset=${encodeURIComponent(heldOffset)}`),
        ]);
        if (cancelled) return;
        const q = await quotesRes.json().catch(() => ({}));
        const h = await heldRes.json().catch(() => ({}));
        if (q.ok && Array.isArray(q.quotes)) {
          setQuotes(q.quotes);
          if (q.page) setQuotesPage(q.page);
        }
        if (h.ok && Array.isArray(h.quotes)) {
          setHeldQuotes(h.quotes);
          if (h.page) setHeldPage(h.page);
        }
      } catch (_) {}
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [authChecked, email, pageSize, pageOffset, heldOffset]);

  const heldList = heldQuotes.filter((q) => q.status === 'held');

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


  const canHeldPrev = heldOffset > 0;
  const canHeldNext = typeof heldPage.total === 'number' ? (heldOffset + pageSize) < heldPage.total : heldList.length === pageSize;

  return (
    <div className="min-h-screen bg-gray-50">
      <AOHeader active="analyst" email={email} onNavigate={handleNavigate} />
      <main className="container mx-auto px-4 py-6 md:py-8 max-w-7xl pb-44 md:pb-8">
        <AutoHubPanel key={autoHubKey} onNavigate={handleNavigate} draftsAnchorId="auto-drafts" />

        <div className="mb-2">
          <h1 className="text-3xl font-bold text-gray-900">
            {activeTab === 'drafts' ? 'Drafts' : activeTab === 'held' ? 'Held' : 'Profiles'}
          </h1>
          {activeTab === 'drafts' ? (
            <p className="text-gray-600 mt-1 text-sm">
              Saved Auto conversations. Use <strong>Edit</strong> to continue in the chat above, or <strong>Delete</strong> to remove one draft forever.
            </p>
          ) : null}
        </div>
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

        {(loading || activeTab === 'drafts') && (
          <div id="auto-drafts" className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 md:p-8 mb-6">
            {loading ? (
              <LoadingSpinner />
            ) : (
              <>
                {draftsLoading ? (
                  <div className="text-sm text-gray-500">Loading drafts…</div>
                ) : autoDrafts.length === 0 ? (
                  <p className="text-gray-500">
                    No drafts yet. Use <strong>Save draft</strong> in Auto when you want to park this conversation and start fresh.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {autoDrafts.map((d) => (
                      <li key={d.id} className="flex flex-wrap items-start justify-between gap-3 border border-gray-200 rounded-lg p-4 bg-gray-50">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-gray-900 truncate">{d.title || 'Draft'}</div>
                          {d.updated_at ? (
                            <div className="text-xs text-gray-500 mt-1">Updated {fmtAgoShort(d.updated_at)}</div>
                          ) : null}
                          {d.preview ? (
                            <div className="text-sm text-gray-700 mt-2 line-clamp-3 whitespace-pre-wrap">{d.preview}</div>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-2 shrink-0">
                          <button
                            type="button"
                            disabled={draftActingId === d.id}
                            onClick={() => resumeAutoDraft(d.id)}
                            className="min-h-[44px] px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                          >
                            {draftActingId === d.id ? 'Opening…' : 'Edit'}
                          </button>
                          <button
                            type="button"
                            disabled={draftActingId === d.id}
                            onClick={() => deleteAutoDraft(d.id)}
                            className="min-h-[44px] px-4 py-2 rounded-lg border border-red-300 bg-white text-red-700 text-sm font-semibold hover:bg-red-50 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        )}
        {!loading && activeTab === 'profiles' && (
            <>
              <p className="text-gray-600 text-sm mb-4">
                Profiles are a “mini inbox” per person/brand. For now, it shows competitor-tagged targets and the opportunities we’ve captured about them.
              </p>

              {profilesError ? (
                <div className="mb-4 p-3 rounded border border-red-200 bg-red-50 text-red-800 text-sm">
                  {profilesError}
                </div>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={profilesShowAll}
                    onChange={(e) => setProfilesShowAll(!!e.target.checked)}
                  />
                  Show non-competitors too
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProfile(null);
                      setProfileQuotes([]);
                      setProfileQuotesError('');
                    }}
                    className="px-3 py-1.5 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50"
                    disabled={!selectedProfile}
                  >
                    Back to list
                  </button>
                  <button
                    type="button"
                    onClick={loadProfilesPeople}
                    disabled={profilesLoading}
                    className="px-3 py-1.5 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    {profilesLoading ? 'Loading…' : 'Refresh'}
                  </button>
                </div>
              </div>

              {!selectedProfile ? (
                <>
                  {profilesLoading ? <LoadingSpinner /> : null}
                  {(() => {
                    const rows = Array.isArray(profilesPeople) ? profilesPeople : [];
                    const filtered = profilesShowAll
                      ? rows
                      : rows.filter((p) => String(p?.competitor_tier || 'none') !== 'none');
                    if (!filtered.length && !profilesLoading) {
                      return <p className="text-gray-500">No profiles yet.</p>;
                    }
                    return (
                      <ul className="space-y-3">
                        {filtered.slice(0, 250).map((p) => (
                          <li key={p.id} className="border border-gray-200 rounded p-4 bg-white">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <div className="text-base font-semibold text-gray-900 truncate">{p.name}</div>
                                  {String(p.competitor_tier || 'none') !== 'none' ? (
                                    <span className={`text-[11px] px-2 py-0.5 rounded border ${p.competitor_tier === 'competitor' ? 'bg-red-50 text-red-800 border-red-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
                                      {p.competitor_tier === 'competitor' ? 'Competitor' : 'Friendly competitor'}
                                    </span>
                                  ) : null}
                                  {p.active === false ? (
                                    <span className="text-[11px] px-2 py-0.5 rounded border bg-gray-50 text-gray-700 border-gray-200">
                                      Paused
                                    </span>
                                  ) : null}
                                </div>
                                {Array.isArray(p.categories) && p.categories.length ? (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {p.categories.slice(0, 8).map((c) => (
                                      <span key={c} className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-800">{c}</span>
                                    ))}
                                  </div>
                                ) : null}
                                {Array.isArray(p.profile_urls) && p.profile_urls.length ? (
                                  <div className="mt-2 text-sm text-gray-700">
                                    {p.profile_urls.slice(0, 2).map((u) => (
                                      <div key={u}>
                                        <a className="text-blue-700 hover:underline break-all" href={u} target="_blank" rel="noreferrer">{u}</a>
                                      </div>
                                    ))}
                                  </div>
                                ) : null}
                                {p.notes ? <div className="mt-2 text-sm text-gray-600">{p.notes}</div> : null}
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedProfile(p);
                                    loadProfileQuotes(p);
                                  }}
                                  className="min-h-[44px] px-3 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800"
                                >
                                  Open
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteProfileTarget(p)}
                                  disabled={profileDeletingId === p.id}
                                  className="min-h-[44px] px-3 py-2 rounded-lg border border-red-200 bg-white text-red-700 text-sm font-semibold hover:bg-red-50 disabled:opacity-50"
                                >
                                  {profileDeletingId === p.id ? 'Deleting…' : 'Delete'}
                                </button>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    );
                  })()}
                </>
              ) : (
                <div className="border border-gray-200 rounded p-4 bg-white">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-lg font-semibold text-gray-900 truncate">{selectedProfile.name}</div>
                      <div className="mt-1 text-sm text-gray-600">
                        {String(selectedProfile.competitor_tier || 'none') === 'competitor'
                          ? 'Competitor'
                          : String(selectedProfile.competitor_tier || 'none') === 'friendly'
                            ? 'Friendly competitor'
                            : 'Not a competitor'}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <button
                        type="button"
                        onClick={() => loadProfileQuotes(selectedProfile)}
                        disabled={profileQuotesLoading}
                        className="min-h-[44px] px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm hover:bg-gray-50 disabled:opacity-50"
                      >
                        {profileQuotesLoading ? 'Loading…' : 'Refresh opportunities'}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteProfileTarget(selectedProfile)}
                        disabled={profileDeletingId === selectedProfile?.id}
                        className="min-h-[44px] px-3 py-2 rounded-lg border border-red-200 bg-white text-red-700 text-sm font-semibold hover:bg-red-50 disabled:opacity-50"
                      >
                        {profileDeletingId === selectedProfile?.id ? 'Deleting…' : 'Delete target'}
                      </button>
                    </div>
                  </div>

                  {profileQuotesError ? (
                    <div className="mt-3 p-3 rounded border border-red-200 bg-red-50 text-red-800 text-sm">
                      {profileQuotesError}
                    </div>
                  ) : null}

                  <div className="mt-4">
                    <div className="text-xs font-semibold text-gray-900">Recent opportunities</div>
                    {profileQuotesLoading ? <div className="mt-2"><LoadingSpinner /></div> : null}
                    {!profileQuotesLoading && profileQuotes.length === 0 ? (
                      <div className="mt-2 text-sm text-gray-500">No competitor opportunities found for this profile yet.</div>
                    ) : null}

                    {profileQuotes.length ? (
                      <ul className="mt-3 space-y-3">
                        {profileQuotes.slice(0, 25).map((q) => (
                          <li key={q.id} className="border border-gray-200 rounded p-3 bg-white">
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-gray-900 truncate">
                                  {q.source_title || q.source_name || 'Opportunity'}
                                </div>
                                <div className="mt-1 text-xs text-gray-600">
                                  {q.created_at ? `Found ${fmtFoundShort(q.created_at)}` : null}
                                  {safeUrl(q.source_url || q.source_slug_or_url) ? (
                                    <>
                                      {' '}
                                      ·{' '}
                                      <a className="text-blue-700 hover:underline" href={safeUrl(q.source_url || q.source_slug_or_url)} target="_blank" rel="noreferrer">
                                        open
                                      </a>
                                    </>
                                  ) : null}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => openWorkroomForQuote(q)}
                                className="min-h-[44px] px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm hover:bg-gray-50"
                              >
                                Discuss
                              </button>
                            </div>
                            <div className="mt-2 text-sm text-gray-800 whitespace-pre-wrap">
                              {q.why_it_matters ? q.why_it_matters : 'Preparing…'}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
              )}
            </>
          )}
          {!loading && activeTab === 'held' && (
            <>
              <p className="text-gray-600 text-sm mb-4">
                Held items are set aside. Come back when you’re ready to Discuss, or Reject if it’s not a fit.
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
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-gray-500 uppercase tracking-wide">{whatItIsLabel(q)}</div>
                        {competitorLabel(q) ? (
                          <span className={`text-[11px] px-2 py-0.5 rounded border ${competitorLabel(q) === 'Competitor' ? 'bg-red-50 text-red-800 border-red-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
                            {competitorLabel(q)}
                          </span>
                        ) : null}
                      </div>

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
                        <div className="text-xs font-semibold text-gray-900">Analyst brief</div>
                        <div className="mt-1 text-sm text-gray-800 whitespace-pre-wrap">
                          {q.summary_interpretation ? q.summary_interpretation : 'Preparing…'}
                        </div>
                        {!q.summary_interpretation && (q.brief_attempts || q.brief_last_attempt_at) ? (
                          <div className="mt-1 text-xs text-gray-500">
                            Brief attempt {Number(q.brief_attempts || 0)}/3
                            {q.brief_last_attempt_at ? ` · last tried ${fmtAgoShort(q.brief_last_attempt_at)}` : ''}
                          </div>
                        ) : null}
                      </div>

                      {competitorLabel(q) ? (
                        <div className="mt-2 text-sm text-gray-800">
                          <span className="text-xs font-semibold text-gray-900">What they’re doing</span>
                          <div className="mt-1 text-sm text-gray-800">
                            {competitorWhatDoing(q) || 'Preparing…'}
                          </div>
                        </div>
                      ) : null}

                      <div className="mt-3">
                        <div className="text-xs font-semibold text-gray-900">Why it matters for AO</div>
                        <div className="mt-1 text-sm text-gray-800 whitespace-pre-wrap">
                          {q.why_it_matters ? q.why_it_matters : 'Preparing…'}
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="text-xs font-semibold text-gray-900">Ideas for how to use it</div>
                        {(() => {
                          const ideas = buildUseIdeasBullets(q);
                          return ideas.length ? (
                            <ul className="mt-1 text-sm text-gray-800 space-y-1">
                              {ideas.map((x, idx) => (
                                <li key={idx} className="whitespace-pre-wrap">- {x}</li>
                              ))}
                            </ul>
                          ) : (
                            <div className="mt-1 text-sm text-gray-500">Preparing…</div>
                          );
                        })()}
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => openWorkroomForQuote(q)}
                          className="min-h-[44px] px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm hover:bg-gray-50"
                        >
                          Discuss
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
