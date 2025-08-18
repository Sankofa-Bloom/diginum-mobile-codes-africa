# Netlify Function Deployment Verification

## Issue Summary
The `swychr-create-payment-v4` function is returning HTTP 500 errors with the message "Failed to create payment link".

## Current Status
- ✅ Swychr variables are set in Netlify environment variables
- ✅ TEST_MODE is set to "true" in netlify.toml
- ✅ Function code has been updated with better error handling and logging
- ✅ Redirects have been added to netlify.toml

## Next Steps

### 1. Redeploy the Function
The function needs to be redeployed to pick up the new environment variables and code changes:

```bash
# Commit and push your changes
git add .
git commit -m "Fix Swychr payment function with improved error handling and test mode"
git push

# Netlify should automatically redeploy
```

### 2. Test the Function Health Check
After deployment, test the function's health check endpoint:

```
GET https://diginum.netlify.app/.netlify/functions/swychr-create-payment-v4
```

This should return a 200 response with environment variable status.

### 3. Test the Payment Creation
Test the payment creation endpoint:

```
POST https://diginum.netlify.app/.netlify/functions/swychr-create-payment-v4
Content-Type: application/json

{
  "country_code": "US",
  "name": "Test User",
  "email": "test@example.com",
  "amount": 1000,
  "transaction_id": "test-123",
  "pass_digital_charge": true
}
```

### 4. Check Netlify Function Logs
In your Netlify dashboard:
1. Go to Functions tab
2. Check the logs for `swychr-create-payment-v4`
3. Look for any error messages or environment variable issues

### 5. Verify Environment Variables
In Netlify dashboard:
1. Go to Site settings > Environment variables
2. Verify these variables are set:
   - `TEST_MODE` = `true`
   - `SWYCHR_EMAIL` = [your email]
   - `SWYCHR_PASSWORD` = [your password]
   - `SWYCHR_BASE_URL` = `https://api.accountpe.com/api/payin`

## Expected Behavior
With `TEST_MODE=true`, the function should:
1. Return a mock payment response instead of making real API calls
2. Log that it's running in test mode
3. Return HTTP 200 with test payment data

## Troubleshooting
If the issue persists:
1. Check Netlify function logs for detailed error messages
2. Verify the function is properly deployed
3. Test with the health check endpoint first
4. Ensure all environment variables are properly set in Netlify
