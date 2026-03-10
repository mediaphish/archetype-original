/**
 * Image validation before publishing: URL reachable, aspect ratio, file size < 8MB.
 */

const MAX_SIZE_BYTES = 8 * 1024 * 1024; // 8MB
const MIN_ASPECT_RATIO = 4 / 5;   // 0.8 (portrait)
const MAX_ASPECT_RATIO = 1.91;    // 1.91 (landscape) - Instagram max

/**
 * Validate image URL for social publishing.
 * @param {string} imageUrl - Public URL of the image
 * @returns {Promise<{ valid: boolean, error?: string }>}
 */
export async function validateImageForPublish(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') {
    return { valid: false, error: 'image_url is required' };
  }
  const url = imageUrl.trim();
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return { valid: false, error: 'image_url must be an absolute http(s) URL' };
  }

  let res;
  try {
    res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
  } catch (err) {
    return { valid: false, error: `Image URL not reachable: ${err.message}` };
  }
  if (!res.ok) {
    return { valid: false, error: `Image URL returned ${res.status}` };
  }

  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  if (!contentType.includes('image/')) {
    return { valid: false, error: 'URL does not point to an image' };
  }

  const contentLength = res.headers.get('content-length');
  if (contentLength) {
    const bytes = parseInt(contentLength, 10);
    if (!Number.isNaN(bytes) && bytes > MAX_SIZE_BYTES) {
      return { valid: false, error: `Image larger than 8MB (${Math.round(bytes / 1024 / 1024)}MB)` };
    }
  }

  // Aspect ratio requires fetching the image (or we could skip and let the platform reject)
  const dimensionCheck = await checkImageDimensions(url);
  if (!dimensionCheck.valid) return dimensionCheck;

  return { valid: true };
}

/**
 * Fetch image and check dimensions / aspect ratio (and size if not in HEAD).
 */
async function checkImageDimensions(url) {
  try {
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) return { valid: false, error: `Image fetch failed: ${res.status}` };
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_SIZE_BYTES) {
      return { valid: false, error: `Image larger than 8MB (${Math.round(buf.byteLength / 1024 / 1024)}MB)` };
    }
    const dimensions = await getImageDimensionsFromBuffer(buf, res.headers.get('content-type'));
    if (!dimensions) return { valid: true }; // skip ratio check if we can't parse
    const { width, height } = dimensions;
    if (!width || !height) return { valid: true };
    const ratio = width / height;
    if (ratio < MIN_ASPECT_RATIO || ratio > MAX_ASPECT_RATIO) {
      return { valid: false, error: `Aspect ratio ${ratio.toFixed(2)} outside allowed range (${MIN_ASPECT_RATIO}–${MAX_ASPECT_RATIO})` };
    }
    return { valid: true };
  } catch (err) {
    return { valid: false, error: `Image validation failed: ${err.message}` };
  }
}

/**
 * Get image dimensions from buffer (basic support for JPEG/PNG via magic bytes / minimal parse).
 * Returns null if unsupported so caller can skip ratio check.
 */
function getImageDimensionsFromBuffer(buffer, contentType) {
  const arr = new Uint8Array(buffer);
  if (arr.length < 24) return null;
  const view = new DataView(buffer);
  // JPEG: FFD8 ... FFC0/C2 segment has dimensions at offset 5 and 7 (big-endian)
  if (arr[0] === 0xff && arr[1] === 0xd8) {
    let i = 2;
    while (i + 9 < arr.length) {
      if (arr[i] !== 0xff) break;
      const marker = arr[i + 1];
      const len = (arr[i + 2] << 8) | arr[i + 3];
      if (marker === 0xc0 || marker === 0xc2) {
        const height = (arr[i + 5] << 8) | arr[i + 6];
        const width = (arr[i + 7] << 8) | arr[i + 8];
        return { width, height };
      }
      i += 2 + len;
    }
    return null;
  }
  // PNG: signature then IHDR chunk (width bytes 16-19, height 20-23, big-endian)
  const pngSig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (pngSig.every((b, j) => arr[j] === b) && arr[12] === 0x49 && arr[13] === 0x48 && arr[14] === 0x44 && arr[15] === 0x52) {
    const width = view.getUint32(16, false);
    const height = view.getUint32(20, false);
    return { width, height };
  }
  return null;
}
