
-- Fix Notification System for Item Requests
-- This script ensures notifications are properly created when users request items

-- First, let's check if the notifications table exists and has the right structure
DO $$ 
BEGIN
    -- Ensure notifications table exists with correct structure
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        CREATE TABLE notifications (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
            type TEXT NOT NULL CHECK (type IN ('item_request', 'message', 'status_update', 'collaboration')),
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            related_item_id UUID REFERENCES items(id) ON DELETE CASCADE,
            related_claim_id UUID REFERENCES claims(id) ON DELETE CASCADE,
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
    
    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notifications' AND column_name = 'related_item_id') THEN
        ALTER TABLE notifications ADD COLUMN related_item_id UUID REFERENCES items(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notifications' AND column_name = 'related_claim_id') THEN
        ALTER TABLE notifications ADD COLUMN related_claim_id UUID REFERENCES claims(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Enable RLS on notifications table
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing notification policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Allow users to read their own notifications" ON notifications;
DROP POLICY IF EXISTS "Allow system to insert notifications" ON notifications;
DROP POLICY IF EXISTS "Allow users to update their own notifications" ON notifications;

-- Create proper RLS policies for notifications
CREATE POLICY "Users can view own notifications" ON notifications 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON notifications 
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own notifications" ON notifications 
    FOR UPDATE USING (auth.uid() = user_id);

-- Recreate the notification creation function
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_related_item_id UUID DEFAULT NULL,
    p_related_claim_id UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    -- Insert notification
    INSERT INTO notifications (user_id, type, title, message, related_item_id, related_claim_id)
    VALUES (p_user_id, p_type, p_title, p_message, p_related_item_id, p_related_claim_id)
    RETURNING id INTO notification_id;
    
    -- Log for debugging
    RAISE NOTICE 'Created notification % for user % with type %', notification_id, p_user_id, p_type;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION create_notification(UUID, TEXT, TEXT, TEXT, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_notification(UUID, TEXT, TEXT, TEXT, UUID, UUID) TO anon;

-- Recreate the function to notify item owner when request is made
CREATE OR REPLACE FUNCTION notify_item_request() RETURNS TRIGGER AS $$
DECLARE
    item_title TEXT;
    item_owner_id UUID;
    claimer_name TEXT;
    notification_id UUID;
BEGIN
    -- Get item details
    SELECT title, user_id INTO item_title, item_owner_id
    FROM items WHERE id = NEW.item_id;
    
    -- Get claimer name
    SELECT full_name INTO claimer_name
    FROM profiles WHERE id = NEW.claimer_id;
    
    -- Don't notify if owner is claiming their own item
    IF item_owner_id = NEW.claimer_id THEN
        RETURN NEW;
    END IF;
    
    -- Create notification for item owner
    SELECT create_notification(
        item_owner_id,
        'item_request',
        'New Item Request',
        COALESCE(claimer_name, 'Someone') || ' has requested your item: ' || COALESCE(item_title, 'Unknown Item'),
        NEW.item_id,
        NEW.id
    ) INTO notification_id;
    
    -- Log for debugging
    RAISE NOTICE 'Item request notification created: % for owner % about item %', notification_id, item_owner_id, NEW.item_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the function to notify when message is sent
CREATE OR REPLACE FUNCTION notify_message_sent() RETURNS TRIGGER AS $$
DECLARE
    claim_record RECORD;
    sender_name TEXT;
    recipient_id UUID;
    notification_id UUID;
BEGIN
    -- Get claim details
    SELECT * INTO claim_record FROM claims WHERE id = NEW.claim_id;
    
    -- Get sender name
    SELECT full_name INTO sender_name FROM profiles WHERE id = NEW.sender_id;
    
    -- Determine recipient (the other person in the conversation)
    IF NEW.sender_id = claim_record.claimer_id THEN
        recipient_id := claim_record.owner_id;
    ELSE
        recipient_id := claim_record.claimer_id;
    END IF;
    
    -- Create notification for recipient
    SELECT create_notification(
        recipient_id,
        'message',
        'New Message',
        COALESCE(sender_name, 'Someone') || ' sent you a message',
        claim_record.item_id,
        NEW.claim_id
    ) INTO notification_id;
    
    -- Log for debugging
    RAISE NOTICE 'Message notification created: % for recipient %', notification_id, recipient_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers to avoid duplicates
DROP TRIGGER IF EXISTS trigger_notify_item_request ON claims;
DROP TRIGGER IF EXISTS trigger_notify_message_sent ON messages;

-- Create triggers
CREATE TRIGGER trigger_notify_item_request
    AFTER INSERT ON claims
    FOR EACH ROW EXECUTE FUNCTION notify_item_request();

CREATE TRIGGER trigger_notify_message_sent
    AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION notify_message_sent();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- Test the notification system by creating a sample notification
DO $$
DECLARE
    test_user_id UUID;
    test_notification_id UUID;
BEGIN
    -- Get a user ID for testing (first user in profiles table)
    SELECT id INTO test_user_id FROM profiles LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Create a test notification
        SELECT create_notification(
            test_user_id,
            'item_request',
            'Test Notification',
            'This is a test notification to verify the system is working'
        ) INTO test_notification_id;
        
        RAISE NOTICE 'Test notification created with ID: %', test_notification_id;
    ELSE
        RAISE NOTICE 'No users found in profiles table for testing';
    END IF;
END $$;

-- Verify the setup
SELECT 
    'Notifications table exists' as check_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') 
         THEN 'PASS' ELSE 'FAIL' END as status
UNION ALL
SELECT 
    'create_notification function exists' as check_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'create_notification') 
         THEN 'PASS' ELSE 'FAIL' END as status
UNION ALL
SELECT 
    'notify_item_request function exists' as check_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'notify_item_request') 
         THEN 'PASS' ELSE 'FAIL' END as status
UNION ALL
SELECT 
    'Item request trigger exists' as check_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'trigger_notify_item_request') 
         THEN 'PASS' ELSE 'FAIL' END as status;

SELECT 'Notification system setup complete!' as result;
