"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface DetailsStepProps {
  itemType: "food" | "non-food";
  formData: {
    title: string;
    description: string;
    category: string;
    quantity: string;
    condition: string;
    expiry_date: string;
  };
  onFormDataChange: (data: Partial<DetailsStepProps["formData"]>) => void;
  getCategories: () => Array<{ value: string; label: string; icon: string }>;
  conditions: Array<{ value: string; label: string; description: string }>;
}

export default function DetailsStep({
  itemType,
  formData,
  onFormDataChange,
  getCategories,
  conditions,
}: DetailsStepProps) {
  return (
    <div className="space-y-6 py-6">
      <div className="text-center">
        <h3 className="text-lg font-medium mb-2">
          Tell us about your {itemType}
        </h3>
        <p className="text-gray-600 text-sm mb-6">
          Help others understand what you're sharing
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="title" className="text-base font-medium">
            What are you sharing? *
          </Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => onFormDataChange({ title: e.target.value })}
            placeholder={
              itemType === "food"
                ? "e.g., Fresh tomatoes"
                : "e.g., Men's running shoes"
            }
            className="mt-2 text-base h-12"
          />
        </div>

        <div>
          <Label className="text-base font-medium">Category *</Label>
          <div className="grid grid-cols-2 gap-3 mt-2">
            {getCategories().map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => onFormDataChange({ category: cat.value })}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  formData.category === cat.value
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div className="text-2xl mb-1">{cat.icon}</div>
                <div className="text-sm font-medium">{cat.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="quantity" className="text-base font-medium">
            Quantity *
          </Label>
          <Input
            id="quantity"
            value={formData.quantity}
            onChange={(e) => onFormDataChange({ quantity: e.target.value })}
            placeholder={
              itemType === "food"
                ? "e.g., 2 kg, 5 pieces"
                : "e.g., 1 pair, 3 items"
            }
            className="mt-2 text-base h-12"
          />
        </div>

        {itemType === "non-food" && (
          <div>
            <Label className="text-base font-medium">Condition *</Label>
            <div className="space-y-2 mt-2">
              {conditions.map((condition) => (
                <button
                  key={condition.value}
                  type="button"
                  onClick={() => onFormDataChange({ condition: condition.value })}
                  className={`w-full p-3 rounded-lg border text-left transition-all ${
                    formData.condition === condition.value
                      ? "border-green-500 bg-green-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="font-medium">{condition.label}</div>
                  <div className="text-sm text-gray-600">
                    {condition.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {itemType === "food" && (
          <div>
            <Label
              htmlFor="expiry_date"
              className="text-base font-medium"
            >
              Best before (optional)
            </Label>
            <Input
              id="expiry_date"
              type="date"
              value={formData.expiry_date}
              onChange={(e) => onFormDataChange({ expiry_date: e.target.value })}
              className="mt-2 text-base h-12"
            />
          </div>
        )}

        <div>
          <Label htmlFor="description" className="text-base font-medium">
            Additional details (optional)
          </Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => onFormDataChange({ description: e.target.value })}
            placeholder="Any special notes..."
            rows={3}
            className="mt-2 text-base"
          />
        </div>
      </div>
    </div>
  );
}

