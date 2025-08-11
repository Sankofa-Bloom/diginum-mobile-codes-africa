-- Drop Database Completely
-- WARNING: This will delete ALL data and tables!

-- Drop all tables if they exist (using IF EXISTS to avoid errors)
-- This approach is safer and won't fail if tables don't exist

-- Drop tables in dependency order (child tables first)
DROP TABLE IF EXISTS public.payment_transactions CASCADE;
DROP TABLE IF EXISTS public.add_funds_payments CASCADE;
DROP TABLE IF EXISTS public.user_balances CASCADE;
DROP TABLE IF EXISTS public.price_adjustments CASCADE;
DROP TABLE IF EXISTS public.exchange_rates CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.payments_fapshi CASCADE;
DROP TABLE IF EXISTS public.payments_stripe CASCADE;

-- Also try to drop any other tables that might exist
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE 'pg_%') LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END $$;

-- Drop all functions if they exist
DROP FUNCTION IF EXISTS public.credit_user_balance(character varying, numeric, character varying) CASCADE;
DROP FUNCTION IF EXISTS public.update_user_balance() CASCADE;
DROP FUNCTION IF EXISTS public.handle_payment_success() CASCADE;

-- Drop all triggers if they exist
DROP TRIGGER IF EXISTS update_user_balance_trigger ON public.payment_transactions;
DROP TRIGGER IF EXISTS handle_payment_success_trigger ON public.payment_transactions;

-- Drop all sequences if they exist
DROP SEQUENCE IF EXISTS public.payment_transactions_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.add_funds_payments_id_seq CASCADE;

-- Reset any custom types if they exist
-- (Supabase handles auth.users table automatically)

-- Verify tables are dropped
SELECT 'Tables dropped successfully' as status;

-- Show what tables remain (should be empty)
SELECT 
    'Remaining tables' as check_type,
    tablename,
    'Still exists' as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename NOT LIKE 'pg_%'
ORDER BY tablename; 