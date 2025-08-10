"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"

interface SubmitStoryModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function SubmitStoryModal({ open, onClose, onSuccess }: SubmitStoryModalProps) {
  const [name, setName] = useState("")
  const [location, setLocation] = useState("")
  const [story, setStory] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)
    if (!name || !location || !story) {
      setError("All fields are required.")
      setLoading(false)
      return
    }
    const { error } = await supabase.from("stories").insert([
      { name, location, story, status: "pending" }
    ])
    setLoading(false)
    if (error) {
      setError("Failed to submit story. Please try again.")
    } else {
      setSuccess(true)
      setName("")
      setLocation("")
      setStory("")
      onSuccess()
      setTimeout(() => {
        setSuccess(false)
        onClose()
      }, 1500)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit Your Story</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="Your Name"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
          <Input
            placeholder="Your Location (e.g. Lilongwe)"
            value={location}
            onChange={e => setLocation(e.target.value)}
            required
          />
          <Textarea
            placeholder="Share your Tigawane moment..."
            value={story}
            onChange={e => setStory(e.target.value)}
            rows={4}
            required
          />
          {error && <div className="text-red-500 text-sm">{error}</div>}
          {success && <div className="text-green-600 text-sm">Story submitted! Thank you.</div>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}