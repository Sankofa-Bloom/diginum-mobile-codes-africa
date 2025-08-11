-- Recreate Complete Database
-- This script creates all tables, functions, triggers, and sample data

-- ========================================
-- 0. CLEANUP EXISTING OBJECTS
-- ========================================

-- Drop existing functions first (triggers will be dropped when tables are dropped)
DROP FUNCTION IF EXISTS public.credit_user_balance(UUID, DECIMAL, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS public.credit_user_balance(UUID, NUMERIC, CHARACTER VARYING) CASCADE;
DROP FUNCTION IF EXISTS public.credit_user_balance(UUID, NUMERIC, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS public.credit_user_balance(UUID, DECIMAL, CHARACTER VARYING) CASCADE;
DROP FUNCTION IF EXISTS public.update_user_balance() CASCADE;
DROP FUNCTION IF EXISTS public.handle_payment_success() CASCADE;

-- ========================================
-- 1. CREATE TABLES
-- ========================================

-- Exchange rates table
CREATE TABLE IF NOT EXISTS public.exchange_rates (
    id SERIAL PRIMARY KEY,
    code VARCHAR(3) NOT NULL UNIQUE,
    rate DECIMAL(15,6) NOT NULL,
    vat DECIMAL(4,2) DEFAULT 0.0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Price adjustments table
CREATE TABLE IF NOT EXISTS public.price_adjustments (
    id SERIAL PRIMARY KEY,
    country_code VARCHAR(3) NOT NULL UNIQUE,
    adjustment_factor DECIMAL(4,2) DEFAULT 1.0,
    currency VARCHAR(3) DEFAULT 'USD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User balances table
CREATE TABLE IF NOT EXISTS public.user_balances (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    balance DECIMAL(15,2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'USD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, currency)
);

-- Add funds payments table
CREATE TABLE IF NOT EXISTS public.add_funds_payments (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method VARCHAR(50) NOT NULL,
    reference VARCHAR(100) UNIQUE,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment transactions table
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    transaction_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    reference VARCHAR(100),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 2. CREATE INDEXES
-- ========================================

-- User balances indexes
CREATE INDEX IF NOT EXISTS idx_user_balances_user_id ON public.user_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_user_balances_currency ON public.user_balances(currency);

-- Payment indexes
CREATE INDEX IF NOT EXISTS idx_add_funds_payments_user_id ON public.add_funds_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_add_funds_payments_reference ON public.add_funds_payments(reference);
CREATE INDEX IF NOT EXISTS idx_add_funds_payments_status ON public.add_funds_payments(status);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON public.payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_reference ON public.payment_transactions(reference);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON public.payment_transactions(status);

-- Exchange rates indexes
CREATE INDEX IF NOT EXISTS idx_exchange_rates_code ON public.exchange_rates(code);

-- ========================================
-- 3. CREATE FUNCTIONS
-- ========================================

-- Function to credit user balance
CREATE OR REPLACE FUNCTION public.credit_user_balance(
    p_user_id UUID,
    p_amount DECIMAL(15,2),
    p_currency VARCHAR(3) DEFAULT 'USD'
)
RETURNS DECIMAL(15,2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_balance DECIMAL(15,2);
    v_new_balance DECIMAL(15,2);
BEGIN
    -- Get current balance
    SELECT COALESCE(balance, 0) INTO v_current_balance
    FROM public.user_balances
    WHERE user_id = p_user_id AND currency = p_currency;
    
    -- Calculate new balance
    v_new_balance := v_current_balance + p_amount;
    
    -- Insert or update balance
    INSERT INTO public.user_balances (user_id, balance, currency)
    VALUES (p_user_id, v_new_balance, p_currency)
    ON CONFLICT ON CONSTRAINT user_balances_user_id_currency_key
    DO UPDATE SET 
        balance = v_new_balance,
        updated_at = NOW();
    
    RETURN v_new_balance;
END;
$$;

-- Function to update user balance when payment transaction is created
DROP FUNCTION IF EXISTS public.update_user_balance() CASCADE;
CREATE OR REPLACE FUNCTION public.update_user_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Update the updated_at timestamp
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Function to handle successful payments
DROP FUNCTION IF EXISTS public.handle_payment_success() CASCADE;
CREATE OR REPLACE FUNCTION public.handle_payment_success()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- If this is a successful payment transaction, credit the user's balance
    IF NEW.status = 'completed' AND NEW.transaction_type = 'credit' THEN
        PERFORM public.credit_user_balance(NEW.user_id, NEW.amount, NEW.currency);
    END IF;
    
    RETURN NEW;
END;
$$;

-- ========================================
-- 4. CREATE TRIGGERS
-- ========================================

-- Trigger to update timestamp on user_balances
CREATE TRIGGER update_user_balance_trigger
    BEFORE UPDATE ON public.user_balances
    FOR EACH ROW
    EXECUTE FUNCTION public.update_user_balance();

-- Trigger to handle successful payments
CREATE TRIGGER handle_payment_success_trigger
    AFTER INSERT OR UPDATE ON public.payment_transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_payment_success();

-- ========================================
-- 5. ENABLE ROW LEVEL SECURITY (RLS)
-- ========================================

-- Enable RLS on all tables
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.add_funds_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 6. CREATE RLS POLICIES
-- ========================================

-- Exchange rates - readable by all authenticated users
CREATE POLICY "Exchange rates are viewable by authenticated users" ON public.exchange_rates
    FOR SELECT USING (auth.role() = 'authenticated');

-- Price adjustments - readable by all authenticated users
CREATE POLICY "Price adjustments are viewable by authenticated users" ON public.price_adjustments
    FOR SELECT USING (auth.role() = 'authenticated');

-- User balances - users can only see their own balance
CREATE POLICY "Users can view own balance" ON public.user_balances
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own balance" ON public.user_balances
    FOR UPDATE USING (auth.uid() = user_id);

-- Add funds payments - users can only see their own payments
CREATE POLICY "Users can view own add funds payments" ON public.add_funds_payments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own add funds payments" ON public.add_funds_payments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own add funds payments" ON public.add_funds_payments
    FOR UPDATE USING (auth.uid() = user_id);

-- Payment transactions - users can only see their own transactions
CREATE POLICY "Users can view own payment transactions" ON public.payment_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payment transactions" ON public.payment_transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payment transactions" ON public.payment_transactions
    FOR UPDATE USING (auth.uid() = user_id);

-- ========================================
-- 7. INSERT SAMPLE DATA
-- ========================================

-- Insert current exchange rates (as of August 2025)
INSERT INTO public.exchange_rates (code, rate, vat) VALUES
('USD', 1.000000, 0.0),
('EUR', 0.850000, 1.5),
('GBP', 0.730000, 2.0),
('JPY', 149.800000, 1.0),
('CAD', 1.350000, 1.2),
('AUD', 1.480000, 1.3),
('CHF', 0.880000, 1.8),
('CNY', 7.150000, 0.8),
('INR', 83.250000, 2.5),
('BRL', 5.450000, 3.5),
('MXN', 17.850000, 2.8),
('SGD', 1.320000, 1.1),
('HKD', 7.820000, 0.9),
('SEK', 10.450000, 2.2),
('NOK', 10.850000, 2.4),
('DKK', 6.340000, 2.1),
('PLN', 3.980000, 2.7),
('CZK', 22.150000, 2.3),
('HUF', 365.800000, 2.9),
('RUB', 92.500000, 4.0),
('TRY', 34.150000, 5.2),
('ZAR', 18.350000, 3.8),
('KRW', 1342.000000, 1.4),
('THB', 35.800000, 1.6),
('MYR', 4.480000, 1.7),
('IDR', 15485.000000, 2.1),
('PHP', 56.250000, 2.4),
('NGN', 1635.500000, 3.0),
('XAF', 563.340000, 2.0)
ON CONFLICT ON CONSTRAINT exchange_rates_code_key DO UPDATE SET
    rate = EXCLUDED.rate,
    vat = EXCLUDED.vat,
    updated_at = NOW();

-- Insert sample price adjustments
INSERT INTO public.price_adjustments (country_code, adjustment_factor, currency) VALUES
('US', 1.0, 'USD'),
('GB', 1.2, 'GBP'),
('DE', 1.15, 'EUR'),
('FR', 1.1, 'EUR'),
('JP', 1.3, 'JPY'),
('CA', 1.1, 'CAD'),
('AU', 1.25, 'AUD'),
('NG', 0.9, 'USD'),
('CM', 0.85, 'USD')
ON CONFLICT ON CONSTRAINT price_adjustments_country_code_key DO UPDATE SET
    adjustment_factor = EXCLUDED.adjustment_factor,
    currency = EXCLUDED.currency;

-- ========================================
-- 8. SET USER BALANCE
-- ========================================

-- Insert balance for the specific user (replace with actual user ID)
INSERT INTO public.user_balances (user_id, balance, currency) VALUES
('927331fc-37ad-4e18-85c1-0b13ee5cf9ef', 10.00, 'USD')
ON CONFLICT ON CONSTRAINT user_balances_user_id_currency_key DO UPDATE SET
    balance = EXCLUDED.balance,
    updated_at = NOW();

-- ========================================
-- 9. VERIFICATION
-- ========================================

-- Verify the setup
SELECT 'Database setup completed successfully!' as status;

-- Show user balance
SELECT 
    ub.user_id,
    ub.balance,
    ub.currency,
    ub.created_at,
    ub.updated_at
FROM public.user_balances ub
WHERE ub.user_id = '927331fc-37ad-4e18-85c1-0b13ee5cf9ef';

-- Show table counts
SELECT 
    'exchange_rates' as table_name,
    COUNT(*) as record_count
FROM public.exchange_rates
UNION ALL
SELECT 
    'price_adjustments' as table_name,
    COUNT(*) as record_count
FROM public.price_adjustments
UNION ALL
SELECT 
    'user_balances' as table_name,
    COUNT(*) as record_count
FROM public.user_balances; 