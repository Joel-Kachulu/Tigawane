"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Edit, Trash2, Loader2, CheckCircle, XCircle } from "lucide-react"

export default function StoriesManager() {
  const [stories, setStories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editStory, setEditStory] = useState<any | null>(null)
  const [editForm, setEditForm] = useState({
    name: "",
    location: "",
    story: "",
  })
  const [editLoading, setEditLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalStories, setTotalStories] = useState(0)
  const storiesPerPage = 10

  useEffect(() => {
    fetchStories()
  }, [currentPage])

  const fetchStories = async () => {
    try {
      setLoading(true)
      const from = (currentPage - 1) * storiesPerPage
      const to = from + storiesPerPage - 1
      
      const { data, error, count } = await supabase
        .from("stories")
        .select("*", { count: 'exact' })
        .order("created_at", { ascending: false })
        .range(from, to)
      
      if (error) throw error
      
      setStories(data || [])
      setTotalStories(count || 0)
      setTotalPages(Math.ceil((count || 0) / storiesPerPage))
    } catch (error) {
      console.error("Error fetching stories:", error)
      console.error("Error details:", {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error
      })
      setStories([])
      setTotalStories(0)
      setTotalPages(0)
    } finally {
      setLoading(false)
    }
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

  const handleEdit = (story: any) => {
    setEditStory(story)
    setEditForm({
      name: story.name || "",
      location: story.location || "",
      story: story.story || "",
    })
    setEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editStory) return
    setEditLoading(true)
    await supabase.from("stories").update({
      name: editForm.name,
      location: editForm.location,
      story: editForm.story,
    }).eq("id", editStory.id)
    setEditLoading(false)
    setEditDialogOpen(false)
    setEditStory(null)
    await fetchStories()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this story? This action cannot be undone.")) return
    setDeleteLoading(id)
    await supabase.from("stories").delete().eq("id", id)
    setDeleteLoading(null)
    await fetchStories()
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center h-32">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-green-600" />
            <span className="text-gray-600">Loading stories...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Results Summary */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          Showing {stories.length} of {totalStories} stories
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {stories.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg">No stories submitted yet.</div>
        </div>
      )}
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
            <div className="flex flex-wrap gap-2 mt-2">
              {story.status === "pending" && (
                <>
                  <Button size="sm" onClick={() => handleApprove(story.id)} disabled={actionLoading === story.id} className="flex items-center gap-1 min-w-[90px]">
                    {actionLoading === story.id ? <Loader2 className="animate-spin h-4 w-4" /> : <CheckCircle className="h-3 w-3" />}
                    {actionLoading === story.id ? "Approving..." : "Approve"}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleReject(story.id)} disabled={actionLoading === story.id} className="flex items-center gap-1 min-w-[90px]">
                    {actionLoading === story.id ? <Loader2 className="animate-spin h-4 w-4" /> : <XCircle className="h-3 w-3" />}
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
              <Button size="sm" variant="outline" onClick={() => handleEdit(story)} className="flex items-center gap-1 min-w-[90px]">
                <Edit className="h-3 w-3" /> Edit
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleDelete(story.id)} className="text-red-600 hover:text-red-700 flex items-center gap-1 min-w-[90px]" disabled={deleteLoading === story.id}>
                {deleteLoading === story.id ? <Loader2 className="animate-spin h-4 w-4" /> : <Trash2 className="h-3 w-3" />}
                {deleteLoading === story.id ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Story</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <Input
                value={editForm.name}
                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Location</label>
              <Input
                value={editForm.location}
                onChange={e => setEditForm({ ...editForm, location: e.target.value })}
                placeholder="Location"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Story</label>
              <Textarea
                value={editForm.story}
                onChange={e => setEditForm({ ...editForm, story: e.target.value })}
                placeholder="Story"
                rows={5}
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={editLoading}>
              {editLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 