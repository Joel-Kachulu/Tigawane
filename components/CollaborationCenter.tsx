"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Users, Plus, MapPin, Calendar, MessageCircle, AlertCircle, Package, Utensils, Gift } from "lucide-react"

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
}

export default function CollaborationCenter({ onOpenCollaborationChat }: CollaborationCenterProps) {
  const { user } = useAuth()
  const [collaborations, setCollaborations] = useState<Collaboration[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isTableMissing, setIsTableMissing] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    target_date: "",
  })

  useEffect(() => {
    fetchCollaborations()
  }, [])

  const fetchCollaborations = async () => {
    try {
      // First, fetch collaboration requests
      const { data: collaborationData, error: collaborationError } = await supabase
        .from("collaboration_requests")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false })

      if (collaborationError) {
        console.error("Error fetching collaborations:", collaborationError)
        if (collaborationError.message.includes('relation "public.collaboration_requests" does not exist')) {
          setIsTableMissing(true)
        }
        return
      }

      if (!collaborationData || collaborationData.length === 0) {
        setCollaborations([])
        setIsTableMissing(false)
        return
      }

      // Get creator names separately
      const creatorIds = [...new Set(collaborationData.map((collab) => collab.creator_id))]
      const { data: profilesData } = await supabase.from("profiles").select("id, full_name").in("id", creatorIds)

      // Create a map of creator IDs to names
      const profilesMap = new Map()
      if (profilesData) {
        profilesData.forEach((profile) => {
          profilesMap.set(profile.id, profile.full_name)
        })
      }

      // Optimize database queries by batching them
      const collaborationIds = collaborationData.map(collab => collab.id)
      
      // Get all participants for all collaborations in one query
      const { data: allParticipants } = await supabase
        .from("collaboration_participants")
        .select("collaboration_id, user_id")
        .in("collaboration_id", collaborationIds)

      // Get all donation data for all collaborations in one query
      const { data: allDonations } = await supabase
        .from("items")
        .select("collaboration_id, item_type")
        .in("collaboration_id", collaborationIds)
        .eq("status", "available")

      // Process the data efficiently
      const participantsByCollab = new Map()
      const donationsByCollab = new Map()
      
      // Group participants by collaboration
      if (allParticipants) {
        allParticipants.forEach(p => {
          if (!participantsByCollab.has(p.collaboration_id)) {
            participantsByCollab.set(p.collaboration_id, [])
          }
          participantsByCollab.get(p.collaboration_id).push(p.user_id)
        })
      }
      
      // Group donations by collaboration and type
      if (allDonations) {
        allDonations.forEach(d => {
          if (!donationsByCollab.has(d.collaboration_id)) {
            donationsByCollab.set(d.collaboration_id, { food: 0, nonFood: 0, total: 0 })
          }
          const stats = donationsByCollab.get(d.collaboration_id)
          stats.total++
          if (d.item_type === "food") {
            stats.food++
          } else {
            stats.nonFood++
          }
        })
      }

      // Build the final collaboration objects
      const collaborationsWithDetails = collaborationData.map(collab => {
        const participants = participantsByCollab.get(collab.id) || []
        const donations = donationsByCollab.get(collab.id) || { food: 0, nonFood: 0, total: 0 }
        const isParticipant = user ? participants.includes(user.id) : false

        return {
          ...collab,
          creator_name: profilesMap.get(collab.creator_id) || "Anonymous",
          participant_count: participants.length,
          is_participant: isParticipant,
          donation_preview: {
            food_count: donations.food,
            item_count: donations.nonFood,
            total_count: donations.total
          }
        }
      })

      setCollaborations(collaborationsWithDetails)
      setIsTableMissing(false)
    } catch (error) {
      console.error("Unexpected error fetching collaborations:", error)
      setIsTableMissing(true)
    }
  }

  const createCollaboration = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || isTableMissing) return

    setLoading(true)

    try {
      const { data, error } = await supabase
        .from("collaboration_requests")
        .insert({
          creator_id: user.id,
          title: formData.title,
          description: formData.description,
          location: formData.location,
          target_date: formData.target_date || null,
        })
        .select()
        .single()

      if (error) throw error

      // Auto-join the creator as a participant
      await supabase.from("collaboration_participants").insert({
        collaboration_id: data.id,
        user_id: user.id,
      })

      setFormData({ title: "", description: "", location: "", target_date: "" })
      setShowCreateForm(false)
      fetchCollaborations()
      alert("Collaboration created successfully!")
    } catch (error: any) {
      console.error("Error creating collaboration:", error)
      alert(`Error creating collaboration: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const joinCollaboration = async (collaborationId: string) => {
    if (!user || isTableMissing) return

    try {
      const { error } = await supabase.from("collaboration_participants").insert({
        collaboration_id: collaborationId,
        user_id: user.id,
      })

      if (error) throw error

      fetchCollaborations()
      alert("Successfully joined the collaboration!")
    } catch (error: any) {
      console.error("Error joining collaboration:", error)
      alert(`Error joining collaboration: ${error.message}`)
    }
  }

  const leaveCollaboration = async (collaborationId: string) => {
    if (!user || isTableMissing) return

    try {
      const { error } = await supabase
        .from("collaboration_participants")
        .delete()
        .eq("collaboration_id", collaborationId)
        .eq("user_id", user.id)

      if (error) throw error

      fetchCollaborations()
      alert("Left the collaboration")
    } catch (error: any) {
      console.error("Error leaving collaboration:", error)
      alert(`Error leaving collaboration: ${error.message}`)
    }
  }

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
            <Button onClick={fetchCollaborations} variant="outline">
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
            <form onSubmit={createCollaboration} className="space-y-4">
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
                <Button type="submit" disabled={loading} className="flex-1 bg-green-600 hover:bg-green-700">
                  {loading ? "Creating..." : "Create"}
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
                    <Button onClick={() => leaveCollaboration(collab.id)} variant="outline" size="sm">
                      Leave
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => joinCollaboration(collab.id)}
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
