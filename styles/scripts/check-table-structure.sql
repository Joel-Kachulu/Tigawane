-- Check current table structure to understand what columns exist

-- Check notifications table structure
SELECT 'NOTIFICATIONS TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'notifications'
ORDER BY ordinal_position;

-- Check items table structure
SELECT 'ITEMS TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'items'
ORDER BY ordinal_position;

-- Check messages table structure
SELECT 'MESSAGES TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'messages'
ORDER BY ordinal_position;

-- Check claims table structure
SELECT 'CLAIMS TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'claims'
ORDER BY ordinal_position;

-- Check profiles table structure
SELECT 'PROFILES TABLE STRUCTURE:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- List all tables in the database
SELECT 'ALL TABLES IN DATABASE:' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check existing indexes
SELECT 'EXISTING INDEXES:' as info;
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
