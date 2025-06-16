-- Script to add admin users
-- Replace the email and user_id with actual values

-- First, you need to create a regular user account through the normal signup process
-- Then run this script to promote them to admin

-- Example: Add admin user (replace with actual user ID)
-- You can get the user ID by running: SELECT id, email FROM auth.users WHERE email = 'admin@example.com';

-- INSERT INTO admin_users (user_id, role) 
-- VALUES ('your-user-id-here', 'super_admin');

-- To find user IDs:
SELECT 
  au.id as auth_id,
  au.email,
  p.full_name,
  au.created_at
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
ORDER BY au.created_at DESC;

-- To check existing admin users:
SELECT 
  au.email,
  p.full_name,
  admin.role,
  admin.created_at as admin_since
FROM admin_users admin
JOIN auth.users au ON admin.user_id = au.id
LEFT JOIN profiles p ON au.id = p.id
ORDER BY admin.created_at;

-- Example to add an admin (uncomment and replace with actual user ID):
-- INSERT INTO admin_users (user_id, role) 
-- VALUES ('replace-with-actual-user-id', 'super_admin');
