-- Step-by-step script to create your first admin user
-- Follow these steps in order:

-- STEP 1: First, sign up through the normal app at "/" with your desired admin email
-- For example: admin@tigawane.com

-- STEP 2: Find your user ID by running this query (replace with your email):
SELECT 
  id as user_id, 
  email, 
  created_at,
  email_confirmed_at
FROM auth.users 
WHERE email = 'admin@tigawane.com';  -- Replace with your email

-- STEP 3: Copy the user_id from step 2 and use it below (replace 'YOUR_USER_ID_HERE'):
INSERT INTO admin_users (user_id, role) 
VALUES ('YOUR_USER_ID_HERE', 'super_admin');

-- STEP 4: Verify the admin was created successfully:
SELECT 
  au.email,
  admin.role,
  admin.created_at
FROM admin_users admin
JOIN auth.users au ON admin.user_id = au.id
WHERE au.email = 'admin@tigawane.com';  -- Replace with your email

-- STEP 5: Now you can log in to /admin with your email and password!

-- BONUS: To see all admin users:
SELECT 
  au.email,
  admin.role,
  admin.created_at
FROM admin_users admin
JOIN auth.users au ON admin.user_id = au.id
ORDER BY admin.created_at DESC;
