import React, { useEffect, useMemo, useState } from 'react';
import SEO from '../../components/SEO';

function navigate(path) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function getTokenFromUrlOrStorage() {
  const url = new URL(window.location.href);
  const token = url.searchParams.get('token') || localStorage.getItem('blp_admin_token') || '';
  if (token) localStorage.setItem('blp_admin_token', token);
  if (url.searchParams.get('token')) {
    url.searchParams.delete('token');
    window.history.replaceState({}, '', `${url.pathname}${url.search}`);
  }
  return token;
}

const tabs = [
  { id: 'moderation', label: 'Moderation Queue' },
  { id: 'flagged', label: 'Flagged Stories' },
  { id: 'published', label: 'Published archive' },
  { id: 'intelligence', label: 'Intelligence Inbox' },
  { id: 'stats', label: 'Pattern Stats' },
];

export default function BadLeaderAdmin() {
  const [token, setToken] = useState('');
  const [ready, setReady] = useState(false);
  const [activeTab, setActiveTab] = useState('moderation');
  const [sessionEmail, setSessionEmail] = useState('');
  const [queue, setQueue] = useState({ pending: [], flagged: [], counts: { pending: 0, flagged: 0 } });
  const [stats, setStats] = useState(null);
  const [intel, setIntel] = useState({ dysfunctionalPrompts: '', exemplaryPrompts: '' });
  const [loadingIntel, setLoadingIntel] = useState(false);
  const [published, setPublished] = useState([]);
  const [loadingPublished, setLoadingPublished] = useState(false);

  useEffect(() => {
    async function init() {
      const nextToken = getTokenFromUrlOrStorage();
      if (!nextToken) {
        navigate('/culture-science/bad-leader-project/admin/login');
        return;
      }
      setToken(nextToken);
      const response = await fetch(`/api/bad-leader-admin-session?token=${encodeURIComponent(nextToken)}`);
      if (!response.ok) {
        localStorage.removeItem('blp_admin_token');
        navigate('/culture-science/bad-leader-project/admin/login');
        return;
      }
      const data = await response.json();
      setSessionEmail(data.email || '');
      setReady(true);
    }
    init();
  }, []);

  async function fetchQueue() {
    const response = await fetch(`/api/bad-leader-admin-queue?token=${encodeURIComponent(token)}`);
    if (!response.ok) return;
    const data = await response.json();
    setQueue(data);
  }

  async function fetchStats() {
    const response = await fetch(`/api/bad-leader-admin-stats?token=${encodeURIComponent(token)}`);
    if (!response.ok) return;
    const data = await response.json();
    setStats(data);
  }

  useEffect(() => {
    if (!ready || !token) return;
    fetchQueue();
    fetchStats();
  }, [ready, token]);

  async function moderate(submissionId, action) {
    const response = await fetch('/api/bad-leader-admin-moderate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, submissionId, action }),
    });
    if (!response.ok) return;
    await fetchQueue();
    await fetchStats();
  }

  async function runPatternAnalysis() {
    setLoadingIntel(true);
    try {
      const response = await fetch('/api/bad-leader-admin-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (!response.ok) return;
      const data = await response.json();
      setIntel({
        dysfunctionalPrompts: data.dysfunctionalPrompts || '',
        exemplaryPrompts: data.exemplaryPrompts || '',
      });
    } finally {
      setLoadingIntel(false);
    }
  }

  async function processClusterQueue() {
    await fetch('/api/bad-leader-process-clusters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    await fetchStats();
  }

  async function updateClusterLabel(clusterId, label) {
    await fetch('/api/bad-leader-admin-clusters', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, clusterId, label }),
    });
  }

  async function fetchPublished() {
    setLoadingPublished(true);
    try {
      const response = await fetch(`/api/bad-leader-admin-published?token=${encodeURIComponent(token)}`);
      if (!response.ok) return;
      const data = await response.json();
      setPublished(Array.isArray(data.stories) ? data.stories : []);
    } finally {
      setLoadingPublished(false);
    }
  }

  async function deletePublishedStory(storyId) {
    if (!window.confirm('Remove this story from the public archive permanently? This cannot be undone.')) return;
    const q = new URLSearchParams({ token, storyId });
    const response = await fetch(`/api/bad-leader-admin-published?${q}`, { method: 'DELETE' });
    if (!response.ok) return;
    await fetchPublished();
    await fetchStats();
  }

  useEffect(() => {
    if (!ready || !token || activeTab !== 'published') return;
    fetchPublished();
  }, [ready, token, activeTab]);

  const title = useMemo(() => tabs.find((tab) => tab.id === activeTab)?.label || 'Admin', [activeTab]);

  if (!ready) {
    return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>Loading admin...</div>;
  }

  return (
    <>
      <SEO pageKey="bad-leader-project" />
      <div style={{ display: 'flex', minHeight: '100vh', background: '#FAFAF9', color: '#1A1A1A', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <aside style={{ width: 220, background: '#2B2929', color: '#fff', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8B7D72', marginBottom: 4 }}>Archetype Original</div>
            <div style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 16, fontWeight: 400 }}>Bad Leader Project Admin</div>
          </div>
          <nav style={{ flex: 1, paddingTop: 12 }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  width: '100%',
                  border: 'none',
                  textAlign: 'left',
                  padding: '10px 20px',
                  background: activeTab === tab.id ? 'rgba(255,255,255,0.05)' : 'transparent',
                  color: activeTab === tab.id ? '#fff' : 'rgba(255,255,255,0.6)',
                  borderLeft: activeTab === tab.id ? '2px solid #DB0812' : '2px solid transparent',
                  cursor: 'pointer',
                }}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <button type="button" onClick={() => navigate('/culture-science/bad-leader-project')} style={{ display: 'block', marginBottom: 8, border: 'none', background: 'none', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', padding: 0 }}>
              View public page
            </button>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem('blp_admin_token');
                navigate('/culture-science/bad-leader-project/admin/login');
              }}
              style={{ border: 'none', background: 'none', color: 'rgba(255,255,255,0.45)', cursor: 'pointer', padding: 0 }}
            >
              Logout
            </button>
          </div>
        </aside>

        <main style={{ flex: 1 }}>
          <div style={{ height: 56, background: '#fff', borderBottom: '1px solid rgba(26,26,26,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 30px' }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
            <div style={{ fontSize: 12, color: '#6B6B6B' }}>{sessionEmail}</div>
          </div>

          <div style={{ padding: 30 }}>
            {activeTab === 'moderation' && (
              <section>
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8B7D72', marginBottom: 6 }}>Moderation Queue</p>
                  <h2 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 34, fontWeight: 400, margin: '0 0 8px' }}>{queue.counts?.pending || 0} stories awaiting review</h2>
                  <p style={{ color: '#6B6B6B' }}>Original story on the left. Neutralized version on the right. Approve to publish. Reject to remove from queue.</p>
                </div>
                {queue.pending.map((item) => {
                  const story = Array.isArray(item.blp_stories) ? item.blp_stories[0] : item.blp_stories;
                  return (
                    <article key={item.id} style={{ background: '#fff', border: '1px solid rgba(26,26,26,0.08)', marginBottom: 14 }}>
                      <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(26,26,26,0.07)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, color: '#6B6B6B' }}>{new Date(item.created_at).toLocaleString()}</span>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(139,125,114,0.12)', color: '#5C5048', textTransform: 'uppercase' }}>{item.region}</span>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(168,169,173,0.18)', color: '#4A4A4E', textTransform: 'uppercase' }}>{item.industry}</span>
                        {(story?.ali_conditions || []).map((condition) => (
                          <span key={`${item.id}-${condition}`} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(219,8,18,0.08)', color: '#9A0611', textTransform: 'uppercase' }}>
                            {condition}
                          </span>
                        ))}
                        {story?.scoreboard_leadership && (
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(219,8,18,0.15)', color: '#7A040D', textTransform: 'uppercase' }}>
                            Scoreboard pattern
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                        <div style={{ padding: 16 }}>
                          <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8B7D72', marginBottom: 8 }}>Original story</div>
                          <div style={{ maxHeight: 190, overflowY: 'auto', background: '#FAFAF9', border: '1px solid rgba(26,26,26,0.07)', padding: 14, fontSize: 13, lineHeight: 1.7 }}>{item.original_story}</div>
                        </div>
                        <div style={{ padding: 16 }}>
                          <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8B7D72', marginBottom: 8 }}>Neutralized version</div>
                          <div style={{ maxHeight: 190, overflowY: 'auto', background: '#FAFAF9', border: '1px solid rgba(26,26,26,0.07)', borderLeft: '3px solid rgba(219,8,18,0.2)', padding: 14, fontSize: 13, lineHeight: 1.7 }}>
                            {story?.neutralized_text || 'Pending neutralization'}
                          </div>
                        </div>
                      </div>
                      <div style={{ padding: 14, borderTop: '1px solid rgba(26,26,26,0.07)', display: 'flex', gap: 10 }}>
                        <button onClick={() => moderate(item.id, 'approve')} style={{ background: '#DB0812', border: 'none', color: '#fff', borderRadius: 2, padding: '9px 20px', fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>Approve and Publish</button>
                        <button onClick={() => moderate(item.id, 'reject')} style={{ background: 'transparent', border: '1px solid rgba(26,26,26,0.15)', color: '#6B6B6B', borderRadius: 2, padding: '9px 20px', fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>Reject</button>
                      </div>
                    </article>
                  );
                })}
              </section>
            )}

            {activeTab === 'flagged' && (
              <section>
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8B7D72', marginBottom: 6 }}>Flagged Stories</p>
                  <h2 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 34, fontWeight: 400, margin: '0 0 8px' }}>{queue.counts?.flagged || 0} stories need your review</h2>
                </div>
                {queue.flagged.map((item) => (
                  <article key={item.id} style={{ background: '#fff', border: '1px solid rgba(26,26,26,0.08)', marginBottom: 14 }}>
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(26,26,26,0.07)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: '#6B6B6B' }}>{new Date(item.created_at).toLocaleString()}</span>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(239,159,39,0.2)', color: '#633806', textTransform: 'uppercase' }}>Flagged</span>
                    </div>
                    <div style={{ margin: '12px 16px', borderLeft: '3px solid #EF9F27', background: 'rgba(239,159,39,0.08)', padding: '10px 12px', fontSize: 13, color: '#633806' }}>
                      <strong>Flag reason:</strong> {item.relevance_reason || 'Manual review required.'}
                    </div>
                    <div style={{ padding: '0 16px 14px' }}>
                      <div style={{ maxHeight: 170, overflowY: 'auto', background: '#FAFAF9', border: '1px solid rgba(26,26,26,0.07)', padding: 14, fontSize: 13, lineHeight: 1.7 }}>{item.original_story}</div>
                    </div>
                    <div style={{ padding: 14, borderTop: '1px solid rgba(26,26,26,0.07)', display: 'flex', gap: 10 }}>
                      <button onClick={() => moderate(item.id, 'approve-flagged')} style={{ background: '#8B7D72', border: 'none', color: '#fff', borderRadius: 2, padding: '9px 20px', fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>Approve for Neutralization</button>
                      <button onClick={() => moderate(item.id, 'reject')} style={{ background: 'transparent', border: '1px solid rgba(26,26,26,0.15)', color: '#6B6B6B', borderRadius: 2, padding: '9px 20px', fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>Reject</button>
                      <button onClick={() => moderate(item.id, 'spam')} style={{ background: 'transparent', border: '1px solid rgba(219,8,18,0.2)', color: '#DB0812', borderRadius: 2, padding: '9px 20px', fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>Mark as Spam</button>
                    </div>
                  </article>
                ))}
              </section>
            )}

            {activeTab === 'published' && (
              <section>
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8B7D72', marginBottom: 6 }}>Published archive</p>
                  <h2 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 34, fontWeight: 400, margin: '0 0 8px' }}>Live on the public site</h2>
                  <p style={{ color: '#6B6B6B' }}>Delete removes the story from the archive permanently (no return to moderation).</p>
                </div>
                {loadingPublished ? (
                  <p style={{ color: '#6B6B6B' }}>Loading...</p>
                ) : published.length === 0 ? (
                  <p style={{ color: '#6B6B6B' }}>No published stories.</p>
                ) : (
                  published.map((row) => (
                    <article key={row.id} style={{ background: '#fff', border: '1px solid rgba(26,26,26,0.08)', marginBottom: 14 }}>
                      <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(26,26,26,0.07)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: '#6B6B6B' }}>
                          {row.published_at ? new Date(row.published_at).toLocaleString() : new Date(row.created_at).toLocaleString()}
                        </span>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(139,125,114,0.12)', color: '#5C5048', textTransform: 'uppercase' }}>{row.region}</span>
                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(168,169,173,0.18)', color: '#4A4A4E', textTransform: 'uppercase' }}>{row.industry}</span>
                        <span style={{ fontSize: 11, color: '#8B7D72', fontFamily: 'ui-monospace, monospace' }}>{row.id.slice(0, 8)}…</span>
                      </div>
                      <div style={{ padding: '14px 16px', fontSize: 13, lineHeight: 1.7, color: '#3a3a3a' }}>{row.preview}{row.preview.length >= 220 ? '…' : ''}</div>
                      <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(26,26,26,0.07)' }}>
                        <button
                          type="button"
                          onClick={() => deletePublishedStory(row.id)}
                          style={{
                            background: 'transparent',
                            border: '1px solid rgba(219,8,18,0.35)',
                            color: '#DB0812',
                            borderRadius: 2,
                            padding: '9px 20px',
                            fontSize: 12,
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                          }}
                        >
                          Delete from archive
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </section>
            )}

            {activeTab === 'intelligence' && (
              <section>
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8B7D72', marginBottom: 6 }}>Intelligence Inbox</p>
                  <h2 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 34, fontWeight: 400, margin: '0 0 8px' }}>Pattern analysis from the corpus</h2>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '14px 16px', border: '1px solid rgba(26,26,26,0.08)', background: '#fff', marginBottom: 16 }}>
                  <p style={{ margin: 0, color: '#6B6B6B', fontSize: 14 }}>Run pattern analysis on approved stories split by dysfunctional and exemplary.</p>
                  <button onClick={runPatternAnalysis} disabled={loadingIntel} style={{ background: '#2B2929', border: 'none', color: '#fff', borderRadius: 2, padding: '10px 18px', fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>
                    {loadingIntel ? 'Running...' : 'Run Pattern Analysis'}
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ background: '#fff', border: '1px solid rgba(26,26,26,0.08)', padding: 16 }}>
                    <h3 style={{ marginTop: 0, marginBottom: 8, fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 400 }}>Dysfunctional Patterns</h3>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 13, lineHeight: 1.7 }}>{intel.dysfunctionalPrompts || 'No analysis yet.'}</pre>
                  </div>
                  <div style={{ background: '#fff', border: '1px solid rgba(26,26,26,0.08)', padding: 16 }}>
                    <h3 style={{ marginTop: 0, marginBottom: 8, fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 400 }}>Exemplary Patterns</h3>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 13, lineHeight: 1.7 }}>{intel.exemplaryPrompts || 'No analysis yet.'}</pre>
                  </div>
                </div>
              </section>
            )}

            {activeTab === 'stats' && (
              <section>
                <div style={{ marginBottom: 20 }}>
                  <p style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8B7D72', marginBottom: 6 }}>Pattern Stats</p>
                  <h2 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 34, fontWeight: 400, margin: '0 0 8px' }}>The corpus signals</h2>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <button onClick={processClusterQueue} style={{ background: '#2B2929', border: 'none', color: '#fff', borderRadius: 2, padding: '10px 18px', fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer' }}>
                    Process pending clusters
                  </button>
                </div>
                {stats && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, marginBottom: 20 }}>
                      <div style={{ background: '#fff', border: '1px solid rgba(26,26,26,0.06)', padding: 18 }}><div style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 34 }}>{stats.totals.submissions}</div><div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6B6B6B' }}>Total submissions</div></div>
                      <div style={{ background: '#fff', border: '1px solid rgba(26,26,26,0.06)', padding: 18 }}><div style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 34 }}>{stats.totals.publishedStories}</div><div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6B6B6B' }}>Published stories</div></div>
                      <div style={{ background: '#fff', border: '1px solid rgba(26,26,26,0.06)', padding: 18 }}><div style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 34 }}>{stats.totals.clusters}</div><div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6B6B6B' }}>Pattern clusters</div></div>
                      <div style={{ background: '#fff', border: '1px solid rgba(26,26,26,0.06)', padding: 18 }}><div style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 34 }}>{stats.totals.industriesRepresented}</div><div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6B6B6B' }}>Industries represented</div></div>
                    </div>

                    <div style={{ marginBottom: 20, border: '1px solid rgba(26,26,26,0.08)', background: '#fff' }}>
                      <div style={{ padding: '16px 18px', borderBottom: '1px solid rgba(26,26,26,0.07)' }}>
                        <p style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8B7D72', margin: '0 0 6px' }}>Leadership Health Index</p>
                        <h3 style={{ margin: 0, fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 400, fontSize: 22 }}>Dysfunctional vs Exemplary by condition</h3>
                      </div>
                      {(stats.healthIndex || []).map((row) => (
                        <div key={row.condition} style={{ display: 'grid', gridTemplateColumns: '150px 1fr 80px', gap: 14, alignItems: 'center', padding: '12px 18px', borderBottom: '1px solid rgba(26,26,26,0.05)' }}>
                          <div style={{ textTransform: 'capitalize', fontSize: 13 }}>{row.condition}</div>
                          <div style={{ height: 8, background: 'rgba(26,26,26,0.08)', borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
                            <div style={{ width: `${row.dysfunctionalPct}%`, background: '#DB0812' }} />
                            <div style={{ width: `${row.exemplaryPct}%`, background: '#2D7A3A' }} />
                          </div>
                          <div style={{ fontSize: 12, color: '#6B6B6B' }}>{row.dysfunctionalPct}% / {row.exemplaryPct}%</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ border: '1px solid rgba(26,26,26,0.08)', background: '#fff' }}>
                      <div style={{ padding: '16px 18px', borderBottom: '1px solid rgba(26,26,26,0.07)' }}>
                        <h3 style={{ margin: 0, fontFamily: 'Playfair Display, Georgia, serif', fontWeight: 400, fontSize: 22 }}>Clusters</h3>
                      </div>
                      {(stats.clusters || []).map((cluster) => (
                        <div key={cluster.id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 1fr', gap: 12, alignItems: 'center', padding: '12px 18px', borderBottom: '1px solid rgba(26,26,26,0.05)' }}>
                          <div style={{ fontSize: 13 }}>{cluster.id.slice(0, 8)} ({cluster.tone})</div>
                          <div style={{ fontSize: 13, color: '#6B6B6B' }}>{cluster.count} stories</div>
                          <input
                            defaultValue={cluster.label || ''}
                            onBlur={(e) => updateClusterLabel(cluster.id, e.target.value)}
                            placeholder="Add label"
                            style={{ border: '1px solid rgba(26,26,26,0.12)', borderRadius: 2, background: '#FAFAF9', padding: '7px 10px', fontSize: 13 }}
                          />
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </section>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
