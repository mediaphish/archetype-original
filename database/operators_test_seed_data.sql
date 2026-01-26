-- Operators System - Test Seed Data
-- Run this SQL in your Supabase SQL Editor to create test data for comprehensive testing
-- This creates 35 Operators users with realistic states and 3 test events

-- ============================================================================
-- SEED USERS (35 Operators + 1 Accountant)
-- ============================================================================

-- Clean up any existing test data (optional - comment out if you want to keep existing data)
-- DELETE FROM operators_rsvps WHERE user_email LIKE 'operator%test.com';
-- DELETE FROM operators_candidates WHERE candidate_email LIKE 'operator%test.com';
-- DELETE FROM operators_users WHERE email LIKE 'operator%test.com';

-- Create 35 Operators with realistic states
-- 25 clean Operators (no offenses)
INSERT INTO operators_users (email, roles, card_status, card_count, owed_balance, benched_until)
VALUES
  ('operator01@test.com', ARRAY['operator'], 'none', 0, 0, NULL),
  ('operator02@test.com', ARRAY['operator'], 'none', 0, 0, NULL),
  ('operator03@test.com', ARRAY['operator'], 'none', 0, 0, NULL),
  ('operator04@test.com', ARRAY['operator'], 'none', 0, 0, NULL),
  ('operator05@test.com', ARRAY['operator'], 'none', 0, 0, NULL),
  ('operator06@test.com', ARRAY['operator'], 'none', 0, 0, NULL),
  ('operator07@test.com', ARRAY['operator'], 'none', 0, 0, NULL),
  ('operator08@test.com', ARRAY['operator'], 'none', 0, 0, NULL),
  ('operator09@test.com', ARRAY['operator'], 'none', 0, 0, NULL),
  ('operator10@test.com', ARRAY['operator'], 'none', 0, 0, NULL),
  ('operator11@test.com', ARRAY['operator'], 'none', 0, 0, NULL),
  ('operator12@test.com', ARRAY['operator'], 'none', 0, 0, NULL),
  ('operator13@test.com', ARRAY['operator'], 'none', 0, 0, NULL),
  ('operator14@test.com', ARRAY['operator'], 'none', 0, 0, NULL),
  ('operator15@test.com', ARRAY['operator'], 'none', 0, 0, NULL),
  ('operator16@test.com', ARRAY['operator'], 'none', 0, 0, NULL),
  ('operator17@test.com', ARRAY['operator'], 'none', 0, 0, NULL),
  ('operator18@test.com', ARRAY['operator'], 'none', 0, 0, NULL),
  ('operator19@test.com', ARRAY['operator'], 'none', 0, 0, NULL),
  ('operator20@test.com', ARRAY['operator'], 'none', 0, 0, NULL),
  ('operator21@test.com', ARRAY['operator'], 'none', 0, 0, NULL),
  ('operator22@test.com', ARRAY['operator'], 'none', 0, 0, NULL),
  ('operator23@test.com', ARRAY['operator'], 'none', 0, 0, NULL),
  ('operator24@test.com', ARRAY['operator'], 'none', 0, 0, NULL),
  ('operator25@test.com', ARRAY['operator'], 'none', 0, 0, NULL)
ON CONFLICT (email) DO UPDATE SET
  roles = EXCLUDED.roles,
  card_status = EXCLUDED.card_status,
  card_count = EXCLUDED.card_count,
  owed_balance = EXCLUDED.owed_balance,
  benched_until = EXCLUDED.benched_until;

-- 5 Operators with yellow card (1 offense)
INSERT INTO operators_users (email, roles, card_status, card_count, owed_balance, benched_until)
VALUES
  ('operator26@test.com', ARRAY['operator'], 'yellow', 1, 0, NULL),
  ('operator27@test.com', ARRAY['operator'], 'yellow', 1, 0, NULL),
  ('operator28@test.com', ARRAY['operator'], 'yellow', 1, 0, NULL),
  ('operator29@test.com', ARRAY['operator'], 'yellow', 1, 0, NULL),
  ('operator30@test.com', ARRAY['operator'], 'yellow', 1, 0, NULL)
ON CONFLICT (email) DO UPDATE SET
  roles = EXCLUDED.roles,
  card_status = EXCLUDED.card_status,
  card_count = EXCLUDED.card_count,
  owed_balance = EXCLUDED.owed_balance,
  benched_until = EXCLUDED.benched_until;

-- 3 Operators with orange card (2 offenses)
INSERT INTO operators_users (email, roles, card_status, card_count, owed_balance, benched_until)
VALUES
  ('operator31@test.com', ARRAY['operator'], 'orange', 2, 0, NULL),
  ('operator32@test.com', ARRAY['operator'], 'orange', 2, 0, NULL),
  ('operator33@test.com', ARRAY['operator'], 'orange', 2, 0, NULL)
ON CONFLICT (email) DO UPDATE SET
  roles = EXCLUDED.roles,
  card_status = EXCLUDED.card_status,
  card_count = EXCLUDED.card_count,
  owed_balance = EXCLUDED.owed_balance,
  benched_until = EXCLUDED.benched_until;

-- 2 Operators with red card and benched (3 offenses)
INSERT INTO operators_users (email, roles, card_status, card_count, owed_balance, benched_until)
VALUES
  ('operator34@test.com', ARRAY['operator'], 'red', 3, 120, (NOW() + INTERVAL '30 days')),
  ('operator35@test.com', ARRAY['operator'], 'red', 3, 120, (NOW() + INTERVAL '30 days'))
ON CONFLICT (email) DO UPDATE SET
  roles = EXCLUDED.roles,
  card_status = EXCLUDED.card_status,
  card_count = EXCLUDED.card_count,
  owed_balance = EXCLUDED.owed_balance,
  benched_until = EXCLUDED.benched_until;

-- Ensure bart@archetypeoriginal.com has all roles including accountant
INSERT INTO operators_users (email, roles, card_status, card_count, owed_balance, benched_until)
VALUES (
  'bart@archetypeoriginal.com',
  ARRAY['super_admin', 'chief_operator', 'operator', 'accountant'],
  'none',
  0,
  0,
  NULL
)
ON CONFLICT (email) DO UPDATE SET
  roles = ARRAY['super_admin', 'chief_operator', 'operator', 'accountant'],
  card_status = 'none',
  card_count = 0,
  owed_balance = 0,
  benched_until = NULL;

-- ============================================================================
-- SEED EVENTS (3 test events in different states)
-- ============================================================================

-- Event 1: LIVE event (for RSVP and waitlist testing)
-- This will be created via the UI, but here's the structure for reference:
-- Title: "March 2026 Operators Meeting"
-- Date: Future date (e.g., 30 days from now)
-- State: LIVE
-- Max Seats: 20
-- Stake: $120

-- Event 2: OPEN event (for voting and check-in testing)
-- This will be created via the UI and then opened
-- Title: "February 2026 Operators Meeting"  
-- Date: Today or recent past date
-- State: OPEN
-- Max Seats: 20
-- Stake: $120

-- Event 3: CLOSED event (for ROI and outcomes testing)
-- This will be created via the UI, opened, then closed
-- Title: "January 2026 Operators Meeting"
-- Date: Past date
-- State: CLOSED
-- Max Seats: 20
-- Stake: $120

-- Note: Events should be created through the UI to ensure proper host/sponsor data
-- This seed script focuses on user data only

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check user counts
SELECT 
  card_status,
  COUNT(*) as count
FROM operators_users
WHERE email LIKE 'operator%@test.com'
GROUP BY card_status
ORDER BY 
  CASE card_status
    WHEN 'none' THEN 1
    WHEN 'yellow' THEN 2
    WHEN 'orange' THEN 3
    WHEN 'red' THEN 4
  END;

-- Check bart's roles
SELECT email, roles, card_status 
FROM operators_users 
WHERE email = 'bart@archetypeoriginal.com';
