-- Create profiles table (references auth.users, not modifies it)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create items table (for both food and non-food items)
CREATE TABLE IF NOT EXISTS items (
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
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'claimed', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create claims table
CREATE TABLE IF NOT EXISTS claims (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE NOT NULL,
  claimer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table for chat
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_id UUID REFERENCES claims(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Anyone can view available items" ON items;
DROP POLICY IF EXISTS "Users can insert own items" ON items;
DROP POLICY IF EXISTS "Users can update own items" ON items;
DROP POLICY IF EXISTS "Users can delete own items" ON items;
DROP POLICY IF EXISTS "Users can view claims they're involved in" ON claims;
DROP POLICY IF EXISTS "Users can insert claims" ON claims;
DROP POLICY IF EXISTS "Food owners can update claims" ON claims;
DROP POLICY IF EXISTS "Users can view messages in their claims" ON messages;
DROP POLICY IF EXISTS "Users can insert messages in their claims" ON messages;

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

-- Create storage bucket for item images (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('item-images', 'item-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Anyone can view item images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload item images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own item images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own item images" ON storage.objects;

-- Storage policies for item images
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
