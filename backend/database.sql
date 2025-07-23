-- Create exchange_rates table
CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  currency VARCHAR(3) NOT NULL,
  rate DECIMAL(10, 6) NOT NULL,
  markup DECIMAL(5, 2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create price_adjustments table
CREATE TABLE IF NOT EXISTS price_adjustments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  service VARCHAR(50) NOT NULL,
  country VARCHAR(50) NOT NULL,
  markup DECIMAL(5, 2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_service_country UNIQUE (service, country)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_exchange_rates_currency ON exchange_rates(currency);
CREATE INDEX IF NOT EXISTS idx_price_adjustments_service_country ON price_adjustments(service, country);

-- Insert default exchange rates
INSERT INTO exchange_rates (currency, rate, markup)
VALUES 
  ('USD', 1.00, 0),
  ('EUR', 0.85, 0.05),
  ('GBP', 0.75, 0.05),
  ('XAF', 580.00, 0.10)
ON CONFLICT (currency) DO UPDATE SET
  rate = EXCLUDED.rate,
  markup = EXCLUDED.markup,
  updated_at = CURRENT_TIMESTAMP;

-- Insert default price adjustments
INSERT INTO price_adjustments (service, country, markup)
VALUES 
  ('whatsapp', 'US', 0.10),
  ('instagram', 'US', 0.15),
  ('telegram', 'RU', 0.20)
ON CONFLICT (service, country) DO UPDATE SET
  markup = EXCLUDED.markup,
  updated_at = CURRENT_TIMESTAMP;
