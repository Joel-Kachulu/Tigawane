"use client";

import React from "react";

interface MissionSectionProps {
  sectionRef?: (el: HTMLElement | null) => void;
}

export default function MissionSection({ sectionRef }: MissionSectionProps) {
  return (
    <section ref={sectionRef} className="py-20 bg-gray-900 text-white relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-gray-900 via-green-900/20 to-blue-900/20"></div>
        <div className="absolute top-20 left-20 w-40 h-40 bg-green-400/10 rounded-full animate-pulse" style={{ animationDelay: '0s', animationDuration: '4s' }} />
        <div className="absolute bottom-20 right-20 w-32 h-32 bg-blue-400/10 rounded-full animate-pulse" style={{ animationDelay: '2s', animationDuration: '6s' }} />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-white/5 rounded-full animate-bounce" style={{ animationDelay: '1s', animationDuration: '3s' }} />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <div className="mb-12 opacity-0 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            Our Mission
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-8">Why Tigawane Exists</h2>
        </div>
        <div className="space-y-6 text-lg">
          <p className="opacity-0 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            Malawi loses tons of edible food every day—while thousands go hungry.
          </p>
          <p className="opacity-0 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            Families throw away clothes, utensils, and goods that others desperately need.
          </p>
          <p className="text-2xl font-bold text-green-400 opacity-0 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
            Tigawane changes that.
          </p>
          <p className="opacity-0 animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
            We connect neighbors through generosity and dignity.
          </p>
          <blockquote className="text-xl italic text-green-300 border-l-4 border-green-400 pl-6 my-8 opacity-0 animate-fade-in-up hover:scale-105 transition-transform duration-300" style={{ animationDelay: '1s' }}>
            "Let's share" is not just our name. It's our movement.
          </blockquote>
        </div>
      </div>
    </section>
  );
}

