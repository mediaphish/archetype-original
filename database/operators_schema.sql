-- The Operators System - Database Schema
-- Run this SQL in your Supabase SQL Editor to create all tables, indexes, and functions

-- ============================================================================
-- TABLES
-- ============================================================================

-- Operators Users Table
CREATE TABLE IF NOT EXISTS operators_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  roles TEXT[] DEFAULT ARRAY[]::TEXT[],
  card_status TEXT NOT NULL DEFAULT 'none' CHECK (card_status IN ('none', 'yellow', 'orange', 'red')),
  card_count INTEGER NOT NULL DEFAULT 0,
  benched_until TIMESTAMPTZ,
  owed_balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
  loyalty_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_operators_users_email ON operators_users(email);
CREATE INDEX IF NOT EXISTS idx_operators_users_roles ON operators_users USING GIN(roles);
CREATE INDEX IF NOT EXISTS idx_operators_users_benched_until ON operators_users(benched_until) WHERE benched_until IS NOT NULL;

-- Operators Events Table
CREATE TABLE IF NOT EXISTS operators_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  event_date DATE NOT NULL,
  state TEXT NOT NULL DEFAULT 'LIVE' CHECK (state IN ('LIVE', 'OPEN', 'CLOSED')),
  stake_amount DECIMAL(10, 2) NOT NULL,
  max_seats INTEGER NOT NULL,
  sponsor_email TEXT,
  opened_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_sponsor_per_event UNIQUE (id, sponsor_email) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX IF NOT EXISTS idx_operators_events_state ON operators_events(state);
CREATE INDEX IF NOT EXISTS idx_operators_events_event_date ON operators_events(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_operators_events_created_by ON operators_events(created_by);

-- Operators RSVPs Table
CREATE TABLE IF NOT EXISTS operators_rsvps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES operators_events(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'waitlisted', 'no_show', 'attended')),
  checked_in_at TIMESTAMPTZ,
  checked_out_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_rsvp_per_event UNIQUE (event_id, user_email)
);

CREATE INDEX IF NOT EXISTS idx_operators_rsvps_event_id ON operators_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_operators_rsvps_user_email ON operators_rsvps(user_email);
CREATE INDEX IF NOT EXISTS idx_operators_rsvps_status ON operators_rsvps(status);

-- Operators Candidates Table
CREATE TABLE IF NOT EXISTS operators_candidates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES operators_events(id) ON DELETE CASCADE,
  candidate_email TEXT NOT NULL,
  invited_by_email TEXT NOT NULL,
  essay TEXT NOT NULL CHECK (char_length(essay) >= 200),
  contact_info TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'promoted')),
  approved_by_email TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_operators_candidates_event_id ON operators_candidates(event_id);
CREATE INDEX IF NOT EXISTS idx_operators_candidates_status ON operators_candidates(status);
CREATE INDEX IF NOT EXISTS idx_operators_candidates_candidate_email ON operators_candidates(candidate_email);

-- Operators Votes Table
CREATE TABLE IF NOT EXISTS operators_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES operators_events(id) ON DELETE CASCADE,
  voter_email TEXT NOT NULL,
  target_email TEXT NOT NULL,
  vote_value INTEGER NOT NULL CHECK (vote_value IN (-1, 1)),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT no_self_voting CHECK (voter_email != target_email)
);
-- Note: No unique constraint on (event_id, voter_email, target_email) to allow multiple votes per target
-- Users can vote multiple times for the same person (up to 10 total votes per event)

CREATE INDEX IF NOT EXISTS idx_operators_votes_event_id ON operators_votes(event_id);
CREATE INDEX IF NOT EXISTS idx_operators_votes_voter_email ON operators_votes(voter_email);
CREATE INDEX IF NOT EXISTS idx_operators_votes_target_email ON operators_votes(target_email);
CREATE INDEX IF NOT EXISTS idx_operators_votes_event_voter ON operators_votes(event_id, voter_email);

-- Operators Attendance Table
CREATE TABLE IF NOT EXISTS operators_attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES operators_events(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  checked_in BOOLEAN NOT NULL DEFAULT false,
  votes_used INTEGER NOT NULL DEFAULT 0 CHECK (votes_used >= 0 AND votes_used <= 10),
  present_until_close BOOLEAN NOT NULL DEFAULT false,
  marked_no_show BOOLEAN NOT NULL DEFAULT false,
  check_in_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_attendance_per_event UNIQUE (event_id, user_email)
);

CREATE INDEX IF NOT EXISTS idx_operators_attendance_event_id ON operators_attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_operators_attendance_user_email ON operators_attendance(user_email);

-- Computed column for attendance_counted (PostgreSQL doesn't support computed columns directly, so we'll use a function)
-- attendance_counted = checked_in AND votes_used = 10 AND present_until_close AND NOT marked_no_show

-- Operators Promotions Table
CREATE TABLE IF NOT EXISTS operators_promotions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES operators_events(id) ON DELETE CASCADE,
  candidate_email TEXT NOT NULL,
  yes_votes INTEGER NOT NULL DEFAULT 0,
  no_votes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_promotion_per_event UNIQUE (event_id, candidate_email)
);

CREATE INDEX IF NOT EXISTS idx_operators_promotions_event_id ON operators_promotions(event_id);
CREATE INDEX IF NOT EXISTS idx_operators_promotions_candidate_email ON operators_promotions(candidate_email);

-- Operators ROi Winners Table
CREATE TABLE IF NOT EXISTS operators_roi_winners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES operators_events(id) ON DELETE CASCADE,
  winner_email TEXT NOT NULL,
  net_score INTEGER NOT NULL,
  upvote_ratio DECIMAL(5, 4) NOT NULL,
  total_votes INTEGER NOT NULL,
  check_in_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_roi_per_event UNIQUE (event_id)
);

CREATE INDEX IF NOT EXISTS idx_operators_roi_winners_event_id ON operators_roi_winners(event_id);
CREATE INDEX IF NOT EXISTS idx_operators_roi_winners_winner_email ON operators_roi_winners(winner_email);

-- Operators Offenses Table
CREATE TABLE IF NOT EXISTS operators_offenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES operators_events(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  offense_type TEXT NOT NULL CHECK (offense_type IN ('no_show', 'early_departure')),
  recorded_by_email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_operators_offenses_event_id ON operators_offenses(event_id);
CREATE INDEX IF NOT EXISTS idx_operators_offenses_user_email ON operators_offenses(user_email);
CREATE INDEX IF NOT EXISTS idx_operators_offenses_created_at ON operators_offenses(created_at DESC);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function: Check if user is benched
CREATE OR REPLACE FUNCTION check_benched_status(user_email_param TEXT)
RETURNS TIMESTAMPTZ AS $$
DECLARE
  benched_date TIMESTAMPTZ;
BEGIN
  SELECT benched_until INTO benched_date
  FROM operators_users
  WHERE email = user_email_param;
  
  -- If benched_until is in the past or null, return null (not benched)
  IF benched_date IS NULL OR benched_date < NOW() THEN
    RETURN NULL;
  END IF;
  
  RETURN benched_date;
END;
$$ LANGUAGE plpgsql;

-- Function: Check vote exhaustion
CREATE OR REPLACE FUNCTION check_vote_exhaustion(event_id_param UUID, voter_email_param TEXT)
RETURNS INTEGER AS $$
DECLARE
  votes_used_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO votes_used_count
  FROM operators_votes
  WHERE event_id = event_id_param AND voter_email = voter_email_param;
  
  RETURN GREATEST(0, 10 - votes_used_count);
END;
$$ LANGUAGE plpgsql;

-- Function: Check attendance eligibility
CREATE OR REPLACE FUNCTION check_attendance_eligibility(event_id_param UUID, user_email_param TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  attendance_record RECORD;
  user_record RECORD;
BEGIN
  -- Get attendance record
  SELECT * INTO attendance_record
  FROM operators_attendance
  WHERE event_id = event_id_param AND user_email = user_email_param;
  
  -- If no attendance record, not eligible
  IF attendance_record IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check all conditions
  IF attendance_record.checked_in = true
     AND attendance_record.votes_used = 10
     AND attendance_record.present_until_close = true
     AND attendance_record.marked_no_show = false THEN
    
    -- Also check user status (no owed balance, not benched)
    SELECT * INTO user_record
    FROM operators_users
    WHERE email = user_email_param;
    
    IF user_record IS NULL THEN
      RETURN false;
    END IF;
    
    IF user_record.owed_balance > 0 THEN
      RETURN false;
    END IF;
    
    IF check_benched_status(user_email_param) IS NOT NULL THEN
      RETURN false;
    END IF;
    
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate ROi Winner (Deterministic)
CREATE OR REPLACE FUNCTION calculate_roi_winner(event_id_param UUID)
RETURNS TABLE (
  winner_email TEXT,
  net_score INTEGER,
  upvote_ratio DECIMAL,
  total_votes INTEGER,
  check_in_time TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH eligible_targets AS (
    SELECT DISTINCT
      a.user_email,
      a.check_in_time,
      COALESCE(SUM(CASE WHEN v.vote_value = 1 THEN 1 ELSE 0 END), 0)::INTEGER AS upvotes,
      COALESCE(SUM(CASE WHEN v.vote_value = -1 THEN 1 ELSE 0 END), 0)::INTEGER AS downvotes
    FROM operators_attendance a
    INNER JOIN operators_users u ON u.email = a.user_email
    LEFT JOIN operators_votes v ON v.event_id = a.event_id AND v.target_email = a.user_email
    WHERE a.event_id = event_id_param
      AND a.checked_in = true
      AND a.votes_used = 10
      AND a.present_until_close = true
      AND a.marked_no_show = false
      AND u.owed_balance = 0
      AND (u.benched_until IS NULL OR u.benched_until < NOW())
      AND (u.roles && ARRAY['operator', 'candidate']::TEXT[])
    GROUP BY a.user_email, a.check_in_time
  ),
  ranked_targets AS (
    SELECT
      user_email,
      check_in_time,
      (upvotes - downvotes) AS net_score,
      CASE 
        WHEN (upvotes + downvotes) > 0 
        THEN (upvotes::DECIMAL / (upvotes + downvotes)::DECIMAL)
        ELSE 0::DECIMAL
      END AS upvote_ratio,
      (upvotes + downvotes) AS total_votes
    FROM eligible_targets
    ORDER BY
      (upvotes - downvotes) DESC,  -- net_score DESC
      CASE 
        WHEN (upvotes + downvotes) > 0 
        THEN (upvotes::DECIMAL / (upvotes + downvotes)::DECIMAL)
        ELSE 0::DECIMAL
      END DESC,  -- upvote_ratio DESC
      (upvotes + downvotes) DESC,  -- total_votes DESC
      check_in_time ASC  -- earliest check-in
    LIMIT 1
  )
  SELECT
    rt.user_email,
    rt.net_score::INTEGER,
    rt.upvote_ratio,
    rt.total_votes::INTEGER,
    rt.check_in_time
  FROM ranked_targets rt;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_operators_users_updated_at
  BEFORE UPDATE ON operators_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_operators_events_updated_at
  BEFORE UPDATE ON operators_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_operators_attendance_updated_at
  BEFORE UPDATE ON operators_attendance
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Prevent edits to CLOSED events
CREATE OR REPLACE FUNCTION prevent_closed_event_edits()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.state = 'CLOSED' THEN
    RAISE EXCEPTION 'Cannot edit CLOSED events';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_operators_events_closed_edits
  BEFORE UPDATE ON operators_events
  FOR EACH ROW
  WHEN (OLD.state = 'CLOSED')
  EXECUTE FUNCTION prevent_closed_event_edits();

-- Trigger: Auto-progress card status on offense
CREATE OR REPLACE FUNCTION auto_progress_card_status()
RETURNS TRIGGER AS $$
DECLARE
  current_card_count INTEGER;
  new_card_status TEXT;
  bench_date TIMESTAMPTZ;
BEGIN
  -- Get current card count
  SELECT card_count INTO current_card_count
  FROM operators_users
  WHERE email = NEW.user_email;
  
  -- Increment card count
  current_card_count := current_card_count + 1;
  
  -- Determine new card status
  IF current_card_count = 1 THEN
    new_card_status := 'yellow';
    bench_date := NULL;
  ELSIF current_card_count = 2 THEN
    new_card_status := 'orange';
    bench_date := NULL;
  ELSIF current_card_count >= 3 THEN
    new_card_status := 'red';
    bench_date := NOW() + INTERVAL '3 months';
  END IF;
  
  -- Update user's card status and bench
  UPDATE operators_users
  SET 
    card_status = new_card_status,
    card_count = current_card_count,
    benched_until = bench_date,
    updated_at = NOW()
  WHERE email = NEW.user_email;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_progress_card_on_offense
  AFTER INSERT ON operators_offenses
  FOR EACH ROW
  EXECUTE FUNCTION auto_progress_card_status();

-- Trigger: Create owed balance on no-show
CREATE OR REPLACE FUNCTION create_owed_balance_on_no_show()
RETURNS TRIGGER AS $$
DECLARE
  event_stake DECIMAL;
BEGIN
  IF NEW.offense_type = 'no_show' THEN
    -- Get event stake amount
    SELECT stake_amount INTO event_stake
    FROM operators_events
    WHERE id = NEW.event_id;
    
    -- Add to user's owed balance
    UPDATE operators_users
    SET 
      owed_balance = owed_balance + event_stake,
      updated_at = NOW()
    WHERE email = NEW.user_email;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_owed_on_no_show
  AFTER INSERT ON operators_offenses
  FOR EACH ROW
  WHEN (NEW.offense_type = 'no_show')
  EXECUTE FUNCTION create_owed_balance_on_no_show();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE operators_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE operators_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE operators_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE operators_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE operators_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE operators_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE operators_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE operators_roi_winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE operators_offenses ENABLE ROW LEVEL SECURITY;

-- Policies: Service role has full access (for API)
CREATE POLICY "Service role full access - operators_users"
  ON operators_users FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access - operators_events"
  ON operators_events FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access - operators_rsvps"
  ON operators_rsvps FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access - operators_candidates"
  ON operators_candidates FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access - operators_votes"
  ON operators_votes FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access - operators_attendance"
  ON operators_attendance FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access - operators_promotions"
  ON operators_promotions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access - operators_roi_winners"
  ON operators_roi_winners FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access - operators_offenses"
  ON operators_offenses FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
