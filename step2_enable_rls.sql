-- Step 2: Enable RLS and Create Policies
-- Run this after step 1

-- Enable Row Level Security
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_balances ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_transactions
CREATE POLICY "Users can view own transactions" ON public.payment_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON public.payment_transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_balances
CREATE POLICY "Users can view own balance" ON public.user_balances
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own balance" ON public.user_balances
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own balance" ON public.user_balances
    FOR UPDATE USING (auth.uid() = user_id);

SELECT 'RLS policies created successfully!' as status;