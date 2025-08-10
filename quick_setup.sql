-- Quick Setup: Just create tables and set your balance
-- This minimal version should work without snippet errors

-- Create user_balances table
CREATE TABLE IF NOT EXISTS public.user_balances (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    balance DECIMAL(15, 2) DEFAULT 0.00 NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, currency)
);

-- Enable RLS
ALTER TABLE public.user_balances ENABLE ROW LEVEL SECURITY;

-- Simple policy - users can do everything with their own balance
CREATE POLICY "Users manage own balance" ON public.user_balances
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.user_balances TO authenticated;

-- Set your balance to $10
INSERT INTO public.user_balances (user_id, balance, currency)
SELECT id, 10.00, 'USD' FROM auth.users WHERE email = 'gfghg1817@gmail.com'
ON CONFLICT (user_id, currency) DO UPDATE SET balance = 10.00;

-- Verify
SELECT 'SUCCESS: Balance set to $10 for gfghg1817@gmail.com' as result;