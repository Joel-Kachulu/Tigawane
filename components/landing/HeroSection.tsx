"use client";

import React, { useEffect, useState } from "react";
import { ArrowRight, Heart, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import HeroStats from "./HeroStats";

const HERO_IMAGES = [
  "/images/people sharing.avif",
  "/images/tig5.webp",
  "/images/girlD.png",
  "/images/tigawaneD.png",
  "/images/ready.avif",
  "/images/food1.jpg"
];
const HERO_IMAGE_ALT = "African people sharing food and building community together";

interface HeroSectionProps {
  onGetStarted: () => void;
  isVisible: boolean;
  communityStats: {
    itemsShared: number;
    communityMembers: number;
    activeCollaborations: number;
  };
  statsLoading: boolean;
}

export default function HeroSection({
  onGetStarted,
  isVisible,
  communityStats,
  statsLoading,
}: HeroSectionProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative bg-gradient-to-r from-green-600 to-blue-500 text-white min-h-[60vh] sm:min-h-[65vh] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0">
        {HERO_IMAGES.map((image, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-all duration-1000 ${
              index === currentImageIndex ? 'opacity-100 scale-100' : 'opacity-0 scale-110'
            }`}
          >
            <Image
              src={image}
              alt={HERO_IMAGE_ALT}
              fill
              style={{ objectFit: 'cover' }}
              priority={index === 0}
            />
          </div>
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-green-600/80 to-blue-500/80" />
      </div>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-12 h-12 bg-white/10 rounded-full animate-bounce" style={{ animationDelay: '0s', animationDuration: '3s' }} />
        <div className="absolute top-20 right-20 w-10 h-10 bg-yellow-400/20 rounded-full animate-bounce" style={{ animationDelay: '1s', animationDuration: '4s' }} />
        <Heart className="absolute top-16 right-16 w-6 h-6 text-white/30 animate-pulse" style={{ animationDelay: '0.5s' }} />
        <Users className="absolute bottom-20 right-12 w-5 h-5 text-white/40 animate-pulse" style={{ animationDelay: '1.5s' }} />
      </div>

      <div className={`max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 flex flex-col items-center justify-center text-center space-y-5 sm:space-y-7 relative z-10 transition-all duration-1000 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
        <div className="space-y-3 sm:space-y-4">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold drop-shadow-lg animate-fade-in-up leading-tight" style={{ animationDelay: '0.2s' }}>
            <span className="block text-yellow-300">Tigawane</span>
            <span className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl">Community Sharing</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl max-w-3xl mx-auto text-white/90 drop-shadow animate-fade-in-up leading-relaxed px-2" style={{ animationDelay: '0.4s' }}>
            Connect with your neighbors to share food, items, and experiences. 
            <span className="block mt-1.5 sm:mt-2 text-green-200 font-semibold text-sm sm:text-base md:text-lg">Build stronger communities through generous sharing.</span>
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center animate-fade-in-up w-full max-w-2xl px-4" style={{ animationDelay: '0.6s' }}>
          <Button
            onClick={onGetStarted}
            size="lg"
            className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-base sm:text-lg lg:text-xl px-6 sm:px-8 lg:px-10 py-4 sm:py-5 lg:py-6 shadow-lg rounded-full transform hover:scale-105 hover:shadow-xl transition-all duration-300 group w-full sm:w-auto sm:min-w-[200px] lg:min-w-[240px]"
          >
            <span className="mr-2 sm:mr-3 text-lg sm:text-xl lg:text-2xl">🍽️</span>
            Browse Nearby Food
          </Button>
          <Button
            onClick={onGetStarted}
            size="lg"
            variant="outline"
            className="border-2 border-white text-green-600 hover:bg-white hover:text-green-600 font-bold text-base sm:text-lg lg:text-xl px-6 sm:px-8 lg:px-10 py-4 sm:py-5 lg:py-6 shadow-lg rounded-full transform hover:scale-105 hover:shadow-xl transition-all duration-300 backdrop-blur-sm w-full sm:w-auto sm:min-w-[200px] lg:min-w-[240px]"
          >
            <ArrowRight className="mr-2 sm:mr-3 h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
            Share an Item
          </Button>
        </div>

        <HeroStats
          itemsShared={communityStats.itemsShared}
          communityMembers={communityStats.communityMembers}
          activeCollaborations={communityStats.activeCollaborations}
          loading={statsLoading}
        />
      </div>

      <div className="absolute bottom-4 sm:bottom-6 left-1/2 transform -translate-x-1/2 animate-bounce hidden sm:block">
        <div className="w-5 h-8 border-2 border-white/50 rounded-full flex justify-center">
          <div className="w-1 h-2 bg-white/70 rounded-full mt-1.5 animate-pulse"></div>
        </div>
      </div>
    </section>
  );
}

