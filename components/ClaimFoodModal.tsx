"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

interface Item {
  id: string
  title: string
  description: string | null
  pickup_location: string
  user_id: string
  owner_name?: string | null
}

interface ClaimFoodModalProps {
  foodItem: Item | null
  isOpen: boolean
  onClose: () => void
  onClaimed: () => void
}

export default function ClaimFoodModal({ foodItem, isOpen, onClose, onClaimed }: ClaimFoodModalProps) {
  const { user } = useAuth()
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  const handleClaim = async () => {
    if (!user || !foodItem) return

    setLoading(true)

    try {
      console.log("Creating claim for item:", foodItem.id)

      const { data, error } = await supabase
        .from("claims")
        .insert({
          item_id: foodItem.id,
          claimer_id: user.id,
          owner_id: foodItem.user_id,
          message: message || null,
        })
        .select()

      if (error) {
        console.error("Error creating claim:", error)
        throw error
      }

      console.log("Claim created successfully:", data)

      // Update item status to 'requested' instead of 'claimed'
      const { error: updateError } = await supabase.from("items").update({ status: "requested" }).eq("id", foodItem.id)

      if (updateError) {
        console.warn("Error updating item status:", updateError)
      } else {
        console.log("Item status updated to requested")
      }

      onClaimed()
      onClose()
      setMessage("")
      alert("Item request sent! The owner will be notified.")
    } catch (error: any) {
      console.error("Error claiming item:", error)
      alert(`Error sending request: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (!foodItem) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request Item</DialogTitle>
          <DialogDescription>
            Send a request to {foodItem.owner_name || "the owner"} for "{foodItem.title}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600">
              <strong>Pickup Location:</strong> {foodItem.pickup_location}
            </p>
          </div>

          <div>
            <Label htmlFor="message">Message (optional)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Hi! I'm interested in this item. When can I pick it up?"
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleClaim} disabled={loading} className="flex-1 bg-green-600 hover:bg-green-700">
              {loading ? "Sending..." : "Send Request"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
