# Multi-Currency System Implementation

## Overview

This document describes the implementation of a multi-currency system for DigiNum that allows users to:
- Make payments in their local currency
- See dual currency displays (local + USD)
- Have all backend amounts stored in USD (base currency)
- Get real-time exchange rates updated every 24 hours

## Architecture

### Backend (Always USD)
- **Database**: All amounts stored in USD cents (e.g., 1000 = $10.00)
- **API Responses**: Return USD amounts for consistency
- **Payment Processing**: Convert local currency to USD before storage

### Frontend (Local Currency + USD)
- **Auto-detection**: Detects user's country and sets local currency
- **Dual Display**: Shows amount in local currency with USD equivalent
- **User Preference**: Allows users to change their preferred currency

### Exchange Rates
- **Primary Source**: Fixer API (https://fixer.io/)
- **Update Frequency**: Every 24 hours
- **Fallback**: Cached rates + hardcoded fallbacks
- **Storage**: Local storage + database

## Components

### 1. Currency Service (`src/lib/currency.ts`)
- Fetches exchange rates from Fixer API
- Handles currency conversions with FX buffer
- Manages rate caching and updates
- Provides VAT rates for different currencies

### 2. Dual Currency Display (`src/components/DualCurrencyDisplay.tsx`)
- Shows amounts in both local currency and USD
- Handles loading states during conversion
- Responsive design with different sizes

### 3. Swychr Payment Functions
- **`swychr-create-payment-v4.js`**: Creates payments in local currency
- **`swychr-check-status.js`**: Checks payment status
- Both functions return currency information for proper conversion

### 4. Exchange Rate Update Function (`netlify/functions/update-exchange-rates.js`)
- Runs every 24 hours to update rates from Fixer API
- Stores rates in environment variables
- Handles API errors gracefully

## Configuration

### Environment Variables
```bash
# Fixer API (required for live exchange rates)
FIXER_API_KEY=your_fixer_api_key_here

# Test mode (for development)
TEST_MODE=true
```

### Supported Currencies
- **Major**: USD, EUR, GBP, JPY, CAD, AUD, CHF, CNY
- **African**: NGN (Nigeria), KES (Kenya), GHS (Ghana), EGP (Egypt)
- **Others**: INR, BRL, MXN, SGD, HKD, SEK, NOK, DKK, PLN, CZK, HUF, RUB, TRY, ZAR, KRW, THB, MYR, IDR, PHP, VND

## Usage Examples

### Frontend Currency Display
```tsx
import DualCurrencyDisplay from '@/components/DualCurrencyDisplay';

// Show amount in user's local currency with USD equivalent
<DualCurrencyDisplay 
  amount={1000} // Amount in USD cents
  currency="EUR" // User's preferred currency
  showUSD={true} // Show USD equivalent
  size="lg"
/>
```

### Currency Conversion
```tsx
import { CurrencyService } from '@/lib/currency';

// Convert USD to local currency
const conversion = await CurrencyService.convertUSDToLocal(1000, 'EUR');
console.log(conversion.finalAmount); // Amount in EUR with FX buffer

// Convert local currency back to USD
const usdAmount = await CurrencyService.convertLocalToUSD(850, 'EUR');
console.log(usdAmount); // Amount in USD
```

### Payment Creation
```tsx
// Create payment in local currency
const paymentData = {
  amount: 50, // 50 EUR
  currency: 'EUR',
  country_code: 'DE',
  // ... other fields
};

// Backend stores as USD equivalent (e.g., 54.25 USD)
```

## Database Schema

### Exchange Rates Table
```sql
CREATE TABLE exchange_rates (
  currency VARCHAR(3) PRIMARY KEY,
  rate DECIMAL(10,6) NOT NULL,
  vat DECIMAL(5,2) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Payment Transactions Table
```sql
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  original_amount_usd INTEGER NOT NULL, -- Always in USD cents
  converted_amount INTEGER NOT NULL, -- Amount in local currency
  currency VARCHAR(3) NOT NULL,
  exchange_rate DECIMAL(10,6) NOT NULL,
  fx_buffer INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

### Exchange Rates
- `GET /api/exchange-rates` - Get current exchange rates
- `POST /update-exchange-rates` - Update rates from Fixer API

### Payments
- `POST /.netlify/functions/swychr-create-payment-v4` - Create payment in local currency
- `POST /.netlify/functions/swychr-check-status` - Check payment status

## Security Considerations

1. **FX Buffer**: 2.5% buffer applied to protect against currency volatility
2. **Rate Validation**: Rates validated before use in calculations
3. **API Key Protection**: Fixer API key stored in environment variables
4. **Input Validation**: All currency inputs validated and sanitized

## Testing

### Test Mode
When `TEST_MODE=true`:
- Functions return mock responses
- No real API calls to Swychr
- Test currency conversions work
- All amounts use test data

### Currency Conversion Testing
```tsx
// Test USD to EUR conversion
const conversion = await CurrencyService.convertUSDToLocal(1000, 'EUR');
expect(conversion.originalAmount).toBe(1000);
expect(conversion.currency).toBe('EUR');
expect(conversion.fxBuffer).toBeGreaterThan(0);
```

## Deployment

1. **Set Fixer API Key**: Add `FIXER_API_KEY` to Netlify environment variables
2. **Deploy Functions**: All Netlify functions will be deployed automatically
3. **Test Currency Display**: Verify dual currency display works correctly
4. **Monitor Rate Updates**: Check logs for successful rate updates

## Monitoring

### Key Metrics
- Exchange rate update success rate
- Currency conversion accuracy
- Payment processing in different currencies
- User currency preferences

### Logs to Watch
- Fixer API response times
- Currency conversion errors
- Payment creation failures
- Rate update frequency

## Future Enhancements

1. **Real-time Rates**: WebSocket updates for critical currencies
2. **Multi-currency Balances**: Allow users to hold balances in multiple currencies
3. **FX Hedging**: Advanced currency risk management
4. **Regional Pricing**: Location-based pricing in local currencies
5. **Currency Analytics**: Track currency usage and conversion patterns
