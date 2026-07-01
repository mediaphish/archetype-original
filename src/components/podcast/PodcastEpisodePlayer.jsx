import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

function SpotifyIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141 4.32-1.32 9.66-.660 13.32 1.56.42.18.6.84.42 1.26zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.78-.18-.601.18-1.2.78-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.299z" />
    </svg>
  );
}

function ApplePodcastsIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24zm0 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16zm0 1.5A6.5 6.5 0 1 0 12 18.5a6.5 6.5 0 0 0 0-13zm0 2.05a4.45 4.45 0 1 1 0 8.9 4.45 4.45 0 0 1 0-8.9zm4.7 5.85a.95.95 0 1 1 0-1.9.95.95 0 0 1 0 1.9z" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

const PLATFORM_ICONS = {
  spotify: SpotifyIcon,
  apple: ApplePodcastsIcon,
  youtube: YouTubeIcon,
};

let ytApiPromise = null;

function loadYouTubeIframeApi() {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previous === 'function') previous();
      resolve();
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    } else if (window.YT?.Player) {
      resolve();
    }
  });
  return ytApiPromise;
}

function linkButtonClassName(prominent) {
  const size = prominent ? 'w-12 h-12' : 'w-9 h-9';
  return `${size} flex items-center justify-center border border-[#1A1A1A]/10 text-[#6B6B6B] hover:border-[#DB0812] hover:text-[#DB0812] transition-colors`;
}

export function getEpisodePlatformLinks(episode) {
  if (!episode) return [];
  const links = [];
  const spotifyId = String(episode.spotify_episode_id || '').trim();
  const appleUrl = String(episode.apple_podcasts_url || '').trim();
  const youtubeId = String(episode.youtube_id || '').trim();

  if (spotifyId) {
    links.push({
      key: 'spotify',
      platform: 'spotify',
      label: 'Spotify',
      url: `https://open.spotify.com/episode/${spotifyId}`,
    });
  }
  if (appleUrl) {
    links.push({
      key: 'apple',
      platform: 'apple',
      label: 'Apple Podcasts',
      url: appleUrl,
    });
  }
  if (youtubeId) {
    links.push({
      key: 'youtube',
      platform: 'youtube',
      label: 'YouTube',
      url: `https://www.youtube.com/watch?v=${youtubeId}`,
    });
  }
  return links;
}

const PodcastEpisodePlayer = forwardRef(function PodcastEpisodePlayer({ episode }, ref) {
  const youtubeId = String(episode?.youtube_id || '').trim();
  const links = getEpisodePlatformLinks(episode);
  const prominentLinks = !youtubeId && links.length > 0;
  const containerRef = useRef(null);
  const playerRef = useRef(null);

  useImperativeHandle(ref, () => ({
    seekTo(seconds) {
      const sec = Number(seconds);
      if (!Number.isFinite(sec) || sec < 0) return;
      if (playerRef.current?.seekTo) {
        playerRef.current.seekTo(sec, true);
        return;
      }
      if (youtubeId) {
        window.open(`https://www.youtube.com/watch?v=${youtubeId}&t=${Math.floor(sec)}s`, '_blank', 'noopener,noreferrer');
      }
    },
  }));

  useEffect(() => {
    if (!youtubeId || !containerRef.current) return undefined;
    let cancelled = false;

    loadYouTubeIframeApi().then(() => {
      if (cancelled || !containerRef.current || !window.YT?.Player) return;
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId: youtubeId,
        width: '100%',
        height: '100%',
        playerVars: { rel: 0, modestbranding: 1 },
      });
    });

    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy?.();
      } catch {
        // ignore destroy errors
      }
      playerRef.current = null;
    };
  }, [youtubeId]);

  if (!youtubeId && !links.length) return null;

  return (
    <div className={prominentLinks ? 'mb-8 sm:mb-10' : 'mb-8 sm:mb-10'}>
      {youtubeId ? (
        <div className="mb-5 w-full aspect-video bg-[#2B2929]">
          <div ref={containerRef} className="h-full w-full" />
        </div>
      ) : (
        <div className="mb-5 w-full bg-[#2B2929] px-6 py-10 sm:py-12 text-center">
          <p className="font-serif text-xl sm:text-2xl text-white mb-2">Listen to this episode</p>
          <p className="font-sans text-sm text-white/60 max-w-md mx-auto">
            Video is not available for this episode yet. Listen on your preferred platform below.
          </p>
        </div>
      )}

      {links.length > 0 && (
        <div className={`flex items-center gap-3 flex-wrap ${prominentLinks ? 'justify-center sm:justify-start' : ''}`}>
          <span className="text-xs font-semibold uppercase tracking-wide text-[#6B6B6B] mr-1">Listen on</span>
          {links.map((link) => {
            const Icon = PLATFORM_ICONS[link.platform];
            return (
              <a
                key={link.key}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={link.label}
                className={linkButtonClassName(prominentLinks)}
              >
                {Icon ? <Icon /> : link.label}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
});

export default PodcastEpisodePlayer;
