"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import ChatHeader from "@/components/collaborations/ChatHeader"
import ChatMessages from "@/components/collaborations/ChatMessages"
import MessageInput from "@/components/collaborations/MessageInput"
import CollaborationSidebar from "@/components/collaborations/CollaborationSidebar"
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
  onNavigateToFullPage?: (collaborationId: string) => void // Optional callback for navigation
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
  onNavigateToFullPage,
}: CollaborationChatModalProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [messages, setMessages] = useState<CollaborationMessage[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [donationSummary, setDonationSummary] = useState<DonationSummary | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const [activeTab, setActiveTab] = useState<"participants" | "donations">("participants")
  const [showSidebar, setShowSidebar] = useState(false) // For mobile sidebar toggle
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const subscriptionRef = useRef<any>(null)

  // Detect mobile
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
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
    }, 100)
  }, [])

  useEffect(() => {
    if (collaborationId && isOpen) {
      fetchMessages()
      fetchParticipants()
      fetchDonationSummary()

      // Create unique channel name for real-time updates
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
              setMessages((prev) => {
                // Avoid duplicates
                if (prev.some(m => m.id === newMsg.id)) return prev
                return [...prev, { ...newMsg, sender_name: senderName }]
              })
              scrollToBottom()
            })
          },
        )
        .subscribe()

      subscriptionRef.current = subscription

      return () => {
        if (subscriptionRef.current) {
          subscriptionRef.current.unsubscribe()
        }
      }
    }
  }, [collaborationId, isOpen, scrollToBottom])

  useEffect(() => {
    scrollToBottom()
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
    if (!user || !collaborationId || !newMessage.trim() || isSending) return

    const messageText = newMessage.trim()
    setNewMessage("")
    setIsSending(true)
    
    // Optimistically add message to UI
    const optimisticMessage: CollaborationMessage = {
      id: `temp-${Date.now()}`,
      message: messageText,
      sender_id: user.id,
      created_at: new Date().toISOString(),
      sender_name: user.user_metadata?.full_name || 'You'
    }
    
    setMessages(prev => [...prev, optimisticMessage])
    scrollToBottom()

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
      setIsSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
    if (!collaborationId) {
      console.error('❌ No collaboration ID available')
      return
    }
    
    setIsNavigating(true)
    console.log('🚀 Navigating to full page for collaboration:', collaborationId)
    
    // Navigate to the collaboration detail page
    onClose() // Close modal first
    router.push(`/collaborations/${collaborationId}`)
    setIsNavigating(false)
  }

  if (!collaborationId) return null

  const messageGroups = groupMessagesByDate(messages)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl w-full h-[95vh] max-h-[95vh] p-0 m-0 sm:m-4 md:m-6 flex flex-col overflow-hidden rounded-lg sm:rounded-xl">
        <ChatHeader
          collaborationTitle={collaborationTitle}
          participantsCount={participants.length}
          donationsCount={donationSummary?.total_count || 0}
          isMobile={isMobile}
          isNavigating={isNavigating}
          showSidebar={showSidebar}
          onToggleSidebar={() => setShowSidebar(!showSidebar)}
          onNavigateToFullPage={handleNavigateToFullPage}
          onClose={onClose}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden relative">
          {/* Chat Section */}
          <div className={`flex-1 flex flex-col min-h-0 min-w-0 transition-all duration-300 ${isMobile && showSidebar ? 'hidden' : 'flex'}`}>
            <ChatMessages
              messages={messages}
              loading={loading}
              currentUserId={user?.id}
              messageGroups={messageGroups}
              formatDate={formatDate}
              formatTime={formatTime}
              scrollAreaRef={scrollAreaRef}
              messagesEndRef={messagesEndRef}
            />

            <MessageInput
              newMessage={newMessage}
              isSending={isSending}
              onMessageChange={setNewMessage}
              onSend={sendMessage}
              onKeyPress={handleKeyPress}
            />
          </div>

          {/* Sidebar */}
          <CollaborationSidebar
            participants={participants}
            donationSummary={donationSummary}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            formatTime={formatTime}
            isMobile={isMobile}
            onClose={() => setShowSidebar(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
