-- Fapshi Payments Table
-- Add this to your Supabase database

CREATE TABLE IF NOT EXISTS payments (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL DEFAULT 'fapshi',
    provider_transaction_id VARCHAR(255) UNIQUE NOT NULL,
    reference VARCHAR(255) UNIQUE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'XAF',
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    provider_response JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_provider_transaction_id ON payments(provider_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments(reference);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);

-- Create RLS policies
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Users can only see their own payments
CREATE POLICY "Users can view own payments" ON payments
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own payments (for logging purposes)
CREATE POLICY "Users can insert own payments" ON payments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Only authenticated users can update payments (for webhook processing)
CREATE POLICY "Service role can update payments" ON payments
    FOR UPDATE USING (true);

-- Add comments for documentation
COMMENT ON TABLE payments IS 'Table storing Fapshi and other payment gateway transactions';
COMMENT ON COLUMN payments.provider IS 'Payment provider name (fapshi, stripe, campay, etc.)';
COMMENT ON COLUMN payments.provider_transaction_id IS 'Transaction ID from the payment provider';
COMMENT ON COLUMN payments.reference IS 'Internal reference number for this transaction';
COMMENT ON COLUMN payments.amount IS 'Payment amount in the specified currency';
COMMENT ON COLUMN payments.currency IS 'Currency code (XAF, USD, EUR, etc.)';
COMMENT ON COLUMN payments.status IS 'Payment status (pending, success, failed, cancelled)';
COMMENT ON COLUMN payments.provider_response IS 'JSON response from payment provider for audit trail';

-- Update the updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();