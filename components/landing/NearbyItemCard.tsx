"use client";

import React from "react";

interface NearbyItem {
  id: string;
  title: string;
  item_type: 'food' | 'non-food';
  distance: number;
  emoji: string;
  category?: string;
}

interface NearbyItemCardProps {
  item: NearbyItem;
  onGetStarted: () => void;
}

export default function NearbyItemCard({ item, onGetStarted }: NearbyItemCardProps) {
  return (
    <button
      className="flex-shrink-0 w-56 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-300 cursor-pointer hover:scale-105 text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
      onClick={onGetStarted}
    >
      <div className="text-4xl mb-4">{item.emoji}</div>
      <h3 className="font-semibold text-gray-900 mb-3 text-lg">{item.title}</h3>
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600 font-medium">{item.distance}km away</span>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
          item.item_type === 'food' ? 'bg-orange-100 text-orange-700' :
          'bg-purple-100 text-purple-700'
        }`}>
          {item.item_type === 'food' ? 'Food' : 'Items'}
        </div>
      </div>
    </button>
  );
}

