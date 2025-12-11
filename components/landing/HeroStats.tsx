"use client";

import React from "react";

interface HeroStatsProps {
  itemsShared: number;
  communityMembers: number;
  activeCollaborations: number;
  loading: boolean;
}

export default function HeroStats({
  itemsShared,
  communityMembers,
  activeCollaborations,
  loading,
}: HeroStatsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-5 sm:gap-6 lg:gap-8 text-center mt-4 sm:mt-6 lg:mt-8 animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
      <div className="flex flex-col items-center">
        <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-yellow-300 mb-1 drop-shadow-lg">
          {loading ? '...' : `${itemsShared}+`}
        </div>
        <div className="text-xs sm:text-sm text-white/90 font-medium">Items Shared</div>
      </div>
      <div className="flex flex-col items-center">
        <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-green-300 mb-1 drop-shadow-lg">
          {loading ? '...' : `${communityMembers}+`}
        </div>
        <div className="text-xs sm:text-sm text-white/90 font-medium">Community Members</div>
      </div>
      <div className="flex flex-col items-center">
        <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-blue-300 mb-1 drop-shadow-lg">
          {loading ? '...' : activeCollaborations}
        </div>
        <div className="text-xs sm:text-sm text-white/90 font-medium">Active Collaborations</div>
      </div>
    </div>
  );
}

