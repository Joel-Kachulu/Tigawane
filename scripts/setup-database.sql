-- Enable RLS
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create food_items table
CREATE TABLE IF NOT EXISTS food_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  quantity TEXT NOT NULL,
  expiry_date DATE,
  pickup_location TEXT NOT NULL,
  image_url TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'claimed', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create claims table
CREATE TABLE IF NOT EXISTS claims (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  food_item_id UUID REFERENCES food_items(id) ON DELETE CASCADE NOT NULL,
  claimer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for food_items
CREATE POLICY "Anyone can view available food items" ON food_items FOR SELECT USING (true);
CREATE POLICY "Users can insert own food items" ON food_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own food items" ON food_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own food items" ON food_items FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for claims
CREATE POLICY "Users can view claims they're involved in" ON claims FOR SELECT USING (auth.uid() = claimer_id OR auth.uid() = owner_id);
CREATE POLICY "Users can insert claims" ON claims FOR INSERT WITH CHECK (auth.uid() = claimer_id);
CREATE POLICY "Food owners can update claims" ON claims FOR UPDATE USING (auth.uid() = owner_id);

-- Create storage bucket for food images
INSERT INTO storage.buckets (id, name, public) VALUES ('food-images', 'food-images', true);

-- Storage policy for food images
CREATE POLICY "Anyone can view food images" ON storage.objects FOR SELECT USING (bucket_id = 'food-images');
CREATE POLICY "Authenticated users can upload food images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'food-images' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update own food images" ON storage.objects FOR UPDATE USING (bucket_id = 'food-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own food images" ON storage.objects FOR DELETE USING (bucket_id = 'food-images' AND auth.uid()::text = (storage.foldername(name))[1]);
