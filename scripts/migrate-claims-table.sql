-- Check if the old column exists and rename it
DO $$ 
BEGIN
    -- Check if food_item_id column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'claims' AND column_name = 'food_item_id') THEN
        -- Rename the column
        ALTER TABLE claims RENAME COLUMN food_item_id TO item_id;
        
        -- Drop the old foreign key constraint if it exists
        ALTER TABLE claims DROP CONSTRAINT IF EXISTS claims_food_item_id_fkey;
        
        -- Add the new foreign key constraint
        ALTER TABLE claims ADD CONSTRAINT claims_item_id_fkey 
        FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Successfully migrated claims table from food_item_id to item_id';
    ELSE
        RAISE NOTICE 'Column food_item_id does not exist, no migration needed';
    END IF;
END $$;
