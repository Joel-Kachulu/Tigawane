"use client";

import React from "react";
import { Users, ExternalLink, X, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface ChatHeaderProps {
  collaborationTitle: string;
  participantsCount: number;
  donationsCount: number;
  isMobile: boolean;
  isNavigating: boolean;
  showSidebar: boolean;
  onToggleSidebar: () => void;
  onNavigateToFullPage: () => void;
  onClose: () => void;
}

export default function ChatHeader({
  collaborationTitle,
  participantsCount,
  donationsCount,
  isMobile,
  isNavigating,
  showSidebar,
  onToggleSidebar,
  onNavigateToFullPage,
  onClose,
}: ChatHeaderProps) {
  return (
    <DialogHeader className="border-b border-gray-200 pb-3 px-4 sm:px-6 pt-4 sm:pt-6 bg-gradient-to-r from-green-50 via-blue-50 to-green-50 flex-shrink-0">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
            <Users className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <DialogTitle className="text-base sm:text-xl font-bold text-gray-900 truncate">
              {collaborationTitle}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-gray-600 mt-0.5 flex items-center gap-2">
              <span>{participantsCount} {participantsCount === 1 ? 'participant' : 'participants'}</span>
              {donationsCount > 0 && (
                <>
                  <span>·</span>
                  <span>{donationsCount} {donationsCount === 1 ? 'item' : 'items'} shared</span>
                </>
              )}
            </DialogDescription>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Mobile sidebar toggle */}
          {isMobile && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0"
              onClick={onToggleSidebar}
            >
              <Info className="h-5 w-5" />
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="bg-white hover:bg-gray-50 border-gray-300 text-xs sm:text-sm"
            onClick={onNavigateToFullPage}
            disabled={isNavigating}
          >
            {isNavigating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <ExternalLink className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline md:inline">Full Page</span>
                <span className="sm:hidden">View</span>
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </DialogHeader>
  );
}

