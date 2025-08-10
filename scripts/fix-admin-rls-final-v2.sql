-- Fix Admin RLS Policies - Remove Infinite Recursion (Fixed Version)
-- This script completely removes problematic RLS policies and creates simple ones

-- First, disable RLS temporarily to clean up
ALTER TABLE admin_users DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on admin_users
DROP POLICY IF EXISTS "Users can view their own admin status" ON admin_users;
DROP POLICY IF EXISTS "Admins can view all admin users" ON admin_users;
DROP POLICY IF EXISTS "Super admins can manage admin users" ON admin_users;
DROP POLICY IF EXISTS "Only admins can view admin users" ON admin_users;
DROP POLICY IF EXISTS "Only super admins can manage admin users" ON admin_users;
DROP POLICY IF EXISTS "allow_own_admin_status" ON admin_users;
DROP POLICY IF EXISTS "allow_authenticated_read" ON admin_users;
DROP POLICY IF EXISTS "allow_service_role_write" ON admin_users;

-- Re-enable RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Create SIMPLE policies that don't cause recursion
-- Policy 1: Allow users to read their own admin status (no recursion)
CREATE POLICY "allow_own_admin_status" ON admin_users 
  FOR SELECT 
  USING (user_id = auth.uid());

-- Policy 2: Allow authenticated users to read admin_users (for admin checks)
-- This is safe because we're not checking if they're admin in the policy itself
CREATE POLICY "allow_authenticated_read" ON admin_users 
  FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Policy 3: Only allow inserts/updates/deletes via service role or specific function
CREATE POLICY "allow_service_role_write" ON admin_users 
  FOR ALL 
  USING (auth.role() = 'service_role');

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS check_user_admin_status(UUID);

-- Create a safe function to check admin status without RLS recursion
CREATE OR REPLACE FUNCTION check_user_admin_status(user_uuid UUID DEFAULT auth.uid())
RETURNS TABLE(is_admin BOOLEAN, admin_role TEXT) AS $$
BEGIN
  -- Use security definer to bypass RLS for this specific check
  RETURN QUERY
  SELECT 
    CASE WHEN au.user_id IS NOT NULL THEN TRUE ELSE FALSE END as is_admin,
    COALESCE(au.role, 'none') as admin_role
  FROM (SELECT user_uuid as uid) u
  LEFT JOIN admin_users au ON au.user_id = u.uid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_user_admin_status TO authenticated;

-- Verify the admin user exists (with proper column references)
SELECT 
  'Admin user check:' as info, 
  au.email, 
  admin.role as admin_role
FROM auth.users au 
JOIN admin_users admin ON au.id = admin.user_id 
WHERE au.email = 'kachulujoel89@gmail.com';

-- Test the function
SELECT 
  'Function test:' as info, 
  is_admin, 
  admin_role 
FROM check_user_admin_status(
  (SELECT id FROM auth.users WHERE email = 'kachulujoel89@gmail.com')
);

-- Show all admin users for verification
SELECT 
  'All admin users:' as info,
  au.email,
  admin.role as admin_role,
  admin.created_at
FROM admin_users admin
JOIN auth.users au ON admin.user_id = au.id
ORDER BY admin.created_at;
