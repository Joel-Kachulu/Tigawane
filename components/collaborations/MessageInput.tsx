"use client";

import React, { useRef, useEffect } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface MessageInputProps {
  newMessage: string;
  isSending: boolean;
  onMessageChange: (value: string) => void;
  onSend: () => void;
  onKeyPress: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export default function MessageInput({
  newMessage,
  isSending,
  onMessageChange,
  onSend,
  onKeyPress,
}: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [newMessage]);

  return (
    <div className="border-t border-gray-200 bg-white px-3 sm:px-4 md:px-6 py-3 sm:py-4 flex-shrink-0">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSend();
        }}
        className="flex gap-2 sm:gap-3 items-end"
      >
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={newMessage}
            onChange={(e) => onMessageChange(e.target.value)}
            onKeyDown={onKeyPress}
            placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
            className="w-full py-3 px-4 text-sm sm:text-base rounded-xl border-2 border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all resize-none min-h-[48px] max-h-[120px] pr-12"
            disabled={isSending}
            rows={1}
          />
          <div className="absolute right-3 bottom-3 text-xs text-gray-400">
            {newMessage.length > 0 && `${newMessage.length} chars`}
          </div>
        </div>
        <Button
          type="submit"
          disabled={isSending || !newMessage.trim()}
          className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 sm:px-6 py-3 min-h-[48px] min-w-[48px] sm:min-w-[60px] rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        >
          {isSending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </form>
    </div>
  );
}

