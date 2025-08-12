-- Simple Database Setup for DigiNum - Fapshi Only
-- Clean and minimal setup for add funds functionality

-- Create user_balances table (for storing user account balances)
CREATE TABLE IF NOT EXISTS public.user_balances (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    balance DECIMAL(15, 2) DEFAULT 0.00 NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create fapshi_payments table (simple payment tracking)
CREATE TABLE IF NOT EXISTS public.fapshi_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    reference VARCHAR(255) UNIQUE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'pending',
    fapshi_transaction_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create basic indexes
CREATE INDEX IF NOT EXISTS idx_user_balances_user_id ON public.user_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_fapshi_payments_user_id ON public.fapshi_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_fapshi_payments_reference ON public.fapshi_payments(reference);
CREATE INDEX IF NOT EXISTS idx_fapshi_payments_status ON public.fapshi_payments(status);

-- Enable RLS (Row Level Security)
ALTER TABLE public.user_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fapshi_payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DO $$
BEGIN
    -- User balances policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_balances' AND policyname = 'Users can view their own balance') THEN
        CREATE POLICY "Users can view their own balance" ON public.user_balances
            FOR SELECT USING (auth.uid()::text = user_id::text);
        RAISE NOTICE 'Created policy: Users can view their own balance';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_balances' AND policyname = 'Users can update their own balance') THEN
        CREATE POLICY "Users can update their own balance" ON public.user_balances
            FOR UPDATE USING (auth.uid()::text = user_id::text);
        RAISE NOTICE 'Created policy: Users can update their own balance';
    END IF;

    -- Fapshi payments policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fapshi_payments' AND policyname = 'Users can view own payments') THEN
        CREATE POLICY "Users can view own payments" ON public.fapshi_payments
            FOR SELECT USING (auth.uid() = user_id);
        RAISE NOTICE 'Created policy: Users can view own payments';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fapshi_payments' AND policyname = 'Users can insert own payments') THEN
        CREATE POLICY "Users can insert own payments" ON public.fapshi_payments
            FOR INSERT WITH CHECK (auth.uid() = user_id);
        RAISE NOTICE 'Created policy: Users can insert own payments';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fapshi_payments' AND policyname = 'Users can update own payments') THEN
        CREATE POLICY "Users can update own payments" ON public.fapshi_payments
            FOR UPDATE USING (auth.uid() = user_id);
        RAISE NOTICE 'Created policy: Users can update own payments';
    END IF;
END $$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.user_balances TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.fapshi_payments TO authenticated;

-- Success message
SELECT 'Simple database setup completed! Only essential tables for Fapshi payments created.' as status;
