/**
 * Client-side chat attachment sizing (#135).
 * Vercel Node functions reject bodies over ~4.5MB (413) before Auto ever runs.
 */

export const MAX_ATTACHMENT_DIMENSION = 1280;
export const ATTACHMENT_JPEG_QUALITY = 0.78;
export const MAX_TOTAL_ATTACHMENT_BYTES = 3_200_000;

export function totalAttachmentBytes(files) {
  return (files || []).reduce((sum, f) => sum + (f?.dataUrl ? String(f.dataUrl).length : 0), 0);
}

export function attachmentScale(width, height, maxDim = MAX_ATTACHMENT_DIMENSION) {
  const w = Number(width) || 0;
  const h = Number(height) || 0;
  const longest = Math.max(w, h);
  if (!longest) return 1;
  return Math.min(1, maxDim / longest);
}

export function packAttachmentsUnderLimit(
  existing,
  incoming,
  maxBytes = MAX_TOTAL_ATTACHMENT_BYTES
) {
  const kept = [...(existing || [])];
  const dropped = [];
  for (const file of incoming || []) {
    const next = [...kept, file];
    if (totalAttachmentBytes(next) <= maxBytes) kept.push(file);
    else dropped.push(file);
  }
  return { kept, dropped };
}

export function attachmentOverLimitMessage(maxBytes = MAX_TOTAL_ATTACHMENT_BYTES) {
  const mb = Math.floor(maxBytes / 1_000_000);
  return (
    `These images together are too large to send in one message (Auto can accept about ${mb}MB at a time). ` +
    'Try attaching fewer images, or send them in a couple of separate messages.'
  );
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read the selected file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Resize/re-encode images for chat reference. Non-images pass through unresized.
 * Browser-only (uses Image + canvas).
 */
export async function resizeImageFileToDataUrl(file) {
  const isImage = !!(file?.type && String(file.type).startsWith('image/'));
  if (!isImage) return readFileAsDataUrl(file);

  const dataUrl = await readFileAsDataUrl(file);
  const img = await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not decode the selected image'));
    image.src = dataUrl;
  });

  const scale = attachmentScale(img.width, img.height);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not prepare the selected image');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', ATTACHMENT_JPEG_QUALITY);
}
