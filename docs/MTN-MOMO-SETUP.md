# MTN MoMo Integration Setup Guide

## Prerequisites

1. MTN MoMo Developer Account
   - Sign up at [MTN MoMo Developer Portal](https://momodeveloper.mtn.com)
   - Get your Subscription Key from the portal

2. Node.js and npm installed
3. Netlify account for deployment

## Setup Steps

### 1. Install Dependencies

```bash
# Install script dependencies
npm install dotenv node-fetch uuid --save-dev
```

### 2. Set Environment Variables

Create a `.env` file in the project root:

```env
# Your subscription key from MTN MoMo developer portal
MTN_MOMO_SUBSCRIPTION_KEY=your_subscription_key_here

# Optional: Custom callback URL (defaults to your Netlify URL)
MTN_MOMO_CALLBACK_URL=https://your-app.netlify.app/.netlify/functions/momo-callback
```

### 3. Run Setup Script

```bash
node scripts/setup-momo-sandbox.js
```

This script will:
- Create an API User
- Generate API Key
- Configure environment variables
- Create necessary configuration files

### 4. Configure Netlify

Add these environment variables to your Netlify dashboard:

```bash
MTN_MOMO_SUBSCRIPTION_KEY=your_subscription_key
MTN_MOMO_USER_ID=generated_reference_id
MTN_MOMO_API_KEY=generated_api_key
MTN_MOMO_API_SECRET=generated_api_key
MTN_MOMO_ENVIRONMENT=sandbox
MTN_MOMO_CALLBACK_URL=https://your-app.netlify.app/.netlify/functions/momo-callback
```

### 5. Test the Integration

1. Deploy your application to Netlify
2. Try adding funds using a test phone number
3. Check the payment status
4. Verify the callback functionality

## Sandbox Testing

Use these test credentials for sandbox environment:

- Test Phone Numbers:
  - `46733123450`
  - `46733123451`
  - `46733123452`

- Test Scenarios:
  1. Successful Payment: Any amount
  2. Failed Payment: Amount > 100,000
  3. Timeout: Amount = 50,000

## Going Live

To switch to production:

1. Get production credentials from MTN MoMo
2. Update environment variables in Netlify:
   ```bash
   MTN_MOMO_ENVIRONMENT=production
   MTN_MOMO_SUBSCRIPTION_KEY=your_production_key
   MTN_MOMO_USER_ID=your_production_user_id
   MTN_MOMO_API_KEY=your_production_api_key
   MTN_MOMO_API_SECRET=your_production_api_secret
   ```

## Troubleshooting

1. API User Creation Failed
   - Check your subscription key
   - Verify the sandbox URL
   - Check network connectivity

2. Payment Failed
   - Verify test phone number format
   - Check amount limits
   - Verify API credentials

3. Callback Not Received
   - Check callback URL configuration
   - Verify Netlify function permissions
   - Check function logs

## Support

For issues:
1. Check MTN MoMo API status
2. Review Netlify function logs
3. Contact MTN MoMo support
4. Open GitHub issue
