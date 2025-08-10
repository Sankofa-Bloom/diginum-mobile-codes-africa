-- Fix balance for the correct user ID
-- Run this in Supabase SQL Editor

-- First, let's see what user IDs exist and their balances
SELECT 'Current user balances:' as info;
SELECT u.email, u.id as user_id, ub.balance, ub.currency 
FROM auth.users u
LEFT JOIN public.user_balances ub ON u.id = ub.user_id
WHERE u.email = 'gfghg1817@gmail.com';

-- Set balance for the specific user ID we found in the logs
INSERT INTO public.user_balances (user_id, balance, currency)
VALUES ('927331fc-37ad-4e18-85c1-0b13ee5cf9ef', 10.00, 'USD')
ON CONFLICT (user_id, currency) 
DO UPDATE SET 
    balance = 10.00,
    updated_at = timezone('utc'::text, now());

-- Also set for the email-based lookup (fallback)
INSERT INTO public.user_balances (user_id, balance, currency)
SELECT id, 10.00, 'USD' FROM auth.users WHERE email = 'gfghg1817@gmail.com'
ON CONFLICT (user_id, currency) 
DO UPDATE SET 
    balance = 10.00,
    updated_at = timezone('utc'::text, now());

-- Verify the balance is now set correctly
SELECT 'Updated balance:' as info;
SELECT u.email, u.id as user_id, ub.balance, ub.currency, ub.updated_at
FROM auth.users u
LEFT JOIN public.user_balances ub ON u.id = ub.user_id
WHERE u.email = 'gfghg1817@gmail.com' OR u.id = '927331fc-37ad-4e18-85c1-0b13ee5cf9ef';

SELECT 'SUCCESS: Balance set to $10 for user 927331fc-37ad-4e18-85c1-0b13ee5cf9ef' as result;