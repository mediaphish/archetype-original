/**
 * The artifact panel for a journal draft, organised by workflow stage.
 *
 * Build step 2 of notes/AUTO_STAGED_WORKSPACE_SPEC.md. Five tabs, one thing per
 * tab, and the open tab follows the draft's real stage forward.
 *
 * Why it exists: the Cain header image was generated, saved to the draft, and
 * present in the old panel, and Bart could not tell. That panel stacked the
 * draft, a rejected reference upload, and Auto's images in one column, and the
 * newest image sat below the fold of a half-height scroll box. Bart: "Everything
 * I see on the right should be the image."
 *
 * The Post view is passed in as renderPost rather than imported, because it
 * lives in AutoV2Panel.jsx and importing it back would be circular.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { buildTabs, resolveOpenTab, pickImageCandidates } from '../../lib/stagedPanelModel.js';

function formatWhen(ms) {
  if (!ms) return '';
  try {
    return new Date(ms).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

function TabBar({ tabs, openTab, unread, onSelect }) {
  return (
    <div role="tablist" aria-label="Workflow" className="flex shrink-0 gap-1 overflow-x-auto border-b border-gray-200 px-2">
      {tabs.map((t) => {
        const selected = t.key === openTab;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={selected}
            data-testid={`stage-tab-${t.key}`}
            data-state={t.state}
            onClick={() => onSelect(t.key)}
            className={`relative whitespace-nowrap px-3 py-2 text-xs font-medium transition-colors ${
              selected ? 'text-gray-900' : t.state === 'ahead' ? 'text-gray-400 hover:text-gray-600' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t.state === 'done' ? <span aria-label="approved" className="mr-1 text-green-700">✓</span> : null}
            {t.label}
            {t.state === 'current' ? (
              <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-ao-red align-middle" aria-label="in progress" />
            ) : null}
            {unread[t.key] && !selected ? (
              <span data-testid={`stage-tab-unread-${t.key}`} className="absolute right-1 top-1.5 h-2 w-2 rounded-full bg-blue-600" aria-label="new" />
            ) : null}
            {selected ? <span className="absolute inset-x-2 bottom-0 h-0.5 rounded bg-gray-900" /> : null}
          </button>
        );
      })}
    </div>
  );
}

function EmptyTab({ title, detail }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-medium text-gray-700">{title}</p>
      {detail ? <p className="mt-1 max-w-xs text-xs leading-relaxed text-gray-500">{detail}</p> : null}
    </div>
  );
}

function ImageTab({ designImages, draftImageUrl, onImageError }) {
  const { current, previous, uploads, total } = useMemo(
    () => pickImageCandidates(designImages, draftImageUrl),
    [designImages, draftImageUrl]
  );
  const [viewingUrl, setViewingUrl] = useState(null);
  const [showPrevious, setShowPrevious] = useState(false);
  const [showUploads, setShowUploads] = useState(false);

  // A new candidate replaces what is shown. Viewing an older version is a
  // deliberate choice and ends the moment a new one arrives.
  useEffect(() => {
    setViewingUrl(null);
  }, [current?.url]);

  if (!current) {
    return (
      <EmptyTab
        title="No image yet"
        detail="When Auto generates the header image it appears here, on its own, sized to fit."
      />
    );
  }

  const ordered = [current, ...previous];
  const shown = (viewingUrl && ordered.find((i) => i.url === viewingUrl)) || current;
  const versionNumber = total - ordered.indexOf(shown);
  const isCurrent = shown.url === current.url;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex shrink-0 items-baseline justify-between gap-2">
        <p data-testid="image-version-label" className="text-xs font-semibold uppercase tracking-wide text-gray-600">
          {isCurrent ? 'Current image' : 'Earlier image'}, version {versionNumber} of {total}
        </p>
        <p className="text-xs text-gray-400">
          {shown.savedOnDraft ? 'saved on the draft' : formatWhen(shown.addedAt)}
        </p>
      </div>

      {/* Fitted, never scrolled. Missing a new image below the fold is the bug this replaces. */}
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl bg-gray-900">
        <img
          data-testid="image-current"
          src={shown.url}
          alt={shown.label || 'Generated header image'}
          className="max-h-full max-w-full object-contain"
          onError={() => onImageError?.(shown.url)}
        />
      </div>

      {!isCurrent ? (
        <button type="button" onClick={() => setViewingUrl(null)} className="shrink-0 text-xs font-medium text-gray-700 underline">
          Back to the current image
        </button>
      ) : null}

      {previous.length > 0 ? (
        <div className="shrink-0">
          <button
            type="button"
            data-testid="image-previous-toggle"
            onClick={() => setShowPrevious((v) => !v)}
            className="text-xs font-medium text-gray-600 hover:text-gray-900"
          >
            {showPrevious ? 'Hide' : 'Show'} previous versions ({previous.length})
          </button>
          {showPrevious ? (
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {previous.map((img) => (
                <button
                  key={img.url}
                  type="button"
                  onClick={() => setViewingUrl(img.url)}
                  className={`h-14 w-20 shrink-0 overflow-hidden rounded-md border ${
                    viewingUrl === img.url ? 'border-gray-900' : 'border-gray-200'
                  }`}
                  aria-label={`View version ${total - ordered.indexOf(img)}`}
                >
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {uploads.length > 0 ? (
        <div className="shrink-0 border-t border-gray-200 pt-2">
          <button
            type="button"
            data-testid="image-uploads-toggle"
            onClick={() => setShowUploads((v) => !v)}
            className="text-xs font-medium text-gray-500 hover:text-gray-800"
          >
            {showUploads ? 'Hide' : 'Show'} your uploads ({uploads.length})
          </button>
          {showUploads ? (
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {uploads.map((img) => (
                <a key={img.url} href={img.url} target="_blank" rel="noopener noreferrer" className="h-14 w-20 shrink-0 overflow-hidden rounded-md border border-dashed border-gray-300">
                  <img src={img.url} alt="Your upload" className="h-full w-full object-cover" />
                </a>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function StagedJournalPanel({ slug, designImages = [], renderPost, onImageError, refreshKey = 0 }) {
  const [stageInfo, setStageInfo] = useState(null);
  const [draft, setDraft] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  // The server says there is no such draft. The slug may have come from the
  // artifact's label, which is a guess; in that case show the post exactly as
  // the panel always did, with no tabs claiming a stage nobody confirmed.
  const [notFound, setNotFound] = useState(false);
  const [userTab, setUserTab] = useState(null);
  const [openTab, setOpenTab] = useState(null);
  const [unread, setUnread] = useState({});
  const previousStageTab = useRef(null);
  const openTabRef = useRef(null);
  const lastSeenImageUrl = useRef(null);

  const imageKey = (designImages || []).map((i) => i?.url).join('|');

  useEffect(() => {
    openTabRef.current = openTab;
  }, [openTab]);

  useEffect(() => {
    if (!slug) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/ao/auto/content-draft?slug=${encodeURIComponent(slug)}&kind=journal&include_published=1&with_stage=1`
        );
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok || !json?.ok) {
          setLoadFailed(true);
          return;
        }
        setNotFound(false);
        setLoadFailed(false);
        setDraft(json.draft || null);
        const nextStage = json.stage || null;
        setStageInfo(nextStage);

        const stageTab = nextStage?.tab || null;
        const next = resolveOpenTab({ userTab, previousTab: previousStageTab.current, stageTab });
        if (stageTab && previousStageTab.current && next === stageTab && stageTab !== previousStageTab.current) {
          // The stage moved forward and took the panel with it. Bart's earlier
          // tab choice was about the old stage and no longer applies.
          setUserTab(null);
        }
        previousStageTab.current = stageTab;
        setOpenTab(next);
      } catch {
        if (!cancelled) setLoadFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // userTab is read, not reacted to: clicking a tab must not refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, imageKey, refreshKey]);

  // Nothing changes silently. A new image while Bart is on another tab marks
  // the Image tab instead of switching him away from what he is reading.
  const newestCandidateUrl = useMemo(
    () => pickImageCandidates(designImages, draft?.image_url).current?.url || null,
    [designImages, draft?.image_url]
  );
  useEffect(() => {
    if (!newestCandidateUrl) return;
    if (lastSeenImageUrl.current && newestCandidateUrl !== lastSeenImageUrl.current && openTabRef.current !== 'image') {
      setUnread((u) => ({ ...u, image: true }));
    }
    if (openTabRef.current === 'image' || !lastSeenImageUrl.current) {
      lastSeenImageUrl.current = newestCandidateUrl;
    }
  }, [newestCandidateUrl]);

  const tabs = useMemo(() => buildTabs(stageInfo), [stageInfo]);
  const activeTab = loadFailed ? 'post' : openTab || 'post';

  const selectTab = (key) => {
    setUserTab(key);
    setOpenTab(key);
    if (key === 'image') {
      lastSeenImageUrl.current = newestCandidateUrl;
      setUnread((u) => ({ ...u, image: false }));
    }
  };

  // No tabs until the draft is confirmed. Showing a tab bar before the stage is
  // known would flash, and for an unconfirmed slug it would be wrong.
  if (notFound || (!stageInfo && !loadFailed)) {
    return (
      <div data-testid="staged-journal-fallback" className="flex min-h-0 flex-1 flex-col">
        {renderPost?.()}
      </div>
    );
  }

  return (
    <div data-testid="staged-journal-panel" className="flex min-h-0 flex-1 flex-col">
      <TabBar tabs={tabs} openTab={activeTab} unread={unread} onSelect={selectTab} />
      <div className="flex min-h-0 flex-1 flex-col pt-3">
        {activeTab === 'post' ? (
          <div className="flex min-h-0 flex-1 flex-col">{renderPost?.()}</div>
        ) : activeTab === 'image' ? (
          <ImageTab designImages={designImages} draftImageUrl={draft?.image_url} onImageError={onImageError} />
        ) : activeTab === 'research_brief' ? (
          <EmptyTab title="Research & Brief" detail="The research and brief for this post will live here. Until then they are in the conversation." />
        ) : activeTab === 'captions' ? (
          <EmptyTab title="Captions" detail="Every channel's caption will show here together, so notes can happen in the chat." />
        ) : (
          <EmptyTab title="Schedule & Publish" detail="What goes out when, and anything you still post by hand, will show here." />
        )}
      </div>
    </div>
  );
}
