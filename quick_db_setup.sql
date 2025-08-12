-- Quick Database Setup for DigiNum
-- Run this in Supabase SQL Editor to fix the missing tables error

-- Check which tables already exist
DO $$
DECLARE
    table_exists BOOLEAN;
    missing_tables TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Check orders table
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'orders'
    ) INTO table_exists;
    
    IF NOT table_exists THEN
        missing_tables := array_append(missing_tables, 'orders');
    END IF;
    
    -- Check user_balances table
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'user_balances'
    ) INTO table_exists;
    
    IF NOT table_exists THEN
        missing_tables := array_append(missing_tables, 'user_balances');
    END IF;
    
    -- Check payments table
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'payments'
    ) INTO table_exists;
    
    IF NOT table_exists THEN
        missing_tables := array_append(missing_tables, 'payments');
    END IF;
    
    -- Check add_funds_payments table
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'add_funds_payments'
    ) INTO table_exists;
    
    IF NOT table_exists THEN
        missing_tables := array_append(missing_tables, 'add_funds_payments');
    END IF;
    
    -- Log what will be created
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE NOTICE 'Will create missing tables: %', array_to_string(missing_tables, ', ');
    ELSE
        RAISE NOTICE 'All required tables already exist!';
    END IF;
END $$;

-- Create orders table (minimal version)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    service_id INTEGER,
    country_id VARCHAR(10),
    phone_number VARCHAR(20),
    verification_code VARCHAR(10),
    app_price DECIMAL(10, 2) DEFAULT 0.00,
    api_price DECIMAL(10, 2) DEFAULT 0.00,
    markup_amount DECIMAL(10, 2) DEFAULT 0.00,
    markup_percentage DECIMAL(5, 4) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'pending',
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    sms_order_id VARCHAR(255),
    sms_provider VARCHAR(50) DEFAULT 'default',
    sms_status VARCHAR(50),
    sms_response JSONB,
    payment_reference VARCHAR(255),
    payment_status VARCHAR(20) DEFAULT 'pending',
    payment_provider VARCHAR(50),
    order_type VARCHAR(50) DEFAULT 'phone_number',
    description TEXT,
    metadata JSONB
);

-- Create user_balances table
CREATE TABLE IF NOT EXISTS public.user_balances (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    balance DECIMAL(15, 2) DEFAULT 0.00 NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create payments table (missing from quick setup)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL DEFAULT 'fapshi',
    provider_transaction_id VARCHAR(255),
    reference VARCHAR(255) UNIQUE NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'XAF',
    status VARCHAR(20) DEFAULT 'pending',
    provider_response JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create add_funds_payments table (missing from quick setup)
CREATE TABLE IF NOT EXISTS public.add_funds_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    amount_usd DECIMAL(10, 2) NOT NULL,
    amount_original DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    reference VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    campay_transaction_id VARCHAR(100),
    exchange_rate DECIMAL(15, 6) NOT NULL,
    markup DECIMAL(5, 2) NOT NULL DEFAULT 2.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create basic indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_user_balances_user_id ON public.user_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON public.payments(reference);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_add_funds_payments_user_id ON public.add_funds_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_add_funds_payments_reference ON public.add_funds_payments(reference);
CREATE INDEX IF NOT EXISTS idx_add_funds_payments_status ON public.add_funds_payments(status);

-- Enable RLS (Row Level Security)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.add_funds_payments ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies
DO $$
BEGIN
    -- Orders policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Users can view their own orders') THEN
        CREATE POLICY "Users can view their own orders" ON public.orders
            FOR SELECT USING (auth.uid()::text = user_id::text);
        RAISE NOTICE 'Created policy: Users can view their own orders';
    ELSE
        RAISE NOTICE 'Policy already exists: Users can view their own orders';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'Users can insert their own orders') THEN
        CREATE POLICY "Users can insert their own orders" ON public.orders
            FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
        RAISE NOTICE 'Created policy: Users can insert their own orders';
    ELSE
        RAISE NOTICE 'Policy already exists: Users can insert their own orders';
    END IF;

    -- User balances policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_balances' AND policyname = 'Users can view their own balance') THEN
        CREATE POLICY "Users can view their own balance" ON public.user_balances
            FOR SELECT USING (auth.uid()::text = user_id::text);
        RAISE NOTICE 'Created policy: Users can view their own balance';
    ELSE
        RAISE NOTICE 'Policy already exists: Users can view their own balance';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_balances' AND policyname = 'Users can update their own balance') THEN
        CREATE POLICY "Users can update their own balance" ON public.user_balances
            FOR UPDATE USING (auth.uid()::text = user_id::text);
        RAISE NOTICE 'Created policy: Users can update their own balance';
    ELSE
        RAISE NOTICE 'Policy already exists: Users can update their own balance';
    END IF;

    -- Payments policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Users can view own payments') THEN
        CREATE POLICY "Users can view own payments" ON public.payments
            FOR SELECT USING (auth.uid() = user_id);
        RAISE NOTICE 'Created policy: Users can view own payments';
    ELSE
        RAISE NOTICE 'Policy already exists: Users can view own payments';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Users can insert own payments') THEN
        CREATE POLICY "Users can insert own payments" ON public.payments
            FOR INSERT WITH CHECK (auth.uid() = user_id);
        RAISE NOTICE 'Created policy: Users can insert own payments';
    ELSE
        RAISE NOTICE 'Policy already exists: Users can insert own payments';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Users can update own payments') THEN
        CREATE POLICY "Users can update own payments" ON public.payments
            FOR UPDATE USING (auth.uid() = user_id);
        RAISE NOTICE 'Created policy: Users can update own payments';
    ELSE
        RAISE NOTICE 'Policy already exists: Users can update own payments';
    END IF;

    -- Add funds payments policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'add_funds_payments' AND policyname = 'Users can view own add funds payments') THEN
        CREATE POLICY "Users can view own add funds payments" ON public.add_funds_payments
            FOR SELECT USING (auth.uid() = user_id);
        RAISE NOTICE 'Created policy: Users can view own add funds payments';
    ELSE
        RAISE NOTICE 'Policy already exists: Users can view own add funds payments';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'add_funds_payments' AND policyname = 'Users can insert own add funds payments') THEN
        CREATE POLICY "Users can insert own add funds payments" ON public.add_funds_payments
            FOR INSERT WITH CHECK (auth.uid() = user_id);
        RAISE NOTICE 'Created policy: Users can insert own add funds payments';
    ELSE
        RAISE NOTICE 'Policy already exists: Users can insert own add funds payments';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'add_funds_payments' AND policyname = 'Users can update own add funds payments') THEN
        CREATE POLICY "Users can update own add funds payments" ON public.add_funds_payments
            FOR UPDATE USING (auth.uid() = user_id);
        RAISE NOTICE 'Created policy: Users can update own add funds payments';
    ELSE
        RAISE NOTICE 'Policy already exists: Users can update own add funds payments';
    END IF;
END $$;

-- Grant permissions to authenticated users (these will fail silently if already granted)
DO $$
BEGIN
    -- Grant permissions to orders table
    BEGIN
        GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
    EXCEPTION WHEN duplicate_object THEN
        -- Permissions already exist, continue
    END;
    
    -- Grant permissions to user_balances table
    BEGIN
        GRANT SELECT, INSERT, UPDATE ON public.user_balances TO authenticated;
    EXCEPTION WHEN duplicate_object THEN
        -- Permissions already exist, continue
    END;
    
    -- Grant permissions to payments table
    BEGIN
        GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;
    EXCEPTION WHEN duplicate_object THEN
        -- Permissions already exist, continue
    END;
    
    -- Grant permissions to add_funds_payments table
    BEGIN
        GRANT SELECT, INSERT, UPDATE ON public.add_funds_payments TO authenticated;
    EXCEPTION WHEN duplicate_object THEN
        -- Permissions already exist, continue
    END;
END $$;

-- Insert a default balance for testing (if needed)
-- INSERT INTO public.user_balances (user_id, balance, currency) 
-- VALUES ('your-user-id-here', 0.00, 'USD')
-- ON CONFLICT (user_id, currency) DO NOTHING;

-- Success message
DO $$
DECLARE
    table_count INTEGER := 0;
    policy_count INTEGER := 0;
BEGIN
    -- Count existing tables
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('orders', 'user_balances', 'payments', 'add_funds_payments');
    
    -- Count existing policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename IN ('orders', 'user_balances', 'payments', 'add_funds_payments');
    
    RAISE NOTICE 'Database setup completed! Found % tables and % policies.', table_count, policy_count;
    
    IF table_count = 4 THEN
        RAISE NOTICE '✅ All required tables exist: orders, user_balances, payments, add_funds_payments';
    ELSE
        RAISE NOTICE '⚠️  Some tables may be missing. Check the logs above for details.';
    END IF;
    
    IF policy_count >= 12 THEN
        RAISE NOTICE '✅ All required RLS policies are in place';
    ELSE
        RAISE NOTICE '⚠️  Some RLS policies may be missing. Check the logs above for details.';
    END IF;
END $$;
