-- Tigawane v8: Optimized Location Features with Validation and Performance Improvements
-- This script fixes location accuracy issues and improves performance

-- 1. Improve the trigger to validate coordinates before creating geography point
CREATE OR REPLACE FUNCTION set_pickup_geog()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate coordinates before creating geography point
  IF NEW.pickup_lat IS NOT NULL 
     AND NEW.pickup_lon IS NOT NULL 
     AND NEW.pickup_lat >= -90 
     AND NEW.pickup_lat <= 90 
     AND NEW.pickup_lon >= -180 
     AND NEW.pickup_lon <= 180
     AND NOT (NEW.pickup_lat = 0 AND NEW.pickup_lon = 0) THEN -- Exclude 0,0 (null island)
    NEW.pickup_geog := ST_SetSRID(ST_MakePoint(NEW.pickup_lon, NEW.pickup_lat), 4326)::geography;
  ELSE
    NEW.pickup_geog := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Drop all existing versions of get_items_nearby to avoid conflicts
-- This dynamically drops all overloads of the function
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT oid::regprocedure as func_name 
              FROM pg_proc 
              WHERE proname = 'get_items_nearby') 
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_name || ' CASCADE';
    END LOOP;
END $$;

-- 3. Optimized RPC function with input validation and better performance
CREATE OR REPLACE FUNCTION get_items_nearby(
  lat double precision,
  lon double precision,
  radius_km double precision DEFAULT 10,
  limit_count integer DEFAULT 50,
  item_type_filter text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  category text,
  item_type text,
  quantity text,
  condition text,
  expiry_date timestamptz,
  pickup_lat double precision,
  pickup_lon double precision,
  pickup_label text,
  pickup_geog geography,
  user_id uuid,
  status text,
  created_at timestamptz,
  distance_m double precision,
  collaboration_id uuid
) AS $$
DECLARE
  user_point geography;
BEGIN
  -- Validate input coordinates
  IF lat IS NULL OR lon IS NULL OR 
     lat < -90 OR lat > 90 OR 
     lon < -180 OR lon > 180 OR
     (lat = 0 AND lon = 0) THEN
    RAISE EXCEPTION 'Invalid coordinates: lat=%, lon=%', lat, lon;
  END IF;

  -- Validate radius
  IF radius_km IS NULL OR radius_km <= 0 OR radius_km > 1000 THEN
    RAISE EXCEPTION 'Invalid radius: % km (must be between 0 and 1000)', radius_km;
  END IF;

  -- Validate limit
  IF limit_count IS NULL OR limit_count <= 0 OR limit_count > 500 THEN
    RAISE EXCEPTION 'Invalid limit: % (must be between 1 and 500)', limit_count;
  END IF;

  -- Create user point once for reuse
  user_point := ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography;

  -- Optimized query with proper filtering
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
      i.pickup_lat, 
      i.pickup_lon, 
      i.pickup_label, 
      i.pickup_geog, 
      i.user_id, 
      i.status, 
      i.created_at,
      -- Calculate distance in meters (ST_Distance on geography returns meters)
      ROUND(ST_Distance(i.pickup_geog, user_point)::numeric, 2) AS distance_m,
      i.collaboration_id
    FROM items i
    WHERE i.pickup_geog IS NOT NULL
      -- Only include items with valid coordinates (not 0,0)
      AND i.pickup_lat != 0 
      AND i.pickup_lon != 0
      AND i.pickup_lat >= -90 
      AND i.pickup_lat <= 90 
      AND i.pickup_lon >= -180 
      AND i.pickup_lon <= 180
      -- Filter by item type if provided
      AND (item_type_filter IS NULL OR i.item_type = item_type_filter)
      -- Only show available or requested items
      AND i.status IN ('available', 'requested')
      -- Use ST_DWithin for efficient spatial filtering (uses GIST index)
      AND ST_DWithin(i.pickup_geog, user_point, radius_km * 1000)
    ORDER BY distance_m ASC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create index on status for better performance when filtering
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status) WHERE status IN ('available', 'requested');

-- 5. Create composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_items_type_status ON items(item_type, status) 
WHERE status IN ('available', 'requested') AND pickup_geog IS NOT NULL;

-- 6. Fix existing items with invalid coordinates (set to NULL)
UPDATE items 
SET pickup_geog = NULL, pickup_lat = NULL, pickup_lon = NULL
WHERE (pickup_lat = 0 AND pickup_lon = 0)
   OR pickup_lat IS NULL 
   OR pickup_lon IS NULL
   OR pickup_lat < -90 
   OR pickup_lat > 90 
   OR pickup_lon < -180 
   OR pickup_lon > 180;

-- 7. Add function to validate and fix coordinates (for admin use)
CREATE OR REPLACE FUNCTION validate_item_coordinates(item_id_param uuid)
RETURNS boolean AS $$
DECLARE
  item_record RECORD;
BEGIN
  SELECT pickup_lat, pickup_lon INTO item_record
  FROM items
  WHERE id = item_id_param;

  IF item_record.pickup_lat IS NULL OR item_record.pickup_lon IS NULL THEN
    RETURN false;
  END IF;

  IF item_record.pickup_lat < -90 OR item_record.pickup_lat > 90 OR
     item_record.pickup_lon < -180 OR item_record.pickup_lon > 180 OR
     (item_record.pickup_lat = 0 AND item_record.pickup_lon = 0) THEN
    -- Fix invalid coordinates
    UPDATE items
    SET pickup_geog = NULL, pickup_lat = NULL, pickup_lon = NULL
    WHERE id = item_id_param;
    RETURN false;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Add comment for documentation
COMMENT ON FUNCTION get_items_nearby IS 
'Optimized function to get items within a radius. Returns distance in meters. 
Validates input coordinates and filters out invalid items. 
Uses GIST index on pickup_geog for fast spatial queries.';

-- End v8 optimization

