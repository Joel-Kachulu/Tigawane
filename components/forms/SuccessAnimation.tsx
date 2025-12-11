"use client";

import React from "react";
import { Sparkles } from "lucide-react";

interface SuccessAnimationProps {
  itemType: "food" | "non-food";
}

export default function SuccessAnimation({ itemType }: SuccessAnimationProps) {
  return (
    <div className="fixed inset-0 bg-green-50 flex items-center justify-center z-50">
      <div className="text-center space-y-6 animate-bounce">
        <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto">
          <Sparkles className="w-12 h-12 text-white animate-pulse" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-green-700">Amazing! 🎉</h2>
          <p className="text-lg text-green-600">
            You've helped someone in your neighborhood!
          </p>
          <p className="text-sm text-green-500">
            {itemType === "food"
              ? "Food rescued from waste"
              : "Item given new life"}{" "}
            ✨
          </p>
        </div>
      </div>
    </div>
  );
}

