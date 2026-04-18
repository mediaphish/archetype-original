/**
 * Account-level quote-card context for Auto — durable snippets from past Auto work
 * (assistant message meta), plus thin fallbacks from scheduled posts and editorial memory.
 */

import { supabaseAdmin } from '../supabase-admin.js';

function safeText(v, maxLen = 0) {
  const s = String(v || '').trim();
  if (!s) return '';
  return maxLen ? s.slice(0, maxLen) : s;
}

function normQuote(q) {
  return String(q || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 280);
}

const DEFAULT_CAP = 18;

/**
 * @param {string} email
 * @param {{ cap?: number }} [opts]
 * @returns {Promise<{ items: Array<Record<string, unknown>> }>}
 */
export async function fetchAccountQuoteCardContext(email, { cap = DEFAULT_CAP } = {}) {
  const owner = String(email || '').toLowerCase().trim();
  if (!owner) return { items: [] };

  const max = Math.min(40, Math.max(6, Number(cap) || DEFAULT_CAP));
  const items = [];
  const seen = new Set();

  function pushItem(entry) {
    const snippet = safeText(entry.quote_snippet, 220);
    if (snippet.length < 8) return;
    const key = snippet.toLowerCase().slice(0, 160);
    if (seen.has(key)) return;
    seen.add(key);
    items.push(entry);
  }

  try {
    const threadsOut = await supabaseAdmin
      .from('ao_auto_threads')
      .select('id, title')
      .eq('created_by_email', owner)
      .order('updated_at', { ascending: false })
      .limit(400);

    const threadRows = Array.isArray(threadsOut.data) ? threadsOut.data : [];
    const threadById = new Map(threadRows.map((t) => [t.id, safeText(t.title, 160)]));

    const threadIds = threadRows.map((t) => t.id).filter(Boolean);
    if (!threadIds.length) {
      await appendScheduledAndMemoryFallbacks(owner, items, seen, max);
      return { items: items.slice(0, max) };
    }

    const msgsOut = await supabaseAdmin
      .from('ao_auto_messages')
      .select('id, created_at, meta, thread_id')
      .eq('role', 'assistant')
      .in('thread_id', threadIds)
      .order('created_at', { ascending: false })
      .limit(150);

    const msgRows = Array.isArray(msgsOut.data) ? msgsOut.data : [];
    for (const row of msgRows) {
      if (items.length >= max) break;
      const meta = row.meta && typeof row.meta === 'object' ? row.meta : null;
      if (!meta) continue;
      const hasPreviews = Array.isArray(meta.quote_card_previews) && meta.quote_card_previews.length > 0;
      const hasCorpus = Array.isArray(meta.corpus_pull_quotes) && meta.corpus_pull_quotes.length > 0;
      if (!hasPreviews && !hasCorpus) continue;

      const threadTitle = threadById.get(row.thread_id) || '';
      const quotes = Array.isArray(meta.corpus_pull_quotes) ? meta.corpus_pull_quotes : [];

      for (const q of quotes) {
        if (items.length >= max) break;
        pushItem({
          quote_snippet: normQuote(q.quote).slice(0, 200),
          source_title: safeText(q.source_title, 120),
          url: safeText(q.url, 200),
          thread_title: threadTitle,
          created_at: row.created_at,
          source: 'auto_message',
        });
      }

      if (!quotes.length && hasPreviews) {
        for (const p of meta.quote_card_previews) {
          if (items.length >= max) break;
          const capText = normQuote(p.caption);
          if (capText.length < 12) continue;
          pushItem({
            quote_snippet: capText.slice(0, 200),
            source_title: safeText(p.source_title, 120),
            thread_title: threadTitle,
            created_at: row.created_at,
            source: 'auto_message_caption',
          });
        }
      }
    }
  } catch {
    /* fall through to fallbacks */
  }

  if (items.length < Math.min(8, max)) {
    await appendScheduledAndMemoryFallbacks(owner, items, seen, max);
  }

  return { items: items.slice(0, max) };
}

async function appendScheduledAndMemoryFallbacks(owner, items, seen, max) {
  try {
    const schedOut = await supabaseAdmin
      .from('ao_scheduled_posts')
      .select('text, scheduled_at, intent, source_kind')
      .eq('source_kind', 'auto_pull_quote_card')
      .order('scheduled_at', { ascending: false })
      .limit(80);

    const schedRows = Array.isArray(schedOut.data) ? schedOut.data : [];
    for (const row of schedRows) {
      if (items.length >= max) break;
      const intent = row.intent && typeof row.intent === 'object' ? row.intent : {};
      if (String(intent.created_by_email || '').toLowerCase().trim() !== owner) continue;
      const text = normQuote(row.text);
      if (text.length < 16) continue;
      const key = text.toLowerCase().slice(0, 160);
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({
        quote_snippet: text.slice(0, 220),
        source_title: '',
        thread_title: '',
        scheduled_at: row.scheduled_at,
        source: 'scheduled_quote_card',
      });
    }
  } catch {
    /* ignore */
  }

  if (items.length >= max) return;

  try {
    const memOut = await supabaseAdmin
      .from('ao_editorial_memory_items')
      .select('title, body_text, published_at, external_platform')
      .eq('created_by_email', owner)
      .eq('kind', 'social_post')
      .order('published_at', { ascending: false })
      .limit(30);

    const memRows = Array.isArray(memOut.data) ? memOut.data : [];
    for (const row of memRows) {
      if (items.length >= max) break;
      const body = normQuote(row.body_text);
      const title = safeText(row.title, 120);
      const snippet = body.length >= 24 ? body.slice(0, 200) : title ? `${title} — ${body}`.slice(0, 200) : '';
      if (snippet.length < 16) continue;
      const key = snippet.toLowerCase().slice(0, 160);
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({
        quote_snippet: snippet,
        source_title: title,
        thread_title: '',
        published_at: row.published_at,
        platform: safeText(row.external_platform, 40),
        source: 'editorial_memory',
      });
    }
  } catch {
    /* ignore */
  }
}

/**
 * Short numbered list for deterministic assistant replies (recall branch).
 * @param {Array<Record<string, unknown>>} items
 */
export function formatQuoteCardContextBlock(items) {
  if (!Array.isArray(items) || !items.length) return [];
  const lines = ['**Recent quote-card work on your account** (from saved Auto sessions and publish trail):', ''];
  items.slice(0, 14).forEach((it, i) => {
    const q = safeText(it.quote_snippet, 220);
    const src = [it.source_title, it.thread_title].filter(Boolean).join(' · ');
    const tail = src ? ` — ${src}` : '';
    lines.push(`${i + 1}. “${q}”${tail}`);
  });
  lines.push('');
  lines.push('Use this so you can continue without repeating the same lines—ask for more from the corpus or a new theme when you are ready.');
  return lines;
}
