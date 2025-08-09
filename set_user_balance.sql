-- Set balance for user gfghg1817@gmail.com to $10 USD
-- Run this in your Supabase SQL Editor

-- First, let's find the user ID for the email
-- (This is a helper query to see the user ID - you can run this first to verify)
SELECT id, email FROM auth.users WHERE email = 'gfghg1817@gmail.com';

-- Set the balance to $10 USD for user gfghg1817@gmail.com
-- This will either insert a new balance record or update existing one
INSERT INTO public.user_balances (user_id, balance, currency)
SELECT 
    id as user_id,
    10.00 as balance,
    'USD' as currency
FROM auth.users 
WHERE email = 'gfghg1817@gmail.com'
ON CONFLICT (user_id, currency) 
DO UPDATE SET 
    balance = 10.00,
    updated_at = timezone('utc'::text, now());

-- Verify the balance was set correctly
SELECT 
    ub.balance,
    ub.currency,
    ub.created_at,
    ub.updated_at,
    u.email
FROM public.user_balances ub
JOIN auth.users u ON ub.user_id = u.id
WHERE u.email = 'gfghg1817@gmail.com';

-- Optional: Check if the credit function works
-- SELECT * FROM public.credit_user_balance(
--     (SELECT id FROM auth.users WHERE email = 'gfghg1817@gmail.com'),
--     5.00,
--     'USD'
-- );