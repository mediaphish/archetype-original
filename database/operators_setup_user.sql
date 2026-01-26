-- Setup Operators User for bart@archetypeoriginal.com
-- Run this in Supabase SQL Editor

-- Check if user exists
SELECT email, roles, card_status, owed_balance, benched_until 
FROM operators_users 
WHERE email = 'bart@archetypeoriginal.com';

-- Insert or update user with all roles
INSERT INTO operators_users (email, roles, card_status, owed_balance, benched_until)
VALUES (
  'bart@archetypeoriginal.com',
  ARRAY['super_admin', 'chief_operator', 'operator', 'accountant'],
  'none',
  0,
  NULL
)
ON CONFLICT (email) 
DO UPDATE SET 
  roles = ARRAY['super_admin', 'chief_operator', 'operator', 'accountant'],
  card_status = 'none',
  owed_balance = 0,
  benched_until = NULL;

-- Verify the update
SELECT email, roles, card_status, owed_balance, benched_until 
FROM operators_users 
WHERE email = 'bart@archetypeoriginal.com';
