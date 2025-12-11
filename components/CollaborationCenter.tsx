"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { useCollaborations, useCollaborationDetails, useCollaborationMutations } from "@/lib/hooks/useCollaborations"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Users, Plus, MapPin, Calendar, MessageCircle, AlertCircle, Package, Utensils, Gift, ChevronLeft, Loader2 } from "lucide-react"

interface Collaboration {
  id: string
  title: string
  description: string
  location: string
  target_date: string | null
  status: string
  created_at: string
  creator_id: string
  creator_name?: string
  participant_count?: number
  is_participant?: boolean
  donation_preview?: {
    food_count: number
    item_count: number
    total_count: number
  }
}

interface CollaborationCenterProps {
  onOpenCollaborationChat: (collaborationId: string, title: string) => void
  selectedCollaborationId?: string | null // For showing specific collaboration details
}

export default function CollaborationCenter({ onOpenCollaborationChat, selectedCollaborationId }: CollaborationCenterProps) {
  const { user } = useAuth()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    target_date: "",
  })

  // ✨ Use the new hooks instead of manual fetching
  const { collaborations, loading, error, refetch } = useCollaborations(user?.id)
  const { collaboration: selectedCollaboration, loading: loadingDetails, refetch: refetchDetails } = useCollaborationDetails(
    selectedCollaborationId || null,
    user?.id
  )
  const { create, join, leave, loading: mutationLoading } = useCollaborationMutations()

  // Check if table is missing (error handling)
  const isTableMissing = error?.message === 'COLLABORATION_TABLE_MISSING' || 
    (error && error.message.includes('relation "public.collaboration_requests" does not exist'))

  const handleCreateCollaboration = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || isTableMissing) return

    try {
      // Service automatically joins the creator as a participant
      await create({
        creator_id: user.id,
        title: formData.title,
        description: formData.description,
        location: formData.location,
        target_date: formData.target_date || null,
      })

      setFormData({ title: "", description: "", location: "", target_date: "" })
      setShowCreateForm(false)
      refetch()
      alert("Collaboration created successfully!")
    } catch (error: any) {
      console.error("Error creating collaboration:", error)
      alert(`Error creating collaboration: ${error.message}`)
    }
  }

  const handleJoinCollaboration = async (collaborationId: string) => {
    if (!user || isTableMissing) return

    try {
      await join(collaborationId, user.id)
      refetch()
      if (selectedCollaborationId === collaborationId) {
        refetchDetails()
      }
      alert("Successfully joined the collaboration!")
    } catch (error: any) {
      console.error("Error joining collaboration:", error)
      alert(`Error joining collaboration: ${error.message}`)
    }
  }

  const handleLeaveCollaboration = async (collaborationId: string) => {
    if (!user || isTableMissing) return

    try {
      await leave(collaborationId, user.id)
      refetch()
      if (selectedCollaborationId === collaborationId) {
        refetchDetails()
      }
      alert("Left the collaboration")
    } catch (error: any) {
      console.error("Error leaving collaboration:", error)
      alert(`Error leaving collaboration: ${error.message}`)
    }
  }

  // Extract participants and donation summary from selectedCollaboration
  const participants = selectedCollaboration?.participants || []
  const donationSummary = selectedCollaboration?.donation_summary || null

  // Show setup message if table is missing
  if (isTableMissing) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Community Collaborations</h2>
          <p className="text-gray-600">Organize big moves, donations, and community projects</p>
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-orange-500" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Setup Required</h3>
            <p className="text-gray-600 mb-4">
              The collaboration system needs to be set up. Please run the complete database setup script to enable
              collaboration features.
            </p>
            <div className="bg-gray-100 p-3 rounded text-sm mb-4">
              <strong>Script to run:</strong>
              <br />
              <code>scripts/setup-complete-database.sql</code>
            </div>
            <Button onClick={refetch} variant="outline">
              Check Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Community Collaborations</h2>
          <p className="text-gray-600">Organize big moves, donations, and community projects</p>
        </div>
        <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Start Collaboration
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Start a New Collaboration</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateCollaboration} className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Community Food Drive, Moving Help"
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what help you need or what you're organizing..."
                  rows={3}
                  required
                />
              </div>
              <div>
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Lilongwe, Area 25"
                  required
                />
              </div>
              <div>
                <Label htmlFor="target_date">Target Date (optional)</Label>
                <Input
                  id="target_date"
                  type="date"
                  value={formData.target_date}
                  onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={mutationLoading} className="flex-1 bg-green-600 hover:bg-green-700">
                  {mutationLoading ? "Creating..." : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {collaborations.map((collab) => (
          <Card key={collab.id} className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-green-500">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg text-green-700">{collab.title}</CardTitle>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  <Users className="h-3 w-3 mr-1" />
                  {collab.participant_count}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600 text-sm line-clamp-2">{collab.description}</p>

              {/* Simple Donation Summary */}
              {collab.donation_preview && collab.donation_preview.total_count > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-green-800 flex items-center gap-1">
                      <Gift className="h-4 w-4" />
                      Shared Items
                    </h4>
                    <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                      {collab.donation_preview.total_count} total
                    </Badge>
                  </div>
                  
                  <div className="flex gap-4 text-xs text-green-700 mt-2">
                    {collab.donation_preview.food_count > 0 && (
                      <div className="flex items-center gap-1">
                        <Utensils className="h-3 w-3" />
                        <span>{collab.donation_preview.food_count} food</span>
                      </div>
                    )}
                    {collab.donation_preview.item_count > 0 && (
                      <div className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        <span>{collab.donation_preview.item_count} items</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Simple Participants Summary */}
              {collab.participant_count && collab.participant_count > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-blue-800 flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      Participants
                    </h4>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                      {collab.participant_count} total
                    </Badge>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span>{collab.location}</span>
                </div>

                {collab.target_date && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>Target: {new Date(collab.target_date).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              <div className="text-sm text-gray-500 border-t pt-2">
                Created by {collab.creator_name} • {new Date(collab.created_at).toLocaleDateString()}
              </div>

              <div className="flex gap-2 pt-2">
                {collab.is_participant ? (
                  <>
                    <Button
                      onClick={() => onOpenCollaborationChat(collab.id, collab.title)}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      size="sm"
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      Chat
                    </Button>
                    <Button onClick={() => handleLeaveCollaboration(collab.id)} variant="outline" size="sm">
                      Leave
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => handleJoinCollaboration(collab.id)}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    size="sm"
                  >
                    Join Collaboration
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {collaborations.length === 0 && !isTableMissing && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No active collaborations</h3>
          <p className="text-gray-600 mb-4">Be the first to start a community collaboration!</p>
          <Button onClick={() => setShowCreateForm(true)} className="bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-2" />
            Start Collaboration
          </Button>
        </div>
      )}
    </div>
  )
}