"use client";

import React from "react";
import { Users, Gift, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ParticipantsList from "./ParticipantsList";
import DonationsList from "./DonationsList";

interface Participant {
  id: string;
  user_id: string;
  full_name: string | null;
}

interface DonationSummary {
  food_count: number;
  item_count: number;
  total_count: number;
  recent_donations: Array<{
    id: string;
    title: string;
    item_type: string;
    user_name?: string;
    created_at: string;
  }>;
}

interface CollaborationSidebarProps {
  participants: Participant[];
  donationSummary: DonationSummary | null;
  activeTab: "participants" | "donations";
  onTabChange: (tab: "participants" | "donations") => void;
  formatTime: (dateString: string) => string;
  isMobile?: boolean;
  onClose?: () => void;
}

export default function CollaborationSidebar({
  participants,
  donationSummary,
  activeTab,
  onTabChange,
  formatTime,
  isMobile = false,
  onClose,
}: CollaborationSidebarProps) {
  const content = (
    <Tabs
      value={activeTab}
      onValueChange={(v) => onTabChange(v as "participants" | "donations")}
      className="flex-1 flex flex-col overflow-hidden"
    >
      <TabsList className="grid w-full grid-cols-2 m-2 sm:m-3">
        <TabsTrigger value="participants" className="text-xs">
          <Users className="h-4 w-4 mr-1" />
          People
        </TabsTrigger>
        <TabsTrigger value="donations" className="text-xs">
          <Gift className="h-4 w-4 mr-1" />
          Items
        </TabsTrigger>
      </TabsList>

      <TabsContent value="participants" className="flex-1 overflow-y-auto p-4 mt-0">
        <ParticipantsList participants={participants} />
      </TabsContent>

      <TabsContent value="donations" className="flex-1 overflow-y-auto p-4 mt-0">
        <DonationsList donationSummary={donationSummary} formatTime={formatTime} />
      </TabsContent>
    </Tabs>
  );

  if (isMobile) {
    return (
      <div className="absolute inset-0 z-50 bg-white flex flex-col">
        <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between bg-gradient-to-r from-green-50 to-blue-50">
          <h3 className="font-semibold text-lg">Collaboration Info</h3>
          {onClose && (
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
        </div>
        {content}
      </div>
    );
  }

  return (
    <div className="hidden md:flex md:flex-col md:w-80 border-l border-gray-200 bg-white flex-shrink-0">
      {content}
    </div>
  );
}

