"use client";

import React from "react";
import { Camera, Package, MapPin, Heart } from "lucide-react";

const STEPS = [
  { id: 1, title: "Photo", icon: Camera, description: "Show your item" },
  {
    id: 2,
    title: "Details",
    icon: Package,
    description: "What are you sharing?",
  },
  { id: 3, title: "Location", icon: MapPin, description: "Where to collect" },
  { id: 4, title: "Impact", icon: Heart, description: "Choose destination" },
];

interface AddItemHeaderProps {
  itemType: "food" | "non-food";
  currentStep: number;
}

export default function AddItemHeader({ itemType, currentStep }: AddItemHeaderProps) {
  return (
    <div className="sticky top-0 bg-white border-b border-gray-100 p-4 z-10">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">
          Share {itemType === "food" ? "Food" : "Items"}
        </h1>
        <div className="text-sm text-gray-500">{currentStep}/4</div>
      </div>

      {/* Progress Bar */}
      <div className="flex space-x-2">
        {STEPS.map((step) => (
          <div
            key={step.id}
            className={`flex-1 h-2 rounded-full transition-all duration-300 ${
              currentStep > step.id
                ? "bg-green-500"
                : currentStep === step.id
                  ? "bg-green-300"
                  : "bg-gray-200"
            }`}
          />
        ))}
      </div>

      {/* Current Step Info */}
      <div className="mt-4 text-center">
        <div className="flex items-center justify-center space-x-2 mb-2">
          {React.createElement(STEPS[currentStep - 1].icon, {
            className: "w-5 h-5 text-green-600",
          })}
          <h2 className="text-lg font-semibold text-gray-900">
            {STEPS[currentStep - 1].title}
          </h2>
        </div>
        <p className="text-sm text-gray-600">
          {STEPS[currentStep - 1].description}
        </p>
      </div>
    </div>
  );
}

