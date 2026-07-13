-- Vector corpus embeddings for Archetype Original.
-- Run in Supabase SQL editor (extension + table + search RPC).
-- pgvector must be available on the project.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS ao_corpus_embeddings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL,
  title text NOT NULL,
  doc_type text NOT NULL DEFAULT 'journal-post',
  categories text[] DEFAULT '{}',
  summary text DEFAULT '',
  body_preview text DEFAULT '',
  embedding vector(1536) NOT NULL,
  token_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(slug)
);

CREATE INDEX IF NOT EXISTS ao_corpus_embeddings_embedding_idx
  ON ao_corpus_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 50);

CREATE INDEX IF NOT EXISTS ao_corpus_embeddings_slug_idx
  ON ao_corpus_embeddings (slug);

CREATE INDEX IF NOT EXISTS ao_corpus_embeddings_type_idx
  ON ao_corpus_embeddings (doc_type);

CREATE OR REPLACE FUNCTION search_corpus_embeddings(
  query_embedding vector(1536),
  similarity_threshold float DEFAULT 0.3,
  max_results int DEFAULT 50
)
RETURNS TABLE (
  slug text,
  title text,
  doc_type text,
  categories text[],
  summary text,
  body_preview text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.slug,
    e.title,
    e.doc_type,
    e.categories,
    e.summary,
    e.body_preview,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM ao_corpus_embeddings e
  WHERE 1 - (e.embedding <=> query_embedding) > similarity_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT max_results;
END;
$$;
