"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Package } from "lucide-react";

interface ItemListEmptyStateProps {
  itemType: "food" | "non-food";
  searchTerm: string;
  collaborationId?: string | null;
  hasLocation: boolean;
}

export default function ItemListEmptyState({
  itemType,
  searchTerm,
  collaborationId,
  hasLocation,
}: ItemListEmptyStateProps) {
  if (!hasLocation) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <MapPin className="h-12 w-12 mx-auto mb-4 text-orange-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Location Required</h3>
          <p className="text-gray-600 mb-4">
            Please set your location using the Location Selector to see nearby {itemType} items.
            Items are filtered by distance from your location.
          </p>
          <p className="text-sm text-gray-500">
            Click the location button in the top right to set your location.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-8 text-center">
        <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {searchTerm
            ? `${searchTerm} not available, be the first to share`
            : `No ${itemType} items found`}
        </h3>
        <p className="text-gray-600">
          {searchTerm
            ? null
            : collaborationId
              ? "No items have been shared with this collaboration yet. Be the first to share something with your group!"
              : `Looks like there are no ${itemType} items nearby. Be the first to share in your area!`}
        </p>
      </CardContent>
    </Card>
  );
}

