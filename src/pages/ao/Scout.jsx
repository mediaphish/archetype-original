import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AOHeader from '../../components/ao/AOHeader';
import LoadingSpinner from '../../components/operators/LoadingSpinner';

function safeUrl(s) {
  try {
    if (!s) return null;
    const u = new URL(String(s));
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    return u.toString();
  } catch (_) {
    return null;
  }
}

function summarizeResponseText(text) {
  const raw = String(text || '').trim();
  if (!raw) return '';
  // If the response is HTML, show a short, cleaner snippet.
  const noTags = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return (noTags || raw).slice(0, 220);
}

function IndeterminateBar({ label }) {
  return (
    <div className="mt-3">
      {label ? <p className="text-xs text-gray-600 mb-2">{label}</p> : null}
      <div className="h-2 w-full bg-gray-100 rounded overflow-hidden border border-gray-200 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-200 via-blue-600 to-blue-200 animate-pulse opacity-90" />
      </div>
      <p className="text-xs text-gray-500 mt-2">This can take a moment. You can stay on this page.</p>
    </div>
  );
}

function normType(v) {
  const t = String(v || '').trim().toLowerCase();
  return t === 'article' ? 'article' : 'rss';
}

export default function Scout() {
  const [email, setEmail] = useState('');
  const [authChecked, setAuthChecked] = useState(false);

  const [aiStatusLoading, setAiStatusLoading] = useState(true);
  const [aiConfigured, setAiConfigured] = useState(null); // null | boolean

  const [scanStatus, setScanStatus] = useState({
    last_internal_scan: null,
    last_external_scan: null,
    last_daily_run: null,
    recent_errors: [],
  });
  const [statusLoading, setStatusLoading] = useState(true);

  const [scanning, setScanning] = useState(false);
  const [scanRunningType, setScanRunningType] = useState(null); // null | 'internal' | 'external'
  const [scanMessage, setScanMessage] = useState('');
  const [scanError, setScanError] = useState('');
  const [dailyRunning, setDailyRunning] = useState(false);
  const [dailyRunMessage, setDailyRunMessage] = useState('');

  // Scout reporter-mode activity + pending sources
  const [scoutRunsLoading, setScoutRunsLoading] = useState(true);
  const [scoutRuns, setScoutRuns] = useState([]);
  const [scoutRunsError, setScoutRunsError] = useState('');
  const [scoutPassRunning, setScoutPassRunning] = useState(false);
  const [scoutPassMessage, setScoutPassMessage] = useState('');

  const [capLoading, setCapLoading] = useState(true);
  const [capStatus, setCapStatus] = useState(null); // { cap, used, remaining, window }

  const [pendingSourcesLoading, setPendingSourcesLoading] = useState(true);
  const [pendingSources, setPendingSources] = useState([]);
  const [pendingSourcesError, setPendingSourcesError] = useState('');
  const [pendingActingId, setPendingActingId] = useState(null);

  // URLs we watch (external sources allowlist)
  const [sourcesLoading, setSourcesLoading] = useState(true);
  const [sources, setSources] = useState([]);
  const [sourcesError, setSourcesError] = useState('');
  const [sourcesMessage, setSourcesMessage] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceType, setNewSourceType] = useState('rss'); // rss | article
  const [newSourceCompetitorTier, setNewSourceCompetitorTier] = useState('none'); // none | friendly | competitor
  const [addSourceLoading, setAddSourceLoading] = useState(false);
  const [deleteSourceLoading, setDeleteSourceLoading] = useState(null);
  const [rebuildingSources, setRebuildingSources] = useState(false);
  const [wipingSources, setWipingSources] = useState(false);

  // People we follow (Brain Trust registry)
  const [peopleLoading, setPeopleLoading] = useState(true);
  const [people, setPeople] = useState([]);
  const [peopleError, setPeopleError] = useState('');
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonCategories, setNewPersonCategories] = useState('');
  const [newPersonProfileUrl, setNewPersonProfileUrl] = useState('');
  const [newPersonNotes, setNewPersonNotes] = useState('');
  const [newPersonCompetitorTier, setNewPersonCompetitorTier] = useState('none'); // none | friendly | competitor
  const [addPersonLoading, setAddPersonLoading] = useState(false);
  const [togglingPersonId, setTogglingPersonId] = useState(null);
  const [deletePersonLoading, setDeletePersonLoading] = useState(null);

  // Competitor digest lane
  const [digestLoading, setDigestLoading] = useState(true);
  const [digestError, setDigestError] = useState('');
  const [digestStatus, setDigestStatus] = useState(null); // last run row
  const [digestRunning, setDigestRunning] = useState(false);
  const [digestMessage, setDigestMessage] = useState('');

  // Chase list (from editorial memory loop)
  const [chaseLoading, setChaseLoading] = useState(true);
  const [chase, setChase] = useState([]);
  const [chaseError, setChaseError] = useState('');
  const [chaseMessage, setChaseMessage] = useState('');
  const [chaseGenerating, setChaseGenerating] = useState(false);

  const handleNavigate = useCallback((path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

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

  const loadStatus = useCallback(async () => {
    if (!authChecked) return;
    setStatusLoading(true);
    try {
      const res = await fetch('/api/ao/automation-status');
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        setScanStatus({
          last_internal_scan: json.last_internal_scan,
          last_external_scan: json.last_external_scan,
          last_daily_run: json.last_daily_run || null,
          recent_errors: json.recent_errors || [],
        });
      }
    } catch (_) {}
    setStatusLoading(false);
  }, [authChecked]);

  const loadSources = useCallback(async () => {
    if (!authChecked) return;
    setSourcesLoading(true);
    setSourcesError('');
    try {
      const res = await fetch('/api/ao/external-sources');
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        setSources(Array.isArray(json.sources) ? json.sources : []);
      } else {
        setSources([]);
        setSourcesError(json.error || 'Could not load sources');
      }
    } catch (e) {
      setSources([]);
      setSourcesError(e.message || 'Could not load sources');
    } finally {
      setSourcesLoading(false);
    }
  }, [authChecked]);

  const loadPeople = useCallback(async () => {
    if (!authChecked) return;
    setPeopleLoading(true);
    setPeopleError('');
    try {
      const res = await fetch('/api/ao/brain-trust');
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        setPeople(Array.isArray(json.people) ? json.people : []);
      } else {
        setPeople([]);
        setPeopleError(json.error || 'Could not load people');
      }
    } catch (e) {
      setPeople([]);
      setPeopleError(e.message || 'Could not load people');
    } finally {
      setPeopleLoading(false);
    }
  }, [authChecked]);

  const loadAiStatus = useCallback(async () => {
    if (!authChecked) return;
    setAiStatusLoading(true);
    try {
      const res = await fetch('/api/ao/ai/status');
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        setAiConfigured(!!json.configured);
      } else {
        setAiConfigured(false);
      }
    } catch (_) {
      setAiConfigured(false);
    } finally {
      setAiStatusLoading(false);
    }
  }, [authChecked]);

  const displayRecentErrors = useMemo(() => {
    const errs = Array.isArray(scanStatus?.recent_errors) ? scanStatus.recent_errors : [];
    const hasSources = !sourcesLoading && Array.isArray(sources) && sources.length > 0;
    return errs
      .filter((r) => {
        const msg = String(r?.error_message || '').toLowerCase();
        if (!msg) return false;
        if (hasSources && msg.includes('no external sources configured')) return false;
        return true;
      })
      .slice(0, 3);
  }, [scanStatus, sources, sourcesLoading]);

  const loadScoutRuns = useCallback(async () => {
    if (!authChecked) return;
    setScoutRunsLoading(true);
    setScoutRunsError('');
    try {
      const res = await fetch('/api/ao/scout/runs');
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        setScoutRuns(Array.isArray(json.runs) ? json.runs : []);
      } else {
        setScoutRuns([]);
        setScoutRunsError(json.error || 'Could not load Scout activity');
      }
    } catch (e) {
      setScoutRuns([]);
      setScoutRunsError(e.message || 'Could not load Scout activity');
    } finally {
      setScoutRunsLoading(false);
    }
  }, [authChecked]);

  const loadPendingSources = useCallback(async () => {
    if (!authChecked) return;
    setPendingSourcesLoading(true);
    setPendingSourcesError('');
    try {
      const res = await fetch('/api/ao/scout/pending-sources');
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        setPendingSources(Array.isArray(json.pending) ? json.pending : []);
      } else {
        setPendingSources([]);
        setPendingSourcesError(json.error || 'Could not load pending sources');
      }
    } catch (e) {
      setPendingSources([]);
      setPendingSourcesError(e.message || 'Could not load pending sources');
    } finally {
      setPendingSourcesLoading(false);
    }
  }, [authChecked]);

  const loadCapStatus = useCallback(async () => {
    if (!authChecked) return;
    setCapLoading(true);
    try {
      const res = await fetch('/api/ao/scout/cap-status');
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        setCapStatus({
          cap: Number(json.cap || 0),
          used: Number(json.used || 0),
          remaining: Number(json.remaining || 0),
          window: String(json.window || ''),
        });
      } else {
        setCapStatus(null);
      }
    } catch (_) {
      setCapStatus(null);
    } finally {
      setCapLoading(false);
    }
  }, [authChecked]);

  const loadDigestStatus = useCallback(async () => {
    if (!authChecked) return;
    setDigestLoading(true);
    setDigestError('');
    try {
      const res = await fetch('/api/ao/competitors/digest-status');
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        setDigestStatus(json.last_run || null);
      } else {
        setDigestStatus(null);
        setDigestError(json.error || 'Could not load competitor digest status');
      }
    } catch (e) {
      setDigestStatus(null);
      setDigestError(e.message || 'Could not load competitor digest status');
    } finally {
      setDigestLoading(false);
    }
  }, [authChecked]);

  const runDigestNow = useCallback(async () => {
    if (!authChecked || digestRunning) return;
    setDigestRunning(true);
    setDigestMessage('');
    setDigestError('');
    try {
      const res = await fetch('/api/ao/competitors/digest-now', { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setDigestError(json.error || 'Competitor digest failed');
      } else {
        const inserted = Number(json.inserted || 0) || 0;
        const found = Number(json.candidates_found || 0) || 0;
        setDigestMessage(`Competitor digest complete. Found ${found}. Added ${inserted} item(s) to Analyst.`);
        await loadDigestStatus();
        await loadStatus();
      }
    } catch (e) {
      setDigestError(e.message || 'Competitor digest failed');
    } finally {
      setDigestRunning(false);
    }
  }, [authChecked, digestRunning, loadDigestStatus, loadStatus]);

  const loadChaseList = useCallback(async () => {
    if (!authChecked) return;
    setChaseLoading(true);
    setChaseError('');
    try {
      const res = await fetch('/api/ao/editorial/chase-list');
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        setChase(Array.isArray(json.chase) ? json.chase : []);
      } else {
        setChase([]);
        setChaseError(json.error || 'Could not load chase list');
      }
    } catch (e) {
      setChase([]);
      setChaseError(e.message || 'Could not load chase list');
    } finally {
      setChaseLoading(false);
    }
  }, [authChecked]);

  const generateChaseList = useCallback(async () => {
    if (!authChecked || chaseGenerating) return;
    setChaseMessage('');
    setChaseError('');
    setChaseGenerating(true);
    try {
      const res = await fetch('/api/ao/editorial/generate-chase-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ windowDays: 30 }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Could not generate chase list');
      setChaseMessage(`Updated chase list. (${json.generated || 0} items)`);
      await loadChaseList();
    } catch (e) {
      setChaseError(e.message || 'Could not generate chase list');
    } finally {
      setChaseGenerating(false);
    }
  }, [authChecked, chaseGenerating, loadChaseList]);

  useEffect(() => {
    if (!authChecked) return;
    loadStatus();
    loadSources();
    loadPeople();
    loadAiStatus();
    loadScoutRuns();
    loadPendingSources();
    loadCapStatus();
    loadDigestStatus();
    loadChaseList();
  }, [authChecked, loadStatus, loadSources, loadPeople, loadAiStatus, loadScoutRuns, loadPendingSources, loadCapStatus, loadDigestStatus, loadChaseList]);

  const runScan = useCallback(async (type) => {
    if (!authChecked || scanning) return;
    setScanMessage('');
    setScanError('');
    setScanning(true);
    setScanRunningType(type === 'internal' ? 'internal' : 'external');
    try {
      const url = `${type === 'internal' ? '/api/ao/scan-internal' : '/api/ao/scan-external'}`;
      const res = await fetch(url, { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        await loadStatus();
        const inserted = Number(json.candidates_inserted ?? json.candidatesInserted ?? 0) || 0;
        const found = Number(json.candidates_found ?? json.candidatesFound ?? 0) || 0;
        const kind = type === 'internal' ? 'Internal scan' : 'External scan';
        setScanMessage(`${kind} complete. Found ${found}. Added ${inserted} item(s) to Analyst.`);
      } else {
        const kind = type === 'internal' ? 'Internal scan' : 'External scan';
        setScanError(json.error || `${kind} failed`);
      }
    } catch (e) {
      const kind = type === 'internal' ? 'Internal scan' : 'External scan';
      setScanError(e.message || `${kind} failed`);
    } finally {
      setScanning(false);
      setScanRunningType(null);
    }
  }, [authChecked, scanning, loadStatus]);

  const runDailyNow = useCallback(async () => {
    if (!authChecked || dailyRunning) return;
    setDailyRunMessage('');
    setDailyRunning(true);
    try {
      const res = await fetch('/api/ao/daily-run-now', { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        setDailyRunMessage(`Daily run complete. Drafted ${json.drafted_count || 0} item(s).`);
        await loadStatus();
      } else {
        setDailyRunMessage(json.error || 'Daily run failed');
      }
    } catch (e) {
      setDailyRunMessage(e.message || 'Daily run failed');
    } finally {
      setDailyRunning(false);
    }
  }, [authChecked, dailyRunning, loadStatus]);

  const runScoutPassNow = useCallback(async () => {
    if (!authChecked || scoutPassRunning) return;
    setScoutPassMessage('');
    setScoutRunsError('');
    setScoutPassRunning(true);
    try {
      const res = await fetch('/api/ao/scout-pass-now', { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        setScoutPassMessage(`Scout pass complete. Read ${json.pages_fetched || 0} page(s). Sent ${json.discoveries_created || 0} item(s) to Analyst.`);
      } else {
        setScoutPassMessage(json.error || 'Scout pass failed');
      }
    } catch (e) {
      setScoutPassMessage(e.message || 'Scout pass failed');
    } finally {
      setScoutPassRunning(false);
      await loadScoutRuns();
      await loadPendingSources();
      await loadCapStatus();
    }
  }, [authChecked, scoutPassRunning, loadScoutRuns, loadPendingSources, loadCapStatus]);

  async function actOnPendingSource(id, action) {
    if (!authChecked || pendingActingId) return;
    setPendingActingId(id);
    setPendingSourcesError('');
    try {
      const res = await fetch(`/api/ao/scout/pending-sources/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setPendingSourcesError(json.error || 'Action failed');
      } else {
        await loadPendingSources();
        await loadSources();
        await loadCapStatus();
      }
    } catch (e) {
      setPendingSourcesError(e.message || 'Action failed');
    } finally {
      setPendingActingId(null);
    }
  }

  async function handleAddSource() {
    if (!authChecked || addSourceLoading) return;
    const url = newSourceUrl.trim();
    if (!url) return;
    setAddSourceLoading(true);
    setSourcesError('');
    try {
      const res = await fetch('/api/ao/external-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          name: newSourceName.trim() || null,
          source_type: normType(newSourceType),
          competitor_tier: String(newSourceCompetitorTier || 'none'),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setSourcesError(json.error || 'Could not add source');
      } else {
        setNewSourceUrl('');
        setNewSourceName('');
        setNewSourceType('rss');
        setNewSourceCompetitorTier('none');
        await loadSources();
      }
    } catch (e) {
      setSourcesError(e.message || 'Could not add source');
    } finally {
      setAddSourceLoading(false);
    }
  }

  async function handleWipeSources() {
    if (!authChecked || wipingSources) return;
    const ok = window.confirm('Wipe all watched URLs? This cannot be undone.');
    if (!ok) return;
    setWipingSources(true);
    setSourcesError('');
    setSourcesMessage('');
    try {
      const res = await fetch('/api/ao/external-sources/wipe', { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Wipe failed');
      await loadSources();
      setSourcesMessage('Wiped watched URLs.');
    } catch (e) {
      setSourcesError(e.message || 'Wipe failed');
    } finally {
      setWipingSources(false);
    }
  }

  async function handleRebuildSources() {
    if (!authChecked || rebuildingSources) return;
    if (aiConfigured === false) {
      setSourcesError('AI is not set up yet. Add OPEN_API_KEY in your site settings, then try again.');
      return;
    }
    const ok = window.confirm('Rebuild watched URLs with AI? This will wipe the list first.');
    if (!ok) return;
    setRebuildingSources(true);
    setSourcesError('');
    setSourcesMessage('');
    try {
      const res = await fetch('/api/ao/external-sources/rebuild', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_count: 20 }),
      });
      const text = await res.text().catch(() => '');
      const json = (() => {
        try { return text ? JSON.parse(text) : {}; } catch { return {}; }
      })();
      if (!res.ok || !json.ok) {
        if (res.status === 504 || res.status === 502 || res.status === 503) {
          throw new Error('Rebuild took too long to finish. Try again — it will keep building the list.');
        }
        const hint = summarizeResponseText(text);
        throw new Error(
          json.error
          || (hint ? `Rebuild failed (${res.status || 'error'}): ${hint}` : (res.status ? `Rebuild failed (${res.status})` : 'Rebuild failed'))
        );
      }
      await loadSources();
      const inserted = Number(json.inserted || 0);
      if (!inserted) {
        // This is not necessarily an "error" — it can mean the AI returned no usable links this time.
        setSourcesMessage(json.message || 'Rebuild finished, but added 0 URLs. Try again.');
      } else {
        setSourcesMessage(`Rebuilt watched URLs. Added ${inserted}.${json.message ? ` ${json.message}` : ''}`);
      }
    } catch (e) {
      setSourcesError(e.message || 'Rebuild failed');
      await loadAiStatus();
    } finally {
      setRebuildingSources(false);
    }
  }

  async function handleDeleteSource(id) {
    if (!authChecked || deleteSourceLoading) return;
    setDeleteSourceLoading(id);
    setSourcesError('');
    try {
      const res = await fetch(`/api/ao/external-sources/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setSourcesError(json.error || 'Could not delete source');
      } else {
        await loadSources();
      }
    } catch (e) {
      setSourcesError(e.message || 'Could not delete source');
    } finally {
      setDeleteSourceLoading(null);
    }
  }

  const categoriesArray = useMemo(() => {
    const raw = String(newPersonCategories || '').trim();
    if (!raw) return [];
    return raw.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 12);
  }, [newPersonCategories]);

  async function handleAddPerson() {
    if (!authChecked || addPersonLoading) return;
    const name = newPersonName.trim();
    if (!name) return;
    const url = safeUrl(newPersonProfileUrl.trim());
    setAddPersonLoading(true);
    setPeopleError('');
    try {
      const res = await fetch('/api/ao/brain-trust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          categories: categoriesArray,
          profile_urls: url ? [url] : [],
          notes: newPersonNotes.trim() || null,
          competitor_tier: String(newPersonCompetitorTier || 'none'),
          active: true,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setPeopleError(json.error || 'Could not add person');
      } else {
        setNewPersonName('');
        setNewPersonCategories('');
        setNewPersonProfileUrl('');
        setNewPersonNotes('');
        setNewPersonCompetitorTier('none');
        await loadPeople();
      }
    } catch (e) {
      setPeopleError(e.message || 'Could not add person');
    } finally {
      setAddPersonLoading(false);
    }
  }

  async function togglePersonActive(person) {
    if (!authChecked || togglingPersonId) return;
    setTogglingPersonId(person.id);
    setPeopleError('');
    try {
      const res = await fetch(`/api/ao/brain-trust/${encodeURIComponent(person.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !person.active }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setPeopleError(json.error || 'Could not update');
      } else {
        await loadPeople();
      }
    } catch (e) {
      setPeopleError(e.message || 'Could not update');
    } finally {
      setTogglingPersonId(null);
    }
  }

  async function handleDeletePerson(person) {
    if (!authChecked || deletePersonLoading || !person?.id) return;
    const ok = window.confirm(`Delete "${person.name || 'this person'}" from Watch Targets? This does not delete any opportunities already found.`);
    if (!ok) return;
    setDeletePersonLoading(person.id);
    setPeopleError('');
    try {
      const res = await fetch(`/api/ao/brain-trust/${encodeURIComponent(person.id)}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setPeopleError(json.error || 'Could not delete');
      } else {
        await loadPeople();
      }
    } catch (e) {
      setPeopleError(e.message || 'Could not delete');
    } finally {
      setDeletePersonLoading(null);
    }
  }

  async function updateSourceTier(id, competitorTier) {
    if (!authChecked || !id) return;
    setSourcesError('');
    try {
      const res = await fetch(`/api/ao/external-sources/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitor_tier: competitorTier }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setSourcesError(json.error || 'Could not update this URL');
      } else {
        await loadSources();
      }
    } catch (e) {
      setSourcesError(e.message || 'Could not update this URL');
    }
  }

  async function updatePersonTier(person, competitorTier) {
    if (!authChecked || togglingPersonId || !person?.id) return;
    setTogglingPersonId(person.id);
    setPeopleError('');
    try {
      const res = await fetch(`/api/ao/brain-trust/${encodeURIComponent(person.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitor_tier: competitorTier }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setPeopleError(json.error || 'Could not update this person');
      } else {
        await loadPeople();
      }
    } catch (e) {
      setPeopleError(e.message || 'Could not update this person');
    } finally {
      setTogglingPersonId(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AOHeader active="scout" email={email} onNavigate={handleNavigate} />
      <main className="container mx-auto px-4 py-6 md:py-8 max-w-7xl pb-28 md:pb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Scout</h1>
        <p className="text-gray-600 mb-8">
          Search and collect leadership signals from watch targets (sites + people). You can tag targets as competitors to include them in a daily digest lane.
        </p>

        <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Run Scout</h2>
          <p className="text-sm text-gray-600">
            Last daily run: {scanStatus.last_daily_run ? new Date(scanStatus.last_daily_run).toLocaleString() : '—'}<br />
            Last internal: {scanStatus.last_internal_scan ? new Date(scanStatus.last_internal_scan).toLocaleString() : '—'} | Last external: {scanStatus.last_external_scan ? new Date(scanStatus.last_external_scan).toLocaleString() : '—'}
          </p>
          {statusLoading ? <div className="mt-3"><LoadingSpinner /></div> : null}
          {displayRecentErrors.length ? (
            <ul className="mt-3 text-sm text-red-700">
              {displayRecentErrors.map((r, i) => (
                <li key={i}>
                  <span className="text-red-700">{r.error_message}</span>
                  {r?.started_at ? <span className="text-xs text-gray-500 ml-2">({new Date(r.started_at).toLocaleString()})</span> : null}
                </li>
              ))}
            </ul>
          ) : null}

          {dailyRunMessage ? (
            <div className={`mt-3 p-3 rounded text-sm ${dailyRunMessage.toLowerCase().includes('failed') ? 'bg-red-50 border border-red-200 text-red-800' : 'bg-green-50 border border-green-200 text-green-800'}`}>
              {dailyRunMessage}
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={runDailyNow} disabled={dailyRunning} className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50">
              {dailyRunning ? 'Running…' : 'Run daily now'}
            </button>
            <button type="button" onClick={() => runScan('internal')} disabled={scanning} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50">
              Run internal scan
            </button>
            <button type="button" onClick={() => runScan('external')} disabled={scanning} className="px-3 py-1.5 bg-gray-700 text-white text-sm rounded hover:bg-gray-800 disabled:opacity-50">
              Run external scan
            </button>
            <button type="button" onClick={runScoutPassNow} disabled={scoutPassRunning} className="px-3 py-1.5 bg-gray-900 text-white text-sm rounded hover:bg-gray-800 disabled:opacity-50">
              {scoutPassRunning ? 'Running…' : 'Run Scout pass now'}
            </button>
          </div>

          {dailyRunning ? <IndeterminateBar label="Daily run in progress…" /> : null}
          {scanning ? <IndeterminateBar label={`${scanRunningType === 'internal' ? 'Internal scan' : 'External scan'} in progress…`} /> : null}
          {scoutPassRunning ? <IndeterminateBar label="Scout pass in progress…" /> : null}
          {scoutPassMessage ? (
            <div className="mt-3 p-3 rounded text-sm bg-gray-50 border border-gray-200 text-gray-800">
              {scoutPassMessage}
            </div>
          ) : null}
          {scanError ? (
            <div className="mt-3 p-3 rounded text-sm bg-red-50 border border-red-200 text-red-800">
              {scanError}
            </div>
          ) : null}
          {scanMessage ? (
            <div className="mt-3 p-3 rounded text-sm bg-green-50 border border-green-200 text-green-800">
              {scanMessage}
            </div>
          ) : null}

          <div className="mt-5 pt-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">Competitor digest</h3>
            <p className="text-xs text-gray-600 mt-1">
              Best-effort daily lane. Some social sites block reading; this panel shows what was reachable.
            </p>

            {digestLoading ? <div className="mt-2"><LoadingSpinner /></div> : null}
            {digestError ? (
              <div className="mt-2 p-3 rounded text-sm bg-red-50 border border-red-200 text-red-800">
                {digestError}
              </div>
            ) : null}
            {digestMessage ? (
              <div className="mt-2 p-3 rounded text-sm bg-green-50 border border-green-200 text-green-800">
                {digestMessage}
              </div>
            ) : null}

            <div className="mt-2 text-sm text-gray-700">
              <div>
                Last run:{' '}
                {digestStatus?.started_at ? new Date(digestStatus.started_at).toLocaleString() : '—'}
              </div>
              <div className="mt-1">
                Added to Analyst:{' '}
                {typeof digestStatus?.inserted_count === 'number' ? digestStatus.inserted_count : '—'}
              </div>
              <div className="mt-2 text-xs text-gray-600">
                Reachable platforms:{' '}
                {digestStatus?.reachable_platforms
                  ? Object.entries(digestStatus.reachable_platforms).map(([k, v]) => `${k}:${v}`).join('  ')
                  : '—'}
              </div>
              <div className="mt-1 text-xs text-gray-600">
                Attempted platforms:{' '}
                {digestStatus?.attempted_platforms
                  ? Object.entries(digestStatus.attempted_platforms).map(([k, v]) => `${k}:${v}`).join('  ')
                  : '—'}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={runDigestNow}
                disabled={digestRunning}
                className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 disabled:opacity-50"
              >
                {digestRunning ? 'Running…' : 'Run competitor digest now'}
              </button>
              <button
                type="button"
                onClick={loadDigestStatus}
                disabled={digestLoading}
                className="px-3 py-1.5 border border-gray-300 text-sm rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Refresh
              </button>
            </div>

            {digestRunning ? <IndeterminateBar label="Competitor digest in progress…" /> : null}
          </div>
        </section>

        <section className="mt-6 bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Today’s hunt goals</h2>
              <p className="text-sm text-gray-600">
                Read-only mission brief for Scout (built from your priorities + what you’ve posted recently).
              </p>
              {!chaseLoading && chase.length ? (
                <div className="mt-1 text-xs text-gray-500">
                  Updated:{' '}
                  {new Date(
                    Math.max(
                      ...chase
                        .map((c) => new Date(c.updated_at || c.created_at || 0).getTime())
                        .filter((n) => Number.isFinite(n))
                    )
                  ).toLocaleString()}
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={generateChaseList}
                disabled={chaseGenerating}
                className="px-3 py-1.5 bg-gray-900 text-white text-sm rounded hover:bg-gray-800 disabled:opacity-50"
              >
                {chaseGenerating ? 'Refreshing…' : 'Refresh chase list'}
              </button>
              <button
                type="button"
                onClick={loadChaseList}
                disabled={chaseLoading}
                className="px-3 py-1.5 border border-gray-300 text-sm rounded hover:bg-gray-50 disabled:opacity-50"
              >
                {chaseLoading ? 'Loading…' : 'Reload'}
              </button>
            </div>
          </div>

          {chaseError ? (
            <div className="mt-3 p-3 rounded border border-red-200 bg-red-50 text-red-800 text-sm">{chaseError}</div>
          ) : null}
          {chaseMessage ? (
            <div className="mt-3 p-3 rounded border border-green-200 bg-green-50 text-green-800 text-sm">{chaseMessage}</div>
          ) : null}

          {chaseLoading ? (
            <div className="mt-3"><LoadingSpinner message="Loading chase list…" /></div>
          ) : chase.length === 0 ? (
            <div className="mt-3 text-sm text-gray-600">
              No chase items yet. Add “Beat priorities” in Settings, then refresh the chase list.
            </div>
          ) : (
            <ul className="mt-4 space-y-2">
              {chase.slice(0, 10).map((c) => (
                <li key={c.id} className="border border-gray-200 rounded p-3 bg-white">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold text-gray-900">{c.topic}</div>
                    <div className="text-xs text-gray-600">Priority: {c.priority ?? 50}</div>
                  </div>
                  {c.why ? <div className="mt-1 text-sm text-gray-700">{c.why}</div> : null}
                  {c.expires_at ? <div className="mt-1 text-xs text-gray-500">Expires: {new Date(c.expires_at).toLocaleDateString()}</div> : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Scout activity</h2>
            <p className="text-sm text-gray-600 mb-4">Short passes run automatically on weekdays. This is the recent activity log.</p>
            <div className="mb-4 text-xs text-gray-600">
              Daily cap: {capLoading ? '—' : capStatus ? `${capStatus.used}/${capStatus.cap} used` : '—'}
              {capStatus && capStatus.remaining === 0 ? (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded border border-red-200 bg-red-50 text-red-800">Cap reached</span>
              ) : null}
            </div>
            {scoutRunsError ? <p className="text-sm text-red-700 mb-3">{scoutRunsError}</p> : null}
            {scoutRunsLoading ? (
              <LoadingSpinner message="Loading activity…" />
            ) : scoutRuns.length === 0 ? (
              <p className="text-sm text-gray-500">No Scout runs yet.</p>
            ) : (
              <ul className="divide-y divide-gray-200 border border-gray-200 rounded">
                {scoutRuns.slice(0, 6).map((r) => (
                  <li key={r.id} className="p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-gray-900 font-medium">
                        {r.started_at ? new Date(r.started_at).toLocaleString() : 'Run'}
                      </div>
                      <div className="text-xs text-gray-600">
                        Pages: {r.pages_fetched ?? 0} · Leads: {r.leads_followed ?? 0} · Sent to Analyst: {r.discoveries_created ?? 0}
                      </div>
                    </div>
                    {r.error_message ? <div className="mt-1 text-xs text-red-700">{r.error_message}</div> : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Extra suggestions (Scout)</h2>
            <p className="text-sm text-gray-600 mb-4">New domains Scout found while following leads. Approve to add them to your watched list.</p>
            {pendingSourcesError ? <p className="text-sm text-red-700 mb-3">{pendingSourcesError}</p> : null}
            {pendingSourcesLoading ? (
              <LoadingSpinner message="Loading pending sources…" />
            ) : pendingSources.length === 0 ? (
              <p className="text-sm text-gray-500">No new domains waiting for approval.</p>
            ) : (
              <ul className="divide-y divide-gray-200 border border-gray-200 rounded">
                {pendingSources.slice(0, 20).map((p) => (
                  <li key={p.id} className="p-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">{p.domain}</div>
                      {p.example_url ? (
                        <a className="text-sm text-blue-700 hover:underline break-all" href={safeUrl(p.example_url) || '#'} target="_blank" rel="noreferrer">
                          {p.example_url}
                        </a>
                      ) : null}
                      <div className="mt-1 text-xs text-gray-500">
                        First seen: {p.first_seen_at ? new Date(p.first_seen_at).toLocaleString() : '—'}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => actOnPendingSource(p.id, 'approve')}
                        disabled={pendingActingId === p.id}
                        className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {pendingActingId === p.id ? 'Working…' : 'Approve'}
                      </button>
                      <button
                        type="button"
                        onClick={() => actOnPendingSource(p.id, 'reject')}
                        disabled={pendingActingId === p.id}
                        className="px-3 py-1.5 border border-gray-300 text-sm rounded hover:bg-gray-50 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Watch targets — sites</h2>
            <p className="text-sm text-gray-600 mb-4">
              These are the sites Scout checks. If you tag one as a competitor, it becomes eligible for the daily competitor digest.
            </p>

            {sourcesError ? <p className="text-sm text-red-700 mb-3">{sourcesError}</p> : null}
            {sourcesMessage ? <p className="text-sm text-green-800 mb-3">{sourcesMessage}</p> : null}

            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span
                className={`px-2 py-1 rounded text-xs border ${
                  aiStatusLoading
                    ? 'bg-gray-50 border-gray-200 text-gray-700'
                    : aiConfigured
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                }`}
                title={aiStatusLoading ? 'Checking AI status…' : aiConfigured ? 'AI is ready.' : 'AI key is missing.'}
              >
                {aiStatusLoading ? 'AI: checking…' : aiConfigured ? 'AI: ready' : 'AI: not set'}
              </span>
              <button
                type="button"
                onClick={handleRebuildSources}
                disabled={rebuildingSources}
                className="px-4 py-2 bg-gray-900 text-white font-semibold rounded hover:bg-gray-800 disabled:opacity-50"
              >
                {rebuildingSources ? 'Rebuilding…' : 'Rebuild list with AI'}
              </button>
              <button
                type="button"
                onClick={handleWipeSources}
                disabled={wipingSources}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                {wipingSources ? 'Wiping…' : 'Wipe list'}
              </button>
              <span className="text-xs text-gray-500">Wipe removes AI-added URLs only. Manual URLs stay until you delete them.</span>
            </div>
            {(rebuildingSources || wipingSources) ? (
              <IndeterminateBar label={rebuildingSources ? 'Rebuilding the list…' : 'Wiping the list…'} />
            ) : null}

            <div className="grid gap-3 md:grid-cols-3">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                <input
                  value={newSourceUrl}
                  onChange={(e) => setNewSourceUrl(e.target.value)}
                  placeholder="https://example.com/feed"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={newSourceType}
                  onChange={(e) => setNewSourceType(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white"
                >
                  <option value="rss">RSS</option>
                  <option value="article">Article</option>
                </select>
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Competitor tag</label>
                <select
                  value={newSourceCompetitorTier}
                  onChange={(e) => setNewSourceCompetitorTier(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white"
                >
                  <option value="none">Not a competitor</option>
                  <option value="friendly">Friendly competitor</option>
                  <option value="competitor">Competitor</option>
                </select>
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Name (optional)</label>
                <input
                  value={newSourceName}
                  onChange={(e) => setNewSourceName(e.target.value)}
                  placeholder="Leadership Brain Trust"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <button
                type="button"
                onClick={handleAddSource}
                disabled={addSourceLoading || !newSourceUrl.trim()}
                className="px-4 py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {addSourceLoading ? 'Adding…' : 'Add URL'}
              </button>
              <button
                type="button"
                onClick={loadSources}
                disabled={sourcesLoading}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Refresh
              </button>
            </div>

            <div className="mt-4">
              {sourcesLoading ? (
                <LoadingSpinner message="Loading sources…" />
              ) : sources.length === 0 ? (
                <p className="text-sm text-gray-500">No URLs yet.</p>
              ) : (
                <ul className="divide-y divide-gray-200 border border-gray-200 rounded">
                  {sources.map((s) => (
                    <li key={s.id} className="p-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {s.name || 'Source'}
                          <span className="ml-2 text-xs text-gray-500">({s.source_type})</span>
                        </div>
                        <a className="text-sm text-blue-700 hover:underline break-all" href={safeUrl(s.url) || '#'} target="_blank" rel="noreferrer">
                          {s.url}
                        </a>
                        <div className="mt-2">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Competitor tag</label>
                          <select
                            value={String(s.competitor_tier || 'none')}
                            onChange={(e) => updateSourceTier(s.id, e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
                          >
                            <option value="none">Not a competitor</option>
                            <option value="friendly">Friendly competitor</option>
                            <option value="competitor">Competitor</option>
                          </select>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteSource(s.id)}
                        disabled={deleteSourceLoading === s.id}
                        className="text-sm text-red-700 hover:underline disabled:opacity-50"
                      >
                        {deleteSourceLoading === s.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Watch targets — people/brands</h2>
            <p className="text-sm text-gray-600 mb-4">A lightweight registry of identifiable people/brands in your leadership universe.</p>

            {peopleError ? <p className="text-sm text-red-700 mb-3">{peopleError}</p> : null}

            <div className="grid gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categories (comma-separated)</label>
                  <input
                    value={newPersonCategories}
                    onChange={(e) => setNewPersonCategories(e.target.value)}
                    placeholder="leadership, culture, operations"
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Profile link (optional)</label>
                  <input
                    value={newPersonProfileUrl}
                    onChange={(e) => setNewPersonProfileUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Competitor tag</label>
                <select
                  value={newPersonCompetitorTier}
                  onChange={(e) => setNewPersonCompetitorTier(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white"
                >
                  <option value="none">Not a competitor</option>
                  <option value="friendly">Friendly competitor</option>
                  <option value="competitor">Competitor</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <textarea
                  value={newPersonNotes}
                  onChange={(e) => setNewPersonNotes(e.target.value)}
                  rows={2}
                  placeholder="Why this person matters / what to watch for"
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleAddPerson}
                  disabled={addPersonLoading || !newPersonName.trim()}
                  className="px-4 py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {addPersonLoading ? 'Adding…' : 'Add person'}
                </button>
                <button
                  type="button"
                  onClick={loadPeople}
                  disabled={peopleLoading}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  Refresh
                </button>
              </div>
            </div>

            <div className="mt-4">
              {peopleLoading ? (
                <LoadingSpinner message="Loading people…" />
              ) : people.length === 0 ? (
                <p className="text-sm text-gray-500">No people yet.</p>
              ) : (
                <ul className="divide-y divide-gray-200 border border-gray-200 rounded">
                  {people.map((p) => (
                    <li key={p.id} className="p-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-semibold text-gray-900 truncate">{p.name}</div>
                          <span className={`text-xs px-2 py-0.5 rounded ${p.active ? 'bg-green-50 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                            {p.active ? 'Active' : 'Paused'}
                          </span>
                          {String(p.competitor_tier || 'none') !== 'none' ? (
                            <span className={`text-xs px-2 py-0.5 rounded ${p.competitor_tier === 'competitor' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'}`}>
                              {p.competitor_tier === 'competitor' ? 'Competitor' : 'Friendly competitor'}
                            </span>
                          ) : null}
                        </div>
                        {Array.isArray(p.categories) && p.categories.length ? (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {p.categories.slice(0, 8).map((c) => (
                              <span key={c} className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-800">{c}</span>
                            ))}
                          </div>
                        ) : null}
                        {Array.isArray(p.profile_urls) && p.profile_urls.length ? (
                          <div className="mt-2">
                            {p.profile_urls.slice(0, 2).map((u) => (
                              <a key={u} href={safeUrl(u) || '#'} target="_blank" rel="noreferrer" className="text-sm text-blue-700 hover:underline break-all">
                                {u}
                              </a>
                            ))}
                          </div>
                        ) : null}
                        {p.notes ? <div className="mt-2 text-sm text-gray-600">{p.notes}</div> : null}
                        <div className="mt-2">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Competitor tag</label>
                          <select
                            value={String(p.competitor_tier || 'none')}
                            onChange={(e) => updatePersonTier(p, e.target.value)}
                            className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
                          >
                            <option value="none">Not a competitor</option>
                            <option value="friendly">Friendly competitor</option>
                            <option value="competitor">Competitor</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <button
                          type="button"
                          onClick={() => togglePersonActive(p)}
                          disabled={togglingPersonId === p.id}
                          className="text-sm text-gray-700 hover:underline disabled:opacity-50"
                        >
                          {togglingPersonId === p.id ? 'Saving…' : (p.active ? 'Pause' : 'Activate')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePerson(p)}
                          disabled={deletePersonLoading === p.id}
                          className="text-sm text-red-700 hover:underline disabled:opacity-50"
                        >
                          {deletePersonLoading === p.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

