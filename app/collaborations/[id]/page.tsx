
"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { useCollaborationDetails, useCollaborationMutations } from "@/lib/hooks/useCollaborations"
import ItemList from "@/components/ItemList"
import CollaborationChatModal from "@/components/CollaborationChatModal"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, MapPin, Calendar, ArrowLeft, MessageCircle, Package, Utensils, Gift } from "lucide-react"
import Link from "next/link"

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
}

interface Participant {
  id: string
  user_id: string
  full_name: string | null
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

export default function CollaborationPage() {
  const params = useParams()
  const router = useRouter()
  const collaborationId = params?.id as string
  const { user } = useAuth()
  const [collaboration, setCollaboration] = useState<Collaboration | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [donationSummary, setDonationSummary] = useState<DonationSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showChatModal, setShowChatModal] = useState(false)

  // ✨ Use the new hooks
  const { collaboration: collaborationDetails, loading, refetch: refetchDetails } = useCollaborationDetails(
    collaborationId || null,
    user?.id
  )
  const { join, leave } = useCollaborationMutations()

  // Update local state when collaboration details are fetched
  useEffect(() => {
    if (collaborationDetails) {
      setCollaboration({
        id: collaborationDetails.id,
        title: collaborationDetails.title,
        description: collaborationDetails.description,
        location: collaborationDetails.location,
        target_date: collaborationDetails.target_date,
        status: collaborationDetails.status,
        created_at: collaborationDetails.created_at,
        creator_id: collaborationDetails.creator_id,
        creator_name: collaborationDetails.creator_name,
        participant_count: collaborationDetails.participant_count,
        is_participant: collaborationDetails.is_participant,
      })
      setParticipants(collaborationDetails.participants)
      setDonationSummary(collaborationDetails.donation_summary)
    }
  }, [collaborationDetails])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-8">Loading collaboration...</div>
        </div>
      </div>
    )
  }

  if (error || !collaboration) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-8 text-red-600">
            {error || "Collaboration not found"}
          </div>
          <div className="text-center">
            <Link href="/">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const handleJoinCollaboration = async () => {
    if (!user) {
      alert("Please sign in to join collaborations")
      return
    }

    if (!collaborationId) return

    try {
      await join(collaborationId, user.id)
      refetchDetails()
      alert("Successfully joined the collaboration!")
    } catch (error: any) {
      console.error("Error joining collaboration:", error)
      alert(`Error joining collaboration: ${error.message}`)
    }
  }

  const handleLeaveCollaboration = async () => {
    if (!user || !collaborationId) return

    try {
      await leave(collaborationId, user.id)
      refetchDetails()
      alert("Left the collaboration")
    } catch (error: any) {
      console.error("Error leaving collaboration:", error)
      alert(`Error leaving collaboration: ${error.message}`)
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

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Back Button */}
        <Button 
          onClick={() => router.back()}
          className="bg-green text-black hover:bg-gray-50 border border-gray-300"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Collaboration Header */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <CardTitle className="text-2xl sm:text-3xl text-green-700 mb-2">
                  {collaboration.title}
                </CardTitle>
                <CardDescription className="text-base mt-2">
                  {collaboration.description}
                </CardDescription>
              </div>
              <Badge className="bg-blue-100 text-blue-800 text-sm">
                <Users className="h-4 w-4 mr-1" />
                {collaboration.participant_count} participants
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="h-5 w-5 text-green-600" />
                <span className="font-medium">{collaboration.location}</span>
              </div>
              {collaboration.target_date && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-5 w-5 text-green-600" />
                  <span className="font-medium">
                    Target: {new Date(collaboration.target_date).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
            <div className="text-sm text-gray-500 border-t pt-3">
              Created by {collaboration.creator_name} • {new Date(collaboration.created_at).toLocaleDateString()}
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        {donationSummary && donationSummary.total_count > 0 && (
          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Utensils className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-semibold text-green-700">Food Items</span>
                </div>
                <p className="text-3xl font-bold text-green-700">{donationSummary.food_count}</p>
              </CardContent>
            </Card>
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-semibold text-blue-700">Other Items</span>
                </div>
                <p className="text-3xl font-bold text-blue-700">{donationSummary.item_count}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Participants Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Participants ({participants.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {participants.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No participants yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {participants.map((participant) => (
                  <div key={participant.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-sm font-semibold text-white shadow-md">
                      {participant.full_name?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <span className="text-sm font-medium text-gray-700 flex-1">
                      {participant.full_name || "Anonymous"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Donations Section */}
        {donationSummary && donationSummary.total_count > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-green-600" />
                Shared Items ({donationSummary.total_count})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {donationSummary.recent_donations.map((donation) => (
                  <div key={donation.id} className="p-3 bg-white rounded-lg border border-gray-200 hover:border-green-300 transition-colors">
                    <div className="flex items-start gap-2">
                      {donation.item_type === "food" ? (
                        <Utensils className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      ) : (
                        <Package className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">{donation.title}</p>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {donation.user_name} • {formatTime(donation.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {collaboration.is_participant ? (
            <>
              <Button
                onClick={() => setShowChatModal(true)}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <MessageCircle className="h-5 w-5 mr-2" />
                Open Chat
              </Button>
              <Button 
                onClick={handleLeaveCollaboration} 
                className="border-gray-300"
              >
                Leave
              </Button>
            </>
          ) : (
            <Button
              onClick={handleJoinCollaboration}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Join Collaboration
            </Button>
          )}
        </div>

        {/* Items Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Food Donations</h2>
          <ItemList itemType="food" collaborationId={collaborationId} />
          
          <h2 className="text-xl font-semibold text-gray-900">Item Donations</h2>
          <ItemList itemType="non-food" collaborationId={collaborationId} />
        </div>
      </div>

      {/* Chat Modal */}
      {collaboration && (
        <CollaborationChatModal
          collaborationId={collaborationId}
          collaborationTitle={collaboration.title}
          isOpen={showChatModal}
          onClose={() => setShowChatModal(false)}
        />
      )}
    </div>
  )
}
