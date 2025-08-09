-- Test Balance System for gfghg1817@gmail.com
-- Run this to test if the balance system is working

-- 1. Check if user exists
SELECT 'User Check:' as step, id, email FROM auth.users WHERE email = 'gfghg1817@gmail.com';

-- 2. Check current balance
SELECT 'Current Balance:' as step, balance, currency FROM public.user_balances ub
JOIN auth.users u ON ub.user_id = u.id
WHERE u.email = 'gfghg1817@gmail.com';

-- 3. Test credit function (add $5)
SELECT 'Testing Credit Function:' as step, * FROM public.credit_user_balance(
    (SELECT id FROM auth.users WHERE email = 'gfghg1817@gmail.com'),
    5.00,
    'USD'
);

-- 4. Check balance after credit
SELECT 'Balance After Credit:' as step, balance, currency FROM public.user_balances ub
JOIN auth.users u ON ub.user_id = u.id
WHERE u.email = 'gfghg1817@gmail.com';

-- 5. Check table permissions
SELECT 'Table Permissions:' as step, 
       schemaname, tablename, tableowner, hasindexes, hasrules, hastriggers
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('user_balances', 'payment_transactions');