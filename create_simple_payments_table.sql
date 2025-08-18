-- Create simple_payments table for basic payment tracking
-- This table is designed to work with the Netlify function endpoints

CREATE TABLE IF NOT EXISTS public.simple_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reference VARCHAR(255) UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  payment_method VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_simple_payments_user_id ON public.simple_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_simple_payments_reference ON public.simple_payments(reference);
CREATE INDEX IF NOT EXISTS idx_simple_payments_status ON public.simple_payments(status);
CREATE INDEX IF NOT EXISTS idx_simple_payments_created_at ON public.simple_payments(created_at);

-- Enable Row Level Security
ALTER TABLE public.simple_payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own payments" ON public.simple_payments
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payments" ON public.simple_payments
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payments" ON public.simple_payments
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.simple_payments TO authenticated;

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_simple_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_simple_payments_updated_at ON public.simple_payments;
CREATE TRIGGER update_simple_payments_updated_at
    BEFORE UPDATE ON public.simple_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_simple_payments_updated_at();

-- Insert a sample record to test the table (optional)
-- INSERT INTO public.simple_payments (user_id, reference, amount, currency, payment_method, status, description)
-- VALUES ('00000000-0000-0000-0000-000000000000', 'TEST_REF_001', 10.00, 'USD', 'test', 'pending', 'Test payment record');
