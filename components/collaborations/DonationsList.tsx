"use client";

import React from "react";
import { Utensils, Package, Clock, Gift } from "lucide-react";

interface Donation {
  id: string;
  title: string;
  item_type: string;
  user_name?: string;
  created_at: string;
}

interface DonationSummary {
  food_count: number;
  item_count: number;
  total_count: number;
  recent_donations: Donation[];
}

interface DonationsListProps {
  donationSummary: DonationSummary | null;
  formatTime: (dateString: string) => string;
}

export default function DonationsList({
  donationSummary,
  formatTime,
}: DonationsListProps) {
  if (!donationSummary || donationSummary.total_count === 0) {
    return (
      <div className="text-center text-gray-500 py-12">
        <Gift className="h-16 w-16 mx-auto mb-4 text-gray-300" />
        <p className="text-sm font-medium mb-1">No donations yet</p>
        <p className="text-xs">Be the first to share!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <Utensils className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
            <span className="text-xs sm:text-sm font-semibold text-green-700">Food</span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-green-700">
            {donationSummary.food_count}
          </p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
            <span className="text-xs sm:text-sm font-semibold text-blue-700">Items</span>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-blue-700">
            {donationSummary.item_count}
          </p>
        </div>
      </div>
      <div>
        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Recent Donations
        </h4>
        <div className="space-y-2">
          {donationSummary.recent_donations
            .slice(0, 8)
            .map((donation) => (
              <div
                key={donation.id}
                className="p-3 bg-white rounded-lg border border-gray-200 hover:border-green-300 transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-2">
                  {donation.item_type === "food" ? (
                    <Utensils className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <Package className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">
                      {donation.title}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {donation.user_name} · {formatTime(donation.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

