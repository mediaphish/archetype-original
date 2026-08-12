import React from 'react';

/**
 * Always-available trigger for direct-to-draft header uploads.
 * Must NOT live only inside ArtifactPanel — that panel is content-gated and
 * unreachable in a fresh / empty conversation.
 */
export const HEADER_UPLOAD_TO_DRAFT_LABEL =
  'Upload header image directly to draft (skips chat)';

export const HEADER_UPLOAD_TO_DRAFT_TITLE =
  'Saves the image onto a draft by slug. Does not attach it to your next chat message — Auto is told about it separately.';

function UploadImageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 15l-5-5L5 21" />
    </svg>
  );
}

/**
 * Composer-row control + hidden file input. Parent owns the ref and onChange handler.
 */
export default function HeaderUploadToDraftTrigger({
  inputRef,
  onPickFile,
  onChange,
  disabled = false,
  uploading = false,
}) {
  return (
    <>
      <button
        type="button"
        onClick={onPickFile}
        disabled={disabled || uploading}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded disabled:opacity-40"
        aria-label={HEADER_UPLOAD_TO_DRAFT_LABEL}
        title={HEADER_UPLOAD_TO_DRAFT_TITLE}
      >
        <UploadImageIcon />
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        data-testid="header-upload-to-draft-input"
        onChange={onChange}
      />
    </>
  );
}
