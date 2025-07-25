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
import { Send, Users, Package, Utensils, Gift, ExternalLink } from "lucide-react"

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
  }>
}

export default function CollaborationChatModal({
  collaborationId,
  collaborationTitle,
  isOpen,
  onClose,
}: CollaborationChatModalProps) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<CollaborationMessage[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [donationSummary, setDonationSummary] = useState<DonationSummary | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(false)
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
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
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
      // Get donation items for this collaboration
      const { data: donationData, error } = await supabase
        .from("items")
        .select(`
          id, 
          title, 
          item_type, 
          user_id, 
          created_at,
          profiles!items_user_id_fkey(full_name)
        `)
        .eq("collaboration_id", collaborationId)
        .eq("status", "available")
        .order("created_at", { ascending: false })
        .limit(5)

      if (error) {
        console.error("Error fetching donations:", error)
        return
      }

      if (!donationData) {
        setDonationSummary({
          food_count: 0,
          item_count: 0,
          total_count: 0,
          recent_donations: []
        })
        return
      }

      const foodCount = donationData.filter(item => item.item_type === "food").length
      const itemCount = donationData.filter(item => item.item_type === "non-food").length

      const recentDonations = donationData.map(item => ({
        id: item.id,
        title: item.title,
        item_type: item.item_type,
        user_name: (item.profiles as any)?.full_name || "Anonymous"
      }))

      setDonationSummary({
        food_count: foodCount,
        item_count: itemCount,
        total_count: donationData.length,
        recent_donations: recentDonations
      })
    } catch (error) {
      console.error("Error fetching donation summary:", error)
    }
  }

  const sendMessage = async () => {
    if (!user || !collaborationId || !newMessage.trim()) return

    setLoading(true)

    try {
      const { error } = await supabase.from("collaboration_messages").insert({
        collaboration_id: collaborationId,
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

  if (!collaborationId) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[700px] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {collaborationTitle}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {participants.length} participants
            </Badge>
            <span className="text-xs text-gray-500">
              {participants.map((p) => p.full_name || "Anonymous").join(", ")}
            </span>
          </DialogDescription>
        </DialogHeader>

        {/* Donation Summary Section */}
        {donationSummary && donationSummary.total_count > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-green-800 flex items-center gap-2">
                <Gift className="h-4 w-4" />
                Available Donations
              </h4>
              <div className="flex gap-2">
                <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                  {donationSummary.total_count} total
                </Badge>
                <a 
                  href={`/collaborations/${collaborationId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-600 hover:text-green-800 text-xs flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  View All
                </a>
              </div>
            </div>
            
            <div className="flex gap-4 text-xs text-green-700">
              {donationSummary.food_count > 0 && (
                <div className="flex items-center gap-1">
                  <Utensils className="h-3 w-3" />
                  <span>{donationSummary.food_count} food items</span>
                </div>
              )}
              {donationSummary.item_count > 0 && (
                <div className="flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  <span>{donationSummary.item_count} other items</span>
                </div>
              )}
            </div>

            {/* Recent Donations */}
            {donationSummary.recent_donations.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-green-800">Recent donations:</p>
                <div className="grid grid-cols-1 gap-1 max-h-16 overflow-y-auto">
                  {donationSummary.recent_donations.slice(0, 3).map((donation) => (
                    <div key={donation.id} className="flex items-center justify-between text-xs bg-white rounded px-2 py-1">
                      <span className="text-green-700 truncate">{donation.title}</span>
                      <span className="text-green-500 text-xs ml-2 flex-shrink-0">
                        by {donation.user_name}
                      </span>
                    </div>
                  ))}
                </div>
                {donationSummary.recent_donations.length > 3 && (
                  <p className="text-xs text-green-500 italic text-center">
                    +{donationSummary.recent_donations.length - 3} more donations available
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <ScrollArea className="flex-1 p-4 border rounded" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No messages yet</p>
                <p className="text-xs mt-1">Start the conversation!</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender_id === user?.id ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.sender_id === user?.id ? "bg-green-600 text-white" : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    {message.sender_id !== user?.id && (
                      <p className="text-xs font-medium mb-1 opacity-70">{message.sender_name}</p>
                    )}
                    <p className="text-sm">{message.message}</p>
                    <p className="text-xs opacity-70 mt-1">{new Date(message.created_at).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))
            )}
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
