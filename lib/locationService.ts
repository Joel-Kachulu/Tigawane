// Location service for handling GPS coordinates and geocoding

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface LocationWithDistance extends Location {
  distance: number; // in kilometers
}

// Get user's current location using browser geolocation
export const getCurrentLocation = (): Promise<Location> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        // Provide more specific error messages
        let errorMessage = 'Geolocation error: ';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Permission denied. Please enable location access in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location information unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage += 'Location request timed out. Please try again or set location manually.';
            break;
          default:
            errorMessage += error.message || 'Unknown error';
            break;
        }
        reject(new Error(errorMessage));
      },
      {
        enableHighAccuracy: false, // Changed to false for faster response
        timeout: 15000, // Increased to 15 seconds
        maximumAge: 300000, // 5 minutes - use cached location if available
      }
    );
  });
};

// Calculate distance between two points using Haversine formula
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Format distance for display
export const formatDistance = (distance: number): string => {
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`;
  }
  return `${distance.toFixed(1)}km`;
};

// Geocode an address to coordinates (using our API proxy to avoid CORS and certificate issues)
export const geocodeAddress = async (address: string): Promise<Location> => {
  try {
    // Use our API route instead of direct Nominatim call to avoid CORS and certificate issues
    const response = await fetch(
      `/api/geocode?q=${encodeURIComponent(address)}&country=MW`
    );
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (errorData.code === 'CERT_ERROR') {
        throw new Error('Certificate validation failed. Please check your system clock.');
      }
      throw new Error(errorData.error || 'Geocoding request failed');
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }

    return {
      latitude: data.latitude,
      longitude: data.longitude,
      address: data.display_name || address,
    };
  } catch (error: any) {
    console.error('Geocoding error:', error);
    throw new Error(error.message || 'Failed to geocode address');
  }
};

// Reverse geocode coordinates to address
export const reverseGeocode = async (
  latitude: number,
  longitude: number
): Promise<string> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=16`
    );
    
    if (!response.ok) {
      throw new Error('Reverse geocoding request failed');
    }

    const data = await response.json();
    return data.display_name || 'Unknown location';
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return 'Unknown location';
  }
};

// Common cities in Malawi with their coordinates

// Validate coordinates
export const isValidCoordinates = (latitude: number, longitude: number): boolean => {
  return (
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    !isNaN(latitude) &&
    !isNaN(longitude)
  );
};

// Default radius options for location filtering
export const RADIUS_OPTIONS = [
  { value: 1, label: '1 km' },
  { value: 5, label: '5 km' },
  { value: 10, label: '10 km' },
  { value: 25, label: '25 km' },
  { value: 50, label: '50 km' },
  { value: 100, label: '100 km' },
];