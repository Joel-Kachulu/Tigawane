-- Add notifications table
CREATE TABLE IF NOT EXISTS notifications (
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

-- Add collaboration_requests table for big moves/donations
CREATE TABLE IF NOT EXISTS collaboration_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  target_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add collaboration_participants table
CREATE TABLE IF NOT EXISTS collaboration_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  collaboration_id UUID REFERENCES collaboration_requests(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(collaboration_id, user_id)
);

-- Add collaboration_messages table for group chats
CREATE TABLE IF NOT EXISTS collaboration_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  collaboration_id UUID REFERENCES collaboration_requests(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update items table to have better status options
ALTER TABLE items DROP CONSTRAINT IF EXISTS items_status_check;
ALTER TABLE items ADD CONSTRAINT items_status_check 
CHECK (status IN ('available', 'requested', 'reserved', 'completed', 'cancelled'));

-- Update claims table to have better status options
ALTER TABLE claims DROP CONSTRAINT IF EXISTS claims_status_check;
ALTER TABLE claims ADD CONSTRAINT claims_status_check 
CHECK (status IN ('pending', 'accepted', 'rejected', 'completed', 'cancelled'));

-- Enable RLS on new tables
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert notifications" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for collaboration_requests
CREATE POLICY "Anyone can view active collaborations" ON collaboration_requests FOR SELECT USING (status = 'active');
CREATE POLICY "Users can create collaborations" ON collaboration_requests FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators can update own collaborations" ON collaboration_requests FOR UPDATE USING (auth.uid() = creator_id);

-- RLS Policies for collaboration_participants
CREATE POLICY "Users can view collaboration participants" ON collaboration_participants FOR SELECT USING (true);
CREATE POLICY "Users can join collaborations" ON collaboration_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave collaborations" ON collaboration_participants FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for collaboration_messages
CREATE POLICY "Participants can view collaboration messages" ON collaboration_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM collaboration_participants 
    WHERE collaboration_participants.collaboration_id = collaboration_messages.collaboration_id 
    AND collaboration_participants.user_id = auth.uid()
  )
);
CREATE POLICY "Participants can send collaboration messages" ON collaboration_messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM collaboration_participants 
    WHERE collaboration_participants.collaboration_id = collaboration_messages.collaboration_id 
    AND collaboration_participants.user_id = auth.uid()
  )
);

-- Function to create notifications
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
  INSERT INTO notifications (user_id, type, title, message, related_item_id, related_claim_id)
  VALUES (p_user_id, p_type, p_title, p_message, p_related_item_id, p_related_claim_id)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify item owner when request is made
CREATE OR REPLACE FUNCTION notify_item_request() RETURNS TRIGGER AS $$
DECLARE
  item_title TEXT;
  claimer_name TEXT;
  owner_id UUID;
BEGIN
  -- Get item details and owner
  SELECT title, user_id INTO item_title, owner_id
  FROM items WHERE id = NEW.item_id;
  
  -- Get claimer name
  SELECT full_name INTO claimer_name
  FROM profiles WHERE id = NEW.claimer_id;
  
  -- Create notification for item owner
  PERFORM create_notification(
    owner_id,
    'item_request',
    'New Item Request',
    COALESCE(claimer_name, 'Someone') || ' has requested your item: ' || item_title,
    NEW.item_id,
    NEW.id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify when message is sent
CREATE OR REPLACE FUNCTION notify_message_sent() RETURNS TRIGGER AS $$
DECLARE
  claim_record RECORD;
  sender_name TEXT;
  recipient_id UUID;
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
  PERFORM create_notification(
    recipient_id,
    'message',
    'New Message',
    COALESCE(sender_name, 'Someone') || ' sent you a message',
    claim_record.item_id,
    NEW.claim_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_notify_item_request ON claims;
CREATE TRIGGER trigger_notify_item_request
  AFTER INSERT ON claims
  FOR EACH ROW EXECUTE FUNCTION notify_item_request();

DROP TRIGGER IF EXISTS trigger_notify_message_sent ON messages;
CREATE TRIGGER trigger_notify_message_sent
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION notify_message_sent();
