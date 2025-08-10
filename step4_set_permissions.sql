-- Step 4: Set Permissions and Create Initial Balance
-- Run this after step 3

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.payment_transactions TO authenticated;
GRANT ALL ON public.user_balances TO authenticated;
GRANT EXECUTE ON FUNCTION public.credit_user_balance TO authenticated;

-- Set initial balance for your user
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

-- Verify setup
SELECT 
    'Setup complete! Balance set to $' || ub.balance || ' for ' || u.email as status
FROM public.user_balances ub
JOIN auth.users u ON ub.user_id = u.id
WHERE u.email = 'gfghg1817@gmail.com';