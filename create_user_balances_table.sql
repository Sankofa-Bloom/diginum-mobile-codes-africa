-- Create user_balances table for account balance management
-- Run this in your Supabase SQL Editor

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

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_balances_user_id ON public.user_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_user_balances_currency ON public.user_balances(currency);

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_balances ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own balance
CREATE POLICY "Users can view own balance" ON public.user_balances
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own balance (for initial setup)
CREATE POLICY "Users can insert own balance" ON public.user_balances
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own balance
CREATE POLICY "Users can update own balance" ON public.user_balances
    FOR UPDATE USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at_user_balances()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
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

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.user_balances TO authenticated;
GRANT EXECUTE ON FUNCTION public.credit_user_balance TO authenticated;

-- Insert some sample data for testing (optional)
-- This will be commented out - uncomment if you want test data
/*
INSERT INTO public.user_balances (user_id, balance, currency) 
VALUES 
    ((SELECT id FROM auth.users LIMIT 1), 100.00, 'USD'),
    ((SELECT id FROM auth.users LIMIT 1), 50000.00, 'XAF')
ON CONFLICT (user_id, currency) DO NOTHING;
*/