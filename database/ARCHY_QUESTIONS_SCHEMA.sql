-- Schema for logging all questions asked to Archy for corpus building
-- Run this in your Supabase SQL editor to create the table

CREATE TABLE IF NOT EXISTS archy_questions (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT,
  question TEXT NOT NULL,
  response TEXT,
  context TEXT, -- page context (home, methods, philosophy, etc.)
  knowledge_docs_used TEXT[], -- array of document titles used
  knowledge_docs_count INTEGER DEFAULT 0,
  response_length INTEGER, -- length of response in characters
  was_answered BOOLEAN DEFAULT true, -- false if Archy couldn't answer
  is_valuable BOOLEAN, -- null until assessed
  topic_category TEXT, -- extracted topic (leadership, culture, consulting, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  response_time_ms INTEGER -- time to generate response
);

-- Create indexes for analysis
CREATE INDEX IF NOT EXISTS idx_archy_questions_session_id ON archy_questions(session_id);
CREATE INDEX IF NOT EXISTS idx_archy_questions_was_answered ON archy_questions(was_answered);
CREATE INDEX IF NOT EXISTS idx_archy_questions_is_valuable ON archy_questions(is_valuable);
CREATE INDEX IF NOT EXISTS idx_archy_questions_topic_category ON archy_questions(topic_category);
CREATE INDEX IF NOT EXISTS idx_archy_questions_created_at ON archy_questions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_archy_questions_context ON archy_questions(context);

-- Enable Row Level Security
ALTER TABLE archy_questions ENABLE ROW LEVEL SECURITY;

-- Policy to allow service role to read/write
CREATE POLICY "Service role can manage archy_questions"
  ON archy_questions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

