"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";

interface WasteToShareSectionProps {
  sectionRef?: (el: HTMLElement | null) => void;
  normalizeImageUrl: (url: string) => string;
}

export default function WasteToShareSection({ sectionRef, normalizeImageUrl }: WasteToShareSectionProps) {
  const steps = [
    {
      title: "Before: Ready to Throw Away",
      description: "Instead of throwing away good items, take a moment to consider who might need them.",
      image: "/images/ready.avif",
      icon: "🗑️",
      color: "red"
    },
    {
      title: "Pack with Care",
      description: "Clean and pack items with love, knowing they'll bring joy to someone else.",
      image: "/images/tigawaneD.png",
      icon: "📦",
      color: "yellow"
    },
    {
      title: "Share the Blessing",
      description: "Share on Tigawane and connect with neighbors who need what you have.",
      image: "/images/bless1.webp",
      icon: "🤝",
      color: "green"
    }
  ];

  return (
    <section ref={sectionRef} className="py-20 bg-gradient-to-br from-blue-50 to-green-50 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-20 opacity-0 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
            Transformation
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">From Waste to Share</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">See how simple it is to turn potential waste into community blessings</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <Card 
              key={index}
              className="group hover:shadow-xl hover:-translate-y-2 transition-all duration-500 opacity-0 animate-fade-in-up relative overflow-hidden"
              style={{ animationDelay: `${index * 0.2}s` }}
            >
              <div className="h-48 relative">
                <Image
                  src={normalizeImageUrl(step.image)}
                  alt={step.title}
                  fill
                  style={{ objectFit: 'cover' }}
                  className="pointer-events-none"
                />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors duration-300" />
                <div className="absolute top-4 right-4 text-3xl bg-white rounded-full p-2 group-hover:scale-110 transition-transform duration-300">
                  {step.icon}
                </div>
              </div>
              
              <CardContent className="p-6">
                <h3 className={`text-xl font-bold text-${step.color}-700 mb-3 group-hover:text-${step.color}-800 transition-colors duration-300`}>
                  {step.title}
                </h3>
                <p className="text-gray-600 group-hover:text-gray-700 transition-colors duration-300">
                  {step.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

