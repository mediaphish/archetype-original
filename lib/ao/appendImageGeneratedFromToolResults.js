/**
 * When generate_image ran as a real tool this turn, append the same
 * [IMAGE_GENERATED ...] client signal the legacy DALLE path produces.
 * Pure / testable — does not re-run image generation.
 */

function escapeAttr(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, "'");
}

function urlsAlreadyPresent(reply) {
  const found = new Set();
  const text = String(reply || '');
  const re = /\[IMAGE_GENERATED([^\]]*)\]/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    const urlMatch = m[1].match(/\burl="([^"]*)"/i);
    if (urlMatch?.[1]) found.add(urlMatch[1].trim());
  }
  return found;
}

/**
 * @param {string} reply
 * @param {Array<{ name?: string, result?: object }>} toolResults
 * @returns {{ reply: string, appended: Array<{ label: string, url: string, size: string }> }}
 */
export function appendImageGeneratedFromToolResults(reply, toolResults = []) {
  let fullReply = String(reply || '').replace(/\[DALLE_GENERATE[^\]]*\]/gi, '').trim();
  const already = urlsAlreadyPresent(fullReply);
  const appended = [];

  const imageToolResults = (toolResults || []).filter(
    (r) => r?.name === 'generate_image' && r?.result?.ok && r?.result?.image_url
  );

  for (const r of imageToolResults) {
    const url = String(r.result.image_url || '').trim();
    if (!url || already.has(url)) continue;

    const label =
      String(r.result.title || '').trim() ||
      String(r.result.slug || '').trim() ||
      String(r.result.series_slug || '').trim() ||
      'Generated Image';
    const size = String(r.result.size || '1536x1024').trim() || '1536x1024';
    const tag = `[IMAGE_GENERATED label="${escapeAttr(label)}" url="${escapeAttr(url)}" size="${escapeAttr(size)}"]`;
    fullReply = `${fullReply}\n\n${tag}`.trim();
    already.add(url);
    appended.push({ label, url, size });
  }

  return { reply: fullReply, appended };
}
