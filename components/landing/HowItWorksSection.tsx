"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface HowItWorksSectionProps {
  sectionRef?: (el: HTMLElement | null) => void;
}

export default function HowItWorksSection({ sectionRef }: HowItWorksSectionProps) {
  const steps = [
    {
      step: "1",
      title: "Post what you want to give",
      description: "Food, clothes, shoes, utensils, baby items—you name it. Just snap a pic, write a short description, and share.",
      icon: "📱",
      delay: "0.1s"
    },
    {
      step: "2", 
      title: "Others in your area see the item",
      description: "Neighbors can comment, message, or request to pick it up.",
      icon: "👥",
      delay: "0.2s"
    },
    {
      step: "3",
      title: "Meet up and share", 
      description: "Once they collect it, it's done. No money. Just community.",
      icon: "🤝",
      delay: "0.3s"
    }
  ];

  return (
    <section id="how-it-works" ref={sectionRef} className="py-20 bg-white relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-green-100 to-blue-100"></div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-20 opacity-0 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Simple Process
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">How It Works</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">Three simple steps to start sharing and building community</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((item, index) => (
            <Card 
              key={index}
              className="text-center border-2 hover:border-green-300 transition-all duration-500 hover:shadow-xl hover:-translate-y-2 group opacity-0 animate-fade-in-up"
              style={{ animationDelay: item.delay }}
            >
              <CardHeader>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-green-200 group-hover:scale-110 transition-all duration-300 relative">
                  <span className="text-2xl font-bold text-green-600 group-hover:text-green-700 transition-colors duration-300">
                    {item.step}
                  </span>
                  <div className="absolute -top-2 -right-2 text-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-110">
                    {item.icon}
                  </div>
                </div>
                <CardTitle className="text-xl group-hover:text-green-700 transition-colors duration-300">
                  {item.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 group-hover:text-gray-700 transition-colors duration-300">
                  {item.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

