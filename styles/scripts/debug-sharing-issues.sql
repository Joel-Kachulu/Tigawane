-- Debug script to identify sharing button issues

-- 1. Check if items table exists and has correct structure
SELECT 'Items table structure:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'items' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check if storage bucket exists
SELECT 'Storage buckets:' as info;
SELECT id, name, public FROM storage.buckets;

-- 3. Check RLS policies on items table
SELECT 'Items table policies:' as info;
SELECT policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'items';

-- 4. Check if profiles table exists (needed for user info)
SELECT 'Profiles table exists:' as info;
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
);

-- 5. Test basic insert permissions (replace with actual user ID)
SELECT 'Testing insert permissions...' as info;
-- Uncomment and replace user_id to test:
-- INSERT INTO items (title, category, item_type, quantity, pickup_location, user_id, status)
-- VALUES ('Test Item', 'other', 'food', '1 piece', 'Test Location', 'your-user-id-here', 'available');
