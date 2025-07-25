
-- Add collaboration_id field to items table
ALTER TABLE items ADD COLUMN collaboration_id UUID REFERENCES collaboration_requests(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_items_collaboration_id ON items(collaboration_id);

-- Update RLS policies to handle collaboration filtering
DROP POLICY IF EXISTS "Anyone can view available items" ON items;
CREATE POLICY "Anyone can view available items" ON items FOR SELECT USING (true);
