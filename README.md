
# Tigawane

## Geospatial Pickup Locations & Nearby Search (v7)

### Location Handling
- Each item now requires a pickup location (latitude, longitude, and human-readable label/address).
- Donors must set a pickup location via GPS, map pin, or manual entry when adding an item.
- The app no longer uses predefined cities or area dropdowns.
- If GPS fails, users must manually select or enter a location.

### Efficient Nearby Search
- The backend (Supabase/Postgres) uses a `pickup_geog` column and a GIST index for fast geospatial queries.
- Items are fetched using the `get_items_nearby(lat, lon, radius_km, limit)` RPC, which returns items ordered by distance.
- The frontend displays the distance to each item and sorts by proximity.

### Multi-Location Donations
- Donors can donate items at any location, not just their current GPS.
- Reverse geocoding (optional) can be used to fill the pickup label/address.

### Real-time & Filtering
- Real-time subscriptions are preserved; when items update, the nearby list is refreshed.
- All client-side Haversine filtering and city/area logic have been removed.

### Migration
- See `scripts/setup-database-v7.sql` for the full migration (columns, trigger, index, and RPC).

---

## Quick Start
// ...existing code...
