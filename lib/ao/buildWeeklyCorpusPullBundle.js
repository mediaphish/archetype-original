import { getCorpusPullQuotes } from './corpusPullQuotes.js';
import { generatePullQuoteCaptionsForQuotes } from './pullQuoteCaptions.js';
import { renderQuoteCardSvg } from './quoteCardDesigner.js';
import { getDefaultLogoUrl } from './brandLogos.js';
import { inlineLogoForQuoteCardSvg } from './remoteAssetDataUrl.js';
import { publishPlateCard } from './publishPlateCard.js';

/**
 * The closing words in the house red, like the approved cards: about the last
 * third, two to five words. The quote itself is never changed.
 */
export function accentClosingWords(quote) {
  const words = String(quote || '').trim().split(/\s+/).filter(Boolean);
  if (words.length < 4) return words.join(' ');
  const n = Math.max(2, Math.min(5, Math.round(words.length * 0.3)));
  return `${words.slice(0, -n).join(' ')} *${words.slice(-n).join(' ')}*`;
}

/** Monday YYYY-MM-DD in local calendar (server TZ) for labeling */
export function weekStartMonday(d = new Date()) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const dd = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function defaultThemes() {
  const raw = process.env.AO_WEEKLY_PULL_THEMES || '';
  if (raw.trim()) {
    return raw
      .split(/[|,]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  // Bart, 2026-10-24: "If we focus on real servant leadership quotes, we'll
  // be just fine." Every week's theme is a face of servant leadership.
  return [
    'servant leadership serving people first humility',
    'servant leadership trust accountability culture',
    'servant leadership developing people growth',
    'servant leadership listening clarity care',
    'servant leadership sacrifice responsibility pressure',
  ];
}

function pickThemeForWeek(weeksSinceEpoch) {
  const themes = defaultThemes();
  return themes[Math.abs(weeksSinceEpoch) % themes.length];
}

/**
 * Build quotes + interpretive captions (plus X-sized lines) + minimal card SVGs for a weekly bundle.
 * @returns {Promise<{ ok: boolean, error?: string, week_start?: string, theme_query?: string, items?: array }>}
 */
export async function buildWeeklyCorpusPullBundle({
  queryText,
  limit = 5,
} = {}) {
  const weekStart = weekStartMonday();
  const t = new Date(weekStart);
  const weeksSinceEpoch = Math.floor(t.getTime() / (7 * 24 * 60 * 60 * 1000));
  const theme = queryText || pickThemeForWeek(weeksSinceEpoch);

  const corpus = await getCorpusPullQuotes({
    queryText: theme,
    limit: Math.min(Math.max(Number(limit) || 5, 3), 5),
  });
  if (!corpus.ok || !corpus.quotes?.length) {
    return { ok: false, error: 'no_quotes', week_start: weekStart, theme_query: theme };
  }

  const { captions, captions_x } = await generatePullQuoteCaptionsForQuotes(corpus.quotes, { maxChars: 2000 });
  const rawLogo = await getDefaultLogoUrl({ background: 'dark' });
  const logoUrl = (await inlineLogoForQuoteCardSvg(rawLogo)) || null;

  const items = [];
  for (let i = 0; i < corpus.quotes.length; i += 1) {
    const q = corpus.quotes[i];
    const caption = captions[i] || '';
    const caption_x = captions_x[i] || '';
    const rendered = renderQuoteCardSvg({
      quote: q.quote,
      sourceName: q.source_title,
      logoUrl,
      style: 'minimal',
      minimalVariant: 'dark',
      forceLightLogo: true,
    });
    let quoteCardSvg = rendered.ok ? rendered.svg : null;
    if (quoteCardSvg && quoteCardSvg.length > 100000) {
      quoteCardSvg = null;
    }
    // Bart, 2026-10-28: the plates he shot for this "were well thought out, well
    // organized, and well designed by me. Right now, the system is completely
    // ignoring them." Every weekly card is set on one of his plates, rotating,
    // with his real lockup (generatePlateCard.js).
    let quote_card_image_url = null;
    try {
      const card = await publishPlateCard({ quote: accentClosingWords(q.quote), attribution: 'Bart Paden' });
      if (card.ok) quote_card_image_url = card.image_url;
      else console.error('[weeklyBundle] plate card failed:', card.error);
    } catch (err) {
      console.error('[weeklyBundle] plate card failed:', err?.message || err);
    }
    items.push({
      quote: q.quote,
      caption,
      caption_x,
      source_title: q.source_title,
      slug: q.slug || null,
      url: q.url || null,
      quote_card_svg: quoteCardSvg,
      ...(quote_card_image_url ? { quote_card_image_url } : {}),
    });
  }

  return {
    ok: true,
    week_start: weekStart,
    theme_query: theme,
    items,
  };
}
