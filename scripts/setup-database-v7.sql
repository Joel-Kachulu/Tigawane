-- Tigawane v7: Geospatial item pickup locations and efficient nearby search

-- 1. Add new pickup location columns to items table
ALTER TABLE items
  ADD COLUMN IF NOT EXISTS pickup_lat double precision,
  ADD COLUMN IF NOT EXISTS pickup_lon double precision,
  ADD COLUMN IF NOT EXISTS pickup_label text,
  ADD COLUMN IF NOT EXISTS pickup_geog geography(Point, 4326);

-- 2. Trigger to keep pickup_geog in sync
CREATE OR REPLACE FUNCTION set_pickup_geog()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.pickup_lat IS NOT NULL AND NEW.pickup_lon IS NOT NULL THEN
    NEW.pickup_geog := ST_SetSRID(ST_MakePoint(NEW.pickup_lon, NEW.pickup_lat), 4326)::geography;
  ELSE
    NEW.pickup_geog := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_pickup_geog ON items;
CREATE TRIGGER trg_set_pickup_geog
  BEFORE INSERT OR UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION set_pickup_geog();

-- 3. GIST index for fast geospatial queries
CREATE INDEX IF NOT EXISTS idx_items_pickup_geog ON items USING GIST (pickup_geog);

-- 4. RPC: get_items_nearby(lat, lon, radius_km, limit)
CREATE OR REPLACE FUNCTION get_items_nearby(
  lat double precision,
  lon double precision,
  radius_km double precision DEFAULT 10,
  limit_count integer DEFAULT 50
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
  distance_m double precision
) AS $$
BEGIN
  RETURN QUERY
    SELECT
      i.id, i.title, i.description, i.category, i.item_type, i.quantity, i.condition, i.expiry_date,
      i.pickup_lat, i.pickup_lon, i.pickup_label, i.pickup_geog, i.user_id, i.status, i.created_at,
      ST_Distance(i.pickup_geog, ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography) AS distance_m
    FROM items i
    WHERE i.pickup_geog IS NOT NULL
      AND ST_DWithin(i.pickup_geog, ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography, radius_km * 1000)
    ORDER BY distance_m ASC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- End v7 migration
