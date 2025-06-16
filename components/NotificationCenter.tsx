"use client"

import { useState, useEffect } from "react"
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
}

export default function NotificationCenter({ onOpenChat }: NotificationCenterProps) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isTableMissing, setIsTableMissing] = useState(false)

  useEffect(() => {
    if (user) {
      fetchNotifications()
    }
  }, [user])

  const fetchNotifications = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20)

      if (error) {
        console.error("Error fetching notifications:", error)
        // Check if the error is due to missing table
        if (error.message.includes('relation "public.notifications" does not exist')) {
          setIsTableMissing(true)
        }
      } else {
        setNotifications(data || [])
        setUnreadCount(data?.filter((n) => !n.is_read).length || 0)
        setIsTableMissing(false)

        // Subscribe to new notifications only if table exists
        const subscription = supabase
          .channel(`notifications:${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "notifications",
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              const newNotification = payload.new as Notification
              setNotifications((prev) => [newNotification, ...prev])
              setUnreadCount((prev) => prev + 1)
            },
          )
          .subscribe()

        return () => {
          subscription.unsubscribe()
        }
      }
    } catch (error) {
      console.error("Unexpected error fetching notifications:", error)
      setIsTableMissing(true)
    }
  }

  const markAsRead = async (notificationId: string) => {
    if (isTableMissing) return

    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", notificationId)

    if (!error) {
      setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }
  }

  const markAllAsRead = async () => {
    if (!user || isTableMissing) return

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false)

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id)
    }

    if (notification.type === "message" && notification.related_claim_id) {
      // Get the claim details and user names separately
      const { data: claimData } = await supabase
        .from("claims")
        .select("*")
        .eq("id", notification.related_claim_id)
        .single()

      if (claimData) {
        // Get the other user's name
        const otherUserId = claimData.claimer_id === user?.id ? claimData.owner_id : claimData.claimer_id
        const { data: otherUserProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", otherUserId)
          .single()

        const otherUserName = otherUserProfile?.full_name || "User"
        onOpenChat(notification.related_claim_id, otherUserName)
        setIsOpen(false)
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
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                Mark all read
              </Button>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1">
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
                          {!notification.is_read && <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />}
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
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
