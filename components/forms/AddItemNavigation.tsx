"use client";

import React from "react";
import { ArrowLeft, ArrowRight, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AddItemNavigationProps {
  currentStep: number;
  canProceed: boolean;
  loading: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

export default function AddItemNavigation({
  currentStep,
  canProceed,
  loading,
  onPrevious,
  onNext,
  onSubmit,
}: AddItemNavigationProps) {
  return (
    <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4">
      <div className="flex space-x-3">
        {currentStep > 1 && (
          <Button
            variant="outline"
            onClick={onPrevious}
            className="flex-1 h-12 text-base"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        )}

        {currentStep < 4 ? (
          <Button
            onClick={onNext}
            disabled={!canProceed}
            className={`h-12 text-base font-medium ${
              currentStep === 1 ? "w-full" : "flex-1"
            } bg-green-600 hover:bg-green-700 disabled:opacity-50`}
          >
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={onSubmit}
            disabled={loading || !canProceed}
            className="flex-1 h-12 text-base font-medium bg-green-600 hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Sharing...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Heart className="w-4 h-4" />
                <span>Share with Community</span>
              </div>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

