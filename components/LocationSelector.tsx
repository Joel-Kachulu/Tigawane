"use client"

import React, { useState } from 'react';
import { useLocation } from '@/contexts/LocationContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, Globe, Settings, RefreshCw, ChevronDown } from 'lucide-react';
import { formatDistance, RADIUS_OPTIONS } from '@/lib/locationService';

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
  // availableCities,
  } = useLocation();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [customCity, setCustomCity] = useState("");
  const [isSettingCity, setIsSettingCity] = useState(false);
  // Handler for setting custom city as location
  // Geocode city name to coordinates (simple fetch to Nominatim)
  const handleSetCustomCity = async () => {
    if (!customCity) return;
    setIsSettingCity(true);
    try {
      // Call our server-side geocode proxy to avoid CORS and rate-limit issues
      const resp = await fetch(`/api/geocode?q=${encodeURIComponent(customCity)}&country=MW`);
      if (!resp.ok) {
        // If no result, fallback to setting the address with zeroed coords
        setSelectedLocation({ latitude: 0, longitude: 0, address: customCity });
      } else {
        const data = await resp.json();
        // data expected: { latitude, longitude, display_name }
        if (data && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
          setSelectedLocation({
            latitude: Number(data.latitude),
            longitude: Number(data.longitude),
            address: data.display_name || customCity,
          });
        } else {
          setSelectedLocation({ latitude: 0, longitude: 0, address: customCity });
        }
      }
    } catch (err) {
      console.error('Geocode error:', err);
      setSelectedLocation({ latitude: 0, longitude: 0, address: customCity });
    }
    setCustomCity("");
    setIsSettingCity(false);
    setIsOpen(false);
  };

  const handleLocationRefresh = async () => {
    setIsRefreshing(true);
    await getCurrentUserLocation();
    setIsRefreshing(false);
  };



  const handleRadiusChange = (radius: string) => {
    setLocationRadius(parseInt(radius));
  };

  const getLocationDisplay = () => {
    if (!selectedLocation) return 'Select location';
    if (selectedLocation.address) {
      return selectedLocation.address.split(',')[0]; // Show first part of address
    }
    return `${selectedLocation.latitude.toFixed(4)}, ${selectedLocation.longitude.toFixed(4)}`;
  };

  const getCompactDisplay = () => {
    if (!selectedLocation) return 'Set Location';
    if (selectedLocation.address) {
      const shortAddress = selectedLocation.address.split(',')[0];
      return `${shortAddress} (${formatDistance(locationRadius)})`;
    }
    return `${formatDistance(locationRadius)} radius`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className={`flex items-center gap-3 px-4 py-3 min-h-[48px] rounded-xl border-2 border-gray-200 hover:border-green-500 transition-colors touch-target-lg ${className}`}
        >
          <MapPin className="h-5 w-5 text-blue-600" />
          <span className="text-sm font-medium mobile-text-base">{getCompactDisplay()}</span>
          <ChevronDown className="h-4 w-4 text-gray-500" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            Location & Radius Settings
          </DialogTitle>
        </DialogHeader>
        
  <div className="space-y-4">
          {/* Custom City Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Set Location Manually:</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded px-3 py-2 mb-2"
              placeholder="Enter city or area name (e.g. Lilongwe)"
              value={customCity}
              onChange={e => setCustomCity(e.target.value)}
              disabled={isSettingCity}
            />
            <Button
              className="mt-2 bg-green-600 hover:bg-green-700 text-white"
              disabled={!customCity || isSettingCity}
              onClick={handleSetCustomCity}
            >
              {isSettingCity ? 'Setting...' : 'Set Location'}
            </Button>
          </div>
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

          {/* Close Button */}
          <div className="flex justify-end pt-2">
            <Button onClick={() => setIsOpen(false)} className="bg-blue-600 hover:bg-blue-700">
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
