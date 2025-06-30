"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function StoriesManager() {
  const [stories, setStories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchStories()
  }, [])

  const fetchStories = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("stories")
      .select("*")
      .order("created_at", { ascending: false })
    setStories(data || [])
    setLoading(false)
  }

  const handleApprove = async (id: string) => {
    setActionLoading(id)
    await supabase.from("stories").update({ status: "approved" }).eq("id", id)
    await fetchStories()
    setActionLoading(null)
  }

  const handleReject = async (id: string) => {
    setActionLoading(id)
    await supabase.from("stories").update({ status: "rejected" }).eq("id", id)
    await fetchStories()
    setActionLoading(null)
  }

  if (loading) return <div>Loading stories...</div>

  return (
    <div className="space-y-6">
      {stories.length === 0 && <div>No stories submitted yet.</div>}
      {stories.map(story => (
        <Card key={story.id} className="border-l-4 mb-4 border-l-green-500">
          <CardHeader>
            <CardTitle>
              {story.name} <span className="text-gray-400 text-sm">({story.location})</span>
              <Badge className="ml-2" variant={
                story.status === "approved"
                  ? "default"
                  : story.status === "pending"
                  ? "secondary"
                  : "destructive"
              }>
                {story.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <blockquote className="italic mb-2">"{story.story}"</blockquote>
            <div className="flex gap-2">
              {story.status === "pending" && (
                <>
                  <Button size="sm" onClick={() => handleApprove(story.id)} disabled={actionLoading === story.id}>
                    {actionLoading === story.id ? "Approving..." : "Approve"}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleReject(story.id)} disabled={actionLoading === story.id}>
                    {actionLoading === story.id ? "Rejecting..." : "Reject"}
                  </Button>
                </>
              )}
              {story.status === "approved" && (
                <span className="text-green-600 font-semibold">Approved</span>
              )}
              {story.status === "rejected" && (
                <span className="text-red-600 font-semibold">Rejected</span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
} 