-- Admin Management Helper Scripts

-- 1. VIEW ALL USERS AND THEIR STATUS
SELECT 
  au.id,
  au.email,
  p.full_name,
  au.created_at as registered,
  CASE 
    WHEN admin.user_id IS NOT NULL THEN admin.role
    ELSE 'user'
  END as role,
  CASE 
    WHEN admin.user_id IS NOT NULL THEN '✅ ADMIN'
    ELSE '👤 User'
  END as status
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.id
LEFT JOIN admin_users admin ON au.id = admin.user_id
ORDER BY au.created_at DESC;

-- 2. PROMOTE USER TO ADMIN (replace email and role)
-- Step 1: Find user by email
SELECT id, email FROM auth.users WHERE email = 'user@example.com';

-- Step 2: Promote to admin (use the ID from step 1)
-- INSERT INTO admin_users (user_id, role) VALUES ('user-id-here', 'admin');

-- 3. CHANGE ADMIN ROLE
-- UPDATE admin_users SET role = 'super_admin' WHERE user_id = 'user-id-here';

-- 4. REMOVE ADMIN PRIVILEGES
-- DELETE FROM admin_users WHERE user_id = 'user-id-here';

-- 5. VIEW ONLY ADMIN USERS
SELECT 
  au.email,
  p.full_name,
  admin.role,
  admin.created_at as admin_since
FROM admin_users admin
JOIN auth.users au ON admin.user_id = au.id
LEFT JOIN profiles p ON au.id = p.id
ORDER BY admin.created_at DESC;

-- 6. COUNT USERS BY TYPE
SELECT 
  'Total Users' as type,
  COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
  'Admin Users' as type,
  COUNT(*) as count
FROM admin_users
UNION ALL
SELECT 
  'Regular Users' as type,
  (SELECT COUNT(*) FROM auth.users) - COUNT(*) as count
FROM admin_users;
