-- Database Performance Optimization Script
-- This script adds indexes, optimizes queries, and improves performance

-- Add indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id);
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
CREATE INDEX IF NOT EXISTS idx_items_item_type ON items(item_type);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_user_status ON items(user_id, status);
CREATE INDEX IF NOT EXISTS idx_items_type_status ON items(item_type, status);

-- Claims table indexes
CREATE INDEX IF NOT EXISTS idx_claims_claimer_id ON claims(claimer_id);
CREATE INDEX IF NOT EXISTS idx_claims_owner_id ON claims(owner_id);
CREATE INDEX IF NOT EXISTS idx_claims_item_id ON claims(item_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
CREATE INDEX IF NOT EXISTS idx_claims_created_at ON claims(created_at DESC);

-- Messages table indexes
CREATE INDEX IF NOT EXISTS idx_messages_claim_id ON messages(claim_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_claim_created ON messages(claim_id, created_at DESC);

-- Collaboration messages indexes
CREATE INDEX IF NOT EXISTS idx_collaboration_messages_collab_id ON collaboration_messages(collaboration_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_messages_sender_id ON collaboration_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_messages_created_at ON collaboration_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collaboration_messages_collab_created ON collaboration_messages(collaboration_id, created_at DESC);

-- Collaboration participants indexes
CREATE INDEX IF NOT EXISTS idx_collaboration_participants_collab_id ON collaboration_participants(collaboration_id);
CREATE INDEX IF NOT EXISTS idx_collaboration_participants_user_id ON collaboration_participants(user_id);

-- Profiles table indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON profiles(full_name);

-- Notifications table indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);

-- Admin users indexes
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON admin_users(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);

-- Create materialized view for item statistics (for admin dashboard)
CREATE MATERIALIZED VIEW IF NOT EXISTS item_stats AS
SELECT 
  item_type,
  status,
  category,
  COUNT(*) as count,
  DATE_TRUNC('day', created_at) as date
FROM items
GROUP BY item_type, status, category, DATE_TRUNC('day', created_at);

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_item_stats_date ON item_stats(date DESC);
CREATE INDEX IF NOT EXISTS idx_item_stats_type ON item_stats(item_type);
CREATE INDEX IF NOT EXISTS idx_item_stats_status ON item_stats(status);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_item_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW item_stats;
END;
$$ LANGUAGE plpgsql;

-- Create optimized function for fetching items with profiles
CREATE OR REPLACE FUNCTION get_items_with_profiles(
  p_item_type text DEFAULT NULL,
  p_status text[] DEFAULT ARRAY['available', 'requested', 'reserved'],
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  category text,
  item_type text,
  quantity text,
  condition text,
  expiry_date date,
  pickup_location text,
  image_url text,
  status text,
  created_at timestamptz,
  user_id uuid,
  owner_name text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.title,
    i.description,
    i.category,
    i.item_type,
    i.quantity,
    i.condition,
    i.expiry_date,
    i.pickup_location,
    i.image_url,
    i.status,
    i.created_at,
    i.user_id,
    COALESCE(p.full_name, 'Community Member') as owner_name
  FROM items i
  LEFT JOIN profiles p ON i.user_id = p.id
  WHERE 
    (p_item_type IS NULL OR i.item_type = p_item_type)
    AND i.status = ANY(p_status)
  ORDER BY i.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Create optimized function for user's items
CREATE OR REPLACE FUNCTION get_user_items(
  p_user_id uuid,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  category text,
  item_type text,
  quantity text,
  condition text,
  expiry_date date,
  pickup_location text,
  image_url text,
  status text,
  created_at timestamptz,
  user_id uuid
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.title,
    i.description,
    i.category,
    i.item_type,
    i.quantity,
    i.condition,
    i.expiry_date,
    i.pickup_location,
    i.image_url,
    i.status,
    i.created_at,
    i.user_id
  FROM items i
  WHERE i.user_id = p_user_id
  ORDER BY i.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Create function for optimized message fetching
CREATE OR REPLACE FUNCTION get_messages_with_sender_names(
  p_claim_id uuid,
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  message text,
  sender_id uuid,
  created_at timestamptz,
  sender_name text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.message,
    m.sender_id,
    m.created_at,
    COALESCE(p.full_name, 'Anonymous') as sender_name
  FROM messages m
  LEFT JOIN profiles p ON m.sender_id = p.id
  WHERE m.claim_id = p_claim_id
  ORDER BY m.created_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Create function for optimized collaboration message fetching
CREATE OR REPLACE FUNCTION get_collaboration_messages_with_sender_names(
  p_collaboration_id uuid,
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  message text,
  sender_id uuid,
  created_at timestamptz,
  sender_name text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cm.id,
    cm.message,
    cm.sender_id,
    cm.created_at,
    COALESCE(p.full_name, 'Anonymous') as sender_name
  FROM collaboration_messages cm
  LEFT JOIN profiles p ON cm.sender_id = p.id
  WHERE cm.collaboration_id = p_collaboration_id
  ORDER BY cm.created_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security optimizations
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_messages ENABLE ROW LEVEL SECURITY;

-- Optimized RLS policies for items (allow read for all, write for owners)
DROP POLICY IF EXISTS "Items are viewable by everyone" ON items;
CREATE POLICY "Items are viewable by everyone" ON items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own items" ON items;
CREATE POLICY "Users can insert their own items" ON items FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own items" ON items;
CREATE POLICY "Users can update their own items" ON items FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own items" ON items;
CREATE POLICY "Users can delete their own items" ON items FOR DELETE USING (auth.uid() = user_id);

-- Optimized RLS policies for messages
DROP POLICY IF EXISTS "Users can view messages for their claims" ON messages;
CREATE POLICY "Users can view messages for their claims" ON messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM claims c 
    WHERE c.id = claim_id 
    AND (c.claimer_id = auth.uid() OR c.owner_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can insert messages for their claims" ON messages;
CREATE POLICY "Users can insert messages for their claims" ON messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM claims c 
    WHERE c.id = claim_id 
    AND (c.claimer_id = auth.uid() OR c.owner_id = auth.uid())
  )
);

-- Create trigger to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_stats_trigger()
RETURNS trigger AS $$
BEGIN
  -- Refresh stats in background (non-blocking)
  PERFORM pg_notify('refresh_stats', '');
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to refresh stats when items change
DROP TRIGGER IF EXISTS refresh_stats_on_item_change ON items;
CREATE TRIGGER refresh_stats_on_item_change
  AFTER INSERT OR UPDATE OR DELETE ON items
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_stats_trigger();

-- Analyze tables for better query planning
ANALYZE items;
ANALYZE claims;
ANALYZE messages;
ANALYZE collaboration_messages;
ANALYZE profiles;
ANALYZE notifications;

-- Create connection pooling recommendations
COMMENT ON DATABASE postgres IS 'Recommended connection pool settings: max_connections=100, shared_buffers=256MB, effective_cache_size=1GB';

SELECT 'Database optimization completed successfully!' as status;
