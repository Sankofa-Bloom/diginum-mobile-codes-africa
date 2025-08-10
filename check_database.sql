-- Check what's actually in the database
-- Run this to see current state

-- Check all users with email gfghg1817@gmail.com
SELECT 'All users with this email:' as info;
SELECT id, email, created_at FROM auth.users WHERE email = 'gfghg1817@gmail.com';

-- Check all balance records
SELECT 'All balance records:' as info;
SELECT ub.*, u.email 
FROM public.user_balances ub 
LEFT JOIN auth.users u ON ub.user_id = u.id;

-- Check if the specific user ID has a balance
SELECT 'Balance for user ID 927331fc-37ad-4e18-85c1-0b13ee5cf9ef:' as info;
SELECT * FROM public.user_balances WHERE user_id = '927331fc-37ad-4e18-85c1-0b13ee5cf9ef';

-- Quick fix: Set balance for this specific user
INSERT INTO public.user_balances (user_id, balance, currency)
VALUES ('927331fc-37ad-4e18-85c1-0b13ee5cf9ef', 10.00, 'USD')
ON CONFLICT (user_id, currency) 
DO UPDATE SET balance = 10.00;

-- Verify it worked
SELECT 'After setting balance:' as info;
SELECT * FROM public.user_balances WHERE user_id = '927331fc-37ad-4e18-85c1-0b13ee5cf9ef';