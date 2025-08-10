"use client"

import React, { useState } from 'react';
import { useLocation } from '@/contexts/LocationContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, Globe, Settings, RefreshCw } from 'lucide-react';
import { formatDistance, RADIUS_OPTIONS, getCityCoordinates } from '@/lib/locationService';

interface LocationSelectorProps {
  showRadiusSelector?: boolean;
  className?: string;
}

export default function LocationSelector({ showRadiusSelector = true, className = '' }: LocationSelectorProps) {
  const {
    selectedLocation,
    locationRadius,
    isLoadingLocation,
    locationError,
    setSelectedLocation,
    setLocationRadius,
    getCurrentUserLocation,
    clearLocationError,
    availableCities,
  } = useLocation();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleLocationRefresh = async () => {
    setIsRefreshing(true);
    await getCurrentUserLocation();
    setIsRefreshing(false);
  };

  const handleCityChange = (cityName: string) => {
    const cityLocation = getCityCoordinates(cityName);
    if (cityLocation) {
      setSelectedLocation(cityLocation);
    }
  };

  const handleRadiusChange = (radius: string) => {
    setLocationRadius(parseInt(radius));
  };

  const getLocationDisplay = () => {
    if (!selectedLocation) return 'Select location';
    
    if (selectedLocation.city) {
      return selectedLocation.city;
    }
    
    if (selectedLocation.address) {
      return selectedLocation.address.split(',')[0]; // Show first part of address
    }
    
    return `${selectedLocation.latitude.toFixed(4)}, ${selectedLocation.longitude.toFixed(4)}`;
  };

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MapPin className="h-5 w-5 text-blue-600" />
          Location & Radius
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Location Display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium">Current Location:</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLocationRefresh}
            disabled={isRefreshing || isLoadingLocation}
            className="h-8 px-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-sm">{getLocationDisplay()}</span>
          </div>
          
          {selectedLocation && (
            <div className="text-xs text-gray-600">
              {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
            </div>
          )}
        </div>

        {/* Location Error */}
        {locationError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-red-700">
              <Settings className="h-4 w-4" />
              <span className="text-sm">{locationError}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearLocationError}
              className="mt-2 h-6 px-2 text-xs"
            >
              Dismiss
            </Button>
          </div>
        )}

        {/* City Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Select City:</label>
          <Select
            value={selectedLocation?.city || ''}
            onValueChange={handleCityChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a city" />
            </SelectTrigger>
            <SelectContent>
              {availableCities.map((city) => (
                <SelectItem key={city} value={city}>
                  {city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Radius Selector */}
        {showRadiusSelector && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Search Radius:</label>
            <Select
              value={locationRadius.toString()}
              onValueChange={handleRadiusChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RADIUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <MapPin className="h-3 w-3" />
              <span>Items within {formatDistance(locationRadius)} of your location</span>
            </div>
          </div>
        )}

        {/* Loading State */}
        {(isLoadingLocation || isRefreshing) && (
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Getting your location...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
