-- Chunked corpus embeddings for Archetype Original.
-- Run in Supabase SQL editor. pgvector must be available (project is on 0.8.0).
--
-- Why this exists, alongside ao_corpus_embeddings:
--   ao_corpus_embeddings stores ONE row per document, and the text it hands
--   back at query time (body_preview) is capped at 3000 characters. Retrieval
--   could find any document but only ever returned its opening — measured
--   2026-08-20, that left 50.9% of the corpus findable and unreadable.
--
--   This table stores one row per PASSAGE, with the passage text stored whole.
--   Search returns the part of the document that actually answers the question.
--
-- ao_corpus_embeddings is intentionally left in place and untouched: Auto reads
-- it via lib/ao/corpusEmbeddings.js. Callers move over one at a time.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS ao_corpus_chunks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL,
  chunk_index integer NOT NULL,
  title text NOT NULL,
  doc_type text NOT NULL DEFAULT 'journal-post',
  categories text[] DEFAULT '{}',
  summary text DEFAULT '',
  content text NOT NULL,
  embedding vector(1536) NOT NULL,
  token_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (slug, chunk_index)
);

-- HNSW gives better recall than ivfflat and needs no list tuning as the corpus
-- grows. Available from pgvector 0.5.0.
CREATE INDEX IF NOT EXISTS ao_corpus_chunks_embedding_idx
  ON ao_corpus_chunks
  USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS ao_corpus_chunks_slug_idx
  ON ao_corpus_chunks (slug);

CREATE INDEX IF NOT EXISTS ao_corpus_chunks_type_idx
  ON ao_corpus_chunks (doc_type);

-- Semantic search over passages.
--
-- max_per_doc keeps one long essay from filling every slot: without it, a
-- 120-chunk document can crowd out every other source for a broad question.
CREATE OR REPLACE FUNCTION search_corpus_chunks(
  query_embedding vector(1536),
  similarity_threshold float DEFAULT 0.3,
  max_results int DEFAULT 12,
  max_per_doc int DEFAULT 3
)
RETURNS TABLE (
  slug text,
  chunk_index integer,
  title text,
  doc_type text,
  categories text[],
  summary text,
  content text,
  similarity float
)
LANGUAGE sql
STABLE
AS $$
  WITH scored AS (
    SELECT
      c.slug,
      c.chunk_index,
      c.title,
      c.doc_type,
      c.categories,
      c.summary,
      c.content,
      1 - (c.embedding <=> query_embedding) AS similarity
    FROM ao_corpus_chunks c
    WHERE 1 - (c.embedding <=> query_embedding) > similarity_threshold
    ORDER BY c.embedding <=> query_embedding
    LIMIT GREATEST(max_results * 8, 64)
  ),
  ranked AS (
    SELECT
      scored.*,
      row_number() OVER (PARTITION BY scored.slug ORDER BY scored.similarity DESC) AS rn
    FROM scored
  )
  SELECT
    ranked.slug,
    ranked.chunk_index,
    ranked.title,
    ranked.doc_type,
    ranked.categories,
    ranked.summary,
    ranked.content,
    ranked.similarity
  FROM ranked
  WHERE ranked.rn <= max_per_doc
  ORDER BY ranked.similarity DESC
  LIMIT max_results;
$$;
