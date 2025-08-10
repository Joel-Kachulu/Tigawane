-- Script to register admin users for Tigawane platform
-- Follow these steps to create your first admin user

-- STEP 1: First, check if you have any existing users
SELECT 
  au.id as user_id,
  au.email,
  au.created_at,
  p.full_name,
  CASE 
    WHEN admin.user_id IS NOT NULL THEN 'ADMIN (' || admin.role || ')'
    ELSE 'Regular User'
  END as status
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
LEFT JOIN admin_users admin ON au.id = admin.user_id
ORDER BY au.created_at DESC;

-- STEP 2: If you need to create a new user account first, 
-- you'll need to sign up through the normal app interface at /
-- Then come back and run the queries below

-- STEP 3: Find your user ID (replace 'your-email@example.com' with actual email)
-- Copy the user_id from the result
SELECT 
  id as user_id,
  email,
  created_at
FROM auth.users 
WHERE email = 'your-email@example.com';

-- STEP 4: Make the user an admin (replace 'your-user-id-here' with actual ID)
-- Available roles: 'admin', 'super_admin', 'moderator'
INSERT INTO admin_users (user_id, role) 
VALUES ('your-user-id-here', 'super_admin');

-- STEP 5: Verify the admin was created successfully
SELECT 
  au.email,
  p.full_name,
  admin.role,
  admin.created_at as admin_since
FROM admin_users admin
JOIN auth.users au ON admin.user_id = au.id
LEFT JOIN profiles p ON au.id = p.id
ORDER BY admin.created_at DESC;

-- EXAMPLE: Complete workflow
-- 1. Sign up at the main app with email: admin@tigawane.com
-- 2. Find the user ID:
--    SELECT id FROM auth.users WHERE email = 'admin@tigawane.com';
-- 3. Make them admin:
--    INSERT INTO admin_users (user_id, role) VALUES ('found-user-id', 'super_admin');
