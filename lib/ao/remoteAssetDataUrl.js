import sharp from 'sharp';

/**
 * Nested SVG inside SVG &lt;image&gt; often fails in Sharp/librsvg; rasterize to PNG for reliable cards.
 */
async function svgBufferToPngDataUrl(buf) {
  try {
    const png = await sharp(buf)
      .resize(512, 512, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9 })
      .toBuffer();
    if (png?.length) return `data:image/png;base64,${png.toString('base64')}`;
  } catch {
    /* fall through */
  }
  return null;
}

/**
 * Fetch a public image URL and return a data: URL suitable for embedding in SVG <image href="...">.
 * Avoids broken previews when the SVG is shown via data:image/svg+xml (external href often blocked).
 * SVG assets are rasterized to PNG so the quote-card rasterizer does not choke on nested SVG.
 */
export async function fetchUrlAsDataUrlForSvg(imageUrl) {
  const u = String(imageUrl || '').trim();
  if (!u || !/^https?:\/\//i.test(u)) return null;
  try {
    const res = await fetch(u, {
      headers: { Accept: 'image/*' },
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 32 || buf.length > 4 * 1024 * 1024) return null;
    const ct = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    const mime =
      ct && ct.startsWith('image/')
        ? ct
        : u.toLowerCase().endsWith('.svg')
          ? 'image/svg+xml'
          : u.toLowerCase().match(/\.(png|webp|jpg|jpeg|gif)$/i)
            ? `image/${u.toLowerCase().endsWith('.png') ? 'png' : u.toLowerCase().endsWith('.webp') ? 'webp' : 'jpeg'}`
            : 'image/png';

    const head = buf.slice(0, 240).toString('utf8').trim();
    const isSvg =
      mime.includes('svg') ||
      /\.svg(\?|$)/i.test(u) ||
      /^<\?xml|^<svg\b/i.test(head);

    if (isSvg) {
      const asPng = await svgBufferToPngDataUrl(buf);
      if (asPng) return asPng;
    }

    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

/** Use for quote-card SVG: embed logo as data URL so previews render (external URLs often break inside data:image/svg+xml). */
export async function inlineLogoForQuoteCardSvg(logoUrlFromDb) {
  const u = String(logoUrlFromDb || '').trim();
  if (!u) return null;
  return fetchUrlAsDataUrlForSvg(u);
}
