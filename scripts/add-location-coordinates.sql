-- Add location coordinates to profiles and items tables
-- This migration adds latitude and longitude columns for GPS-based location filtering

-- Add coordinates to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Add coordinates to items table  
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Add index for location-based queries (PostGIS extension would be better but this works for now)
CREATE INDEX IF NOT EXISTS idx_profiles_location ON profiles(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_items_location ON items(latitude, longitude);

-- Add a function to calculate distance between two points (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance(
    lat1 DECIMAL, lon1 DECIMAL, 
    lat2 DECIMAL, lon2 DECIMAL
) RETURNS DECIMAL AS $$
DECLARE
    R DECIMAL := 6371; -- Earth's radius in kilometers
    dlat DECIMAL;
    dlon DECIMAL;
    a DECIMAL;
    c DECIMAL;
BEGIN
    -- Convert to radians
    lat1 := lat1 * PI() / 180;
    lon1 := lon1 * PI() / 180;
    lat2 := lat2 * PI() / 180;
    lon2 := lon2 * PI() / 180;
    
    -- Differences
    dlat := lat2 - lat1;
    dlon := lon2 - lon1;
    
    -- Haversine formula
    a := SIN(dlat/2)^2 + COS(lat1) * COS(lat2) * SIN(dlon/2)^2;
    c := 2 * ATAN2(SQRT(a), SQRT(1-a));
    
    RETURN R * c;
END;
$$ LANGUAGE plpgsql;

-- Add a function to get items within a certain radius
CREATE OR REPLACE FUNCTION get_items_within_radius(
    user_lat DECIMAL, 
    user_lon DECIMAL, 
    radius_km DECIMAL DEFAULT 10
) RETURNS TABLE(
    id UUID,
    title TEXT,
    description TEXT,
    category TEXT,
    item_type TEXT,
    quantity TEXT,
    condition TEXT,
    expiry_date DATE,
    pickup_location TEXT,
    image_url TEXT,
    user_id UUID,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    latitude DECIMAL,
    longitude DECIMAL,
    distance DECIMAL
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
        i.user_id,
        i.status,
        i.created_at,
        i.latitude,
        i.longitude,
        calculate_distance(user_lat, user_lon, i.latitude, i.longitude) as distance
    FROM items i
    WHERE i.latitude IS NOT NULL 
        AND i.longitude IS NOT NULL
        AND calculate_distance(user_lat, user_lon, i.latitude, i.longitude) <= radius_km
    ORDER BY distance ASC;
END;
$$ LANGUAGE plpgsql;
