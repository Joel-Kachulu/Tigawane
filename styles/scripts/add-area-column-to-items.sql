
-- Add area column to items table for collaboration filtering
DO $$ 
BEGIN
    -- Check if area column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'items' 
        AND column_name = 'area'
    ) THEN
        ALTER TABLE items ADD COLUMN area TEXT;
        
        -- Set default area for existing items
        UPDATE items SET area = 'general' WHERE area IS NULL;
        
        RAISE NOTICE 'Added area column to items table';
    ELSE
        RAISE NOTICE 'area column already exists in items table';
    END IF;
END $$;

-- Create index for better performance on area filtering
CREATE INDEX IF NOT EXISTS idx_items_area ON items(area);

-- Update the items table comment to include area
COMMENT ON COLUMN items.area IS 'Geographic area or region for item location/collaboration filtering';
