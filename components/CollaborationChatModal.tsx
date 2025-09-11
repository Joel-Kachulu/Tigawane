
"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Send, Users, Package, Utensils, Gift, ExternalLink, Clock, MapPin, Calendar, MessageCircle, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

interface CollaborationMessage {
  id: string
  message: string
  sender_id: string
  created_at: string
  sender_name?: string
}

interface Participant {
  id: string
  user_id: string
  full_name: string | null
}

interface CollaborationChatModalProps {
  collaborationId: string | null
  collaborationTitle: string
  isOpen: boolean
  onClose: () => void
}

interface DonationSummary {
  food_count: number
  item_count: number
  total_count: number
  recent_donations: Array<{
    id: string
    title: string
    item_type: string
    user_name?: string
    created_at: string
  }>
}

export default function CollaborationChatModal({
  collaborationId,
  collaborationTitle,
  isOpen,
  onClose,
}: CollaborationChatModalProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [messages, setMessages] = useState<CollaborationMessage[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [donationSummary, setDonationSummary] = useState<DonationSummary | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (collaborationId && isOpen) {
      fetchMessages()
      fetchParticipants()
      fetchDonationSummary()

      // Subscribe to new messages
      const subscription = supabase
        .channel(`collaboration_messages:${collaborationId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "collaboration_messages",
            filter: `collaboration_id=eq.${collaborationId}`,
          },
          (payload) => {
            const newMsg = payload.new as CollaborationMessage
            // Fetch sender name for the new message
            fetchSenderName(newMsg.sender_id).then((senderName) => {
              setMessages((prev) => [...prev, { ...newMsg, sender_name: senderName }])
            })
          },
        )
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [collaborationId, isOpen])

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight
      }
    }
  }, [messages])

  const fetchSenderName = async (senderId: string): Promise<string> => {
    const { data } = await supabase.from("profiles").select("full_name").eq("id", senderId).single()
    return data?.full_name || "Anonymous"
  }

  const fetchMessages = async () => {
    if (!collaborationId) return

    const { data, error } = await supabase
      .from("collaboration_messages")
      .select("*")
      .eq("collaboration_id", collaborationId)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching messages:", error)
    } else {
      // Get sender names for all messages
      const messagesWithNames = await Promise.all(
        (data || []).map(async (msg) => {
          const senderName = await fetchSenderName(msg.sender_id)
          return {
            ...msg,
            sender_name: senderName,
          }
        }),
      )
      setMessages(messagesWithNames)
    }
  }

  const fetchParticipants = async () => {
    if (!collaborationId) return

    // First get participant user IDs
    const { data: participantData, error } = await supabase
      .from("collaboration_participants")
      .select("*")
      .eq("collaboration_id", collaborationId)

    if (error) {
      console.error("Error fetching participants:", error)
      return
    }

    if (!participantData || participantData.length === 0) {
      setParticipants([])
      return
    }

    // Then get their profile information
    const userIds = participantData.map((p) => p.user_id)
    const { data: profilesData } = await supabase.from("profiles").select("id, full_name").in("id", userIds)

    // Combine participant and profile data
    const participantsWithProfiles = participantData.map((participant) => {
      const profile = profilesData?.find((p) => p.id === participant.user_id)
      return {
        ...participant,
        full_name: profile?.full_name || null,
      }
    })

    setParticipants(participantsWithProfiles)
  }

  const fetchDonationSummary = async () => {
    if (!collaborationId) return

    try {
      // Optimized query: get items with user profiles in one join query
      const { data: donationData, error } = await supabase
        .from("items")
        .select(`
          id, 
          title, 
          item_type, 
          user_id, 
          created_at,
          profiles:user_id ( full_name )
        `)
        .eq("status", "available")
        .eq("collaboration_id", collaborationId)
        .order("created_at", { ascending: false })
        .limit(10)

      if (error) {
        console.error("Error fetching donations:", error)
        setDonationSummary({
          food_count: 0,
          item_count: 0,
          total_count: 0,
          recent_donations: []
        })
        return
      }

      if (!donationData || donationData.length === 0) {
        setDonationSummary({
          food_count: 0,
          item_count: 0,
          total_count: 0,
          recent_donations: []
        })
        return
      }

      // Process data efficiently without additional queries
      const foodCount = donationData.filter(item => item.item_type === "food").length
      const itemCount = donationData.filter(item => item.item_type === "non-food").length

      const recentDonations = donationData.map(item => ({
        id: item.id,
        title: item.title,
        item_type: item.item_type,
        user_name: (item.profiles as any)?.full_name || "Anonymous",
        created_at: item.created_at
      }))

      setDonationSummary({
        food_count: foodCount,
        item_count: itemCount,
        total_count: donationData.length,
        recent_donations: recentDonations
      })
    } catch (error) {
      console.error("Error fetching donation summary:", error)
      setDonationSummary({
        food_count: 0,
        item_count: 0,
        total_count: 0,
        recent_donations: []
      })
    }
  }

  const sendMessage = async () => {
    if (!user || !collaborationId || !newMessage.trim()) return

    const messageText = newMessage.trim()
    setNewMessage("")
    
    // Optimistically add message to UI
    const optimisticMessage = {
      id: `temp-${Date.now()}`,
      message: messageText,
      sender_id: user.id,
      created_at: new Date().toISOString(),
      sender_name: user.user_metadata?.full_name || 'You'
    }
    
    setMessages(prev => [...prev, optimisticMessage])
    
    setLoading(true)

    try {
      const { data, error } = await supabase.from("collaboration_messages").insert({
        collaboration_id: collaborationId,
        sender_id: user.id,
        message: messageText,
      }).select()

      if (error) {
        throw error
      }

      // Replace optimistic message with real one
      if (data && data[0]) {
        setMessages(prev => prev.map(msg => 
          msg.id === optimisticMessage.id ? { ...data[0], sender_name: optimisticMessage.sender_name } : msg
        ))
      }
    } catch (error: any) {
      console.error("Error sending message:", error)
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id))
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

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
  }

  const handleNavigateToFullPage = () => {
    setIsNavigating(true)
    onClose() // Close the modal first
    // Use Next.js router for instant navigation within the app
    router.push(`/collaborations/${collaborationId}`)
    setIsNavigating(false)
  }

  if (!collaborationId) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] h-[95vh] p-0 m-2 sm:m-6">
        <DialogHeader className="border-b pb-4 px-4 sm:px-6 pt-4 sm:pt-6 bg-white rounded-t-lg">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-lg sm:text-xl font-bold text-gray-900 truncate">{collaborationTitle}</DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-gray-600 mt-1">
                  Chat with participants and view collaboration items
                </DialogDescription>
                <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-1 sm:mt-2">
                  <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 px-2 py-1">
                    <Users className="h-3 w-3 mr-1" />
                    {participants.length}
                  </Badge>
                  {donationSummary && donationSummary.total_count > 0 && (
                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 px-2 py-1">
                      <Gift className="h-3 w-3 mr-1" />
                      {donationSummary.total_count}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white font-medium px-3 py-2 sm:px-4 sm:py-3 flex-shrink-0 min-h-[44px] rounded-xl touch-target-lg"
              onClick={handleNavigateToFullPage}
              disabled={isNavigating}
            >
              {isNavigating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">View Full Page</span>
                </>
              )}
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0">
          {/* Chat Area */}
          <div className="flex-1 px-6">
            <ScrollArea className="h-96 p-4" ref={scrollAreaRef}>
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.sender_id === user?.id ? "justify-end" : "justify-start"
                    }`}
                  >
                    {message.sender_id !== user?.id && (
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium">
                        {message.sender_name?.charAt(0) || "U"}
                      </div>
                    )}
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.sender_id === user?.id
                          ? "bg-green-600 text-white"
                          : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      <p className="text-xs font-medium mb-1 opacity-80">
                        {message.sender_id === user?.id ? "You" : (message.sender_name || "Unknown User")}
                      </p>
                      <p className="text-sm">{message.message}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {formatTime(message.created_at)}
                      </p>
                    </div>
                    {message.sender_id === user?.id && (
                      <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-sm font-medium text-white">
                        {message.sender_name?.charAt(0) || "U"}
                      </div>
                    )}
                  </div>
                ))}
                {messages.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Message Input */}
          <div className="border-t p-4 sm:p-6 bg-white rounded-b-lg">
            <form onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }} className="flex gap-3">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 py-3 px-4 text-base sm:text-sm rounded-xl border-2 border-gray-200 focus:border-green-500 transition-colors min-h-[48px] mobile-text-base"
                disabled={loading}
              />
              <Button 
                type="submit" 
                disabled={loading || !newMessage.trim()}
                className="bg-green-600 hover:bg-green-700 px-4 py-3 min-h-[48px] min-w-[48px] rounded-xl touch-target-lg"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
