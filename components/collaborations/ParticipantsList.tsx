"use client";

import React from "react";
import { Users } from "lucide-react";

interface Participant {
  id: string;
  user_id: string;
  full_name: string | null;
}

interface ParticipantsListProps {
  participants: Participant[];
}

export default function ParticipantsList({ participants }: ParticipantsListProps) {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
        <Users className="h-4 w-4" />
        Participants ({participants.length})
      </h3>
      {participants.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">No participants yet</p>
        </div>
      ) : (
        participants.map((participant) => (
          <div
            key={participant.id}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-sm font-semibold text-white shadow-md">
              {participant.full_name?.charAt(0).toUpperCase() || "U"}
            </div>
            <span className="text-sm font-medium text-gray-700 flex-1">
              {participant.full_name || "Anonymous"}
            </span>
          </div>
        ))
      )}
    </div>
  );
}

