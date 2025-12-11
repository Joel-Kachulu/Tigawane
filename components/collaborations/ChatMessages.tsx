"use client";

import React from "react";
import { Calendar, MessageCircle, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CollaborationMessage {
  id: string;
  message: string;
  sender_id: string;
  created_at: string;
  sender_name?: string;
}

interface ChatMessagesProps {
  messages: CollaborationMessage[];
  loading: boolean;
  currentUserId: string | undefined;
  messageGroups: { [key: string]: CollaborationMessage[] };
  formatDate: (dateString: string) => string;
  formatTime: (dateString: string) => string;
  scrollAreaRef: React.RefObject<HTMLDivElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export default function ChatMessages({
  messages,
  loading,
  currentUserId,
  messageGroups,
  formatDate,
  formatTime,
  scrollAreaRef,
  messagesEndRef,
}: ChatMessagesProps) {
  return (
    <ScrollArea
      className="flex-1 px-3 sm:px-4 md:px-6 bg-gray-50"
      ref={scrollAreaRef}
    >
      <div className="py-4 space-y-1">
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-green-500" />
          </div>
        ) : Object.keys(messageGroups).length === 0 ? (
          <div className="text-center text-gray-500 py-12 px-4">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-green-100 to-blue-100 rounded-full flex items-center justify-center">
              <MessageCircle className="h-10 w-10 text-gray-400" />
            </div>
            <p className="text-lg font-semibold mb-2 text-gray-700">No messages yet</p>
            <p className="text-sm text-gray-500">Be the first to start the conversation!</p>
          </div>
        ) : (
          Object.entries(messageGroups).map(([date, dateMessages]) => (
            <div key={date} className="space-y-1">
              {/* Date Separator */}
              <div className="flex items-center justify-center my-6">
                <div className="flex items-center gap-2 px-4 py-1.5 bg-white border border-gray-200 rounded-full shadow-sm">
                  <Calendar className="h-3.5 w-3.5 text-gray-500" />
                  <span className="text-xs font-medium text-gray-600">
                    {formatDate(dateMessages[0].created_at)}
                  </span>
                </div>
              </div>

              {/* Messages for this date */}
              {dateMessages.map((message, index) => {
                const isOwnMessage = message.sender_id === currentUserId;
                const isConsecutive =
                  index > 0 &&
                  dateMessages[index - 1].sender_id === message.sender_id &&
                  new Date(message.created_at).getTime() -
                    new Date(dateMessages[index - 1].created_at).getTime() <
                    300000; // 5 minutes

                return (
                  <div
                    key={message.id}
                    className={`flex gap-2 sm:gap-3 ${
                      isOwnMessage ? "justify-end" : "justify-start"
                    } ${isConsecutive ? "mt-0.5" : "mt-4"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                  >
                    {/* Avatar - only show if not consecutive */}
                    {!isOwnMessage && !isConsecutive && (
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0 shadow-md ring-2 ring-white">
                        {message.sender_name?.charAt(0).toUpperCase() || "U"}
                      </div>
                    )}
                    {!isOwnMessage && isConsecutive && (
                      <div className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0" />
                    )}

                    {/* Message Bubble */}
                    <div
                      className={`flex flex-col max-w-[85%] sm:max-w-[70%] md:max-w-[60%] ${
                        isOwnMessage ? "items-end" : "items-start"
                      }`}
                    >
                      {/* Sender Name - only show if not consecutive */}
                      {!isConsecutive && (
                        <span
                          className={`text-xs font-semibold mb-1 px-1.5 ${
                            isOwnMessage ? "text-green-700" : "text-gray-700"
                          }`}
                        >
                          {isOwnMessage
                            ? "You"
                            : message.sender_name || "Anonymous"}
                        </span>
                      )}

                      <div
                        className={`group relative px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl shadow-sm transition-all hover:shadow-md ${
                          isOwnMessage
                            ? "bg-gradient-to-br from-green-500 to-green-600 text-white rounded-br-md"
                            : "bg-white text-gray-900 border border-gray-200 rounded-bl-md"
                        }`}
                      >
                        <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words">
                          {message.message}
                        </p>

                        {/* Time */}
                        <div
                          className={`flex items-center gap-2 mt-2 ${
                            isOwnMessage ? "justify-end" : "justify-start"
                          }`}
                        >
                          <span
                            className={`text-[10px] sm:text-xs ${
                              isOwnMessage ? "text-green-100" : "text-gray-500"
                            }`}
                          >
                            {formatTime(message.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Avatar for own messages */}
                    {isOwnMessage && !isConsecutive && (
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0 shadow-md ring-2 ring-white">
                        {message.sender_name?.charAt(0).toUpperCase() || "Y"}
                      </div>
                    )}
                    {isOwnMessage && isConsecutive && (
                      <div className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
}

