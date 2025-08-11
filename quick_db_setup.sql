-- Quick Database Setup for DigiNum
-- Run this in Supabase SQL Editor to fix the missing tables error

-- Create orders table (minimal version)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    service_id INTEGER,
    country_id VARCHAR(10),
    phone_number VARCHAR(20),
    verification_code VARCHAR(10),
    app_price DECIMAL(10, 2) DEFAULT 0.00,
    api_price DECIMAL(10, 2) DEFAULT 0.00,
    markup_amount DECIMAL(10, 2) DEFAULT 0.00,
    markup_percentage DECIMAL(5, 4) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'USD',
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

-- Create user_balances table
CREATE TABLE IF NOT EXISTS public.user_balances (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    balance DECIMAL(15, 2) DEFAULT 0.00 NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create basic indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_user_balances_user_id ON public.user_balances(user_id);

-- Enable RLS (Row Level Security)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_balances ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies
CREATE POLICY "Users can view their own orders" ON public.orders
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own orders" ON public.orders
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view their own balance" ON public.user_balances
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own balance" ON public.user_balances
    FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Insert a default balance for testing (if needed)
-- INSERT INTO public.user_balances (user_id, balance, currency) 
-- VALUES ('your-user-id-here', 0.00, 'USD')
-- ON CONFLICT (user_id, currency) DO NOTHING;

-- Success message
SELECT 'Quick database setup completed! Orders and user_balances tables created.' as status;
