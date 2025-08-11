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
    
    -- PRICING INFORMATION
    app_price DECIMAL(10, 2) NOT NULL COMMENT 'Price charged to customer in app',
    api_price DECIMAL(10, 2) NOT NULL COMMENT 'Price charged by SMS provider/API',
    markup_amount DECIMAL(10, 2) NOT NULL COMMENT 'Difference between app_price and api_price',
    markup_percentage DECIMAL(5, 4) NOT NULL COMMENT 'Markup percentage applied',
    currency VARCHAR(3) NOT NULL DEFAULT 'USD' COMMENT 'Currency for all prices',
    
    -- ORDER STATUS
    status VARCHAR(20) DEFAULT 'pending',
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- SMS PROVIDER INFORMATION
    sms_order_id VARCHAR(255),
    sms_provider VARCHAR(50) DEFAULT 'default',
    sms_status VARCHAR(50),
    sms_response JSONB,
    
    -- PAYMENT INFORMATION
    payment_reference VARCHAR(255),
    payment_status VARCHAR(20) DEFAULT 'pending',
    payment_provider VARCHAR(50),
    
    -- ORDER DETAILS
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
    
    -- PRICING STRUCTURE
    app_price DECIMAL(10, 2) NOT NULL COMMENT 'Price charged to customer in app',
    api_price DECIMAL(10, 2) NOT NULL COMMENT 'Price charged by SMS provider/API',
    markup_amount DECIMAL(10, 2) NOT NULL COMMENT 'Profit margin amount',
    markup_percentage DECIMAL(5, 4) NOT NULL COMMENT 'Profit margin percentage',
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    
    -- SERVICE DETAILS
    country_id VARCHAR(10) NOT NULL REFERENCES public.countries(id),
    available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
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

-- 7. Create pricing_history table for tracking price changes
CREATE TABLE IF NOT EXISTS public.pricing_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    service_id INTEGER NOT NULL REFERENCES public.services(id),
    country_id VARCHAR(10) NOT NULL REFERENCES public.countries(id),
    
    -- PRICING DETAILS
    app_price DECIMAL(10, 2) NOT NULL COMMENT 'Price charged to customer',
    api_price DECIMAL(10, 2) NOT NULL COMMENT 'Price charged by SMS provider',
    markup_amount DECIMAL(10, 2) NOT NULL COMMENT 'Profit margin amount',
    markup_percentage DECIMAL(5, 4) NOT NULL COMMENT 'Profit margin percentage',
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    
    -- CHANGE TRACKING
    change_reason VARCHAR(100) COMMENT 'Reason for price change',
    changed_by UUID REFERENCES auth.users(id) COMMENT 'User who made the change',
    effective_from TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    effective_until TIMESTAMP WITH TIME ZONE COMMENT 'When this pricing expires',
    is_active BOOLEAN DEFAULT true COMMENT 'Whether this pricing is currently active',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Create profit_tracking table for financial analytics
CREATE TABLE IF NOT EXISTS public.profit_tracking (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.orders(id),
    
    -- FINANCIAL BREAKDOWN
    revenue DECIMAL(10, 2) NOT NULL COMMENT 'Total revenue from customer',
    cost DECIMAL(10, 2) NOT NULL COMMENT 'Total cost to SMS provider',
    gross_profit DECIMAL(10, 2) NOT NULL COMMENT 'Revenue - Cost',
    profit_margin DECIMAL(5, 4) NOT NULL COMMENT 'Profit as percentage of revenue',
    
    -- CURRENCY AND EXCHANGE
    base_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    exchange_rate DECIMAL(10, 6) COMMENT 'Exchange rate if different from base',
    
    -- TRACKING
    tracking_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
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

-- Insert services with both app and API pricing
INSERT INTO public.services (name, description, app_price, api_price, markup_amount, markup_percentage, currency, country_id, available) VALUES
-- Cameroon Services (25% markup)
('MTN Mobile Money', 'MTN Mobile Money service for Cameroon', 10.00, 8.00, 2.00, 0.25, 'USD', 'CM', true),
('Orange Money', 'Orange Money service for Cameroon', 10.00, 8.00, 2.00, 0.25, 'USD', 'CM', true),
('Express Union', 'Express Union service for Cameroon', 12.00, 9.60, 2.40, 0.25, 'USD', 'CM', true),

-- Nigeria Services (30% markup)
('Airtel Money', 'Airtel Money service for Nigeria', 15.00, 11.54, 3.46, 0.30, 'USD', 'NG', true),
('Paga', 'Paga service for Nigeria', 18.00, 13.85, 4.15, 0.30, 'USD', 'NG', true),
('OPay', 'OPay service for Nigeria', 16.00, 12.31, 3.69, 0.30, 'USD', 'NG', true),

-- Ghana Services (28% markup)
('Momo', 'MTN Mobile Money service for Ghana', 14.00, 10.94, 3.06, 0.28, 'USD', 'GH', true),
('Vodafone Cash', 'Vodafone Cash service for Ghana', 13.00, 10.16, 2.84, 0.28, 'USD', 'GH', true),

-- Kenya Services (25% markup)
('M-Pesa', 'M-Pesa service for Kenya', 12.00, 9.60, 2.40, 0.25, 'USD', 'KE', true),
('Airtel Money KE', 'Airtel Money service for Kenya', 11.00, 8.80, 2.20, 0.25, 'USD', 'KE', true),

-- Senegal Services (26% markup)
('Wave', 'Wave service for Senegal', 13.00, 10.32, 2.68, 0.26, 'USD', 'SN', true),
('Orange Money SN', 'Orange Money service for Senegal', 12.00, 9.52, 2.48, 0.26, 'USD', 'SN', true),

-- Ivory Coast Services (24% markup)
('Moov Money', 'Moov Money service for Ivory Coast', 11.00, 8.87, 2.13, 0.24, 'USD', 'CI', true),
('Orange Money CI', 'Orange Money service for Ivory Coast', 12.00, 9.68, 2.32, 0.24, 'USD', 'CI', true),

-- Uganda Services (22% markup)
('M-Pesa UG', 'M-Pesa service for Uganda', 10.00, 8.20, 1.80, 0.22, 'USD', 'UG', true),
('Airtel Money UG', 'Airtel Money service for Uganda', 9.00, 7.38, 1.62, 0.22, 'USD', 'UG', true),

-- Tanzania Services (23% markup)
('M-Pesa TZ', 'M-Pesa service for Tanzania', 11.00, 8.94, 2.06, 0.23, 'USD', 'TZ', true),
('Tigo Pesa', 'Tigo Pesa service for Tanzania', 10.00, 8.13, 1.87, 0.23, 'USD', 'TZ', true)
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
ALTER TABLE public.pricing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profit_tracking ENABLE ROW LEVEL SECURITY;

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

-- Pricing history policies (admin access)
CREATE POLICY "Users can view pricing history" ON public.pricing_history
    FOR SELECT USING (true);

-- Profit tracking policies (admin access)
CREATE POLICY "Users can view profit tracking" ON public.profit_tracking
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

-- Grant permissions for pricing and profit tracking (admin only)
GRANT SELECT ON public.pricing_history TO authenticated;
GRANT SELECT ON public.profit_tracking TO authenticated;

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

-- Function to calculate profit margin
CREATE OR REPLACE FUNCTION public.calculate_profit_margin(app_price DECIMAL(10, 2), api_price DECIMAL(10, 2))
RETURNS TABLE(markup_amount DECIMAL(10, 2), markup_percentage DECIMAL(5, 4))
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (app_price - api_price) as markup_amount,
        CASE 
            WHEN app_price > 0 THEN (app_price - api_price) / app_price
            ELSE 0
        END as markup_percentage;
END;
$$;

-- Function to create order with profit tracking
CREATE OR REPLACE FUNCTION public.create_order_with_profit_tracking(
    p_user_id UUID,
    p_service_id INTEGER,
    p_country_id VARCHAR(10),
    p_phone_number VARCHAR(20),
    p_verification_code VARCHAR(10),
    p_currency VARCHAR(3) DEFAULT 'USD'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id UUID;
    v_app_price DECIMAL(10, 2);
    v_api_price DECIMAL(10, 2);
    v_markup_amount DECIMAL(10, 2);
    v_markup_percentage DECIMAL(5, 4);
BEGIN
    -- Get service pricing
    SELECT app_price, api_price, markup_amount, markup_percentage 
    INTO v_app_price, v_api_price, v_markup_amount, v_markup_percentage
    FROM public.services 
    WHERE id = p_service_id;
    
    -- Create order
    INSERT INTO public.orders (
        user_id, service_id, country_id, phone_number, verification_code,
        app_price, api_price, markup_amount, markup_percentage, currency
    ) VALUES (
        p_user_id, p_service_id, p_country_id, p_phone_number, p_verification_code,
        v_app_price, v_api_price, v_markup_amount, v_markup_percentage, p_currency
    ) RETURNING id INTO v_order_id;
    
    -- Create profit tracking record
    INSERT INTO public.profit_tracking (
        order_id, revenue, cost, gross_profit, profit_margin, base_currency
    ) VALUES (
        v_order_id, v_app_price, v_api_price, v_markup_amount, v_markup_percentage, p_currency
    );
    
    RETURN v_order_id;
END;
$$;

-- Function to get profit analytics
CREATE OR REPLACE FUNCTION public.get_profit_analytics(
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    total_revenue DECIMAL(15, 2),
    total_cost DECIMAL(15, 2),
    total_profit DECIMAL(15, 2),
    average_profit_margin DECIMAL(5, 4),
    order_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        SUM(pt.revenue) as total_revenue,
        SUM(pt.cost) as total_cost,
        SUM(pt.gross_profit) as total_profit,
        AVG(pt.profit_margin) as average_profit_margin,
        COUNT(*) as order_count
    FROM public.profit_tracking pt
    JOIN public.orders o ON pt.order_id = o.id
    WHERE o.created_at::date BETWEEN p_start_date AND p_end_date;
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
AND table_name IN ('orders', 'countries', 'services', 'exchange_rates', 'user_balances', 'payments', 'pricing_history', 'profit_tracking')
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
AND tablename IN ('orders', 'countries', 'services', 'exchange_rates', 'user_balances', 'payments', 'pricing_history', 'profit_tracking')
ORDER BY tablename;

-- Test profit calculation function
SELECT 'Testing profit calculation function...' as test_status;
SELECT * FROM public.calculate_profit_margin(15.00, 11.54);

-- =====================================================
-- END OF DATABASE SETUP
-- ===================================================== 