-- Admin Diagnostics Script
-- Run this to check your admin setup

-- Check if admin_users table exists and has data
SELECT 'admin_users table check' as check_type, count(*) as count FROM admin_users;

-- Check all users in the system
SELECT 'all users' as check_type, email, id, created_at FROM auth.users ORDER BY created_at DESC LIMIT 5;

-- Check admin users specifically
SELECT 
  'admin users' as check_type,
  au.email,
  admin.role,
  admin.user_id,
  admin.created_at
FROM admin_users admin
JOIN auth.users au ON admin.user_id = au.id;

-- Check if RLS is properly configured
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'admin_users';

-- Check RLS policies
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
