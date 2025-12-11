"use client";

import React from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CTASectionProps {
  onGetStarted: () => void;
  sectionRef?: (el: HTMLElement | null) => void;
}

export default function CTASection({ onGetStarted, sectionRef }: CTASectionProps) {
  return (
    <section ref={sectionRef} className="py-20 bg-gradient-to-r from-green-600 to-blue-600 text-white relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-green-600/90 to-blue-600/90"></div>
        <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full animate-bounce" style={{ animationDelay: '0s', animationDuration: '3s' }} />
        <div className="absolute bottom-10 right-10 w-24 h-24 bg-yellow-400/20 rounded-full animate-bounce" style={{ animationDelay: '1.5s', animationDuration: '4s' }} />
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-white/15 rounded-full animate-pulse" style={{ animationDelay: '0.5s', animationDuration: '2s' }} />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <div className="mb-12 opacity-0 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
            <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
            Join Today
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">Ready to Share or Receive?</h2>
          <p className="text-xl md:text-2xl mb-8 leading-relaxed" style={{ animationDelay: '0.2s' }}>
            Join other Malawians creating a culture of generosity.
            <br />
            <span className="text-yellow-300 font-semibold">List your first item in seconds—food or non-food.</span>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center opacity-0 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <Button
            onClick={onGetStarted}
            size="lg"
            className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-xl px-10 py-6 shadow-lg rounded-full transform hover:scale-105 hover:shadow-xl transition-all duration-300 group"
          >
            Share Something Today 
            <ArrowRight className="ml-2 h-6 w-6 group-hover:translate-x-1 transition-transform duration-300" />
          </Button>
          <Button
            onClick={onGetStarted}
            size="lg"
            variant="outline"
            className="border-white text-green-600 hover:bg-white hover:text-green-600 font-bold text-xl px-10 py-6 shadow-lg rounded-full transform hover:scale-105 hover:shadow-xl transition-all duration-300 backdrop-blur-sm"
          >
            See What's Being Shared
          </Button>
        </div>
      </div>
    </section>
  );
}

