# Fapshi Live Migration Guide

## Overview
This document outlines the changes made to switch DigiNum from Fapshi sandbox to live payment mode.

## Changes Made

### 1. Backend Environment Configuration (`backend/.env`)
- **FAPSHI_BASE_URL**: Changed from `https://sandbox.fapshi.com/api/v1` to `https://api.fapshi.com/v1`
- **FAPSHI_ENVIRONMENT**: Changed from `sandbox` to `live`

### 2. Frontend Environment Configuration (`.env`)
- **VITE_FAPSHI_ENVIRONMENT**: Added and set to `live`

### 3. Frontend Code Updates (`src/lib/fapshi.ts`)
- **Default Environment**: Changed fallback from `'sandbox'` to `'live'`
- **URL Logic**: The conditional URL selection logic remains intact and will now use live URLs

### 4. Test Configuration (`test-fapshi.js`)
- Updated test instructions to reflect live mode configuration
- Updated base URL references to live endpoints

## Configuration Details

### Live Mode URLs
- **API Base URL**: `https://api.fapshi.com/v1`
- **Environment**: `live`

### Sandbox Mode URLs (for reference)
- **API Base URL**: `https://sandbox.fapshi.com/api/v1`
- **Environment**: `sandbox`

## Important Notes

1. **API Keys**: The current API keys in the configuration appear to be test keys (`FAK_TEST_` prefix). You'll need to replace these with your live Fapshi API keys before going to production.

2. **Webhook URLs**: The webhook URLs will automatically use the live endpoints when the environment is set to `live`.

3. **Testing**: Make sure to test the live integration thoroughly before deploying to production.

4. **Environment Variables**: Both frontend and backend environment variables have been updated to use live mode.

## Verification Steps

1. ✅ Backend environment variables updated
2. ✅ Frontend environment variables updated
3. ✅ Code fallback values updated
4. ✅ Test configuration updated
5. ✅ Netlify CSP already includes live Fapshi URLs

## Next Steps

1. **Replace API Keys**: Update `FAPSHI_PUBLIC_KEY` and `FAPSHI_SECRET_KEY` in `backend/.env` with your live Fapshi credentials
2. **Test Integration**: Verify that payments work correctly in live mode
3. **Monitor Transactions**: Keep an eye on live transaction logs
4. **Update Documentation**: Consider updating any user-facing documentation about payment modes

## Rollback Plan

If you need to rollback to sandbox mode:
1. Change `FAPSHI_ENVIRONMENT` back to `sandbox` in `backend/.env`
2. Change `VITE_FAPSHI_ENVIRONMENT` back to `sandbox` in `.env`
3. Change `FAPSHI_BASE_URL` back to `https://sandbox.fapshi.com/api/v1` in `backend/.env`

## Security Considerations

- Live mode will process real money transactions
- Ensure proper error handling and logging
- Monitor for any suspicious activity
- Keep API keys secure and rotate them regularly 