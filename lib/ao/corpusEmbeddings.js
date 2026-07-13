/**
 * Corpus embedding library for Archetype Original.
 *
 * Handles:
 * - Generating embeddings for corpus documents using OpenAI text-embedding-3-small
 * - Storing embeddings in ao_corpus_embeddings via Supabase pgvector
 * - Semantic search across the full corpus
 * - Building a compact frontmatter index of all documents
 *
 * This replaces the keyword-based CORPUS_DOCS_TO_LOAD = 8 approach entirely.
 * The corpus is now a real vector database. All 350,000+ words are searchable.
 * At 1 million words the architecture does not change.
 */

import { supabaseAdmin } from '../supabase-admin.js';

const OPENAI_EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;
const SIMILARITY_THRESHOLD = 0.3; // Minimum cosine similarity to include a document
const MAX_SEMANTIC_RESULTS = 40; // Maximum documents returned from semantic search
const BODY_PREVIEW_CHARS = 3000; // Full text chars per document in semantic results
const FRONTMATTER_SUMMARY_CHARS = 150; // Summary chars in the always-on index

/**
 * Generate an embedding vector for a text string using OpenAI.
 * Returns null on failure — never throws.
 */
export async function generateEmbedding(text) {
  if (!text || !text.trim()) return null;

  const apiKey = process.env.OPENAI_API_KEY || process.env.OPEN_API_KEY;
  if (!apiKey) {
    console.error('[corpusEmbeddings] No OpenAI API key found');
    return null;
  }

  try {
    // Truncate to ~8000 tokens (approx 32000 chars) to stay within embedding limits
    const truncated = text.slice(0, 32000);

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_EMBEDDING_MODEL,
        input: truncated,
        dimensions: EMBEDDING_DIMENSIONS,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[corpusEmbeddings] OpenAI embedding failed:', response.status, err.slice(0, 200));
      return null;
    }

    const data = await response.json();
    return data.data?.[0]?.embedding || null;
  } catch (err) {
    console.error('[corpusEmbeddings] generateEmbedding error:', err?.message || err);
    return null;
  }
}

/**
 * Embed a single corpus document and upsert it into ao_corpus_embeddings.
 * The text that gets embedded is: title + summary + full body.
 * This maximizes semantic retrieval accuracy.
 *
 * Returns true on success, false on failure.
 */
export async function embedAndStoreDocument(doc) {
  if (!doc || !doc.slug) return false;

  const slug = String(doc.slug || '').trim();
  const title = String(doc.title || slug).trim();
  const summary = String(doc.summary || '').trim();
  const body = String(doc.body || '').trim();
  const docType = String(doc.type || 'journal-post').toLowerCase();
  const categories = Array.isArray(doc.categories)
    ? doc.categories.map(String)
    : Array.isArray(doc.tags)
      ? doc.tags.map(String)
      : [];

  // Build the text to embed: title gets extra weight by repetition
  const textToEmbed = [
    `Title: ${title}`,
    `Title: ${title}`, // repeat for weight
    summary ? `Summary: ${summary}` : '',
    body,
  ]
    .filter(Boolean)
    .join('\n\n');

  if (textToEmbed.length < 20) return false;

  const embedding = await generateEmbedding(textToEmbed);
  if (!embedding) return false;

  const bodyPreview = body.slice(0, BODY_PREVIEW_CHARS);
  const estimatedTokens = Math.ceil(textToEmbed.length / 4);

  try {
    const { error } = await supabaseAdmin.from('ao_corpus_embeddings').upsert(
      {
        slug,
        title,
        doc_type: docType,
        categories,
        summary: summary.slice(0, 500),
        body_preview: bodyPreview,
        embedding,
        token_count: estimatedTokens,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'slug',
        ignoreDuplicates: false,
      }
    );

    if (error) {
      console.error(`[corpusEmbeddings] Upsert failed for ${slug}:`, error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error(`[corpusEmbeddings] embedAndStoreDocument error for ${slug}:`, err?.message || err);
    return false;
  }
}

/**
 * Semantic search across the full corpus using pgvector.
 * Returns documents above the similarity threshold, ordered by relevance.
 * No arbitrary document count cap — returns everything above the threshold
 * up to MAX_SEMANTIC_RESULTS.
 *
 * Returns array of { slug, title, doc_type, categories, summary, body_preview, similarity }
 * Returns empty array on failure.
 */
export async function searchCorpus(queryText, options = {}) {
  if (!queryText || !queryText.trim()) return [];

  const threshold = options.threshold || SIMILARITY_THRESHOLD;
  const maxResults = options.maxResults || MAX_SEMANTIC_RESULTS;

  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(queryText);
  if (!queryEmbedding) {
    console.warn('[corpusEmbeddings] Could not generate query embedding — falling back to empty');
    return [];
  }

  try {
    const { data, error } = await supabaseAdmin.rpc('search_corpus_embeddings', {
      query_embedding: queryEmbedding,
      similarity_threshold: threshold,
      max_results: maxResults,
    });

    if (error) {
      console.error('[corpusEmbeddings] Search RPC failed:', error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('[corpusEmbeddings] searchCorpus error:', err?.message || err);
    return [];
  }
}

/**
 * Build a compact frontmatter index of ALL documents in the corpus.
 * This is always injected into Auto's system prompt regardless of query.
 * It gives Auto awareness of everything that exists so it can tell Bart
 * accurately what has been written on any topic.
 *
 * Source: ao_corpus_embeddings table (all rows, no embedding column).
 * Falls back to knowledge.json if table is empty.
 */
export async function buildCorpusFrontmatterIndex() {
  try {
    const { data: allDocs, error } = await supabaseAdmin
      .from('ao_corpus_embeddings')
      .select('slug, title, doc_type, categories, summary')
      .order('doc_type', { ascending: true })
      .order('title', { ascending: true });

    if (error || !allDocs || allDocs.length === 0) {
      return ''; // Will fall back to knowledge.json index in loadCorpusContext
    }

    // Group by doc_type
    const byType = {};
    for (const doc of allDocs) {
      const type = String(doc.doc_type || 'other').toLowerCase();
      if (!byType[type]) byType[type] = [];
      byType[type].push(doc);
    }

    const TYPE_ORDER = [
      'journal-post',
      'chapter',
      'preface',
      'book',
      'devotional',
      'article',
      'culture-science',
      'faq',
      'other',
    ];
    const TYPE_LABELS = {
      'journal-post': 'Journal Posts',
      chapter: 'Book Chapters',
      preface: 'Book Prefaces',
      book: 'Books',
      devotional: 'Devotionals',
      article: 'Articles',
      'culture-science': 'Culture Science',
      faq: 'FAQs',
      other: 'Other',
    };

    const indexLines = [];

    for (const type of TYPE_ORDER) {
      const group = byType[type];
      if (!group || group.length === 0) continue;

      indexLines.push(`\n**${TYPE_LABELS[type] || type} (${group.length})**`);

      for (const doc of group) {
        const slug = String(doc.slug || '').trim();
        const title = String(doc.title || slug || 'Untitled').trim();
        const summary = String(doc.summary || '').trim().slice(0, FRONTMATTER_SUMMARY_CHARS);
        const cats = Array.isArray(doc.categories) ? doc.categories.slice(0, 5).join(', ') : '';
        const catStr = cats ? ` [${cats}]` : '';
        const summaryStr = summary
          ? ` — ${summary}${summary.length >= FRONTMATTER_SUMMARY_CHARS ? '...' : ''}`
          : '';
        indexLines.push(`- **${title}** (${slug})${catStr}${summaryStr}`);
      }
    }

    return `## FULL CORPUS INDEX — ${allDocs.length} DOCUMENTS

Auto has full awareness of everything in the corpus. When Bart asks what has been written on any topic, check this index. When a document is relevant to the current work, its full text is in the SEMANTICALLY RETRIEVED DOCUMENTS section below.

${indexLines.join('\n')}`;
  } catch (err) {
    console.error('[corpusEmbeddings] buildCorpusFrontmatterIndex error:', err?.message || err);
    return '';
  }
}

/**
 * Seed the vector database from knowledge.json.
 * Called by the seeding script. Not used in the live request path.
 * Processes all documents and embeds them with rate limiting.
 */
export async function seedCorpusFromKnowledgeJson(knowledgeDocs, options = {}) {
  const { batchSize = 5, delayMs = 200, onProgress } = options;

  if (!knowledgeDocs || knowledgeDocs.length === 0) {
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  // Process in batches to avoid rate limits
  for (let i = 0; i < knowledgeDocs.length; i += batchSize) {
    const batch = knowledgeDocs.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (doc) => {
        processed++;
        const ok = await embedAndStoreDocument(doc);
        if (ok) {
          succeeded++;
        } else {
          failed++;
          console.warn(`[seedCorpus] Failed to embed: ${doc.slug || doc.title}`);
        }
      })
    );

    if (onProgress) {
      onProgress({ processed, succeeded, failed, total: knowledgeDocs.length });
    }

    // Rate limit delay between batches
    if (i + batchSize < knowledgeDocs.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return { processed, succeeded, failed };
}
