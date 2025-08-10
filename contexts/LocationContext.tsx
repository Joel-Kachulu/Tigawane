"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getCurrentLocation, Location, getCityCoordinates, MALAWI_CITIES } from '@/lib/locationService';

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
  availableCities: string[];
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

  const availableCities = Object.keys(MALAWI_CITIES);

  const getCurrentUserLocation = async () => {
    setIsLoadingLocation(true);
    setLocationError(null);
    
    try {
      const location = await getCurrentLocation();
      setUserLocation(location);
      setSelectedLocation(location); // Set as default selected location
      console.log('📍 User location obtained:', location);
    } catch (error) {
      console.error('❌ Error getting user location:', error);
      setLocationError(error instanceof Error ? error.message : 'Failed to get location');
      
      // Fallback to Lilongwe if geolocation fails
      const fallbackLocation = getCityCoordinates('Lilongwe');
      if (fallbackLocation) {
        setSelectedLocation(fallbackLocation);
        console.log('📍 Using fallback location (Lilongwe):', fallbackLocation);
      }
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const clearLocationError = () => {
    setLocationError(null);
  };

  // Try to get user location on mount
  useEffect(() => {
    getCurrentUserLocation();
  }, []);

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
    availableCities,
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};
