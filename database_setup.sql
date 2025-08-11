-- =====================================================
-- DIGINUM DATABASE SETUP
-- Complete database schema, data, and security configuration
-- Run this file in Supabase Dashboard > SQL Editor
-- =====================================================

-- =====================================================
-- SECTION 1: CREATE TABLES
-- =====================================================

-- 1. Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    service_id INTEGER NOT NULL,
    country_id VARCHAR(10) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    verification_code VARCHAR(10),
    price DECIMAL(10, 2) NOT NULL,
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

-- 2. Create countries table
CREATE TABLE IF NOT EXISTS public.countries (
    id VARCHAR(10) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(3) NOT NULL,
    flag_emoji VARCHAR(10),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create services table
CREATE TABLE IF NOT EXISTS public.services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    country_id VARCHAR(10) NOT NULL REFERENCES public.countries(id),
    available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create exchange_rates table
CREATE TABLE IF NOT EXISTS public.exchange_rates (
    id SERIAL PRIMARY KEY,
    currency VARCHAR(3) NOT NULL UNIQUE,
    rate DECIMAL(10, 6) NOT NULL,
    markup DECIMAL(5, 4) DEFAULT 0.025,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create user_balances table
CREATE TABLE IF NOT EXISTS public.user_balances (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    balance DECIMAL(15, 2) DEFAULT 0.00 NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, currency)
);

-- 6. Create payments table
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

-- =====================================================
-- SECTION 2: CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Orders table indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_payment_reference ON public.orders(payment_reference);

-- User balances indexes
CREATE INDEX IF NOT EXISTS idx_user_balances_user_id ON public.user_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_user_balances_currency ON public.user_balances(currency);

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON public.payments(reference);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- Services indexes
CREATE INDEX IF NOT EXISTS idx_services_country_id ON public.services(country_id);
CREATE INDEX IF NOT EXISTS idx_services_available ON public.services(available);

-- =====================================================
-- SECTION 3: INSERT INITIAL DATA
-- =====================================================

-- Insert countries
INSERT INTO public.countries (id, name, code, flag_emoji, active) VALUES
('CM', 'Cameroon', 'CMR', '🇨🇲', true),
('NG', 'Nigeria', 'NGA', '🇳🇬', true),
('GH', 'Ghana', 'GHA', '🇬🇭', true),
('KE', 'Kenya', 'KEN', '🇰🇪', true),
('SN', 'Senegal', 'SEN', '🇸🇳', true),
('CI', 'Ivory Coast', 'CIV', '🇨🇮', true),
('UG', 'Uganda', 'UGA', '🇺🇬', true),
('TZ', 'Tanzania', 'TZA', '🇹🇿', true)
ON CONFLICT (id) DO NOTHING;

-- Insert exchange rates (as of 2024)
INSERT INTO public.exchange_rates (currency, rate, markup) VALUES
('USD', 1.000000, 0.025),
('XAF', 0.001650, 0.025),
('NGN', 0.001200, 0.025),
('GHS', 0.080000, 0.025),
('KES', 0.007000, 0.025),
('XOF', 0.001650, 0.025),
('UGX', 0.000270, 0.025),
('TZS', 0.000400, 0.025)
ON CONFLICT (currency) DO UPDATE SET
    rate = EXCLUDED.rate,
    markup = EXCLUDED.markup,
    updated_at = timezone('utc'::text, now());

-- Insert services
INSERT INTO public.services (name, description, price, country_id, available) VALUES
-- Cameroon Services
('MTN Mobile Money', 'MTN Mobile Money service for Cameroon', 10.00, 'CM', true),
('Orange Money', 'Orange Money service for Cameroon', 10.00, 'CM', true),
('Express Union', 'Express Union service for Cameroon', 12.00, 'CM', true),

-- Nigeria Services
('Airtel Money', 'Airtel Money service for Nigeria', 15.00, 'NG', true),
('Paga', 'Paga service for Nigeria', 18.00, 'NG', true),
('OPay', 'OPay service for Nigeria', 16.00, 'NG', true),

-- Ghana Services
('Momo', 'MTN Mobile Money service for Ghana', 14.00, 'GH', true),
('Vodafone Cash', 'Vodafone Cash service for Ghana', 13.00, 'GH', true),

-- Kenya Services
('M-Pesa', 'M-Pesa service for Kenya', 12.00, 'KE', true),
('Airtel Money KE', 'Airtel Money service for Kenya', 11.00, 'KE', true),

-- Senegal Services
('Wave', 'Wave service for Senegal', 13.00, 'SN', true),
('Orange Money SN', 'Orange Money service for Senegal', 12.00, 'SN', true),

-- Ivory Coast Services
('Moov Money', 'Moov Money service for Ivory Coast', 11.00, 'CI', true),
('Orange Money CI', 'Orange Money service for Ivory Coast', 12.00, 'CI', true),

-- Uganda Services
('M-Pesa UG', 'M-Pesa service for Uganda', 10.00, 'UG', true),
('Airtel Money UG', 'Airtel Money service for Uganda', 9.00, 'UG', true),

-- Tanzania Services
('M-Pesa TZ', 'M-Pesa service for Tanzania', 11.00, 'TZ', true),
('Tigo Pesa', 'Tigo Pesa service for Tanzania', 10.00, 'TZ', true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- SECTION 4: ENABLE ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SECTION 5: CREATE SECURITY POLICIES
-- =====================================================

-- Orders table policies
CREATE POLICY "Users can view own orders" ON public.orders
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own orders" ON public.orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own orders" ON public.orders
    FOR UPDATE USING (auth.uid() = user_id);

-- User balances policies
CREATE POLICY "Users can view own balance" ON public.user_balances
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own balance" ON public.user_balances
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own balance" ON public.user_balances
    FOR UPDATE USING (auth.uid() = user_id);

-- Payments policies
CREATE POLICY "Users can view own payments" ON public.payments
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own payments" ON public.payments
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own payments" ON public.payments
    FOR UPDATE USING (auth.uid() = user_id);

-- Public read access for countries, services, and exchange rates
CREATE POLICY "Anyone can view countries" ON public.countries
    FOR SELECT USING (true);
CREATE POLICY "Anyone can view services" ON public.services
    FOR SELECT USING (true);
CREATE POLICY "Anyone can view exchange rates" ON public.exchange_rates
    FOR SELECT USING (true);

-- =====================================================
-- SECTION 6: GRANT PERMISSIONS
-- =====================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_balances TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;

-- Grant read-only permissions to authenticated users
GRANT SELECT ON public.countries TO authenticated;
GRANT SELECT ON public.services TO authenticated;
GRANT SELECT ON public.exchange_rates TO authenticated;

-- Grant usage on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- SECTION 7: CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to get user balance
CREATE OR REPLACE FUNCTION public.get_user_balance(user_uuid UUID, currency_code VARCHAR(3) DEFAULT 'USD')
RETURNS DECIMAL(15, 2)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_balance DECIMAL(15, 2) := 0;
BEGIN
    SELECT balance INTO user_balance
    FROM public.user_balances
    WHERE user_id = user_uuid AND currency = currency_code;
    
    RETURN COALESCE(user_balance, 0);
END;
$$;

-- Function to update user balance
CREATE OR REPLACE FUNCTION public.update_user_balance(
    user_uuid UUID,
    amount DECIMAL(15, 2),
    currency_code VARCHAR(3) DEFAULT 'USD'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.user_balances (user_id, balance, currency)
    VALUES (user_uuid, amount, currency_code)
    ON CONFLICT (user_id, currency)
    DO UPDATE SET
        balance = public.user_balances.balance + amount,
        updated_at = timezone('utc'::text, now());
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

-- Function to get exchange rate
CREATE OR REPLACE FUNCTION public.get_exchange_rate(from_currency VARCHAR(3), to_currency VARCHAR(3))
RETURNS DECIMAL(10, 6)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    from_rate DECIMAL(10, 6);
    to_rate DECIMAL(10, 6);
BEGIN
    SELECT rate INTO from_rate FROM public.exchange_rates WHERE currency = from_currency;
    SELECT rate INTO to_rate FROM public.exchange_rates WHERE currency = to_currency;
    
    IF from_rate IS NULL OR to_rate IS NULL THEN
        RETURN 1.0;
    END IF;
    
    RETURN to_rate / from_rate;
END;
$$;

-- =====================================================
-- SECTION 8: VERIFICATION AND STATUS
-- =====================================================

-- Verify all tables were created
SELECT 'Database setup completed successfully!' as status;

-- Show all created tables
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name IN ('orders', 'countries', 'services', 'exchange_rates', 'user_balances', 'payments')
ORDER BY table_name;

-- Show data counts
SELECT 
    'countries' as table_name,
    COUNT(*) as record_count
FROM public.countries
UNION ALL
SELECT 
    'services' as table_name,
    COUNT(*) as record_count
FROM public.services
UNION ALL
SELECT 
    'exchange_rates' as table_name,
    COUNT(*) as record_count
FROM public.exchange_rates;

-- Show RLS status
SELECT 
    schemaname,
    tablename,
    CASE WHEN rowsecurity THEN 'Enabled' ELSE 'Disabled' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('orders', 'countries', 'services', 'exchange_rates', 'user_balances', 'payments')
ORDER BY tablename;

-- =====================================================
-- END OF DATABASE SETUP
-- ===================================================== 