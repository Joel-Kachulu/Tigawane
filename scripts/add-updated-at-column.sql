-- Add updated_at column to items table if it doesn't exist
DO $$ 
BEGIN
    -- Check if updated_at column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'items' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE items ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        
        -- Update existing records to have updated_at = created_at
        UPDATE items SET updated_at = created_at WHERE updated_at IS NULL;
        
        RAISE NOTICE 'Added updated_at column to items table';
    ELSE
        RAISE NOTICE 'updated_at column already exists in items table';
    END IF;
END $$;

-- Create a trigger to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if it exists and create new one
DROP TRIGGER IF EXISTS update_items_updated_at ON items;
CREATE TRIGGER update_items_updated_at
    BEFORE UPDATE ON items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Also add updated_at to other tables if they don't have it
DO $$ 
BEGIN
    -- Add to profiles table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE profiles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        UPDATE profiles SET updated_at = created_at WHERE updated_at IS NULL;
    END IF;
    
    -- Add to claims table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'claims' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE claims ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        UPDATE claims SET updated_at = created_at WHERE updated_at IS NULL;
    END IF;
END $$;

-- Create triggers for other tables
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_claims_updated_at ON claims;
CREATE TRIGGER update_claims_updated_at
    BEFORE UPDATE ON claims
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

SELECT 'Updated_at columns and triggers setup complete!' as result;
