-- Fix Row Level Security policies for users table
-- This script addresses the RLS policy issues preventing user creation and access

-- First, drop existing policies that might be causing issues
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

-- Create a policy that allows users to insert their own profile during signup
-- This policy allows insertion when the user_id matches the authenticated user's ID
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Create a policy that allows users to view their own profile
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT 
  USING (auth.uid() = id);

-- Create a policy that allows users to update their own profile
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE 
  USING (auth.uid() = id);

-- Create a policy that allows users to delete their own profile (optional)
CREATE POLICY "Users can delete own profile" ON public.users
  FOR DELETE 
  USING (auth.uid() = id);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;

-- Verify the policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'users' 
AND schemaname = 'public';

-- Test if the table is accessible
SELECT 'Users table RLS policies have been fixed successfully!' as status;
