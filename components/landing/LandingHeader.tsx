"use client";

import React from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LandingHeaderProps {
  onGetStarted: () => void;
  isVisible: boolean;
}

export default function LandingHeader({ onGetStarted, isVisible }: LandingHeaderProps) {
  return (
    <header className={`w-full bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200/50 py-4 px-6 flex items-center justify-between sticky top-0 z-50 transition-all duration-500 ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
      <div className="flex items-center gap-3 group cursor-pointer">
        <div className="relative">
          <span className="text-2xl sm:text-3xl transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 filter drop-shadow-sm">
            🤝
          </span>
          <div className="absolute -inset-2 bg-green-600/20 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 blur-sm scale-110"></div>
          <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-yellow-400 opacity-0 group-hover:opacity-100 transition-all duration-300 animate-pulse" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-green-700 drop-shadow-sm group-hover:text-green-800 transition-all duration-300 group-hover:scale-105">
            Tigawane
          </h1>
          <p className="text-xs text-green-600 hidden sm:block font-medium group-hover:text-green-700 transition-colors duration-300">
            Share • Connect • Care
          </p>
        </div>
      </div>
      
      <nav className="hidden md:flex items-center gap-8">
        <a href="#how-it-works" className="text-gray-600 hover:text-green-600 transition-colors duration-300 font-medium">How It Works</a>
        <a href="#what-to-share" className="text-gray-600 hover:text-green-600 transition-colors duration-300 font-medium">What to Share</a>
        <a href="#stories" className="text-gray-600 hover:text-green-600 transition-colors duration-300 font-medium">Stories</a>
        <Button 
          onClick={onGetStarted}
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-2 rounded-full shadow-md hover:shadow-lg transition-all duration-300"
        >
          Get Started
        </Button>
      </nav>

      <div className="md:hidden">
        <Button 
          onClick={onGetStarted}
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-full shadow-md hover:shadow-lg transition-all duration-300"
        >
          Start Sharing
        </Button>
      </div>
    </header>
  );
}

