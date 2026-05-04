-- Schema for storing unanswered questions and feedback
-- Run this in your Supabase SQL editor to create the table

CREATE TABLE IF NOT EXISTS unanswered_questions (
  id BIGSERIAL PRIMARY KEY,
  question_id TEXT UNIQUE NOT NULL,
  question TEXT NOT NULL,
  session_id TEXT,
  name TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  feedback TEXT CHECK (feedback IN ('valuable', 'not_valuable')),
  is_valuable BOOLEAN,
  feedback_at TIMESTAMPTZ
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_unanswered_questions_question_id ON unanswered_questions(question_id);
CREATE INDEX IF NOT EXISTS idx_unanswered_questions_feedback ON unanswered_questions(feedback);
CREATE INDEX IF NOT EXISTS idx_unanswered_questions_created_at ON unanswered_questions(created_at DESC);

-- Enable Row Level Security (optional - adjust based on your needs)
ALTER TABLE unanswered_questions ENABLE ROW LEVEL SECURITY;

-- Policy to allow service role to read/write (for API access)
CREATE POLICY "Service role can manage unanswered_questions"
  ON unanswered_questions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

