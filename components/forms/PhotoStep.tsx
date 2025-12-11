"use client";

import React from "react";
import { Camera } from "lucide-react";
import Image from "next/image";

interface PhotoStepProps {
  itemType: "food" | "non-food";
  imagePreview: string | null;
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function PhotoStep({ itemType, imagePreview, onImageChange }: PhotoStepProps) {
  return (
    <div className="space-y-6 py-6">
      <div className="text-center">
        <h3 className="text-lg font-medium mb-2">Add a photo</h3>
        <p className="text-gray-600 text-sm mb-6">
          A good photo helps people connect with your{" "}
          {itemType === "food" ? "food" : "item"}
        </p>
      </div>

      <div className="relative">
        <input
          type="file"
          accept="image/*"
          onChange={onImageChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          id="image-upload"
        />
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
            imagePreview
              ? "border-green-300 bg-green-50"
              : "border-gray-300 bg-gray-50"
          }`}
        >
          {imagePreview ? (
            <div className="space-y-4">
              <Image
                src={imagePreview}
                alt="Preview"
                width={200}
                height={200}
                className="mx-auto rounded-lg object-cover"
              />
              <p className="text-green-600 font-medium">Perfect! 📸</p>
            </div>
          ) : (
            <div className="space-y-4">
              <Camera className="w-12 h-12 text-gray-400 mx-auto" />
              <div>
                <p className="font-medium text-gray-900">Tap to add photo</p>
                <p className="text-sm text-gray-500">Optional but recommended</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

