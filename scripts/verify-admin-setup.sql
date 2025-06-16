-- Verify Admin Setup Script
-- Run this after fixing the RLS policies

-- Check if the admin user exists
SELECT 'Step 1 - Admin user exists:' as step, 
       au.email, 
       admin.role,
       admin.user_id
FROM auth.users au 
JOIN admin_users admin ON au.id = admin.user_id 
WHERE au.email = 'kachulujoel89@gmail.com';

-- Test the safe admin check function
SELECT 'Step 2 - Function test:' as step, 
       is_admin, 
       admin_role 
FROM check_user_admin_status(
  (SELECT id FROM auth.users WHERE email = 'kachulujoel89@gmail.com')
);

-- Check RLS policies (should be simple ones now)
SELECT 'Step 3 - RLS policies:' as step,
       policyname,
       cmd,
       permissive
FROM pg_policies 
WHERE tablename = 'admin_users';

-- Verify table permissions
SELECT 'Step 4 - Table info:' as step,
       schemaname,
       tablename,
       rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'admin_users';
