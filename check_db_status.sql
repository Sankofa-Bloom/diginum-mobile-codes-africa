-- Check Database Status for DigiNum
-- Run this first to see what's already in your database

-- Check which tables exist
SELECT 
    required_tables.table_name,
    CASE 
        WHEN existing_tables.table_name IS NOT NULL THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM (
    VALUES 
        ('orders'),
        ('user_balances'), 
        ('payments'),
        ('add_funds_payments')
) AS required_tables(table_name)
LEFT JOIN information_schema.tables existing_tables 
    ON existing_tables.table_name = required_tables.table_name 
    AND existing_tables.table_schema = 'public';

-- Check which RLS policies exist
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('orders', 'user_balances', 'payments', 'add_funds_payments')
ORDER BY tablename, policyname;

-- Check table row counts (if tables exist)
DO $$
DECLARE
    table_name TEXT;
    row_count BIGINT;
BEGIN
    FOR table_name IN 
        SELECT unnest(ARRAY['orders', 'user_balances', 'payments', 'add_funds_payments'])
    LOOP
        BEGIN
            EXECUTE format('SELECT COUNT(*) FROM public.%I', table_name) INTO row_count;
            RAISE NOTICE 'Table %: % rows', table_name, row_count;
        EXCEPTION WHEN undefined_table THEN
            RAISE NOTICE 'Table %: DOES NOT EXIST', table_name;
        END;
    END LOOP;
END $$;
