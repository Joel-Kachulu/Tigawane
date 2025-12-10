"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Send, 
  Users, 
  Package, 
  Utensils, 
  Gift, 
  ExternalLink, 
  Clock, 
  MapPin, 
  Calendar, 
  MessageCircle, 
  Loader2,
  X,
  ChevronDown,
  Smile,
  MoreVertical,
  Heart,
  ThumbsUp
} from "lucide-react"
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
  const [activeTab, setActiveTab] = useState<"chat" | "participants" | "donations">("chat")
  const [showParticipants, setShowParticipants] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    } else if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollElement) {
        scrollElement.scrollTo({
          top: scrollElement.scrollHeight,
          behavior: "smooth"
        })
      }
    }
  }, [])

  useEffect(() => {
    if (collaborationId && isOpen) {
      fetchMessages()
      fetchParticipants()
      fetchDonationSummary()
      // Focus input when modal opens
      setTimeout(() => inputRef.current?.focus(), 100)

      // Create unique channel name
      const channelName = `collaboration_messages:${collaborationId}:${Date.now()}`
      const subscription = supabase
        .channel(channelName)
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
            fetchSenderName(newMsg.sender_id).then((senderName) => {
              setMessages((prev) => [...prev, { ...newMsg, sender_name: senderName }])
              setTimeout(scrollToBottom, 100)
            })
          },
        )
        .subscribe()

      return () => {
        subscription.unsubscribe()
      }
    }
  }, [collaborationId, isOpen, scrollToBottom])

  useEffect(() => {
    // Scroll to bottom when messages change
    setTimeout(scrollToBottom, 100)
  }, [messages, scrollToBottom])

  const fetchSenderName = async (senderId: string): Promise<string> => {
    const { data } = await supabase.from("profiles").select("full_name").eq("id", senderId).single()
    return data?.full_name || "Anonymous"
  }

  const fetchMessages = async () => {
    if (!collaborationId) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("collaboration_messages")
        .select("*")
        .eq("collaboration_id", collaborationId)
        .order("created_at", { ascending: true })
        .limit(100)

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
    } catch (error) {
      console.error("Error fetching messages:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchParticipants = async () => {
    if (!collaborationId) return

    try {
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

      // Get their profile information
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
    } catch (error) {
      console.error("Error fetching participants:", error)
    }
  }

  const fetchDonationSummary = async () => {
    if (!collaborationId) return

    try {
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

      // Get user names for donations
      const userIds = [...new Set(donationData.map(item => item.user_id))]
      const { data: profilesData } = await supabase.from("profiles").select("id, full_name").in("id", userIds)
      const profilesMap = new Map(profilesData?.map(p => [p.id, p.full_name]) || [])

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
    const optimisticMessage: CollaborationMessage = {
      id: `temp-${Date.now()}`,
      message: messageText,
      sender_id: user.id,
      created_at: new Date().toISOString(),
      sender_name: user.user_metadata?.full_name || 'You'
    }
    
    setMessages(prev => [...prev, optimisticMessage])
    setTimeout(scrollToBottom, 50)

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return "Today"
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday"
    } else {
      return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    }
  }

  const groupMessagesByDate = (messages: CollaborationMessage[]) => {
    const groups: { [key: string]: CollaborationMessage[] } = {}
    
    messages.forEach((message) => {
      const date = new Date(message.created_at).toDateString()
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(message)
    })
    
    return groups
  }

  const handleNavigateToFullPage = () => {
    setIsNavigating(true)
    onClose()
    router.push(`/collaborations/${collaborationId}`)
    setIsNavigating(false)
  }

  if (!collaborationId) return null

  const messageGroups = groupMessagesByDate(messages)
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-full h-[95vh] max-h-[95vh] p-0 m-2 sm:m-4 md:m-6 flex flex-col overflow-hidden">
        {/* Header */}
        <DialogHeader className="border-b pb-3 px-4 sm:px-6 pt-4 sm:pt-6 bg-gradient-to-r from-green-50 to-blue-50 flex-shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                <Users className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-base sm:text-xl font-bold text-gray-900 truncate">
                  {collaborationTitle}
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-gray-600 mt-0.5">
                  {participants.length} {participants.length === 1 ? 'participant' : 'participants'}
                  {donationSummary && donationSummary.total_count > 0 && (
                    <> · {donationSummary.total_count} {donationSummary.total_count === 1 ? 'item' : 'items'} shared</>
                  )}
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="hidden sm:flex bg-white hover:bg-gray-50 border-gray-300"
                onClick={handleNavigateToFullPage}
                disabled={isNavigating}
              >
                {isNavigating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    <span>Full Page</span>
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Chat Section */}
          <div className="flex-1 flex flex-col min-h-0 min-w-0">
            {/* Messages Area */}
            <ScrollArea 
              className="flex-1 px-3 sm:px-4 md:px-6" 
              ref={scrollAreaRef}
            >
              <div className="py-4 space-y-4">
                {loading && messages.length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : Object.keys(messageGroups).length === 0 ? (
                  <div className="text-center text-gray-500 py-12">
                    <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium mb-2">No messages yet</p>
                    <p className="text-sm">Start the conversation!</p>
                  </div>
                ) : (
                  Object.entries(messageGroups).map(([date, dateMessages]) => (
                    <div key={date} className="space-y-4">
                      {/* Date Separator */}
                      <div className="flex items-center justify-center my-6">
                        <div className="flex items-center gap-2 px-4 py-1.5 bg-gray-100 rounded-full">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span className="text-xs font-medium text-gray-600">
                            {formatDate(dateMessages[0].created_at)}
                          </span>
                        </div>
                      </div>

                      {/* Messages for this date */}
                      {dateMessages.map((message, index) => {
                        const isOwnMessage = message.sender_id === user?.id
                        const isConsecutive = index > 0 && 
                          dateMessages[index - 1].sender_id === message.sender_id &&
                          new Date(message.created_at).getTime() - new Date(dateMessages[index - 1].created_at).getTime() < 300000 // 5 minutes
                        
                        return (
                          <div
                            key={message.id}
                            className={`flex gap-2 sm:gap-3 ${isOwnMessage ? "justify-end" : "justify-start"} ${isConsecutive ? "mt-1" : "mt-4"}`}
                          >
                            {/* Avatar - only show if not consecutive */}
                            {!isOwnMessage && !isConsecutive && (
                              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0 shadow-md">
                                {message.sender_name?.charAt(0).toUpperCase() || "U"}
                              </div>
                            )}
                            {!isOwnMessage && isConsecutive && (
                              <div className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0" />
                            )}

                            {/* Message Bubble */}
                            <div className={`flex flex-col max-w-[75%] sm:max-w-[60%] md:max-w-[50%] ${isOwnMessage ? "items-end" : "items-start"}`}>
                              {/* Sender Name - only show if not consecutive */}
                              {!isConsecutive && (
                                <span className={`text-xs font-semibold mb-1 px-1 ${isOwnMessage ? "text-green-700" : "text-gray-700"}`}>
                                  {isOwnMessage ? "You" : (message.sender_name || "Anonymous")}
                                </span>
                              )}
                              
                              <div
                                className={`group relative px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl shadow-sm ${
                                  isOwnMessage
                                    ? "bg-gradient-to-br from-green-500 to-green-600 text-white rounded-br-sm"
                                    : "bg-white text-gray-900 border border-gray-200 rounded-bl-sm"
                                }`}
                              >
                                <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words">
                                  {message.message}
                                </p>
                                
                                {/* Time and Actions */}
                                <div className={`flex items-center gap-2 mt-1.5 ${isOwnMessage ? "justify-end" : "justify-start"}`}>
                                  <span className={`text-[10px] sm:text-xs ${isOwnMessage ? "text-green-100" : "text-gray-500"}`}>
                                    {formatTime(message.created_at)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Avatar for own messages */}
                            {isOwnMessage && !isConsecutive && (
                              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0 shadow-md">
                                {message.sender_name?.charAt(0).toUpperCase() || "Y"}
                              </div>
                            )}
                            {isOwnMessage && isConsecutive && (
                              <div className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0" />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="border-t bg-white px-3 sm:px-4 md:px-6 py-3 sm:py-4 flex-shrink-0">
              <form 
                onSubmit={(e) => {
                  e.preventDefault()
                  sendMessage()
                }} 
                className="flex gap-2 sm:gap-3 items-end"
              >
                <div className="flex-1 relative">
                  <Input
                    ref={inputRef}
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value)
                      // Typing indicator logic could go here
                    }}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="w-full py-3 px-4 text-base sm:text-sm rounded-xl border-2 border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all min-h-[48px] resize-none"
                    disabled={loading}
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={loading || !newMessage.trim()}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 sm:px-6 py-3 min-h-[48px] min-w-[48px] sm:min-w-[60px] rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </form>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </div>

          {/* Sidebar - Desktop only or mobile tab */}
          {isMobile ? (
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="border-t md:border-t-0 md:border-l w-full md:w-80 flex-shrink-0">
              <TabsList className="grid w-full grid-cols-2 md:hidden">
                <TabsTrigger value="participants" className="text-xs">
                  <Users className="h-4 w-4 mr-1" />
                  Participants
                </TabsTrigger>
                <TabsTrigger value="donations" className="text-xs">
                  <Gift className="h-4 w-4 mr-1" />
                  Donations
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="participants" className="mt-0 p-4 max-h-[300px] overflow-y-auto">
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Participants ({participants.length})
                  </h3>
                  {participants.map((participant) => (
                    <div key={participant.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-sm font-semibold text-white">
                        {participant.full_name?.charAt(0).toUpperCase() || "U"}
                      </div>
                      <span className="text-sm font-medium text-gray-700 flex-1">
                        {participant.full_name || "Anonymous"}
                      </span>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="donations" className="mt-0 p-4 max-h-[300px] overflow-y-auto">
                {donationSummary && donationSummary.total_count > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-green-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Utensils className="h-4 w-4 text-green-600" />
                          <span className="text-xs font-medium text-green-700">Food</span>
                        </div>
                        <p className="text-2xl font-bold text-green-700">{donationSummary.food_count}</p>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Package className="h-4 w-4 text-blue-600" />
                          <span className="text-xs font-medium text-blue-700">Items</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-700">{donationSummary.item_count}</p>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Recent Donations</h4>
                      <div className="space-y-2">
                        {donationSummary.recent_donations.slice(0, 5).map((donation) => (
                          <div key={donation.id} className="p-2 bg-gray-50 rounded-lg text-xs">
                            <p className="font-medium text-gray-900">{donation.title}</p>
                            <p className="text-gray-600">{donation.user_name} · {formatTime(donation.created_at)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <Gift className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No donations yet</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <div className="hidden md:flex md:flex-col md:w-80 border-l bg-gray-50 flex-shrink-0">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col">
                <TabsList className="grid w-full grid-cols-2 m-2">
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
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Participants ({participants.length})
                    </h3>
                    {participants.map((participant) => (
                      <div key={participant.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white transition-colors cursor-pointer">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-sm font-semibold text-white shadow-md">
                          {participant.full_name?.charAt(0).toUpperCase() || "U"}
                        </div>
                        <span className="text-sm font-medium text-gray-700 flex-1">
                          {participant.full_name || "Anonymous"}
                        </span>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="donations" className="flex-1 overflow-y-auto p-4 mt-0">
                  {donationSummary && donationSummary.total_count > 0 ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Utensils className="h-5 w-5 text-green-600" />
                            <span className="text-sm font-semibold text-green-700">Food</span>
                          </div>
                          <p className="text-3xl font-bold text-green-700">{donationSummary.food_count}</p>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Package className="h-5 w-5 text-blue-600" />
                            <span className="text-sm font-semibold text-blue-700">Items</span>
                          </div>
                          <p className="text-3xl font-bold text-blue-700">{donationSummary.item_count}</p>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Recent Donations
                        </h4>
                        <div className="space-y-2">
                          {donationSummary.recent_donations.slice(0, 8).map((donation) => (
                            <div key={donation.id} className="p-3 bg-white rounded-lg border border-gray-200 hover:border-green-300 transition-colors cursor-pointer">
                              <div className="flex items-start gap-2">
                                {donation.item_type === "food" ? (
                                  <Utensils className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                ) : (
                                  <Package className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm text-gray-900 truncate">{donation.title}</p>
                                  <p className="text-xs text-gray-600 mt-0.5">
                                    {donation.user_name} · {formatTime(donation.created_at)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-12">
                      <Gift className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <p className="text-sm font-medium mb-1">No donations yet</p>
                      <p className="text-xs">Be the first to share!</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
