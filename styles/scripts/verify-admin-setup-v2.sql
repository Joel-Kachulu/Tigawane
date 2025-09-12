-- Verify Admin Setup - Simple Version

-- 1. Check if admin_users table exists and has data
SELECT 'Admin users table check:' as step;
SELECT 
  au.email,
  admin.role as admin_role,
  admin.created_at
FROM admin_users admin
JOIN auth.users au ON admin.user_id = au.id;

-- 2. Test the admin check function
SELECT 'Testing admin check function:' as step;
SELECT 
  email,
  is_admin,
  admin_role
FROM auth.users au
CROSS JOIN LATERAL check_user_admin_status(au.id)
WHERE au.email = 'kachulujoel89@gmail.com';

-- 3. Check RLS policies
SELECT 'Current RLS policies:' as step;
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'admin_users';

-- 4. Verify the specific user exists
SELECT 'User verification:' as step;
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at IS NOT NULL as email_confirmed
FROM auth.users 
WHERE email = 'kachulujoel89@gmail.com';
