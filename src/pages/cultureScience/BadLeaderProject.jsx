import React, { useEffect, useMemo, useRef, useState } from 'react';
import SEO from '../../components/SEO';
import { splitNeutralizedParagraphs } from '../../lib/blpStoryParagraphs.js';
import './badLeaderProject.css';

function BlpStoryParagraphs({ text, excerpt }) {
  const paras = splitNeutralizedParagraphs(text);
  return (
    <div className={excerpt ? 'blp-story-body blp-story-body--excerpt' : 'blp-story-body'}>
      {paras.map((para, i) => (
        <p key={i} className="blp-story-para">
          {para}
        </p>
      ))}
    </div>
  );
}

const REGIONS = ['Northeast', 'Mid-Atlantic', 'Southeast', 'Midwest', 'South Central', 'Mountain West', 'Pacific West', 'Canada', 'International'];
const INDUSTRIES = ['Technology', 'Healthcare', 'Manufacturing', 'Retail', 'Professional Services', 'Education', 'Government', 'Nonprofit', 'Finance', 'Other'];
const CONDITIONS = ['Clarity', 'Consistency', 'Trust', 'Communication', 'Alignment', 'Stability', 'Drift'];

function spaNavigate(path, e) {
  if (e) e.preventDefault();
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function getClusterIdFromPath() {
  const path = window.location.pathname;
  const match =
    path.match(/\/culture-science\/anti-projects\/bad-leader-project\/cluster\/([^/]+)/) ||
    path.match(/\/culture-science\/bad-leader-project\/cluster\/([^/]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function buildStoryQuery(filters) {
  const p = new URLSearchParams();
  p.set('page', String(filters.page));
  p.set('limit', '12');
  if (filters.search) p.set('search', filters.search);
  if (filters.region) p.set('region', filters.region);
  if (filters.industry) p.set('industry', filters.industry);
  if (filters.condition) p.set('condition', filters.condition.toLowerCase());
  if (filters.tone) p.set('tone', filters.tone);
  if (filters.clusterId) p.set('clusterId', filters.clusterId);
  return p.toString();
}

export default function BadLeaderProject() {
  const [clusterId, setClusterId] = useState(getClusterIdFromPath());
  const [publicStats, setPublicStats] = useState({
    totalSubmitted: 0,
    totalPublished: 0,
    patternClusters: 0,
    industriesRepresented: 0,
  });
  const [stories, setStories] = useState([]);
  const [totalStories, setTotalStories] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedIds, setExpandedIds] = useState({});
  const storyArticleRefs = useRef({});
  const [loadingStories, setLoadingStories] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    name: '',
    email: '',
    region: '',
    industry: '',
    story: '',
  });
  const [filters, setFilters] = useState({
    search: '',
    region: '',
    industry: '',
    condition: '',
    tone: '',
    page: 1,
    clusterId: clusterId || '',
  });

  useEffect(() => {
    const onPop = () => {
      const id = getClusterIdFromPath();
      setClusterId(id);
      setFilters((prev) => ({ ...prev, page: 1, clusterId: id || '' }));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    async function loadPublicStats() {
      try {
        const response = await fetch('/api/bad-leader-public-stats');
        const raw = await response.text();
        if (!response.ok || !raw.trim().startsWith('{')) return;
        const data = JSON.parse(raw);
        setPublicStats({
          totalSubmitted: data.totalSubmitted || 0,
          totalPublished: data.totalPublished || 0,
          patternClusters: data.patternClusters || 0,
          industriesRepresented: data.industriesRepresented || 0,
        });
      } catch (err) {
        console.error('Failed to load BLP stats', err);
      }
    }
    loadPublicStats();
  }, []);

  useEffect(() => {
    async function loadStories() {
      setLoadingStories(true);
      try {
        const query = buildStoryQuery(filters);
        const response = await fetch(`/api/bad-leader-stories?${query}`);
        const raw = await response.text();
        if (!response.ok || !raw.trim().startsWith('{')) throw new Error('Failed to load stories');
        const data = JSON.parse(raw);
        setStories(data.stories || []);
        setTotalStories(data.total || 0);
        setTotalPages(data.totalPages || 1);
      } catch (err) {
        console.error('Failed to load BLP stories', err);
        setStories([]);
      } finally {
        setLoadingStories(false);
      }
    }
    loadStories();
  }, [filters]);

  const toneFromCluster = useMemo(() => {
    if (!clusterId || stories.length === 0) return 'dysfunctional';
    return stories[0].tone === 'exemplary' ? 'exemplary' : 'dysfunctional';
  }, [clusterId, stories]);

  const storyLength = form.story.length;
  const charClass = storyLength >= 1250 ? 'blp-char-ok' : 'blp-char-warn';

  function validateForm(nextForm) {
    const nextErrors = {};
    if (!nextForm.name.trim()) nextErrors.name = 'Name is required.';
    if (!nextForm.email.trim() || !nextForm.email.includes('@')) nextErrors.email = 'Valid email is required.';
    if (!nextForm.region) nextErrors.region = 'Region is required.';
    if (!nextForm.industry) nextErrors.industry = 'Industry is required.';
    if (!nextForm.story.trim()) nextErrors.story = 'Story is required.';
    if (nextForm.story.length < 1250) nextErrors.story = 'Minimum length is 250 words.';
    if (nextForm.story.length > 25000) nextErrors.story = 'Maximum length is 5000 words.';
    return nextErrors;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitLoading(true);
    try {
      const response = await fetch('/api/bad-leader-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const raw = await response.text();
      let data = {};
      try {
        data = raw && raw.trim() ? JSON.parse(raw) : {};
      } catch {
        setErrors({
          form:
            'The submission service returned an unexpected response. Please try again, or use the live site if you are running a local preview.',
        });
        return;
      }
      if (!response.ok) {
        if (data.errors) setErrors(data.errors);
        else setErrors({ form: data.error || 'Failed to submit your story.' });
        return;
      }
      setSubmitSuccess(true);
      setForm({ name: '', email: '', region: '', industry: '', story: '' });
      setErrors({});
    } catch (err) {
      console.error(err);
      setErrors({ form: 'Failed to submit your story.' });
    } finally {
      setSubmitLoading(false);
    }
  }

  function handleThumbsUp(storyId) {
    const key = `blp_vote_${storyId}`;
    if (localStorage.getItem(key)) return;
    fetch('/api/bad-leader-thumbsup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ neutralizedStoryId: storyId }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        localStorage.setItem(key, '1');
        setStories((prev) =>
          prev.map((story) =>
            story.id === storyId ? { ...story, thumbs_up_count: data.count } : story
          )
        );
      })
      .catch((err) => console.error(err));
  }

  function renderPagination() {
    if (totalPages <= 1) return null;
    const pages = [];
    const current = filters.page;
    const addPage = (num) => pages.push(num);
    addPage(1);
    if (current > 3) pages.push('...');
    for (let i = Math.max(2, current - 1); i <= Math.min(totalPages - 1, current + 1); i += 1) addPage(i);
    if (current < totalPages - 2) pages.push('...');
    if (totalPages > 1) addPage(totalPages);

    return (
      <div className="blp-pagination">
        <button
          className="blp-page-btn"
          onClick={() => setFilters((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
          disabled={filters.page === 1}
        >
          Prev
        </button>
        {pages.map((item, idx) =>
          item === '...' ? (
            <span key={`ellipsis-${idx}`}>...</span>
          ) : (
            <button
              key={item}
              className={`blp-page-btn ${item === filters.page ? 'active' : ''}`}
              onClick={() => setFilters((p) => ({ ...p, page: Number(item) }))}
            >
              {item}
            </button>
          )
        )}
        <button
          className="blp-page-btn"
          onClick={() => setFilters((p) => ({ ...p, page: Math.min(totalPages, p.page + 1) }))}
          disabled={filters.page >= totalPages}
        >
          Next
        </button>
      </div>
    );
  }

  return (
    <>
      <SEO pageKey="bad-leader-project" />
      <div className="blp-page">
        <section className="blp-hero">
          <div className="blp-inner blp-hero-grid">
            <div>
              <p className="blp-section-label">Anti-Project · Culture Science</p>
              <h1>The Bad Leader Project</h1>
              <p className="blp-hero-sub">
                A growing archive of dysfunctional leadership across industries and regions. Your story belongs here.
              </p>
              <a href="#submit-form" className="blp-btn blp-btn-primary">
                Submit Your Story
              </a>
            </div>
            <div className="blp-hero-right">
              <p>
                Most people know what bad leadership feels like. They have lived it. They rarely talk about it publicly because the professional cost feels too high.
              </p>
              <p>
                This project exists to change that. Not to call anyone out by name. Not to create a list. To surface the patterns that show up across industries, geographies, and organization sizes so leaders can recognize them, name them, and stop them.
              </p>
              <p>
                The public only ever sees a neutralized version of your story: no names, no companies, no identifying details. Just the pattern. Just the truth.
              </p>
              <div className="blp-promise-list">
                <div className="blp-promise-item"><span className="blp-check">✓</span><p>Your name and email are never shown on the public site</p></div>
                <div className="blp-promise-item"><span className="blp-check">✓</span><p>Only the neutralized text can appear in the public archive</p></div>
                <div className="blp-promise-item"><span className="blp-check">✓</span><p>After neutralization, every story gets a safety and quality review before it can go live</p></div>
                <div className="blp-promise-item"><span className="blp-check">✓</span><p>Your original submission is kept inside this system for research and is not published as-is</p></div>
              </div>
            </div>
          </div>
        </section>

        <section className="blp-section">
          <div className="blp-inner blp-two-col">
            <div className="blp-copy">
              <p className="blp-section-label">What This Project Is</p>
              <h2 className="blp-h2">A research archive. Not a lawsuit. Not a callout. Not a place to name names.</h2>
              <p>The Bad Leader Project collects anonymous stories of dysfunctional leadership from real organizations. The goal is pattern recognition at scale.</p>
              <p>Every story that comes in is neutralized by AI first: names, companies, and anything that would identify someone are stripped into a separate, publishable version. What the public can read is only that neutralized text, after review.</p>
              <p>The original submission stays in the research corpus to feed Culture Science and Archy. It is not published as your raw words on the open site.</p>
            </div>
            <div className="blp-card-stack">
              <div className="blp-card">
                <div className="blp-card-label">This Project Is</div>
                <ul>
                  <li>An anonymous story archive</li>
                  <li>A pattern recognition research tool</li>
                  <li>A corpus for Culture Science and Archy</li>
                  <li>A mirror for leaders who want to see what dysfunction looks like from the inside</li>
                  <li>A place where your experience finally counts for something</li>
                </ul>
              </div>
              <div className="blp-card blp-card-cream">
                <div className="blp-card-label">This Project Is Not</div>
                <ul>
                  <li>A place to name individuals or companies</li>
                  <li>A legal resource or complaint mechanism</li>
                  <li>A social media callout platform</li>
                  <li>A place to settle scores</li>
                  <li>A substitute for HR, legal, or professional support</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="blp-section blp-why">
          <div className="blp-inner blp-why-grid">
            <div>
              <p className="blp-section-label">Why Stories Matter</p>
              <h2 className="blp-h2">The pattern only becomes visible at scale.</h2>
              <p>Your story is one data point. The archive is the research.</p>
            </div>
            <div className="blp-copy">
              <p>Bad leadership is not an isolated incident. The same patterns show up in manufacturing companies in the Midwest, technology firms on the coasts, nonprofit organizations, law firms, medical practices, and retail operations. The industry changes. The behavior does not.</p>
              <div className="blp-why-pull">
                <p>Most leaders who create damaging environments do not know they are doing it. The pattern only becomes visible when you can see it across enough stories to recognize the shape of it.</p>
              </div>
              <p>That is what this archive is building. Not a list of bad actors. A map of behaviors: the early signals, the compounding patterns, the moments where intervention could have changed the outcome. Data that Culture Science, ALI, and Archy can use to help leaders see what is happening before it becomes irreversible.</p>
              <p>Your story is not just cathartic. It is useful. It is research. It is the kind of lived experience that no academic study can replicate because the people who lived it rarely put it on record.</p>
              <p><em>This is the record.</em></p>
            </div>
          </div>
        </section>

        <section className="blp-section blp-published">
          <div className="blp-inner">
            <div style={{ maxWidth: 680, marginBottom: 50 }}>
              <p className="blp-section-label">What Gets Published and What Stays Internal</p>
              <h2 className="blp-h2">Total transparency about what happens to your submission.</h2>
              <p>Before you submit, you should know exactly where your story goes and what form it takes when it gets there.</p>
            </div>
            <div className="blp-published-grid">
              <div className="blp-published-card"><h3>What Goes Public</h3><p>Only the neutralized text can appear in the public archive. Names, companies, and identifying details do not go live. The behavior and pattern can be visible; identities are not.</p></div>
              <div className="blp-published-card"><h3>What Stays Internal</h3><p>Your original submission is stored securely for research. It feeds the Culture Science corpus and trains Archy. It is not published as-is on the open site and is not sold or used for marketing.</p></div>
              <div className="blp-published-card"><h3>Before Anything Goes Live</h3><p>After neutralization, every candidate story goes through a safety and quality review. Nothing is posted until that review approves the neutralized version for the archive.</p></div>
            </div>
          </div>
        </section>

        <section id="submit-form" className="blp-section blp-submit">
          <div className="blp-inner blp-submit-grid">
            <div>
              <p className="blp-section-label">Submit Your Story</p>
              <h2 className="blp-h2">100% anonymous. Reviewed before publishing. Yours to tell.</h2>
              <p>This is the room where your story finally has somewhere to go. Tell it plainly. Tell it honestly. The pattern is what matters.</p>
              <p>Your submission is neutralized first so a safe, de-identified version exists for review. Then it goes through safety and quality review. Only the neutralized text can be approved for the public archive; nothing goes live automatically.</p>
              <p>Minimum 250 words. Maximum 5,000. Write what actually happened.</p>
            </div>
            <div className="blp-form">
              {!submitSuccess ? (
                <form onSubmit={handleSubmit}>
                  <div className="blp-form-row">
                    <div className="blp-form-group">
                      <label className="blp-form-label" htmlFor="blp-name">Name *</label>
                      <input id="blp-name" className="blp-form-input" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
                      {errors.name && <div className="blp-field-error">{errors.name}</div>}
                    </div>
                    <div className="blp-form-group">
                      <label className="blp-form-label" htmlFor="blp-email">Email *</label>
                      <input id="blp-email" type="email" className="blp-form-input" value={form.email} onBlur={() => setErrors((prev) => ({ ...prev, ...validateForm(form) }))} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
                      {errors.email && <div className="blp-field-error">{errors.email}</div>}
                    </div>
                  </div>
                  <div className="blp-form-row">
                    <div className="blp-form-group">
                      <label className="blp-form-label" htmlFor="blp-region">Region *</label>
                      <select id="blp-region" className="blp-form-input" value={form.region} onChange={(e) => setForm((p) => ({ ...p, region: e.target.value }))}>
                        <option value="">Select your region</option>
                        {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                      {errors.region && <div className="blp-field-error">{errors.region}</div>}
                    </div>
                    <div className="blp-form-group">
                      <label className="blp-form-label" htmlFor="blp-industry">Industry *</label>
                      <select id="blp-industry" className="blp-form-input" value={form.industry} onChange={(e) => setForm((p) => ({ ...p, industry: e.target.value }))}>
                        <option value="">Select your industry</option>
                        {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                      </select>
                      {errors.industry && <div className="blp-field-error">{errors.industry}</div>}
                    </div>
                  </div>
                  <div className="blp-form-group">
                    <label className="blp-form-label" htmlFor="blp-story">Story *</label>
                    <textarea id="blp-story" className="blp-form-textarea" value={form.story} onChange={(e) => setForm((p) => ({ ...p, story: e.target.value }))} />
                    <div className={`blp-char-count ${charClass}`}>{storyLength} / 25000 (1250 minimum)</div>
                    {errors.story && <div className="blp-field-error">{errors.story}</div>}
                  </div>
                  <div className="blp-form-divider" />
                  <p className="blp-form-note">Your name and email are used only to confirm your submission and follow up if needed. They are never shown on the public site and are not attached to the neutralized story readers see. Your original words are kept inside this system for research and are not published as-is.</p>
                  {errors.form && <div className="blp-field-error">{errors.form}</div>}
                  <div className="blp-form-submit-row">
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: 0 }}>Neutralized first.<br />Safety and quality review second.<br />Published only if approved.</p>
                    <button type="submit" className="blp-btn blp-btn-primary" disabled={submitLoading}>
                      {submitLoading ? 'Submitting...' : 'Submit Your Story'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="blp-form-success">
                  <h3>Your story is in.</h3>
                  <p>Your story is neutralized into a de-identified version, then reviewed for safety and quality. If it is approved for the archive, readers will only ever see that neutralized text. Thank you for contributing to the research.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {clusterId && (
          <section className="blp-cluster-header">
            <div className="blp-inner">
              <p className="blp-section-label">Pattern cluster · {toneFromCluster === 'exemplary' ? 'Exemplary' : 'Dysfunctional'}</p>
              <h2>
                {toneFromCluster === 'exemplary'
                  ? 'These stories describe the same thing working well. This is what it looks like when leadership gets it right.'
                  : 'These stories follow the same pattern. If one of them is yours, you are not alone.'}
              </h2>
              <a href="/culture-science/bad-leader-project" className="blp-link" onClick={(e) => spaNavigate('/culture-science/bad-leader-project', e)}>
                View all stories
              </a>
            </div>
          </section>
        )}

        <section className="blp-section blp-archive">
          <div className="blp-inner">
            <div className="blp-archive-header">
              <div>
                <p className="blp-section-label">The Archive</p>
                <h2 className="blp-h2" style={{ marginBottom: 6 }}>You are not the only one who has lived this.</h2>
                <p>Every story here has been anonymized. The names are gone. The behavior remains. Read what you recognize.</p>
              </div>
              <span>{totalStories} stories published</span>
            </div>

            <div className="blp-stats-row">
              <div className="blp-stat-card"><div className="blp-stat-number">{publicStats.totalSubmitted}</div><div className="blp-stat-label">Total stories submitted</div></div>
              <div className="blp-stat-card"><div className="blp-stat-number">{publicStats.totalPublished}</div><div className="blp-stat-label">Total published to archive</div></div>
              <div className="blp-stat-card"><div className="blp-stat-number">{publicStats.patternClusters}</div><div className="blp-stat-label">Pattern clusters identified</div></div>
              <div className="blp-stat-card"><div className="blp-stat-number">{publicStats.industriesRepresented}</div><div className="blp-stat-label">Industries represented</div></div>
            </div>

            <div className="blp-filter-bar">
              <input className="blp-filter-input" placeholder="Search stories..." value={filters.search} onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value, page: 1 }))} />
              <select className="blp-filter-select" value={filters.region} onChange={(e) => setFilters((p) => ({ ...p, region: e.target.value, page: 1 }))}>
                <option value="">All regions</option>
                {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <select className="blp-filter-select" value={filters.industry} onChange={(e) => setFilters((p) => ({ ...p, industry: e.target.value, page: 1 }))}>
                <option value="">All industries</option>
                {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
              <select className="blp-filter-select" value={filters.condition} onChange={(e) => setFilters((p) => ({ ...p, condition: e.target.value, page: 1 }))}>
                <option value="">All conditions</option>
                {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select className="blp-filter-select" value={filters.tone} onChange={(e) => setFilters((p) => ({ ...p, tone: e.target.value, page: 1 }))}>
                <option value="">All stories</option>
                <option value="dysfunctional">Dysfunctional leadership</option>
                <option value="exemplary">Exemplary leadership</option>
              </select>
              <span className="blp-filter-meta">Showing {stories.length} of {totalStories} stories</span>
              <button
                className="blp-clear-btn"
                onClick={() => setFilters({ search: '', region: '', industry: '', condition: '', tone: '', page: 1, clusterId: clusterId || '' })}
              >
                Clear
              </button>
            </div>

            {loadingStories ? (
              <div>Loading stories...</div>
            ) : stories.length === 0 ? (
              <div className="blp-card" style={{ textAlign: 'center', padding: 60 }}>
                <h3 style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: 24, fontWeight: 400, marginBottom: 8 }}>No stories found</h3>
                <p>Try clearing filters or checking back soon.</p>
              </div>
            ) : (
              <div className="blp-grid">
                {stories.map((story) => {
                  const isExemplary = story.tone === 'exemplary';
                  const isOpen = Boolean(expandedIds[story.id]);
                  const liked = Boolean(localStorage.getItem(`blp_vote_${story.id}`));
                  return (
                    <article
                      key={story.id}
                      ref={(el) => {
                        if (el) storyArticleRefs.current[story.id] = el;
                        else delete storyArticleRefs.current[story.id];
                      }}
                      className={`blp-story-card ${isExemplary ? 'is-exemplary' : ''}`}
                    >
                      <div className="blp-story-meta">
                        {isExemplary && <span className="blp-tag blp-tag-exemplary">Exemplary leadership</span>}
                        <span className="blp-tag blp-tag-region">{story.region}</span>
                        <span className="blp-tag blp-tag-industry">{story.industry}</span>
                        {(story.ali_conditions || []).map((condition) => (
                          <span
                            key={`${story.id}-${condition}`}
                            className={`blp-tag ${isExemplary ? 'blp-tag-condition-good' : 'blp-tag-condition'}`}
                          >
                            {condition}
                          </span>
                        ))}
                        {!isExemplary && story.scoreboard_leadership && (
                          <span className="blp-tag blp-tag-scoreboard">Scoreboard pattern</span>
                        )}
                      </div>
                      <div className="blp-story-text">
                        <BlpStoryParagraphs text={story.neutralized_text} excerpt={!isOpen} />
                      </div>
                      <button
                        type="button"
                        className="blp-expand-btn"
                        onClick={() => {
                          const wasOpen = Boolean(expandedIds[story.id]);
                          setExpandedIds((p) => ({ ...p, [story.id]: !p[story.id] }));
                          if (wasOpen) {
                            requestAnimationFrame(() => {
                              const el = storyArticleRefs.current[story.id];
                              el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            });
                          }
                        }}
                      >
                        {isOpen ? 'Collapse' : 'Read full story'}
                      </button>
                      <div className="blp-story-footer">
                        <button className={`blp-thumbs ${liked ? 'liked' : ''}`} onClick={() => handleThumbsUp(story.id)}>
                          <span>👍</span>
                          <span>{story.thumbs_up_count || 0}</span>
                        </button>
                        {story.cluster_id ? (
                          <a
                            href={`/culture-science/bad-leader-project/cluster/${story.cluster_id}`}
                            className="blp-link"
                            style={{ color: isExemplary ? '#2d7a3a' : undefined }}
                            onClick={(e) => spaNavigate(`/culture-science/bad-leader-project/cluster/${story.cluster_id}`, e)}
                          >
                            {isExemplary ? 'Leaders have seen this work' : 'Leaders share this pattern'}
                          </a>
                        ) : (
                          <span style={{ fontSize: 12, color: 'rgba(26,26,26,0.25)' }}>No related stories yet</span>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
            {renderPagination()}
          </div>
        </section>

        <section className="blp-section blp-fits">
          <div className="blp-inner">
            <div className="blp-fits-inner">
              <p>The Bad Leader Project is one lens inside Archetype Original. Scoreboard Leadership names one specific pattern. The Bad Leader Project surfaces all of them. Together they give leaders a vocabulary for what they are seeing, and a path toward building the opposite.</p>
              <p>The research that comes from this archive feeds Culture Science, informs ALI, and trains Archy. Every story submitted makes the whole system more accurate. That is how lived experience becomes useful at scale.</p>
              <div className="blp-fits-links">
                <a href="/culture-science/anti-projects/scoreboard-leadership" className="blp-link" onClick={(e) => spaNavigate('/culture-science/anti-projects/scoreboard-leadership', e)}>Scoreboard Leadership</a>
                <a href="/culture-science" className="blp-link" onClick={(e) => spaNavigate('/culture-science', e)}>Culture Science</a>
                <a href="/culture-science/ali" className="blp-link" onClick={(e) => spaNavigate('/culture-science/ali', e)}>ALI</a>
                <a href="/archy" className="blp-link" onClick={(e) => spaNavigate('/archy', e)}>Meet Archy</a>
              </div>
            </div>
          </div>
        </section>

        <section className="blp-section blp-close">
          <div className="blp-inner">
            <p className="blp-section-label">If You're Ready to Build the Opposite</p>
            <h2>The conversation starts here.</h2>
            <p>Bad leadership is diagnosable. It is fixable. The first step is a conversation outside your system where the real picture can finally surface.</p>
            <div className="blp-close-actions">
              <a href="/contact" className="blp-btn blp-btn-primary" onClick={(e) => spaNavigate('/contact', e)}>Start a Conversation</a>
              <a href="/advisory" className="blp-btn blp-btn-ghost-dark" onClick={(e) => spaNavigate('/advisory', e)}>How Advisory Works</a>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
