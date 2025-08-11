-- Verify Database Setup
-- Run this after recreating the database

-- Check if all tables exist
SELECT 
    table_name,
    'EXISTS' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'exchange_rates',
    'price_adjustments', 
    'user_balances',
    'add_funds_payments',
    'payment_transactions'
)
ORDER BY table_name;

-- Check user balance
SELECT 
    'USER BALANCE CHECK' as check_type,
    ub.user_id,
    ub.balance,
    ub.currency,
    ub.created_at,
    ub.updated_at
FROM public.user_balances ub
WHERE ub.user_id = '927331fc-37ad-4e18-85c1-0b13ee5cf9ef';

-- Check exchange rates (should have 30 currencies)
SELECT 
    'EXCHANGE RATES COUNT' as check_type,
    COUNT(*) as total_currencies,
    'Expected: 30' as expected
FROM public.exchange_rates;

-- Check RLS policies
SELECT 
    'RLS POLICIES' as check_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check functions
SELECT 
    'FUNCTIONS' as check_type,
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name IN (
    'credit_user_balance',
    'update_user_balance',
    'handle_payment_success'
)
ORDER BY routine_name;

-- Check triggers
SELECT 
    'TRIGGERS' as check_type,
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name; 