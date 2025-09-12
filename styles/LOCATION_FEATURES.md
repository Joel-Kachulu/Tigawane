# Location-Based Features for Tigawane

## Overview
Tigawane now includes location-based filtering to help users find items shared by people nearby, reducing logistics problems and making community sharing more practical.

## New Features

### 1. Location Coordinates
- **Database Changes**: Added `latitude` and `longitude` columns to both `profiles` and `items` tables
- **GPS Support**: Items and user profiles now store precise GPS coordinates
- **Geocoding**: Automatic conversion of addresses to coordinates using OpenStreetMap

### 2. Location Context
- **User Location**: Automatically detects user's current location using browser geolocation
- **Location Selection**: Users can choose from predefined Malawi cities or use their current location
- **Radius Filtering**: Configurable search radius (1km to 100km)

### 3. Location Selector Component
- **Current Location Display**: Shows user's current GPS coordinates
- **City Selection**: Dropdown with major Malawi cities (Lilongwe, Blantyre, Mzuzu, etc.)
- **Radius Control**: Adjustable search radius with visual feedback
- **Location Refresh**: Button to update current location

### 4. Location-Based Item Filtering
- **Distance Calculation**: Uses Haversine formula to calculate distances between coordinates
- **Radius Search**: Shows only items within the selected radius
- **Distance Display**: Each item card shows the distance from user's location
- **Fallback**: If location filtering fails, falls back to regular item listing

### 5. Database Functions
- **`calculate_distance()`**: PostgreSQL function to calculate distance between two points
- **`get_items_within_radius()`**: Function to get items within a specified radius
- **Indexing**: Database indexes on latitude/longitude for efficient queries

## How It Works

### For Users
1. **Location Detection**: App automatically requests location permission on first visit
2. **Location Selection**: Users can choose their city or use current location
3. **Radius Setting**: Users set how far they're willing to travel (default: 10km)
4. **Filtered Results**: Items are shown sorted by distance, with distance badges

### For Item Sharing
1. **Location Capture**: When adding items, location coordinates are automatically captured
2. **City Mapping**: If user selects a city, coordinates are mapped automatically
3. **GPS Fallback**: If geolocation fails, uses city center coordinates

## Technical Implementation

### Location Service (`lib/locationService.ts`)
- Browser geolocation API integration
- Distance calculation using Haversine formula
- Geocoding using OpenStreetMap Nominatim
- Malawi cities with predefined coordinates

### Location Context (`contexts/LocationContext.tsx`)
- Global state management for user location
- Location persistence and updates
- Error handling for geolocation failures

### Database Migration (`scripts/add-location-coordinates.sql`)
- Adds coordinate columns to existing tables
- Creates distance calculation functions
- Adds database indexes for performance

## Benefits

### For Users
- **Reduced Travel**: Only see items within reasonable distance
- **Better Planning**: Know exactly how far items are before requesting
- **Local Community**: Connect with people in your area

### For the Platform
- **Practical Sharing**: Items are more likely to be collected when nearby
- **Reduced Logistics**: Less travel means more successful exchanges
- **Community Building**: Encourages local connections

## Cities Supported
- Lilongwe (Capital)
- Blantyre (Commercial Capital)
- Mzuzu (Northern Region)
- Zomba (Southern Region)
- Kasungu (Central Region)
- Mangochi (Lakeshore)
- Karonga (Northern Lakeshore)
- Salima (Central Lakeshore)
- Nkhotakota (Central Lakeshore)
- Dedza (Central Highlands)

## Future Enhancements
- **Real-time Location Updates**: Update location as user moves
- **Location History**: Remember frequently used locations
- **Custom Addresses**: Allow users to enter custom addresses
- **Map Integration**: Visual map showing item locations
- **Route Planning**: Integration with navigation apps
