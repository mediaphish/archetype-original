-- Operators System - Cleanup Test Data
-- Run this in Supabase SQL Editor to remove all test data before launch
-- WARNING: This will permanently delete test data. Review carefully before executing.

-- ============================================================================
-- STEP 1: Delete test data from child tables (respecting foreign keys)
-- ============================================================================

-- Delete test votes (votes by or for test users)
DELETE FROM operators_votes
WHERE voter_email LIKE '%@test.com'
   OR target_email LIKE '%@test.com';

-- Delete test attendance records
DELETE FROM operators_attendance
WHERE user_email LIKE '%@test.com';

-- Delete test offenses (offenses by or for test users)
DELETE FROM operators_offenses
WHERE user_email LIKE '%@test.com'
   OR recorded_by_email LIKE '%@test.com';

-- Delete test promotions
DELETE FROM operators_promotions
WHERE candidate_email LIKE '%@test.com';

-- Delete test ROI winners (if any test users won)
DELETE FROM operators_roi_winners
WHERE winner_email LIKE '%@test.com';

-- Delete test candidates
DELETE FROM operators_candidates
WHERE candidate_email LIKE '%@test.com'
   OR invited_by_email LIKE '%@test.com';

-- Delete test RSVPs
DELETE FROM operators_rsvps
WHERE user_email LIKE '%@test.com';

-- ============================================================================
-- STEP 2: Delete test events (this will cascade delete related data)
-- ============================================================================

-- Delete test events (identified by title patterns)
-- Adjust these patterns based on your actual test event names
DELETE FROM operators_events
WHERE title LIKE '%Test%'
   OR title LIKE '%January 2026 Operators Meeting%'
   OR title LIKE '%February 2026 Operators Meeting%'
   OR title LIKE '%March 2026 Operators Meeting%'
   OR created_by LIKE '%@test.com';

-- ============================================================================
-- STEP 3: Delete test users
-- ============================================================================

-- Delete test Operators (operator##@test.com)
DELETE FROM operators_users
WHERE email LIKE 'operator%@test.com';

-- Delete test Candidates (candidate##@test.com)
DELETE FROM operators_users
WHERE email LIKE 'candidate%@test.com';

-- ============================================================================
-- STEP 4: Verify cleanup
-- ============================================================================

-- Check remaining test users (should return 0 rows)
SELECT COUNT(*) as remaining_test_users
FROM operators_users
WHERE email LIKE '%@test.com';

-- Check remaining test events (should return 0 rows)
SELECT COUNT(*) as remaining_test_events
FROM operators_events
WHERE title LIKE '%Test%'
   OR title LIKE '%January 2026 Operators Meeting%'
   OR title LIKE '%February 2026 Operators Meeting%'
   OR title LIKE '%March 2026 Operators Meeting%';

-- Check remaining test RSVPs (should return 0 rows)
SELECT COUNT(*) as remaining_test_rsvps
FROM operators_rsvps
WHERE user_email LIKE '%@test.com';

-- Check remaining test candidates (should return 0 rows)
SELECT COUNT(*) as remaining_test_candidates
FROM operators_candidates
WHERE candidate_email LIKE '%@test.com'
   OR invited_by_email LIKE '%@test.com';

-- Verify bart@archetypeoriginal.com is preserved
SELECT email, roles, card_status
FROM operators_users
WHERE email = 'bart@archetypeoriginal.com';
