# MTN Mobile Money Integration Guide

## Overview

DigiNum uses MTN Mobile Money (MoMo) for processing payments in Africa. This integration allows users to add funds to their DigiNum account using their MTN Mobile Money account.

## Features

- Direct MTN Mobile Money integration
- Real-time payment status updates
- Support for multiple currencies (XAF, USD)
- Automatic balance updates
- Secure payment processing

## Prerequisites

1. MTN MoMo API Credentials:
   - API Key
   - User ID
   - API Secret
   - Subscription Key

2. Environment Variables:
   ```
   MTN_MOMO_API_KEY=your_api_key
   MTN_MOMO_USER_ID=your_user_id
   MTN_MOMO_API_SECRET=your_api_secret
   MTN_MOMO_SUBSCRIPTION_KEY=your_subscription_key
   MTN_MOMO_ENVIRONMENT=sandbox  # or 'production'
   ```

## Integration Components

### 1. Payment Functions

Located in `/netlify/functions/`:

- `momo-payment.js`: Initiates payment requests
- `momo-callback.js`: Handles payment callbacks
- `momo-status.js`: Checks payment status

### 2. Frontend Integration

The AddFunds component (`src/pages/AddFunds.tsx`) handles:
- Payment initiation
- Status checking
- Balance updates
- User interface

## Payment Flow

1. **Initiate Payment**
   - User enters amount and phone number
   - System creates payment request
   - MTN MoMo sends USSD prompt to user's phone

2. **Payment Processing**
   - User completes payment on their phone
   - MTN MoMo sends callback with status
   - System updates payment status

3. **Balance Update**
   - System verifies payment success
   - Updates user's balance
   - Shows confirmation message

## Error Handling

The integration includes comprehensive error handling:
- Invalid phone numbers
- Insufficient funds
- Network issues
- Timeout handling
- Failed transactions

## Testing

1. **Sandbox Testing**
   - Use `MTN_MOMO_ENVIRONMENT=sandbox`
   - Test phone numbers: +237XXXXXXXXX
   - Test amounts: Any amount in XAF

2. **Production Testing**
   - Use `MTN_MOMO_ENVIRONMENT=production`
   - Real MTN MoMo accounts required
   - Start with small amounts

## Security

1. **API Security**
   - All credentials stored in environment variables
   - HTTPS for all API calls
   - JWT authentication

2. **Data Security**
   - Phone numbers masked in logs
   - Sensitive data encrypted
   - Secure callback handling

## Troubleshooting

Common issues and solutions:

1. **Payment Not Initiated**
   - Check phone number format
   - Verify API credentials
   - Check network connectivity

2. **Status Not Updating**
   - Check callback URL
   - Verify transaction reference
   - Check MTN MoMo service status

3. **Balance Not Updated**
   - Check payment status
   - Verify transaction completion
   - Check database connection

## Support

For issues with the MTN MoMo integration:
1. Check MTN MoMo API status
2. Review Netlify function logs
3. Contact MTN MoMo support
4. Open GitHub issue

## Changelog

### v1.0.0
- Initial MTN MoMo integration
- Basic payment flow
- Status checking
- Balance updates
