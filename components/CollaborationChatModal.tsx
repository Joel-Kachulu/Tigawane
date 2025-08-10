
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
import { Send, Users, Package, Utensils, Gift, ExternalLink, Clock, MapPin, Calendar } from "lucide-react"

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
      // Get items for this collaboration
      const { data: donationData, error } = await supabase
        .from("items")
        .select("id, title, item_type, user_id, created_at")
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

      // Get user names for the items
      const userIds = [...new Set(donationData.map(item => item.user_id))]
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds)

      // Create a map of user IDs to names
      const profilesMap = new Map()
      if (profilesData) {
        profilesData.forEach(profile => {
          profilesMap.set(profile.id, profile.full_name)
        })
      }

      const foodCount = donationData.filter(item => item.item_type === "food").length
      const itemCount = donationData.filter(item => item.item_type === "non-food").length

      const recentDonations = donationData.map(item => ({
        id: item.id,
        title: item.title,
        item_type: item.item_type,
        user_name: profilesMap.get(item.user_id) || "Anonymous",
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

  if (!collaborationId) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <div className="text-green-700">{collaborationTitle}</div>
              <div className="flex items-center gap-3 mt-1">
                <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                  <Users className="h-3 w-3 mr-1" />
                  {participants.length} participants
                </Badge>
                {donationSummary && donationSummary.total_count > 0 && (
                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                    <Gift className="h-3 w-3 mr-1" />
                    {donationSummary.total_count} donations
                  </Badge>
                )}
              </div>
            </div>
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            {participants.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 mt-2">
                <span className="text-xs font-medium">Participants:</span>
                {participants.slice(0, 5).map((p, index) => (
                  <span key={p.id} className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {p.full_name || "Anonymous"}
                  </span>
                ))}
                {participants.length > 5 && (
                  <span className="text-xs text-gray-500">+{participants.length - 5} more</span>
                )}
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 gap-4 overflow-hidden flex-col lg:flex-row">
          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col min-h-0">
            <ScrollArea className="flex-1 p-4 border rounded-lg bg-gray-50" ref={scrollAreaRef}>
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="font-medium text-gray-600 mb-2">No messages yet</h3>
                    <p className="text-sm">Start the conversation and coordinate your collaboration!</p>
                  </div>
                ) : (
                  messages.map((message, index) => {
                    const isOwnMessage = message.sender_id === user?.id
                    const showSender = index === 0 || messages[index - 1].sender_id !== message.sender_id
                    
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`max-w-[75%] ${isOwnMessage ? "order-2" : "order-1"}`}>
                          {showSender && !isOwnMessage && (
                            <div className="text-xs font-medium text-gray-600 mb-1 px-3">
                              {message.sender_name}
                            </div>
                          )}
                          <div
                            className={`p-3 rounded-2xl shadow-sm ${
                              isOwnMessage 
                                ? "bg-green-600 text-white rounded-br-md" 
                                : "bg-white text-gray-900 border rounded-bl-md"
                            }`}
                          >
                            <div className="text-sm leading-relaxed">{message.message}</div>
                            <div className={`text-xs mt-2 flex items-center gap-1 ${
                              isOwnMessage ? "text-green-100" : "text-gray-500"
                            }`}>
                              <Clock className="h-3 w-3" />
                              {formatTime(message.created_at)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="flex gap-2 mt-4 p-2 bg-white border rounded-lg">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={loading}
                className="border-0 focus-visible:ring-0 shadow-none"
              />
              <Button 
                onClick={sendMessage} 
                disabled={loading || !newMessage.trim()} 
                size="icon"
                className="bg-green-600 hover:bg-green-700 flex-shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Donations Sidebar */}
          <div className="w-full lg:w-80 border-t lg:border-l lg:border-t-0 pt-4 lg:pt-0 lg:pl-4 space-y-4 bg-gray-50 lg:bg-transparent">
            <div className="sticky top-0">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Gift className="h-4 w-4 text-green-600" />
                Available Donations
              </h3>
              
              {donationSummary && donationSummary.total_count > 0 ? (
                <div className="space-y-4">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 gap-2">
                    {donationSummary.food_count > 0 && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                        <div className="flex items-center justify-center gap-1 text-green-700 mb-1">
                          <Utensils className="h-4 w-4" />
                          <span className="text-sm font-medium">Food</span>
                        </div>
                        <div className="text-lg font-bold text-green-800">{donationSummary.food_count}</div>
                      </div>
                    )}
                    {donationSummary.item_count > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                        <div className="flex items-center justify-center gap-1 text-blue-700 mb-1">
                          <Package className="h-4 w-4" />
                          <span className="text-sm font-medium">Items</span>
                        </div>
                        <div className="text-lg font-bold text-blue-800">{donationSummary.item_count}</div>
                      </div>
                    )}
                  </div>

                  {/* Recent Donations List */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">Recent donations:</h4>
                    <ScrollArea className="h-64">
                      <div className="space-y-2 pr-2">
                        {donationSummary.recent_donations.map((donation) => (
                          <div key={donation.id} className="bg-white border rounded-lg p-3 hover:shadow-sm transition-shadow">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <h5 className="font-medium text-sm text-gray-900 truncate">{donation.title}</h5>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge 
                                    variant="secondary" 
                                    className={`text-xs ${
                                      donation.item_type === 'food' 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-blue-100 text-blue-800'
                                    }`}
                                  >
                                    {donation.item_type === 'food' ? (
                                      <Utensils className="h-3 w-3 mr-1" />
                                    ) : (
                                      <Package className="h-3 w-3 mr-1" />
                                    )}
                                    {donation.item_type}
                                  </Badge>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  by {donation.user_name} • {formatTime(donation.created_at)}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* View All Link */}
                  <div className="text-center pt-4 border-t">
                    <Button
                      asChild
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-medium"
                    >
                      <a 
                        href={`/collaborations/${collaborationId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View Full Collaboration Page
                      </a>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Gift className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-sm">No donations yet</p>
                  <p className="text-xs mt-1">Share items to get started!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
