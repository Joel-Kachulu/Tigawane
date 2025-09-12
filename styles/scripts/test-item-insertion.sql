-- Test script to verify items table structure and permissions

-- Check if items table exists and its structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'items' 
ORDER BY ordinal_position;

-- Check RLS policies on items table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'items';

-- Test inserting a sample item (replace user_id with actual user ID)
-- INSERT INTO items (
--   title, description, category, item_type, quantity, 
--   pickup_location, user_id, status
-- ) VALUES (
--   'Test Item', 'Test description', 'other', 'food', 
--   '1 piece', 'Test location', 'your-user-id-here', 'available'
-- );

-- Check recent items
SELECT id, title, category, item_type, status, created_at 
FROM items 
ORDER BY created_at DESC 
LIMIT 5;
