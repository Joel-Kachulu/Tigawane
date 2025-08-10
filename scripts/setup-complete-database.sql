-- Drop existing tables if they exist (be careful with this in production!)
DROP TABLE IF EXISTS collaboration_messages CASCADE;
DROP TABLE IF EXISTS colssages CASCADE;
DROP TABLE IF EXISTS claims CASCADE;
DROP TABLE IF EXISTS itlaboration_participants CASCADE;
DROP TABLE IF EXISTS collaboration_requests CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS meems CASCADE;
DROP TABLE IF EXISTS food_items CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Create profiles table (references auth.users, not modifies it)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create items table (for both food and non-food items)
CREATE TABLE items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('food', 'non-food')),
  quantity TEXT NOT NULL,
  condition TEXT, -- for non-food items (new, good, fair, etc.)
  expiry_date DATE, -- only for food items
  pickup_location TEXT NOT NULL,
  image_url TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'requested', 'reserved', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create claims table with correct column name
CREATE TABLE claims (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE NOT NULL,
  claimer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed', 'cancelled')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table for chat
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id UUID REFERENCES claims(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add notifications table
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

-- Add collaboration_requests table for big moves/donations
CREATE TABLE collaboration_requests (
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
CREATE TABLE collaboration_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  collaboration_id UUID REFERENCES collaboration_requests(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(collaboration_id, user_id)
);

-- Add collaboration_messages table for group chats
CREATE TABLE collaboration_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  collaboration_id UUID REFERENCES collaboration_requests(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for items
CREATE POLICY "Anyone can view available items" ON items FOR SELECT USING (true);
CREATE POLICY "Users can insert own items" ON items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own items" ON items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own items" ON items FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for claims
CREATE POLICY "Users can view claims they're involved in" ON claims FOR SELECT USING (auth.uid() = claimer_id OR auth.uid() = owner_id);
CREATE POLICY "Users can insert claims" ON claims FOR INSERT WITH CHECK (auth.uid() = claimer_id);
CREATE POLICY "Item owners can update claims" ON claims FOR UPDATE USING (auth.uid() = owner_id);

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their claims" ON messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM claims 
    WHERE claims.id = messages.claim_id 
    AND (claims.claimer_id = auth.uid() OR claims.owner_id = auth.uid())
  )
);
CREATE POLICY "Users can insert messages in their claims" ON messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM claims 
    WHERE claims.id = messages.claim_id 
    AND (claims.claimer_id = auth.uid() OR claims.owner_id = auth.uid())
  )
);

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

-- Create storage bucket for item images (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('item-images', 'item-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for item images
DROP POLICY IF EXISTS "Anyone can view item images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload item images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own item images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own item images" ON storage.objects;

CREATE POLICY "Anyone can view item images" ON storage.objects FOR SELECT USING (bucket_id = 'item-images');
CREATE POLICY "Authenticated users can upload item images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'item-images' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update own item images" ON storage.objects FOR UPDATE USING (bucket_id = 'item-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own item images" ON storage.objects FOR DELETE USING (bucket_id = 'item-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create a function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, location)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'location'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

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
