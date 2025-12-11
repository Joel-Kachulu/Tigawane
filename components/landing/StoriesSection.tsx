"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, MapPin, Heart } from "lucide-react";
import SubmitStoryModal from "@/components/SubmitStoryModal";

interface Story {
  name: string;
  location: string;
  story: string;
  color?: string;
}

interface StoriesSectionProps {
  stories: Story[];
  sectionRef?: (el: HTMLElement | null) => void;
  onOpenModal: () => void;
  modalOpen: boolean;
  onCloseModal: () => void;
}

export default function StoriesSection({
  stories,
  sectionRef,
  onOpenModal,
  modalOpen,
  onCloseModal,
}: StoriesSectionProps) {
  return (
    <section id="stories" ref={sectionRef} className="py-20 bg-white relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-green-100 to-blue-100"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-20 opacity-0 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
            Success Stories
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">Real Stories</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">See how Tigawane is changing lives across Malawi</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {stories.map((s, i) => (
            <Card 
              key={i} 
              className={`border-l-4 border-l-${s.color || (i % 2 === 0 ? "green" : "blue")}-500 hover:shadow-xl hover:-translate-y-2 transition-all duration-500 group opacity-0 animate-fade-in-up`}
              style={{ animationDelay: `${i * 0.2}s` }}
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 bg-${s.color || (i % 2 === 0 ? "green" : "blue")}-100 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:bg-${s.color || (i % 2 === 0 ? "green" : "blue")}-200 transition-all duration-300 relative`}>
                    <span className={`text-${s.color || (i % 2 === 0 ? "green" : "blue")}-600 font-bold group-hover:text-${s.color || (i % 2 === 0 ? "green" : "blue")}-700 transition-colors duration-300`}>
                      {s.name[0]}
                    </span>
                    <Heart className="absolute -top-1 -right-1 w-3 h-3 text-red-400 opacity-0 group-hover:opacity-100 transition-all duration-300 animate-pulse" />
                  </div>
                  <div className="flex-1">
                    <blockquote className="text-lg italic text-gray-700 mb-3 group-hover:text-gray-800 transition-colors duration-300">
                      "{s.story}"
                    </blockquote>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold group-hover:text-gray-800 transition-colors duration-300">{s.name}</span>
                      <span className="text-gray-500">•</span>
                      <span className="text-gray-500 flex items-center gap-1 group-hover:text-gray-600 transition-colors duration-300">
                        <MapPin className="h-4 w-4 group-hover:scale-110 transition-transform duration-300" />
                        {s.location}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12 opacity-0 animate-fade-in-up" style={{ animationDelay: '0.8s' }}>
          <p className="text-lg text-gray-600 mb-4">Want to be featured? Share your Tigawane moment!</p>
          <Button
            variant="outline"
            className="border-green-500 text-green-600 hover:bg-green-50 hover:scale-105 hover:shadow-lg transition-all duration-300 group"
            onClick={onOpenModal}
          >
            <MessageCircle className="mr-2 h-4 w-4 group-hover:scale-110 transition-transform duration-300" />
            Submit your story
          </Button>
          <SubmitStoryModal
            open={modalOpen}
            onClose={onCloseModal}
            onSuccess={() => {}}
          />
        </div>
      </div>
    </section>
  );
}

