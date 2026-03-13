function escapeXml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function wrapText(text, maxCharsPerLine, maxLines) {
  const words = String(text || '').trim().split(/\s+/g).filter(Boolean);
  const lines = [];
  let cur = [];
  for (const w of words) {
    const next = [...cur, w].join(' ');
    if (next.length > maxCharsPerLine && cur.length) {
      lines.push(cur.join(' '));
      cur = [w];
      if (lines.length >= maxLines) break;
    } else {
      cur.push(w);
    }
  }
  if (lines.length < maxLines && cur.length) lines.push(cur.join(' '));
  return lines.slice(0, maxLines);
}

function palette() {
  const palettes = [
    { bg: '#0B0F14', fg: '#FFFFFF', accent: '#7CFF6B' },
    { bg: '#0E1225', fg: '#FFFFFF', accent: '#FFB000' },
    { bg: '#111111', fg: '#FFFFFF', accent: '#00D1FF' },
    { bg: '#140D12', fg: '#FFFFFF', accent: '#FF4D6D' },
  ];
  return palettes[Math.floor(Math.random() * palettes.length)];
}

function renderTemplateCenter({ quote, sourceName, logoUrl }) {
  const { bg, fg, accent } = palette();
  const lines = wrapText(quote, 26, 6);
  const svgLines = lines
    .map((l, i) => `<text x="540" y="${220 + i * 58}" text-anchor="middle" font-size="44" font-weight="700" fill="${fg}">${escapeXml(l)}</text>`)
    .join('');
  const src = sourceName ? `<text x="540" y="650" text-anchor="middle" font-size="24" font-weight="600" fill="${accent}">${escapeXml(sourceName)}</text>` : '';
  const brand = logoUrl
    ? `<image href="${escapeXml(logoUrl)}" x="88" y="88" width="120" height="120" preserveAspectRatio="xMidYMid meet" />`
    : `<text x="110" y="170" font-size="48" font-weight="900" fill="${accent}">AO</text>`;
  return {
    template: 'center',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <rect width="1080" height="1080" rx="0" fill="${bg}"/>
  <rect x="84" y="84" width="912" height="912" fill="none" stroke="${accent}" stroke-width="6" opacity="0.9"/>
  ${brand}
  ${svgLines}
  ${src}
  <text x="540" y="760" text-anchor="middle" font-size="22" font-weight="600" fill="${fg}" opacity="0.75">archetypeoriginal.com</text>
</svg>`,
  };
}

function renderTemplateLeft({ quote, sourceName, logoUrl }) {
  const { bg, fg, accent } = palette();
  const lines = wrapText(quote, 30, 7);
  const svgLines = lines
    .map((l, i) => `<text x="140" y="${240 + i * 54}" text-anchor="start" font-size="40" font-weight="800" fill="${fg}">${escapeXml(l)}</text>`)
    .join('');
  const src = sourceName ? `<text x="140" y="720" text-anchor="start" font-size="24" font-weight="700" fill="${accent}">${escapeXml(sourceName)}</text>` : '';
  const brand = logoUrl
    ? `<image href="${escapeXml(logoUrl)}" x="96" y="92" width="120" height="120" preserveAspectRatio="xMidYMid meet" />`
    : `<text x="140" y="160" font-size="46" font-weight="950" fill="${accent}">AO</text>`;
  return {
    template: 'left',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <rect width="1080" height="1080" fill="${bg}"/>
  <rect x="0" y="0" width="64" height="1080" fill="${accent}"/>
  ${brand}
  ${svgLines}
  ${src}
  <text x="140" y="780" text-anchor="start" font-size="22" font-weight="600" fill="${fg}" opacity="0.75">archetypeoriginal.com</text>
</svg>`,
  };
}

function renderTemplateSplit({ quote, sourceName, logoUrl }) {
  const { bg, fg, accent } = palette();
  const lines = wrapText(quote, 24, 7);
  const svgLines = lines
    .map((l, i) => `<text x="540" y="${250 + i * 52}" text-anchor="middle" font-size="38" font-weight="850" fill="${fg}">${escapeXml(l)}</text>`)
    .join('');
  const src = sourceName ? `<text x="540" y="740" text-anchor="middle" font-size="24" font-weight="700" fill="${accent}">${escapeXml(sourceName)}</text>` : '';
  const brand = logoUrl
    ? `<image href="${escapeXml(logoUrl)}" x="88" y="88" width="120" height="120" preserveAspectRatio="xMidYMid meet" />`
    : `<text x="110" y="170" font-size="48" font-weight="950" fill="${accent}">AO</text>`;
  return {
    template: 'split',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${bg}"/>
      <stop offset="1" stop-color="#000000"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1080" fill="url(#g)"/>
  <circle cx="900" cy="180" r="110" fill="${accent}" opacity="0.18"/>
  <circle cx="170" cy="870" r="160" fill="${accent}" opacity="0.12"/>
  ${brand}
  ${svgLines}
  ${src}
  <text x="540" y="800" text-anchor="middle" font-size="22" font-weight="600" fill="${fg}" opacity="0.75">archetypeoriginal.com</text>
</svg>`,
  };
}

export function renderQuoteCardSvg({ quote, sourceName, logoUrl } = {}) {
  const q = String(quote || '').trim();
  if (!q) return { ok: false, error: 'quote required' };
  const templatePick = Math.random();
  const out =
    templatePick < 0.34
      ? renderTemplateCenter({ quote: q, sourceName, logoUrl })
      : templatePick < 0.67
        ? renderTemplateLeft({ quote: q, sourceName, logoUrl })
        : renderTemplateSplit({ quote: q, sourceName, logoUrl });
  return { ok: true, template: out.template, svg: out.svg };
}

