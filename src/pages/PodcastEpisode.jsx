import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import seoConfig from '../config/seo.json';
import ShareLinks from '../components/ShareLinks';
import JournalSubscription from '../components/JournalSubscription';
import JournalAdvisoryCTA from '../components/JournalAdvisoryCTA';
import JournalMarkdownBody from '../components/JournalMarkdownBody';
import PodcastGuestBlock from '../components/podcast/PodcastGuestBlock';
import PodcastEpisodePlayer from '../components/podcast/PodcastEpisodePlayer';
import { formatDate } from '../lib/formatPublishDate';
import { resolveCorpusConnectionHref, timestampToSeconds } from '../../lib/corpusConnectionUrl.js';

function episodeTypeLabel(type) {
  if (!type) return '';
  const t = String(type).toLowerCase();
  if (t === 'guest') return 'Guest episode';
  if (t === 'solo') return 'Solo episode';
  return String(type);
}

function TranscriptLine({ line }) {
  const match = line.match(/^(\[[\d:]+\])\s*(.*)$/);
  if (match) {
    return (
      <p className="text-base leading-relaxed text-[#1A1A1A]">
        <span className="text-[#DB0812] font-medium text-sm mr-2">{match[1]}</span>
        {match[2]}
      </p>
    );
  }
  return <p className="text-base leading-relaxed text-[#1A1A1A]">{line}</p>;
}

function navigateTo(path) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0, behavior: 'instant' });
}

export default function PodcastEpisode() {
  const [episode, setEpisode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');
  const [transcriptSearch, setTranscriptSearch] = useState('');
  const [allJournalPosts, setAllJournalPosts] = useState([]);
  const playerRef = useRef(null);

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    const scrollToTop = () => window.scrollTo(0, 0);
    scrollToTop();

    requestAnimationFrame(() => {
      scrollToTop();
      requestAnimationFrame(scrollToTop);
    });

    const timers = [0, 10, 50, 100, 200, 300, 500].map((delay) => setTimeout(scrollToTop, delay));

    const path = window.location.pathname;
    const slug = path.replace('/podcast/', '').replace(/\/$/, '');

    if (!slug) {
      setError('Episode not found');
      setLoading(false);
      return;
    }

    Promise.all([
      fetch('/api/knowledge?type=podcast-episode').then((r) => r.json()),
      fetch('/api/knowledge?type=journal-post').then((r) => r.json()),
    ])
      .then(([podcastData, journalData]) => {
        const podcastDocs = podcastData.docs || [];
        setAllJournalPosts(journalData.docs || []);

        const found = podcastDocs.find((ep) => ep.slug === slug);
        if (!found) {
          setError('Episode not found');
        } else {
          setEpisode(found);
        }
        setLoading(false);

        requestAnimationFrame(() => {
          scrollToTop();
          requestAnimationFrame(scrollToTop);
        });
        setTimeout(scrollToTop, 100);
        setTimeout(scrollToTop, 200);
      })
      .catch((err) => {
        console.error('Error loading podcast episode:', err);
        setError('Failed to load episode');
        setLoading(false);
      });

    return () => {
      timers.forEach(clearTimeout);
    };
  }, []);

  const transcriptLines = useMemo(() => {
    if (!episode?.transcript) return [];
    return String(episode.transcript)
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  }, [episode?.transcript]);

  const filteredTranscriptLines = useMemo(() => {
    const q = transcriptSearch.trim().toLowerCase();
    if (!q) return transcriptLines;
    return transcriptLines.filter((line) => line.toLowerCase().includes(q));
  }, [transcriptLines, transcriptSearch]);

  const takeaways = useMemo(() => {
    if (!episode) return [];
    if (Array.isArray(episode.key_takeaways) && episode.key_takeaways.length > 0) {
      return episode.key_takeaways;
    }
    if (Array.isArray(episode.takeaways) && episode.takeaways.length > 0) {
      return episode.takeaways;
    }
    return [];
  }, [episode]);

  const corpusConnections = useMemo(() => {
    const list = Array.isArray(episode?.corpus_connections) ? episode.corpus_connections : [];
    return list.filter((conn) => {
      const strength = String(conn?.strength || '').toLowerCase();
      return strength === 'direct' || strength === 'thematic';
    });
  }, [episode?.corpus_connections]);

  const cleanSummary = (raw) => {
    if (!raw) return '';
    let text = String(raw);
    text = text.replace(/\{\\rtf[^}]*\}/gi, '');
    text = text.replace(/\\[a-z]+\d*\s*/gi, '');
    text = text.replace(/\{[^}]*\}/g, '');
    text = text.replace(/\s+/g, ' ').trim();
    return text;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] py-12 sm:py-16 md:py-20">
        <div className="container mx-auto px-4 sm:px-6 md:px-12">
          <div className="max-w-4xl mx-auto text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#DB0812] mx-auto" />
            <p className="mt-4 text-[#6B6B6B]">Loading episode...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !episode) {
    return (
      <div className="min-h-screen bg-[#FAFAF9] py-12 sm:py-16 md:py-20">
        <div className="container mx-auto px-4 sm:px-6 md:px-12">
          <div className="max-w-4xl mx-auto text-center py-12">
            <h1 className="font-serif text-5xl sm:text-6xl font-bold text-[#1A1A1A] mb-4">Episode Not Found</h1>
            <p className="text-base sm:text-lg text-[#6B6B6B] mb-6">{error || 'This episode does not exist.'}</p>
            <a
              href="/podcast"
              onClick={(e) => {
                e.preventDefault();
                navigateTo('/podcast');
              }}
              className="text-[#1A1A1A] hover:underline font-medium"
            >
              Back to Podcast
            </a>
          </div>
        </div>
      </div>
    );
  }

  const siteUrl = seoConfig.default.siteUrl.replace(/\/$/, '');
  const canonicalUrl = `${siteUrl}/podcast/${episode.slug}`;
  const ogImage = episode.youtube_id
    ? `https://img.youtube.com/vi/${episode.youtube_id}/maxresdefault.jpg`
    : `${siteUrl}/og-default.jpg`;

  const summaryText = cleanSummary(episode.summary);

  const handleTimestampSeek = (timestamp) => {
    const seconds = timestampToSeconds(timestamp);
    if (seconds == null) return;
    playerRef.current?.seekTo(seconds);
  };

  return (
    <>
      <Helmet>
        <title>{episode.title} | The Archetype Original Podcast</title>
        <meta name="description" content={summaryText || episode.title} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content={`${episode.title} | The Archetype Original Podcast`} />
        <meta property="og:description" content={summaryText || episode.title} />
        <meta property="og:image" content={ogImage} />
      </Helmet>

      <div className="min-h-screen bg-[#FAFAF9] py-12 sm:py-16 md:py-20">
        <div className="container mx-auto px-4 sm:px-6 md:px-12">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8 sm:mb-12">
              <a
                href="/podcast"
                onClick={(e) => {
                  e.preventDefault();
                  sessionStorage.setItem('podcastEpisodeNavigating', 'true');
                  navigateTo('/podcast');
                }}
                className="inline-flex items-center text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors text-base sm:text-lg"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Podcast
              </a>
            </div>

            <article className="bg-white border border-[#1A1A1A]/10">
              <div className="p-6 sm:p-8 md:p-10">
                <div className="flex items-center justify-between mb-6 sm:mb-8 flex-wrap gap-3">
                  <time className="text-sm text-[#6B6B6B]">
                    {formatDate(episode.publish_date || episode.created_at)}
                  </time>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-1 bg-[#FAFAF9] text-[#6B6B6B] text-xs">
                      {episodeTypeLabel(episode.episode_type)}
                    </span>
                    {episode.duration && (
                      <span className="px-2 py-1 bg-[#FAFAF9] text-[#6B6B6B] text-xs">{episode.duration}</span>
                    )}
                    <ShareLinks url={canonicalUrl} title={episode.title} description={summaryText} />
                  </div>
                </div>

                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-[#1A1A1A] mb-6 sm:mb-8 font-serif tracking-tight text-balance">
                  {episode.title}
                </h1>

                <PodcastEpisodePlayer ref={playerRef} episode={episode} />

                {summaryText && (
                  <div className="mb-8 sm:mb-10 p-4 sm:p-6 bg-[#FAFAF9] border-l-[6px] border-[#DB0812]">
                    <p className="text-base sm:text-lg font-semibold text-[#1A1A1A] leading-normal">{summaryText}</p>
                  </div>
                )}

                <div className="flex gap-0 border-b border-[#1A1A1A]/10 mb-8">
                  <button
                    type="button"
                    onClick={() => setActiveTab('summary')}
                    className={`px-0 py-3 mr-8 text-sm font-semibold uppercase tracking-[0.06em] border-b-2 transition-colors ${
                      activeTab === 'summary'
                        ? 'border-[#DB0812] text-[#1A1A1A]'
                        : 'border-transparent text-[#6B6B6B] hover:text-[#1A1A1A]'
                    }`}
                  >
                    Summary
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('transcript')}
                    className={`px-0 py-3 text-sm font-semibold uppercase tracking-[0.06em] border-b-2 transition-colors ${
                      activeTab === 'transcript'
                        ? 'border-[#DB0812] text-[#1A1A1A]'
                        : 'border-transparent text-[#6B6B6B] hover:text-[#1A1A1A]'
                    }`}
                  >
                    Transcript
                  </button>
                </div>

                {activeTab === 'summary' && (
                  <div className="prose prose-lg max-w-none" style={{ lineHeight: '1.6' }}>
                    {Array.isArray(episode.show_notes) && episode.show_notes.length > 0 && (
                      <>
                        <div className="flex items-center mb-4 sm:mb-6 mt-2">
                          <div className="w-1 h-10 sm:h-12 bg-[#DB0812] mr-4 sm:mr-6" />
                          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1A1A1A] font-serif tracking-tight">
                            Show notes
                          </h2>
                        </div>
                        <ul className="list-disc mb-6 space-y-3 pl-6 sm:pl-8 marker:text-[#DB0812]">
                          {episode.show_notes.map((note, i) => (
                            <li key={i} className="text-base sm:text-lg leading-normal text-[#1A1A1A]">
                              {typeof note === 'string' ? note : String(note)}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                    <JournalMarkdownBody post={episode} />
                  </div>
                )}

                {activeTab === 'transcript' && (
                  <div>
                    <div className="mb-6">
                      <div className="relative">
                        <input
                          type="text"
                          value={transcriptSearch}
                          onChange={(e) => setTranscriptSearch(e.target.value)}
                          placeholder="Search transcript"
                          className="w-full border border-[#1A1A1A]/15 px-4 py-2.5 pl-10 text-sm focus:outline-none focus:border-[#DB0812] transition-colors"
                        />
                        <svg
                          className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B6B6B]"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {filteredTranscriptLines.length > 0 ? (
                        filteredTranscriptLines.map((line, i) => <TranscriptLine key={i} line={line} />)
                      ) : (
                        <p className="text-[#6B6B6B] italic">
                          {transcriptLines.length === 0
                            ? 'Transcript not available for this episode.'
                            : 'No transcript lines match your search.'}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {takeaways.length > 0 && (
                  <div className="mt-12 sm:mt-16 border-l-2 border-[#DB0812] pl-6 sm:pl-8">
                    <h3 className="text-sm font-semibold uppercase tracking-widest text-[#DB0812] mb-4">
                      Key Takeaways
                    </h3>
                    <ul className="space-y-3 list-none pl-0">
                      {takeaways.map((item, i) => (
                        <li key={i} className="text-base sm:text-lg leading-relaxed text-[#1A1A1A]">
                          {typeof item === 'string' ? item : String(item)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {episode.tags && episode.tags.length > 0 && (
                  <div className="mt-8 sm:mt-10 pt-8 border-t border-[#1A1A1A]/10">
                    <div className="flex flex-wrap gap-2">
                      {episode.tags.map((tag) => (
                        <span key={tag} className="px-3 py-1 bg-[#FAFAF9] text-[#6B6B6B] text-sm">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {Array.isArray(episode.guests) && episode.guests.length > 0 ? (
                  <div className="space-y-6">
                    {episode.guests.map((g, i) => (
                      <PodcastGuestBlock key={g.name || i} guest={g} />
                    ))}
                  </div>
                ) : (
                  episode.guest?.name && <PodcastGuestBlock guest={episode.guest} />
                )}

                <div className="mt-12 sm:mt-16 pt-8 sm:pt-12 border-t border-[#1A1A1A]/10">
                  <h3 className="text-xl sm:text-2xl font-bold text-[#1A1A1A] mb-6 sm:mb-8 font-serif">
                    Related Reading
                  </h3>
                  <div className="space-y-6">
                    {episode.categories && (
                      <div>
                        <h4 className="text-base sm:text-lg font-semibold text-[#1A1A1A] mb-3 sm:mb-4">
                          Explore More
                        </h4>
                        <ul className="space-y-2">
                          {episode.categories.some((cat) =>
                            ['servant-leadership', 'leadership', 'mentorship', 'consulting'].includes(
                              String(cat).toLowerCase(),
                            ),
                          ) && (
                            <li>
                              <a
                                href="/advisory"
                                onClick={(e) => {
                                  e.preventDefault();
                                  navigateTo('/advisory');
                                }}
                                className="text-[#DB0812] hover:text-[#b30610] underline text-base sm:text-lg"
                              >
                                Advisory: How I work with leaders and teams
                              </a>
                            </li>
                          )}
                          {episode.categories.some((cat) =>
                            ['servant-leadership', 'leadership', 'golden-rule', 'posture', 'philosophy'].includes(
                              String(cat).toLowerCase(),
                            ),
                          ) && (
                            <li>
                              <a
                                href="/meet-bart"
                                onClick={(e) => {
                                  e.preventDefault();
                                  navigateTo('/meet-bart');
                                }}
                                className="text-[#DB0812] hover:text-[#b30610] underline text-base sm:text-lg"
                              >
                                Meet Bart: the story, posture, and how the work shows up
                              </a>
                            </li>
                          )}
                          {episode.categories.some((cat) =>
                            ['scoreboard-leadership', 'anti-project', 'bad-leader', 'culture'].includes(
                              String(cat).toLowerCase(),
                            ),
                          ) && (
                            <li>
                              <a
                                href="/culture-science/anti-projects/scoreboard-leadership"
                                onClick={(e) => {
                                  e.preventDefault();
                                  navigateTo('/culture-science/anti-projects/scoreboard-leadership');
                                }}
                                className="text-[#DB0812] hover:text-[#b30610] underline text-base sm:text-lg"
                              >
                                Scoreboard Leadership: The diagnostic lens
                              </a>
                            </li>
                          )}
                        </ul>
                      </div>
                    )}

                    {corpusConnections.length > 0 && (
                      <div>
                        <h4 className="text-base sm:text-lg font-semibold text-[#1A1A1A] mb-3 sm:mb-4">
                          From the AO corpus
                        </h4>
                        <ul className="space-y-5">
                          {corpusConnections.map((conn, index) => {
                            const href = resolveCorpusConnectionHref(conn);
                            return (
                              <li
                                key={`${conn.slug}-${index}`}
                                className="border border-[#1A1A1A]/10 bg-[#FAFAF9] p-4 sm:p-5"
                              >
                                {href ? (
                                  <a
                                    href={href}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      navigateTo(href);
                                    }}
                                    className="text-base sm:text-lg font-semibold text-[#DB0812] hover:text-[#b30610]"
                                  >
                                    {conn.title}
                                  </a>
                                ) : (
                                  <p className="text-base sm:text-lg font-semibold text-[#1A1A1A]">
                                    {conn.title}
                                  </p>
                                )}
                                {conn.connection && (
                                  <p className="mt-2 text-sm sm:text-base leading-relaxed text-[#6B6B6B]">
                                    {conn.connection}
                                  </p>
                                )}
                                {conn.timestamp && episode.youtube_id && (
                                  <button
                                    type="button"
                                    onClick={() => handleTimestampSeek(conn.timestamp)}
                                    className="mt-3 text-sm font-medium text-[#DB0812] hover:text-[#b30610]"
                                  >
                                    Jump to {conn.timestamp} in video
                                  </button>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-12 sm:mt-16">
                  <JournalAdvisoryCTA />
                </div>

                <div className="mt-12 sm:mt-16 pt-8 sm:pt-12 border-t border-[#1A1A1A]/10">
                  <JournalSubscription />
                </div>
              </div>
            </article>
          </div>
        </div>
      </div>
    </>
  );
}
