"use client";

import React from "react";
import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface LocationStepProps {
  formData: {
    pickup_label: string;
    is_anonymous: boolean;
  };
  onFormDataChange: (data: Partial<LocationStepProps["formData"]>) => void;
  selectedLocation: { latitude?: number; longitude?: number } | null;
}

export default function LocationStep({
  formData,
  onFormDataChange,
  selectedLocation,
}: LocationStepProps) {
  return (
    <div className="space-y-6 py-6">
      <div className="text-center">
        <h3 className="text-lg font-medium mb-2">
          Where can people collect?
        </h3>
        <p className="text-gray-600 text-sm mb-6">
          Help people find you easily
        </p>
      </div>

      <div className="space-y-4">
        {selectedLocation && selectedLocation.latitude && selectedLocation.longitude && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm text-green-700">
              <MapPin className="h-4 w-4" />
              <span className="font-medium">GPS location available - will be used if geocoding fails</span>
            </div>
          </div>
        )}
        <div>
          <Label htmlFor="pickup_label" className="text-base font-medium">Pickup Location *</Label>
          <Input
            id="pickup_label"
            value={formData.pickup_label}
            onChange={(e) => onFormDataChange({ pickup_label: e.target.value })}
            placeholder="e.g., COM, Blantyre or Area 25, Lilongwe"
            className="mt-2 text-base h-12"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            Enter location in format: <strong>Area/Location, District</strong> (e.g., "COM, Blantyre" or "Area 25, Lilongwe"). 
            The app will find coordinates automatically. If that fails, your current GPS location will be used.
          </p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center space-x-2">
            <Switch
              id="is_anonymous"
              checked={formData.is_anonymous}
              onCheckedChange={(checked) =>
                onFormDataChange({ is_anonymous: checked })
              }
            />
            <Label htmlFor="is_anonymous" className="text-base">
              Share anonymously
            </Label>
          </div>
          <p className="text-sm text-blue-600 mt-2">
            Your name won't be shown to others
          </p>
        </div>
      </div>
    </div>
  );
}

