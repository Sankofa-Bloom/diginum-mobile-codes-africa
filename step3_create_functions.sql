-- Step 3: Create Functions and Triggers
-- Run this after step 2

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at_user_balances()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_user_balances_updated_at ON public.user_balances;
CREATE TRIGGER update_user_balances_updated_at
    BEFORE UPDATE ON public.user_balances
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at_user_balances();

-- Credit balance function
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
    new_bal DECIMAL(15, 2);
BEGIN
    IF p_amount <= 0 THEN
        RETURN QUERY SELECT false, 0.00::DECIMAL(15, 2), 'Amount must be positive';
        RETURN;
    END IF;
    
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

SELECT 'Functions created successfully!' as status;