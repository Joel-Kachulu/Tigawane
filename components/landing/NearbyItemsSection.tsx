"use client";

import React from "react";
import { MapPin, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import NearbyItemCard from "./NearbyItemCard";

interface NearbyItem {
  id: string;
  title: string;
  item_type: 'food' | 'non-food';
  distance: number;
  emoji: string;
  category?: string;
}

interface NearbyItemsSectionProps {
  nearbyItems: NearbyItem[];
  nearbyLoading: boolean;
  selectedLocation: { latitude?: number; longitude?: number } | null;
  onGetStarted: () => void;
}

export default function NearbyItemsSection({
  nearbyItems,
  nearbyLoading,
  selectedLocation,
  onGetStarted,
}: NearbyItemsSectionProps) {
  return (
    <section data-section="near-you" className="py-16 bg-gradient-to-br from-gray-50 to-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-xl">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <span className="text-white text-2xl">📍</span>
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Near You</h2>
                <p className="text-gray-600 text-lg">Fresh items within walking distance</p>
              </div>
            </div>
            <Button
              onClick={onGetStarted}
              variant="outline"
              className="text-blue-600 border-blue-200 hover:bg-blue-50 px-6 py-3 font-semibold"
            >
              View All
            </Button>
          </div>
          
          <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
            {nearbyLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="flex-shrink-0 w-56 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200 animate-pulse"
                >
                  <div className="w-10 h-10 bg-gray-300 rounded mb-4"></div>
                  <div className="h-6 bg-gray-300 rounded mb-3"></div>
                  <div className="flex items-center justify-between">
                    <div className="h-4 bg-gray-300 rounded w-16"></div>
                    <div className="h-6 bg-gray-300 rounded w-12"></div>
                  </div>
                </div>
              ))
            ) : nearbyItems.length > 0 ? (
              nearbyItems.map((item) => (
                <NearbyItemCard key={item.id} item={item} onGetStarted={onGetStarted} />
              ))
            ) : !selectedLocation ? (
              <div className="flex-shrink-0 w-full text-center p-8">
                <div className="text-gray-500 mb-4">
                  <MapPin className="w-12 h-12 mx-auto mb-2" />
                  <p className="text-lg font-medium">Enable location to see nearby items</p>
                  <p className="text-sm">Allow location access to discover items in your area</p>
                </div>
              </div>
            ) : (
              <div className="flex-shrink-0 w-full text-center p-8">
                <div className="text-gray-500 mb-4">
                  <Heart className="w-12 h-12 mx-auto mb-2" />
                  <p className="text-lg font-medium">No items nearby yet</p>
                  <p className="text-sm">Be the first to share something in your area!</p>
                </div>
                <Button
                  onClick={onGetStarted}
                  className="bg-green-600 hover:bg-green-700 text-white mt-4"
                >
                  Share Something
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

