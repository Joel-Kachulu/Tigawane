"use client";

import React from "react";
import { Globe, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";

interface ImpactStepProps {
  formData: {
    collaboration_id: string | null;
    title: string;
    quantity: string;
    pickup_label: string;
    category: string;
  };
  onFormDataChange: (data: Partial<ImpactStepProps["formData"]>) => void;
  collaborations: Array<{ id: string; title: string }>;
  imagePreview: string | null;
  getCategoryIcon: (category: string) => string;
}

export default function ImpactStep({
  formData,
  onFormDataChange,
  collaborations,
  imagePreview,
  getCategoryIcon,
}: ImpactStepProps) {
  return (
    <div className="space-y-6 py-6">
      <div className="text-center">
        <h3 className="text-lg font-medium mb-2">Choose your impact</h3>
        <p className="text-gray-600 text-sm mb-6">
          Who would you like to help?
        </p>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => onFormDataChange({ collaboration_id: null })}
          className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
            !formData.collaboration_id
              ? "border-green-500 bg-green-50"
              : "border-gray-200 bg-white"
          }`}
        >
          <div className="flex items-center space-x-3">
            <Globe className="w-6 h-6 text-blue-500" />
            <div>
              <div className="font-medium">Public Donation</div>
              <div className="text-sm text-gray-600">
                Available to everyone in your area
              </div>
            </div>
          </div>
        </button>

        {collaborations.map((collaboration) => (
          <button
            key={collaboration.id}
            type="button"
            onClick={() => onFormDataChange({ collaboration_id: collaboration.id })}
            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
              formData.collaboration_id === collaboration.id
                ? "border-green-500 bg-green-50"
                : "border-gray-200 bg-white"
            }`}
          >
            <div className="flex items-center space-x-3">
              <Users className="w-6 h-6 text-purple-500" />
              <div>
                <div className="font-medium">{collaboration.title}</div>
                <div className="text-sm text-gray-600">
                  Specific cause or community project
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Preview Card */}
      <div className="mt-8">
        <h4 className="font-medium mb-3">Preview of your listing:</h4>
        <Card className="border-2 border-green-200">
          <CardContent className="p-4">
            <div className="flex space-x-3">
              {imagePreview ? (
                <Image
                  src={imagePreview}
                  alt="Preview"
                  width={60}
                  height={60}
                  className="rounded-lg object-cover"
                />
              ) : (
                <div className="w-15 h-15 bg-gray-200 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">
                    {getCategoryIcon(formData.category)}
                  </span>
                </div>
              )}
              <div className="flex-1">
                <h5 className="font-medium">
                  {formData.title || "Your item title"}
                </h5>
                <p className="text-sm text-gray-600">
                  {formData.quantity || "Quantity"}
                </p>
                <p className="text-sm text-green-600">
                  📍 {formData.pickup_label || "Your area"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

