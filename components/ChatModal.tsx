"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send } from "lucide-react"

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
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (claimId && isOpen) {
      fetchMessages()

      // Subscribe to new messages
      const subscription = supabase
        .channel(`messages:${claimId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `claim_id=eq.${claimId}`,
          },
          (payload) => {
            const newMsg = payload.new as Message
            setMessages((prev) => [...prev, newMsg])
          },
        )
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [claimId, isOpen])

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  const fetchMessages = async () => {
    if (!claimId) return

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("claim_id", claimId)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching messages:", error)
    } else {
      setMessages(data || [])
    }
  }

  const sendMessage = async () => {
    if (!user || !claimId || !newMessage.trim()) return

    setLoading(true)

    try {
      const { error } = await supabase.from("messages").insert({
        claim_id: claimId,
        sender_id: user.id,
        message: newMessage.trim(),
      })

      if (error) {
        throw error
      }

      setNewMessage("")
    } catch (error: any) {
      console.error("Error sending message:", error)
      alert(`Error sending message: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  if (!claimId) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md h-[500px] flex flex-col">
        <DialogHeader>
          <DialogTitle>Chat with {otherUserName}</DialogTitle>
          <DialogDescription>Coordinate pickup details</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 p-4 border rounded" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender_id === user?.id ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.sender_id === user?.id ? "bg-green-600 text-white" : "bg-gray-100 text-gray-900"
                  }`}
                >
                  <p className="text-sm">{message.message}</p>
                  <p className="text-xs opacity-70 mt-1">{new Date(message.created_at).toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={loading}
          />
          <Button onClick={sendMessage} disabled={loading || !newMessage.trim()} size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
