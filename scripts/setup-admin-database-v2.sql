-- Create admin users table with authentication
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create reports table for flagged items
CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE NOT NULL,
  reporter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('inappropriate', 'spam', 'fake', 'offensive', 'other')),
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create categories table for dynamic category management
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  item_type TEXT NOT NULL CHECK (item_type IN ('food', 'non-food', 'both')),
  icon TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user suspensions table
CREATE TABLE IF NOT EXISTS user_suspensions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  admin_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reason TEXT NOT NULL,
  suspended_until TIMESTAMP WITH TIME ZONE,
  is_permanent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_suspensions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_users
CREATE POLICY "Only admins can view admin users" ON admin_users FOR SELECT USING (
  EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
);
CREATE POLICY "Only super admins can manage admin users" ON admin_users FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid() AND role = 'super_admin')
);

-- RLS Policies for reports
CREATE POLICY "Admins can view all reports" ON reports FOR SELECT USING (
  EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
);
CREATE POLICY "Users can create reports" ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Admins can update reports" ON reports FOR UPDATE USING (
  EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
);

-- RLS Policies for categories
CREATE POLICY "Anyone can view active categories" ON categories FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage categories" ON categories FOR ALL USING (
  EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
);

-- RLS Policies for user_suspensions
CREATE POLICY "Admins can view all suspensions" ON user_suspensions FOR SELECT USING (
  EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
);
CREATE POLICY "Admins can create suspensions" ON user_suspensions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
);

-- Insert default categories
INSERT INTO categories (name, item_type, icon) VALUES
('fruits', 'food', '🍎'),
('vegetables', 'food', '🥕'),
('grains', 'food', '🌾'),
('dairy', 'food', '🥛'),
('meat', 'food', '🍖'),
('prepared', 'food', '🍽️'),
('clothing', 'non-food', '👕'),
('shoes', 'non-food', '👟'),
('household', 'non-food', '🏠'),
('electronics', 'non-food', '📱'),
('books', 'non-food', '📚'),
('toys', 'non-food', '🧸'),
('baby-items', 'non-food', '🍼'),
('other', 'both', '📦')
ON CONFLICT (name) DO NOTHING;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user stats
CREATE OR REPLACE FUNCTION get_user_stats()
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  email TEXT,
  total_items BIGINT,
  active_items BIGINT,
  completed_items BIGINT,
  reports_count BIGINT,
  last_activity TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.email,
    COUNT(i.id) as total_items,
    COUNT(CASE WHEN i.status IN ('available', 'requested') THEN 1 END) as active_items,
    COUNT(CASE WHEN i.status = 'completed' THEN 1 END) as completed_items,
    COUNT(r.id) as reports_count,
    MAX(i.created_at) as last_activity
  FROM profiles p
  LEFT JOIN items i ON p.id = i.user_id
  LEFT JOIN reports r ON i.id = r.item_id
  GROUP BY p.id, p.full_name, p.email
  ORDER BY total_items DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create default admin user (you'll need to update this with actual credentials)
-- First create the auth user, then add to admin_users table
-- Example: 
-- INSERT INTO admin_users (user_id, role) 
-- VALUES ('your-user-id-here', 'super_admin');
