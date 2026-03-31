import { supabaseAdmin } from '../supabase-admin.js';
import { getCorpusPullQuotes } from './corpusPullQuotes.js';
import { normalizeQuoteText, hashNormalized, isExactDuplicate, storeQuoteHash } from './duplicateDetection.js';

function safeText(v, maxLen) {
  const s = String(v || '').trim();
  if (!s) return '';
  return maxLen ? s.slice(0, maxLen) : '';
}

/**
 * Optional cron: insert internal inbox rows from corpus pull-quote search (same retriever as Auto).
 */
export async function seedCorpusPullQuotesToQueue({ email, queryText, limit = 3 } = {}) {
  const owner = String(email || '').trim().toLowerCase();
  if (!owner) return { ok: false, error: 'email required', inserted: 0 };

  const corpus = await getCorpusPullQuotes({
    queryText: queryText || 'leadership accountability culture servant',
    limit: Math.min(Number(limit) || 3, 5),
  });
  if (!corpus.ok || !corpus.quotes.length) {
    return { ok: true, inserted: 0, message: 'No corpus quotes found for seed query.' };
  }

  let inserted = 0;
  for (const q of corpus.quotes) {
    const quoteText = safeText(q.quote, 500);
    const normalized = normalizeQuoteText(quoteText);
    const hashed = hashNormalized(normalized);
    try {
      if (await isExactDuplicate(hashed)) continue;
    } catch (_) {}

    const slug = q.slug || '';
    const publicUrl = q.url || (slug ? `https://www.archetypeoriginal.com/journal/${encodeURIComponent(slug)}` : null);

    try {
      const out = await supabaseAdmin
        .from('ao_quote_review_queue')
        .insert({
          created_by_email: owner,
          quote_text: quoteText,
          author: null,
          source_slug_or_url: slug || publicUrl || 'corpus-seed',
          source_type: 'article',
          is_internal: true,
          status: 'pending',
          source_url: publicUrl,
          source_name: 'Archetype Original (Internal)',
          source_title: q.source_title || null,
          source_excerpt: safeText(q.quote, 900),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      if (out.error) throw out.error;
      inserted += 1;
      if (out.data?.id) {
        try {
          await storeQuoteHash(hashed, out.data.id);
        } catch (_) {}
      }
    } catch (e) {
      const msg = String(e?.message || e || '');
      if (msg.includes('duplicate') || msg.includes('unique')) continue;
    }
  }

  return { ok: true, inserted, message: `Seeded ${inserted} internal inbox item(s) from corpus pull quotes.` };
}
