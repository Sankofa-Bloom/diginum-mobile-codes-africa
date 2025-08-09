-- Complete Database Setup for Diginum Payment System
-- Run this entire script in your Supabase SQL Editor

-- ================================
-- 1. CREATE PAYMENT TRANSACTIONS TABLE
-- ================================

-- Create the payment_transactions table
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    original_amount_usd DECIMAL(10, 2) NOT NULL,
    converted_amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    exchange_rate DECIMAL(10, 6) NOT NULL,
    fx_buffer DECIMAL(5, 4) DEFAULT 0.025,
    payment_reference VARCHAR(255),
    payment_status VARCHAR(20) DEFAULT 'pending',
    payment_provider VARCHAR(50) DEFAULT 'campay',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON public.payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_reference ON public.payment_transactions(payment_reference);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON public.payment_transactions(payment_status);

-- Enable Row Level Security (RLS)
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_transactions
CREATE POLICY "Users can view own transactions" ON public.payment_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON public.payment_transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions" ON public.payment_transactions
    FOR UPDATE USING (auth.uid() = user_id);

-- ================================
-- 2. CREATE USER BALANCES TABLE
-- ================================

-- Create the user_balances table
CREATE TABLE IF NOT EXISTS public.user_balances (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    balance DECIMAL(15, 2) DEFAULT 0.00 NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Ensure one balance record per user per currency
    UNIQUE(user_id, currency)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_balances_user_id ON public.user_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_user_balances_currency ON public.user_balances(currency);

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_balances ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_balances
CREATE POLICY "Users can view own balance" ON public.user_balances
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own balance" ON public.user_balances
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own balance" ON public.user_balances
    FOR UPDATE USING (auth.uid() = user_id);

-- ================================
-- 3. CREATE HELPER FUNCTIONS
-- ================================

-- Function to automatically update updated_at timestamp for payment_transactions
CREATE OR REPLACE FUNCTION public.handle_updated_at_payment_transactions()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically update updated_at timestamp for user_balances
CREATE OR REPLACE FUNCTION public.handle_updated_at_user_balances()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_payment_transactions_updated_at ON public.payment_transactions;
CREATE TRIGGER update_payment_transactions_updated_at
    BEFORE UPDATE ON public.payment_transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at_payment_transactions();

DROP TRIGGER IF EXISTS update_user_balances_updated_at ON public.user_balances;
CREATE TRIGGER update_user_balances_updated_at
    BEFORE UPDATE ON public.user_balances
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at_user_balances();

-- Create function to credit user balance (used by payment completion)
CREATE OR REPLACE FUNCTION public.credit_user_balance(
    p_user_id UUID,
    p_amount DECIMAL(15, 2),
    p_currency VARCHAR(3) DEFAULT 'USD'
)
RETURNS TABLE(
    success BOOLEAN,
    new_balance DECIMAL(15, 2),
    message TEXT
) AS $$
DECLARE
    current_balance DECIMAL(15, 2);
    new_bal DECIMAL(15, 2);
BEGIN
    -- Validate inputs
    IF p_amount <= 0 THEN
        RETURN QUERY SELECT false, 0.00::DECIMAL(15, 2), 'Amount must be positive';
        RETURN;
    END IF;
    
    -- Insert or update balance
    INSERT INTO public.user_balances (user_id, balance, currency)
    VALUES (p_user_id, p_amount, p_currency)
    ON CONFLICT (user_id, currency)
    DO UPDATE SET 
        balance = user_balances.balance + p_amount,
        updated_at = timezone('utc'::text, now())
    RETURNING balance INTO new_bal;
    
    RETURN QUERY SELECT true, new_bal, 'Balance credited successfully';
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT false, 0.00::DECIMAL(15, 2), SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================
-- 4. GRANT PERMISSIONS
-- ================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.payment_transactions TO authenticated;
GRANT ALL ON public.user_balances TO authenticated;
GRANT EXECUTE ON FUNCTION public.credit_user_balance TO authenticated;

-- ================================
-- 5. SET INITIAL BALANCE FOR TEST USER
-- ================================

-- Set $10 balance for gfghg1817@gmail.com
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

-- ================================
-- 6. VERIFICATION QUERIES
-- ================================

-- Check if tables were created
SELECT 'payment_transactions' as table_name, count(*) as record_count FROM public.payment_transactions
UNION ALL
SELECT 'user_balances' as table_name, count(*) as record_count FROM public.user_balances;

-- Check user balance
SELECT 
    ub.balance,
    ub.currency,
    ub.created_at,
    ub.updated_at,
    u.email
FROM public.user_balances ub
JOIN auth.users u ON ub.user_id = u.id
WHERE u.email = 'gfghg1817@gmail.com';

-- Success message
SELECT 'Database setup complete! User gfghg1817@gmail.com now has $10.00 USD balance.' as status;