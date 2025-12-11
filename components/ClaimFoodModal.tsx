"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useClaimMutations } from "@/lib/hooks/useClaims"
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
  const { create, loading, error: claimError } = useClaimMutations()

  const handleClaim = async () => {
    if (!user || !foodItem) return

    try {
      console.log("Creating claim for item:", foodItem.id)

      await create({
        item_id: foodItem.id,
        claimer_id: user.id,
        owner_id: foodItem.user_id,
        message: message || null,
      })

      console.log("Claim created successfully")

      onClaimed()
      onClose()
      setMessage("")
      
      // Create a temporary success notification
      const successDiv = document.createElement('div')
      successDiv.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-pulse'
      successDiv.textContent = '✅ Request sent successfully! Owner will be notified.'
      document.body.appendChild(successDiv)
      
      setTimeout(() => {
        if (document.body.contains(successDiv)) {
          document.body.removeChild(successDiv)
        }
      }, 4000)
    } catch (error: any) {
      console.error("Error claiming item:", error)
      alert(`Error sending request: ${error.message}`)
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
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded mb-2">
            <div className="font-semibold text-yellow-800 mb-1 text-sm">Safety Tips:</div>
            <ul className="list-disc list-inside text-xs text-yellow-900 space-y-1">
              <li>Meet during the day</li>
              <li>Meet in public places</li>
              <li>Go with a friend</li>
              <li>Keep it cash free</li>
              <li>Trust your instincts and report suspicious activity</li>
            </ul>
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
            {claimError && (
              <p className="text-sm text-red-600 mt-2">{claimError.message}</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
