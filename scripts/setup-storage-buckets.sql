-- Create storage buckets if they don't exist

-- Create item-images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('item-images', 'item-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create food-images bucket (for backward compatibility)
INSERT INTO storage.buckets (id, name, public)
VALUES ('food-images', 'food-images', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for item-images
CREATE POLICY "Anyone can view item images" ON storage.objects
FOR SELECT USING (bucket_id = 'item-images');

CREATE POLICY "Users can upload item images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'item-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own item images" ON storage.objects
FOR UPDATE USING (bucket_id = 'item-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own item images" ON storage.objects
FOR DELETE USING (bucket_id = 'item-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Set up storage policies for food-images (backward compatibility)
CREATE POLICY "Anyone can view food images" ON storage.objects
FOR SELECT USING (bucket_id = 'food-images');

CREATE POLICY "Users can upload food images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'food-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own food images" ON storage.objects
FOR UPDATE USING (bucket_id = 'food-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own food images" ON storage.objects
FOR DELETE USING (bucket_id = 'food-images' AND auth.uid()::text = (storage.foldername(name))[1]);
