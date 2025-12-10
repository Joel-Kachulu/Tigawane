-- Diagnostic script to check location issues
-- Run this to see what items have invalid or missing coordinates

-- 1. Check items with missing coordinates
SELECT 
  'Missing coordinates' as issue_type,
  COUNT(*) as count,
  array_agg(id::text) as item_ids
FROM items
WHERE pickup_lat IS NULL OR pickup_lon IS NULL OR pickup_geog IS NULL;

-- 2. Check items with null island coordinates (0,0)
SELECT 
  'Null island coordinates (0,0)' as issue_type,
  COUNT(*) as count,
  array_agg(id::text) as item_ids
FROM items
WHERE pickup_lat = 0 AND pickup_lon = 0;

-- 3. Check items with invalid coordinate ranges
SELECT 
  'Invalid coordinate ranges' as issue_type,
  COUNT(*) as count,
  array_agg(id::text) as item_ids
FROM items
WHERE (pickup_lat < -90 OR pickup_lat > 90 OR pickup_lon < -180 OR pickup_lon > 180)
  AND pickup_lat IS NOT NULL AND pickup_lon IS NOT NULL;

-- 4. Show recent items with their coordinates
SELECT 
  id,
  title,
  item_type,
  status,
  pickup_label,
  pickup_lat,
  pickup_lon,
  CASE 
    WHEN pickup_geog IS NULL THEN 'NULL'
    ELSE 'OK'
  END as geography_status,
  created_at
FROM items
ORDER BY created_at DESC
LIMIT 20;

-- 5. Check if trigger is working (items with lat/lon but no geography)
SELECT 
  'Missing geography (trigger issue)' as issue_type,
  COUNT(*) as count,
  array_agg(id::text) as item_ids
FROM items
WHERE pickup_lat IS NOT NULL 
  AND pickup_lon IS NOT NULL 
  AND pickup_geog IS NULL
  AND pickup_lat != 0 
  AND pickup_lon != 0;

