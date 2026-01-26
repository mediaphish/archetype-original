-- Verify Operators Test Seed Data
-- Run this in Supabase SQL Editor to check if all test users were created

-- Check total test users created
SELECT 
  COUNT(*) as total_test_users,
  COUNT(CASE WHEN card_status = 'none' THEN 1 END) as clean_users,
  COUNT(CASE WHEN card_status = 'yellow' THEN 1 END) as yellow_card_users,
  COUNT(CASE WHEN card_status = 'orange' THEN 1 END) as orange_card_users,
  COUNT(CASE WHEN card_status = 'red' THEN 1 END) as red_card_users
FROM operators_users
WHERE email LIKE 'operator%@test.com';

-- List all test users with their status
SELECT 
  email,
  roles,
  card_status,
  card_count,
  owed_balance,
  benched_until IS NOT NULL as is_benched
FROM operators_users
WHERE email LIKE 'operator%@test.com'
ORDER BY 
  CASE card_status
    WHEN 'none' THEN 1
    WHEN 'yellow' THEN 2
    WHEN 'orange' THEN 3
    WHEN 'red' THEN 4
  END,
  email;

-- Verify bart@archetypeoriginal.com
SELECT 
  email,
  roles,
  card_status,
  card_count,
  owed_balance
FROM operators_users
WHERE email = 'bart@archetypeoriginal.com';
