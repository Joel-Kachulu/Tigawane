"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";

interface WhatToShareSectionProps {
  sectionRef?: (el: HTMLElement | null) => void;
  normalizeImageUrl: (url: string) => string;
}

export default function WhatToShareSection({ sectionRef, normalizeImageUrl }: WhatToShareSectionProps) {
  const categories = [
    {
      icon: "🍚",
      title: "Food",
      color: "orange",
      items: [
        "Leftover cooked food (safe to eat)",
        "Near-expiry groceries", 
        "Garden produce",
        "Extra flour, rice, sugar, etc."
      ],
      delay: "0.1s",
      backgroundImage: "/images/food.avif"   
    },
    {
      icon: "👕",
      title: "Non-Food Items", 
      color: "blue",
      items: [
        "Clothes & shoes in good condition",
        "Kids' school uniforms",
        "Blankets & household goods", 
        "Baby supplies (bottles, wipes, etc.)"
      ],
      delay: "0.2s",
      backgroundImage: "/images/items.avif"
    }
  ];

  return (
    <section id="what-to-share" ref={sectionRef} className="py-20 bg-green-50 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-32 h-32 bg-orange-200/20 rounded-full animate-pulse" style={{ animationDelay: '0s', animationDuration: '4s' }} />
        <div className="absolute bottom-10 right-10 w-24 h-24 bg-blue-200/20 rounded-full animate-pulse" style={{ animationDelay: '2s', animationDuration: '6s' }} />
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-green-200/30 rounded-full animate-bounce" style={{ animationDelay: '1s', animationDuration: '3s' }} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-20 opacity-0 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
            What to Share
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">What You Can Share on Tigawane</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">From food to clothes, every item can find a new home</p>
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          {categories.map((category, index) => (
            <Card 
              key={index}
              className={`border-2 border-${category.color}-200 hover:border-${category.color}-400 transition-all duration-500 hover:shadow-xl hover:-translate-y-2 group opacity-0 animate-fade-in-up relative overflow-hidden`}
              style={{ animationDelay: category.delay }}
            >
              <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
                <Image
                  src={normalizeImageUrl(category.backgroundImage)}
                  alt={`${category.title} background`}
                  fill
                  style={{ objectFit: 'cover' }}
                  className="pointer-events-none"
                />
              </div>
              <div className="relative z-10">
                <CardHeader>
                  <div className="flex items-center gap-3 group-hover:scale-105 transition-transform duration-300">
                    <span className="text-3xl group-hover:animate-bounce">{category.icon}</span>
                    <CardTitle className={`text-2xl text-${category.color}-700 group-hover:text-${category.color}-800 transition-colors duration-300`}>
                      {category.title}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {category.items.map((item, itemIndex) => (
                    <div 
                      key={itemIndex}
                      className="flex items-center gap-2 group-hover:translate-x-2 transition-transform duration-300"
                      style={{ transitionDelay: `${itemIndex * 0.1}s` }}
                    >
                      <span className={`text-${category.color}-500 group-hover:scale-125 transition-transform duration-300`}>•</span>
                      <span className="group-hover:text-gray-800 transition-colors duration-300">{item}</span>
                    </div>
                  ))}
                </CardContent>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

