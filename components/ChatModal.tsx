"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Loader2, X } from "lucide-react"

interface Message {
  id: string
  message: string
  sender_id: string
  created_at: string
  claim_id: string
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
  const scrollAreaRef = useRef<HTMLDivElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const [requestMessage, setRequestMessage] = useState<string | null>(null)
  const [claimLoading, setClaimLoading] = useState(false)
  const [claimInfo, setClaimInfo] = useState<{ owner_id: string; claimer_id: string; item_id: string; status: string } | null>(null)
  const [completing, setCompleting] = useState(false)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

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
        setTimeout(scrollToBottom, 100)
      }
    } catch (error) {
      console.error("Unexpected error fetching messages:", error)
    } finally {
      setLoading(false)
    }
  }, [claimId, scrollToBottom])

  // Real-time listener without broken filters
  useEffect(() => {
    if (!claimId || !isOpen) return

    fetchMessages()

    // Create unique channel name to prevent conflicts
    const channelName = `realtime:messages:${claimId}:${Date.now()}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const newMsg = payload.new as Message

          if (newMsg.claim_id !== claimId) return

          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", newMsg.sender_id)
            .single()

          const messageWithName = {
            ...newMsg,
            sender_name: profile?.full_name || "Anonymous",
          }

          setMessages(prev => {
            if (prev.some(msg => msg.id === newMsg.id)) return prev
            return [...prev, messageWithName]
          })

          setTimeout(scrollToBottom, 100)
        }
      )
      .subscribe()

    return () => {
      console.log('🧹 Cleaning up chat subscription:', channelName)
      channel.unsubscribe()
    }
  }, [claimId, isOpen, fetchMessages, scrollToBottom])

  // Fetch the claim's request message
  useEffect(() => {
    if (!claimId || !isOpen) return
    setClaimLoading(true)
    const fetchClaimMessage = async () => {
      const { data, error } = await supabase
        .from("claims")
        .select("message")
        .eq("id", claimId)
        .single()
      if (!error && data) setRequestMessage(data.message)
      else setRequestMessage(null)
      setClaimLoading(false)
    }
    fetchClaimMessage()
  }, [claimId, isOpen])

  // Fetch claim info for completion logic
  useEffect(() => {
    if (!claimId || !isOpen) return
    const fetchClaimInfo = async () => {
      const { data, error } = await supabase
        .from("claims")
        .select("owner_id, claimer_id, item_id, status")
        .eq("id", claimId)
        .single()
      if (!error && data) setClaimInfo(data)
      else setClaimInfo(null)
    }
    fetchClaimInfo()
  }, [claimId, isOpen])

  const handleTyping = useCallback(() => {
    if (!isTyping) setIsTyping(true)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
    }, 1000)
  }, [isTyping])

  const sendMessage = async () => {
    if (!newMessage.trim() || !claimId || !user) return

    const messageText = newMessage.trim()
    const tempId = `temp-${Date.now()}`

    // Add message immediately to UI for instant feedback
    const tempMessage = {
      id: tempId,
      claim_id: claimId,
      sender_id: user.id,
      message: messageText,
      created_at: new Date().toISOString(),
      sender_name: "You"
    }

    setMessages(prev => [...prev, tempMessage])
    setNewMessage("")
    setTimeout(scrollToBottom, 50)

    setSending(true)
    try {
      const { data, error } = await supabase.from("messages").insert({
        claim_id: claimId,
        sender_id: user.id,
        message: messageText,
      }).select().single()

      if (error) throw error

      // Replace temp message with real one
      setMessages(prev => prev.map(msg =>
        msg.id === tempId ? { ...data, sender_name: "You" } : msg
      ))
    } catch (error: any) {
      console.error("Error sending message:", error)
      // Remove temp message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempId))
      alert(`Failed to send message: ${error.message}`)
      setNewMessage(messageText) // Restore message text
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        sendMessage()
      }
    },
    [sendMessage]
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setNewMessage(e.target.value)
      handleTyping()
    },
    [handleTyping]
  )

  const formatTime = useCallback((dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    return diffInHours < 24
      ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : date.toLocaleDateString([], { month: "short", day: "numeric" })
  }, [])

  const handleComplete = async () => {
    if (!claimInfo || !user || claimInfo.owner_id !== user.id) return
    setCompleting(true)
    try {
      // Update claim status
      await supabase.from("claims").update({ status: "completed" }).eq("id", claimId)
      // Update item status
      await supabase.from("items").update({ status: "completed" }).eq("id", claimInfo.item_id)
      // Notify claimer
      await supabase.from("notifications").insert({
        user_id: claimInfo.claimer_id,
        type: "status_update",
        title: "Sharing completed",
        message: "The owner has marked this sharing as complete.",
        related_claim_id: claimId,
        is_read: false,
      })
      // Refetch claim info to update UI
      setClaimInfo({ ...claimInfo, status: "completed" })
      alert("Marked as complete. This item will be removed from active listings.")
    } catch (err) {
      alert("Error marking as complete.")
    } finally {
      setCompleting(false)
    }
  }

  if (!claimId) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md h-[600px] flex flex-col bg-white shadow-xl rounded-xl border-2 border-green-100">
        <DialogHeader className="flex flex-row items-center justify-between gap-2 border-b pb-2 mb-2">
          <div className="flex flex-col flex-1">
            <DialogTitle className="text-lg font-bold">Chat with {otherUserName}</DialogTitle>
            <DialogDescription className="text-xs text-gray-500">
              Coordinate pickup details
              {isTyping && <span className="text-green-600 ml-2">• typing...</span>}
            </DialogDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close chat">
            <X className="h-5 w-5" />
          </Button>
        </DialogHeader>

        <ScrollArea className="flex-1 p-4 border rounded bg-gray-50" ref={scrollAreaRef}>
          {claimLoading ? (
            <div className="flex justify-center items-center h-16">
              <Loader2 className="h-5 w-5 animate-spin text-green-600" />
            </div>
          ) : requestMessage ? (
            <div className="mb-4 p-3 rounded-lg bg-green-100 text-green-900 text-sm border border-green-200">
              <span className="font-semibold">Request message:</span>
              <br />
              {requestMessage}
            </div>
          ) : null}
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-green-600" />
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
                        className={`max-w-[80%] p-3 rounded-2xl shadow-sm transition-all duration-200 text-sm break-words
                          ${isOwn ? "bg-green-600 text-white rounded-br-md" : "bg-white border border-gray-200 text-gray-900 rounded-bl-md"}
                        `}
                      >
                        {!isOwn && showSender && (
                          <p className="text-xs font-medium mb-1 opacity-70">{message.sender_name}</p>
                        )}
                        <p className="whitespace-pre-wrap">{message.message}</p>
                        <p className="text-xs opacity-60 mt-1 text-right">{formatTime(message.created_at)}</p>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        <form
          className="flex gap-2 mt-2"
          onSubmit={e => {
            e.preventDefault();
            sendMessage();
          }}
        >
          <Input
            value={newMessage}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            disabled={sending}
            className="flex-1 focus:ring-2 focus:ring-green-400 focus:border-green-400 rounded-full px-4 py-2 text-base"
            maxLength={500}
            autoFocus
          />
          <Button type="submit" onClick={sendMessage} disabled={sending || !newMessage.trim()} size="icon" className="shrink-0 bg-green-600 hover:bg-green-700">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
        {claimInfo && (claimInfo.owner_id === user?.id || claimInfo.claimer_id === user?.id) && claimInfo.status !== "completed" && (
          <Button
            onClick={handleComplete}
            disabled={completing}
            className="mt-2 bg-blue-600 hover:bg-blue-700 w-full"
          >
            {completing ? "Completing..." : "Mark as Shared"}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  )
}