-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS is_admin(UUID);

-- Create a simpler function to check admin status
CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
DECLARE
  admin_exists BOOLEAN := FALSE;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = user_uuid
  ) INTO admin_exists;
  
  RETURN admin_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated;
