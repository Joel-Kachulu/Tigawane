
"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getCurrentLocation, Location } from '@/lib/locationService';

interface LocationContextType {
  userLocation: Location | null;
  selectedLocation: Location | null;
  locationRadius: number;
  isLoadingLocation: boolean;
  locationError: string | null;
  setUserLocation: (location: Location | null) => void;
  setSelectedLocation: (location: Location | null) => void;
  setLocationRadius: (radius: number) => void;
  getCurrentUserLocation: () => Promise<void>;
  clearLocationError: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

interface LocationProviderProps {
  children: ReactNode;
}

export const LocationProvider: React.FC<LocationProviderProps> = ({ children }) => {
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [locationRadius, setLocationRadius] = useState(10); // Default 10km radius
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);


  const getCurrentUserLocation = async () => {
    setIsLoadingLocation(true);
    setLocationError(null);
    try {
      const location = await getCurrentLocation();
      setUserLocation(location);
      // Only set as selected if the user hasn't already chosen a manual location
      setSelectedLocation(prev => {
        if (prev && (prev.address || (prev.latitude && prev.longitude))) return prev
        return location
      }); // Set as default selected location when none exists
      console.log('📍 User location obtained:', location);
    } catch (error) {
      console.error('❌ Error getting user location:', error);
      setLocationError(error instanceof Error ? error.message : 'Failed to get location');
      // No fallback to Lilongwe; user must manually select location if GPS fails
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const clearLocationError = () => {
    setLocationError(null);
  };

  // Try to get user location on mount
  useEffect(() => {
    // On mount, prefer any manually persisted location (from LocationSelector)
    try {
      const stored = localStorage.getItem('tigawane_manual_location')
      if (stored) {
        const loc = JSON.parse(stored) as Location
        // Basic validation
        if (loc && (typeof loc.latitude === 'number' || typeof loc.address === 'string')) {
          setSelectedLocation(loc)
        }
      }
    } catch (e) {
      // ignore parse errors
      console.warn('Could not read persisted manual location', e)
    }

    // Attempt to get GPS location; it will not overwrite an existing manual selection
    getCurrentUserLocation();
  }, []);

  // Persist selectedLocation whenever it changes (manual or programmatic)
  useEffect(() => {
    try {
      if (selectedLocation) {
        localStorage.setItem('tigawane_manual_location', JSON.stringify(selectedLocation))
      } else {
        localStorage.removeItem('tigawane_manual_location')
      }
    } catch (e) {
      console.warn('Failed to persist selected location', e)
    }
  }, [selectedLocation]);

  const value: LocationContextType = {
    userLocation,
    selectedLocation,
    locationRadius,
    isLoadingLocation,
    locationError,
    setUserLocation,
    setSelectedLocation,
    setLocationRadius,
    getCurrentUserLocation,
    clearLocationError,
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};