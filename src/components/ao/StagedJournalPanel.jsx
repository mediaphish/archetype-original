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
// The same measured count Auto reports, so the number on the tab and the number
// in the chat cannot disagree.
import { countDraftWords } from '../../../lib/ao/draftStats.js';
import { captionsFromChatText, mergeChatCaptions } from '../../../lib/ao/journalPanelData.js';
import { isPlaceholderArtifactBody } from '../../../lib/ao/artifactPlaceholder.js';

function formatWhen(ms) {
  if (!ms) return '';
  try {
    return new Date(ms).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

function TabBar({ tabs, openTab, unread, onSelect, counts = {} }) {
  return (
    <div role="tablist" aria-label="Workflow" className="flex shrink-0 flex-wrap border-b border-gray-200 px-1">
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
            className={`relative whitespace-nowrap px-2 py-2 text-xs font-medium transition-colors ${
              selected ? 'text-gray-900' : t.state === 'ahead' ? 'text-gray-400 hover:text-gray-600' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t.state === 'done' ? <span aria-label="approved" className="mr-1 text-green-700">✓</span> : null}
            {t.label}
            {counts?.[t.key] != null ? ` (${Number(counts[t.key]).toLocaleString('en-US')})` : null}
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

function ImageTab({ designImages, draftImageUrl, onImageError, stage = null, imageApproved = false, approving = false, approveError = null, onApprove = null }) {
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

      {/*
        Approval is explicit. The panel used to treat a saved image as an
        approved one and moved on without Bart. The button approves the image
        saved on the draft, so it only appears when that is the image on screen.
      */}
      {stage === 'image' || imageApproved ? (
        <div className="flex shrink-0 items-center justify-between gap-2">
          {imageApproved ? (
            <p data-testid="image-approved" className="text-xs font-medium text-green-700">✓ Image approved</p>
          ) : shown.url === draftImageUrl ? (
            <p className="text-xs text-gray-500">Talk through changes in the chat, then approve to move on.</p>
          ) : (
            <p className="text-xs text-amber-800">This is not the image saved on the draft, so it cannot be approved from here.</p>
          )}
          {!imageApproved && stage === 'image' && shown.url === draftImageUrl ? (
            <button
              type="button"
              data-testid="approve-image"
              disabled={approving}
              onClick={() => onApprove?.()}
              className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50"
            >
              {approving ? 'Approving…' : 'Approve image'}
            </button>
          ) : null}
        </div>
      ) : null}
      {approveError ? <p className="shrink-0 text-xs text-red-700">{approveError}</p> : null}

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

function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);
  if (!text) return null;
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          setCopied(false);
        }
      }}
      className="text-xs font-medium text-gray-600 hover:text-gray-900"
    >
      {copied ? 'Copied' : label}
    </button>
  );
}

function CaptionsTab({ captions, stage = null, captionsApproved = false, approving = false, approveError = null, onApprove = null }) {
  const list = Array.isArray(captions) ? captions : [];
  if (!list.some((c) => c.text)) {
    return (
      <EmptyTab
        title="No captions yet"
        detail="When Auto writes the captions, every channel shows here together, so notes can happen in the chat."
      />
    );
  }
  return (
    <div data-testid="captions-tab" className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
      {stage === 'captions' || captionsApproved ? (
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 bg-gray-50 pb-2">
          {captionsApproved ? (
            <p data-testid="captions-approved" className="text-xs font-medium text-green-700">✓ Captions approved</p>
          ) : (
            <p className="text-xs text-gray-500">Talk through changes in the chat, then approve to move on. Nothing is scheduled by approving.</p>
          )}
          {!captionsApproved && stage === 'captions' ? (
            <button
              type="button"
              data-testid="approve-captions"
              disabled={approving}
              onClick={() => onApprove?.()}
              className="shrink-0 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50"
            >
              {approving ? 'Approving…' : 'Approve captions'}
            </button>
          ) : null}
        </div>
      ) : null}
      {approveError ? <p className="text-xs text-red-700">{approveError}</p> : null}
      {list.map((c) => (
        <div key={c.key} data-testid={`caption-${c.key}`} className="rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-3 py-2">
            <p className="text-xs font-semibold text-gray-800">
              {c.label}
              {c.manual ? (
                <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">posted by hand</span>
              ) : null}
              {c.source === 'chat' ? (
                <span data-testid={`caption-chat-${c.key}`} className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-800">in chat, not scheduled</span>
              ) : null}
            </p>
            <div className="flex items-center gap-3">
              {c.text ? <span className="text-[11px] text-gray-400">{c.chars} chars</span> : null}
              <CopyButton text={c.text} />
            </div>
          </div>
          {c.text ? (
            <p className="whitespace-pre-wrap px-3 py-2 text-sm leading-relaxed text-gray-800">{c.text}</p>
          ) : (
            <p className="px-3 py-2 text-sm italic text-gray-400">No caption for this channel yet.</p>
          )}
        </div>
      ))}
    </div>
  );
}

function ScheduleTab({ schedule, slug, onChanged }) {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const rows = schedule?.rows || [];
  const manual = schedule?.manual || [];

  if (!schedule || (!rows.length && !schedule.publishAt)) {
    return (
      <EmptyTab
        title="Nothing scheduled yet"
        detail="Once captions are approved and scheduled, what goes out when shows here, with anything you still post by hand."
      />
    );
  }

  const mark = async (channel, posted) => {
    setBusy(channel);
    setError(null);
    try {
      const res = await fetch('/api/ao/auto/manual-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, channel, posted }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error || 'Could not save that');
      onChanged?.();
    } catch (err) {
      setError(err?.message || 'Could not save that');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div data-testid="schedule-tab" className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {schedule.publishedAt ? 'Published' : 'Post publishes'}
        </p>
        <p className="text-sm text-gray-900">
          {formatWhen(new Date(schedule.publishedAt || schedule.publishAt).getTime()) || 'Not set'}
        </p>
      </div>

      {rows.length ? (
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Scheduled posts</p>
          <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
            {rows.map((r, i) => (
              <li key={`${r.key}-${i}`} data-testid={`schedule-row-${r.key}`} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <span className="text-gray-800">{r.label}</span>
                <span className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{formatWhen(new Date(r.scheduledAt).getTime())}</span>
                  <span className={r.status === 'posted' ? 'text-green-700' : r.status === 'failed' ? 'text-red-700' : ''}>{r.status}</span>
                  <span>{r.hasImage ? 'image' : 'no image'}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Still to post by hand</p>
        <ul className="space-y-2">
          {manual.map((m) => (
            <li key={m.key} data-testid={`manual-${m.key}`} className="rounded-xl border border-gray-200 bg-white px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-gray-900">{m.label}</span>
                {m.postedAt ? (
                  <span className="flex items-center gap-3 text-xs">
                    <span className="text-green-700">Posted {formatWhen(new Date(m.postedAt).getTime())}</span>
                    <button type="button" disabled={busy === m.key} onClick={() => mark(m.key, false)} className="text-gray-500 underline">
                      Undo
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    data-testid={`mark-posted-${m.key}`}
                    disabled={busy === m.key}
                    onClick={() => mark(m.key, true)}
                    className="rounded-md bg-gray-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50"
                  >
                    Mark as posted
                  </button>
                )}
              </div>
              <div className="mt-1 flex items-center gap-3">
                {m.text ? <CopyButton text={m.text} label="Copy caption" /> : <span className="text-xs italic text-gray-400">No caption written for this channel.</span>}
                {m.imageUrl ? (
                  <a href={m.imageUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-gray-600 hover:text-gray-900">
                    Open image
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}

export default function StagedJournalPanel({ slug, designImages = [], renderPost, onImageError, refreshKey = 0, postContent = null, chatCaptionsText = null, onStageApproved = null }) {
  const [stageInfo, setStageInfo] = useState(null);
  const [draft, setDraft] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  // The server says there is no such draft. The slug may have come from the
  // artifact's label, which is a guess; in that case show the post exactly as
  // the panel always did, with no tabs claiming a stage nobody confirmed.
  const [notFound, setNotFound] = useState(false);
  const [panel, setPanel] = useState(null);
  // Bumped after a manual post is marked, so the Schedule tab reflects what was saved.
  const [refreshNonce, setRefreshNonce] = useState(0);
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
        setPanel(json.panel || null);
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
  }, [slug, imageKey, refreshKey, refreshNonce]);

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
  // Auto sometimes writes "(same content as above)" into the artifact instead of
  // the post (2026-09-20). The saved draft is the post, and this panel already
  // has it, so it stands in for the stub rather than showing Bart a placeholder
  // and a word count of 4.
  const postFallback = useMemo(
    () => (isPlaceholderArtifactBody(postContent) && draft?.content?.trim() ? draft.content : null),
    [postContent, draft]
  );
  const effectivePostContent = postFallback || postContent;

  // Recounted whenever the post text changes, so it follows every revision.
  const postWords = useMemo(
    () => (effectivePostContent && String(effectivePostContent).trim() ? countDraftWords(effectivePostContent) : null),
    [effectivePostContent]
  );

  // Captions often exist only in the chat before anything is saved or
  // scheduled ("Your Tuesday", 2026-09-15). Saved and scheduled text wins; chat
  // text only fills gaps and is labelled as not scheduled.
  const captionsForTab = useMemo(
    () => mergeChatCaptions(panel?.captions, chatCaptionsText),
    [panel, chatCaptionsText]
  );
  const scheduleForTab = useMemo(() => {
    const schedule = panel?.schedule;
    if (!schedule) return schedule;
    const chat = captionsFromChatText(chatCaptionsText);
    return {
      ...schedule,
      manual: (schedule.manual || []).map((m) => (m.text || !chat[m.key] ? m : { ...m, text: chat[m.key] })),
    };
  }, [panel, chatCaptionsText]);

  const [approving, setApproving] = useState(null);
  const [approveError, setApproveError] = useState(null);

  // Records Bart's approval of one step. The stage only moves because this
  // record exists, never because an image or caption set merely exists.
  const approveStage = async (stage) => {
    setApproving(stage);
    setApproveError(null);
    try {
      const body = { slug, stage };
      if (stage === 'captions') {
        body.captions = Object.fromEntries(
          (captionsForTab || []).filter((c) => c.text).map((c) => [c.key, c.text])
        );
      }
      const res = await fetch('/api/ao/auto/approve-stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error || 'Could not record that approval');
      setRefreshNonce((n) => n + 1);
      onStageApproved?.(stage);
    } catch (err) {
      setApproveError(err?.message || 'Could not record that approval');
    } finally {
      setApproving(null);
    }
  };
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
      <TabBar tabs={tabs} openTab={activeTab} unread={unread} onSelect={selectTab} counts={{ post: postWords }} />
      <div className="flex min-h-0 flex-1 flex-col pt-3">
        {activeTab === 'post' ? (
          <div className="flex min-h-0 flex-1 flex-col">{renderPost?.(postFallback)}</div>
        ) : activeTab === 'image' ? (
          <ImageTab
            designImages={designImages}
            draftImageUrl={draft?.image_url}
            onImageError={onImageError}
            stage={stageInfo?.stage}
            imageApproved={Boolean(stageInfo?.approvals?.image)}
            approving={approving === 'image'}
            approveError={approving === null ? approveError : null}
            onApprove={() => approveStage('image')}
          />
        ) : activeTab === 'research_brief' ? (
          <EmptyTab title="Research & Brief" detail="The research and brief for this post will live here. Until then they are in the conversation." />
        ) : activeTab === 'captions' ? (
          <CaptionsTab
            captions={captionsForTab}
            stage={stageInfo?.stage}
            captionsApproved={Boolean(stageInfo?.approvals?.captions)}
            approving={approving === 'captions'}
            approveError={approving === null ? approveError : null}
            onApprove={() => approveStage('captions')}
          />
        ) : (
          <ScheduleTab schedule={scheduleForTab} slug={slug} onChanged={() => setRefreshNonce((n) => n + 1)} />
        )}
      </div>
    </div>
  );
}
