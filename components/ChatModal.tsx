"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Loader2 } from "lucide-react"

interface Message {
  id: string
  message: string
  sender_id: string
  created_at: string
  sender_name?: string
}

interface ChatModalProps {
  claimId: string | null
  isOpen: boolean
  onClose: () => void
  otherUserName: string
}

export default function ChatModal({ claimId, isOpen, onClose, otherUserName }: ChatModalProps) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  // Optimized message fetching using database function
  const fetchMessages = useCallback(async () => {
    if (!claimId) return

    setLoading(true)
    try {
      const { data, error } = await supabase.rpc("get_messages_with_sender_names", {
        p_claim_id: claimId,
        p_limit: 100,
      })

      if (error) {
        console.error("Error fetching messages:", error)
      } else {
        setMessages(data || [])
        // Scroll to bottom after messages load
        setTimeout(scrollToBottom, 100)
      }
    } catch (error) {
      console.error("Unexpected error fetching messages:", error)
    } finally {
      setLoading(false)
    }
  }, [claimId, scrollToBottom])

  // Real-time subscription setup
  useEffect(() => {
    if (!claimId || !isOpen) return

    fetchMessages()

    // Set up real-time subscription
    const channel = supabase
      .channel(`messages:${claimId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `claim_id=eq.${claimId}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message

          // Fetch sender name for the new message
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", newMsg.sender_id)
            .single()

          const messageWithName = {
            ...newMsg,
            sender_name: profile?.full_name || "Anonymous",
          }

          setMessages((prev) => {
            // Prevent duplicate messages
            if (prev.some((msg) => msg.id === messageWithName.id)) {
              return prev
            }
            return [...prev, messageWithName]
          })

          // Auto-scroll to new message
          setTimeout(scrollToBottom, 100)
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `claim_id=eq.${claimId}`,
        },
        async (payload) => {
          const updatedMsg = payload.new as Message

          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", updatedMsg.sender_id)
            .single()

          const messageWithName = {
            ...updatedMsg,
            sender_name: profile?.full_name || "Anonymous",
          }

          setMessages((prev) => prev.map((msg) => (msg.id === messageWithName.id ? messageWithName : msg)))
        },
      )
      .subscribe((status) => {
        console.log("Chat subscription status:", status)
      })

    return () => {
      channel.unsubscribe()
    }
  }, [claimId, isOpen, fetchMessages, scrollToBottom])

  // Typing indicator
  const handleTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true)
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Set new timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
    }, 1000)
  }, [isTyping])

  // Optimized message sending
  const sendMessage = useCallback(async () => {
    if (!user || !claimId || !newMessage.trim() || sending) return

    const messageText = newMessage.trim()
    setNewMessage("")
    setSending(true)

    try {
      const { error } = await supabase.from("messages").insert({
        claim_id: claimId,
        sender_id: user.id,
        message: messageText,
      })

      if (error) {
        throw error
      }

      // Clear typing indicator
      setIsTyping(false)
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    } catch (error: any) {
      console.error("Error sending message:", error)
      // Restore message on error
      setNewMessage(messageText)
      alert(`Error sending message: ${error.message}`)
    } finally {
      setSending(false)
    }
  }, [user, claimId, newMessage, sending])

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        sendMessage()
      }
    },
    [sendMessage],
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setNewMessage(e.target.value)
      handleTyping()
    },
    [handleTyping],
  )

  // Format message time
  const formatTime = useCallback((dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" })
    }
  }, [])

  if (!claimId) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle>Chat with {otherUserName}</DialogTitle>
          <DialogDescription>
            Coordinate pickup details
            {isTyping && <span className="text-green-600 ml-2">• typing...</span>}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 p-4 border rounded" ref={scrollAreaRef}>
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No messages yet</p>
                  <p className="text-xs mt-1">Start the conversation!</p>
                </div>
              ) : (
                messages.map((message, index) => {
                  const isOwn = message.sender_id === user?.id
                  const showSender = index === 0 || messages[index - 1].sender_id !== message.sender_id

                  return (
                    <div key={message.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] p-3 rounded-lg ${
                          isOwn ? "bg-green-600 text-white rounded-br-sm" : "bg-gray-100 text-gray-900 rounded-bl-sm"
                        }`}
                      >
                        {!isOwn && showSender && (
                          <p className="text-xs font-medium mb-1 opacity-70">{message.sender_name}</p>
                        )}
                        <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                        <p className="text-xs opacity-70 mt-1">{formatTime(message.created_at)}</p>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={sending}
            className="flex-1"
            maxLength={500}
          />
          <Button onClick={sendMessage} disabled={sending || !newMessage.trim()} size="icon" className="shrink-0">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
