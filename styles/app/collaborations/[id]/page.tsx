
"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import ItemList from "@/components/ItemList"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, MapPin, Calendar, ArrowLeft } from "lucide-react"
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

export default function CollaborationPage() {
  const params = useParams()
  const collaborationId = params?.id as string
  const { user } = useAuth()
  const [collaboration, setCollaboration] = useState<Collaboration | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!collaborationId) return

    const fetchCollaboration = async () => {
      setLoading(true)
      try {
        // Fetch collaboration details
        const { data: collabData, error: collabError } = await supabase
          .from("collaboration_requests")
          .select("*")
          .eq("id", collaborationId)
          .single()

        if (collabError) throw collabError

        // Fetch creator name
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", collabData.creator_id)
          .single()

        // Fetch participant count
        const { data: participantData } = await supabase
          .from("collaboration_participants")
          .select("user_id")
          .eq("collaboration_id", collaborationId)

        // Check if current user is a participant
        let isParticipant = false
        if (user && participantData) {
          isParticipant = participantData.some((p) => p.user_id === user.id)
        }

        setCollaboration({
          ...collabData,
          creator_name: profileData?.full_name || "Anonymous",
          participant_count: participantData?.length || 0,
          is_participant: isParticipant,
        })
      } catch (error: any) {
        console.error("Error fetching collaboration:", error)
        setError("Failed to load collaboration details")
      } finally {
        setLoading(false)
      }
    }

    fetchCollaboration()
  }, [collaborationId, user])

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

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Back Button */}
        <Link href="/">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        {/* Collaboration Header */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl text-green-700">
                  {collaboration.title}
                </CardTitle>
                <CardDescription className="mt-2">
                  {collaboration.description}
                </CardDescription>
              </div>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                <Users className="h-3 w-3 mr-1" />
                {collaboration.participant_count} participants
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4" />
              <span>{collaboration.location}</span>
            </div>

            {collaboration.target_date && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                <span>Target: {new Date(collaboration.target_date).toLocaleDateString()}</span>
              </div>
            )}

            <div className="text-sm text-gray-500">
              Created by {collaboration.creator_name} • {new Date(collaboration.created_at).toLocaleDateString()}
            </div>
          </CardContent>
        </Card>

        {/* Items Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Food Donations</h2>
          <ItemList itemType="food" collaborationId={collaborationId} />
          
          <h2 className="text-xl font-semibold text-gray-900">Item Donations</h2>
          <ItemList itemType="non-food" collaborationId={collaborationId} />
        </div>
      </div>
    </div>
  )
}
