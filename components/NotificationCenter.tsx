"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Bell, MessageCircle, Package, Users, AlertCircle } from "lucide-react"

interface Notification {
  id: string
  type: string
  title: string
  message: string
  is_read: boolean
  created_at: string
  related_item_id?: string
  related_claim_id?: string
}

interface NotificationCenterProps {
  onOpenChat: (claimId: string, otherUserName: string) => void
  onNavigateToMyItems?: () => void
}

export default function NotificationCenter({ onOpenChat, onNavigateToMyItems }: NotificationCenterProps) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isTableMissing, setIsTableMissing] = useState(false)
  const [loading, setLoading] = useState(false)
  const subscriptionRef = useRef<any>(null)
  const channelRef = useRef<string>("")

  useEffect(() => {
    if (user) {
      fetchNotifications()
    }

    // Cleanup subscription when component unmounts or user changes
    return () => {
      if (subscriptionRef.current) {
        console.log("🧹 Cleaning up notification subscription")
        subscriptionRef.current.unsubscribe()
        subscriptionRef.current = null
      }
    }
  }, [user])

  // Also fetch notifications when dialog opens
  useEffect(() => {
    if (isOpen && user) {
      fetchNotifications()
    }
  }, [isOpen, user])

  const fetchNotifications = async () => {
    if (!user) return

    try {
      setLoading(true)
      console.log("📡 Fetching notifications for user:", user.id)

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20)

      if (error) {
        console.error("❌ Error fetching notifications:", error)
        // Check if the error is due to missing table
        if (error.message.includes('relation "public.notifications" does not exist')) {
          setIsTableMissing(true)
          return
        }
      } else {
        console.log("✅ Notifications fetched:", data?.length || 0)
        setNotifications(data || [])
        setUnreadCount(data?.filter((n) => !n.is_read).length || 0)
        setIsTableMissing(false)

        // Set up real-time subscription only if we don't have one already
        setupRealtimeSubscription()
      }
    } catch (error) {
      console.error("💥 Unexpected error fetching notifications:", error)
      setIsTableMissing(true)
    } finally {
      setLoading(false)
    }
  }

  const setupRealtimeSubscription = () => {
    if (!user) return

    // Create unique channel name
    const channelName = `notifications:${user.id}:${Date.now()}`

    // Clean up existing subscription if it exists
    if (subscriptionRef.current && channelRef.current) {
      console.log("🔄 Cleaning up existing subscription:", channelRef.current)
      subscriptionRef.current.unsubscribe()
      subscriptionRef.current = null
    }

    try {
      console.log("🔔 Setting up notification subscription:", channelName)

      const channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log("🆕 New notification received:", payload.new)
            const newNotification = payload.new as Notification
            setNotifications((prev) => [newNotification, ...prev])
            setUnreadCount((prev) => prev + 1)
            
            // Show a browser notification if permitted
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(newNotification.title, {
                body: newNotification.message,
                icon: '/placeholder-logo.png'
              })
            }
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log("📝 Notification updated:", payload.new)
            const updatedNotification = payload.new as Notification
            setNotifications((prev) => prev.map((n) => (n.id === updatedNotification.id ? updatedNotification : n)))
            // Recalculate unread count
            setNotifications((prev) => {
              const newUnreadCount = prev.filter((n) => !n.is_read).length
              setUnreadCount(newUnreadCount)
              return prev
            })
          },
        )
        .subscribe((status) => {
          console.log("📡 Subscription status:", status)
        })

      subscriptionRef.current = channel
      channelRef.current = channelName
    } catch (error) {
      console.error("❌ Error setting up subscription:", error)
    }
  }

  const markAsRead = async (notificationId: string) => {
    if (isTableMissing) return

    try {
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", notificationId)

      if (!error) {
        setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)))
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error("❌ Error marking notification as read:", error)
    }
  }

  const markAllAsRead = async () => {
    if (!user || isTableMissing) return

    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false)

      if (!error) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
        setUnreadCount(0)
      }
    } catch (error) {
      console.error("❌ Error marking all notifications as read:", error)
    }
  }

  const clearAllNotifications = async () => {
    if (!user) return
    try {
      await supabase.from("notifications").delete().eq("user_id", user.id)
      setNotifications([])
      setUnreadCount(0)
    } catch (error) {
      console.error("❌ Error clearing notifications:", error)
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id)
    }

    // Open chat for message, item_request, and status_update notifications if related_claim_id exists
    if ((["message", "item_request", "status_update"].includes(notification.type)) && notification.related_claim_id) {
      try {
        // Get the claim details to determine the other user
        const { data: claimData, error: claimError } = await supabase
          .from("claims")
          .select("*")
          .eq("id", notification.related_claim_id)
          .single()

        if (claimError) {
          console.error("❌ Error fetching claim:", claimError)
          // Still try to open chat with default name if claim fetch fails
          onOpenChat(notification.related_claim_id, "User")
          setIsOpen(false)
          return
        }

        if (claimData && user) {
          // Get the other user's name
          const otherUserId = claimData.claimer_id === user.id ? claimData.owner_id : claimData.claimer_id
          
          let otherUserName = "User"
          try {
            const { data: otherUserProfile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", otherUserId)
              .single()
            
            otherUserName = otherUserProfile?.full_name || "User"
          } catch (profileError) {
            console.error("❌ Error fetching user profile:", profileError)
            // Continue with default name
          }

          onOpenChat(notification.related_claim_id, otherUserName)
          setIsOpen(false)
        }
      } catch (error) {
        console.error("❌ Error handling notification click:", error)
        // Still try to open chat even if there's an error
        if (notification.related_claim_id) {
          onOpenChat(notification.related_claim_id, "User")
          setIsOpen(false)
        }
      }
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "message":
        return <MessageCircle className="h-4 w-4" />
      case "item_request":
        return <Package className="h-4 w-4" />
      case "collaboration":
        return <Users className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  // Show setup message if table is missing
  if (isTableMissing) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="relative">
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Setup Required
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              The notification system needs to be set up. Please run the complete database setup script to enable
              notifications and collaboration features.
            </p>
            <div className="bg-gray-100 p-3 rounded text-sm">
              <strong>Script to run:</strong>
              <br />
              <code>scripts/setup-complete-database.sql</code>
            </div>
            <Button onClick={() => setIsOpen(false)} className="w-full">
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs bg-red-500">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md h-[600px] flex flex-col">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle>Notifications</DialogTitle>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                  Mark all read
                </Button>
              )}
              {notifications.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearAllNotifications} title="Clear all notifications">
                  🗑️
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="text-sm">Loading notifications...</div>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No notifications yet</p>
                  <p className="text-xs mt-1">You'll get notified when someone requests your items or sends messages</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <Card
                    key={notification.id}
                    className={`cursor-pointer transition-colors hover:bg-gray-50 ${
                      !notification.is_read ? "border-green-200 bg-green-50" : ""
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">{getNotificationIcon(notification.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm">{notification.title}</h4>
                            {!notification.is_read && (
                              <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2">{notification.message}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(notification.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
