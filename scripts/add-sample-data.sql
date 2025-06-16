-- First, let's check if we have any users in the profiles table
-- You'll need to sign up first, then run this script

-- Add some sample food items (replace the user_id with an actual user ID from your profiles table)
-- You can get your user ID by running: SELECT id FROM profiles LIMIT 1;

-- Example food items (you'll need to replace 'your-user-id-here' with an actual UUID)
/*
INSERT INTO food_items (title, description, category, quantity, pickup_location, user_id) VALUES
('Fresh Tomatoes', 'Ripe red tomatoes from my garden', 'vegetables', '2 kg', 'Area 25, Lilongwe', 'your-user-id-here'),
('Cooked Rice', 'Freshly cooked rice, still warm', 'prepared', '1 large pot', 'Blantyre City Center', 'your-user-id-here'),
('Bananas', 'Sweet ripe bananas', 'fruits', '1 bunch (8 pieces)', 'Mzuzu Market', 'your-user-id-here');
*/

-- To use this script:
-- 1. Sign up for an account first
-- 2. Get your user ID: SELECT id FROM profiles WHERE email = 'your-email@example.com';
-- 3. Replace 'your-user-id-here' with your actual user ID
-- 4. Uncomment and run the INSERT statements above
