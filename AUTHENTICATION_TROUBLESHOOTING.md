# DigiNum Authentication Troubleshooting Guide

## Current Issues Identified

### 1. **Missing Supabase API Keys**
The most critical issue is that your Supabase API keys are not properly configured:

**Frontend (.env):**
```
VITE_SUPABASE_ANON_KEY=your-anon-public-key-here  # ❌ Placeholder value
```

**Backend (.env):**
```
SUPABASE_KEY=your-service-role-key-here  # ❌ Placeholder value
```

### 2. **Authentication Flow Confusion**
- Frontend uses Supabase directly for authentication
- Backend also has a login endpoint that duplicates Supabase auth
- This creates confusion and potential conflicts

### 3. **Environment Configuration Issues**
- API base URL might not match your backend server
- Missing proper error handling for authentication failures

## Solutions

### Step 1: Get Your Supabase Credentials

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project: `xoivxzjhgjyvuzcmzcas`
3. Go to Settings → API
4. Copy the following values:
   - **Project URL**: `https://xoivxzjhgjyvuzcmzcas.supabase.co`
   - **anon public key**: (starts with `eyJ...`)
   - **service_role key**: (starts with `eyJ...`)

### Step 2: Update Environment Files

**Update `.env` (frontend):**
```bash
VITE_SUPABASE_URL=https://xoivxzjhgjyvuzcmzcas.supabase.co
VITE_SUPABASE_ANON_KEY=your_actual_anon_key_here
VITE_API_BASE_URL=http://localhost:4000/api
```

**Update `backend/.env`:**
```bash
SUPABASE_URL=https://xoivxzjhgjyvuzcmzcas.supabase.co
SUPABASE_KEY=your_actual_service_role_key_here
SUPABASE_JWT_SECRET=Y1p0iIKXbD9LZngmeH6ovLPG61izKj2s8q2g9hQFK34it0uHzIA5o5TNRxTWWyPkx/c7DT4PDwNZqJ6rwolOKg==
PORT=4000
```

### Step 3: Create Test Users

You need to create test users in your Supabase project:

1. Go to your Supabase dashboard
2. Navigate to Authentication → Users
3. Click "Add User" or use the signup functionality in your app
4. Create a test user with:
   - Email: `test@example.com`
   - Password: `password123`

### Step 4: Test Authentication Flow

1. **Start the backend server:**
   ```bash
   cd backend
   npm install
   npm start
   ```

2. **Start the frontend:**
   ```bash
   npm install
   npm run dev
   ```

3. **Test login with the test user:**
   - Go to `http://localhost:5173/login`
   - Use email: `test@example.com`
   - Use password: `password123`

### Step 5: Debug Common Issues

#### Issue: "Invalid login credentials"
- Check if the user exists in Supabase Authentication → Users
- Verify the email is confirmed
- Check if the password is correct

#### Issue: "Network error" or "Failed to fetch"
- Ensure backend server is running on port 4000
- Check CORS configuration in backend
- Verify API_BASE_URL is correct

#### Issue: "Missing Supabase configuration"
- Verify all environment variables are set
- Restart both frontend and backend after changing .env files
- Check browser console for specific error messages

### Step 6: Enable Email Confirmation (Optional)

If you want to require email confirmation:

1. Go to Supabase dashboard → Authentication → Settings
2. Enable "Enable email confirmations"
3. Configure your email provider

### Step 7: Monitor Authentication

Use these tools to debug:

1. **Browser Developer Tools:**
   - Network tab to see API requests
   - Console tab for JavaScript errors
   - Application tab to check localStorage

2. **Supabase Dashboard:**
   - Authentication → Users (see user list)
   - Authentication → Logs (see auth events)

3. **Backend Logs:**
   - Check terminal where backend is running
   - Look for authentication-related errors

## Quick Fix Commands

```bash
# 1. Install dependencies
npm install
cd backend && npm install && cd ..

# 2. Start backend
cd backend && npm start

# 3. Start frontend (in new terminal)
npm run dev

# 4. Test authentication
# Go to http://localhost:5173/login
```

## Expected Behavior After Fix

1. Login page loads without errors
2. Entering valid credentials redirects to dashboard
3. Invalid credentials show proper error message
4. User session persists across page refreshes
5. Logout clears session and redirects to home

## Next Steps

After fixing authentication:

1. Test user registration
2. Test password reset functionality
3. Test protected routes
4. Implement proper error handling
5. Add loading states and better UX

## Support

If you're still having issues:

1. Check the browser console for specific error messages
2. Verify all environment variables are correctly set
3. Ensure both frontend and backend are running
4. Check Supabase dashboard for any service issues 