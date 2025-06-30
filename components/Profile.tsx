import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export default function Profile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState({ full_name: "", bio: "" })
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, bio")
        .eq("id", user.id)
        .single()
      if (data) setProfile({ full_name: data.full_name || "", bio: data.bio || "" })
      setLoading(false)
    }
    fetchProfile()
  }, [user])

  const handleSave = async () => {
    if (!user) return
    setLoading(true)
    await supabase
      .from("profiles")
      .update({ full_name: profile.full_name, bio: profile.bio })
      .eq("id", user.id)
    setEditing(false)
    setSuccess(true)
    setLoading(false)
    setTimeout(() => setSuccess(false), 2000)
  }

  if (!user) return <div className="p-8 text-center">Please sign in to view your profile.</div>

  return (
    <div className="max-w-lg mx-auto mt-10 bg-white rounded-xl shadow-lg p-8">
      <h2 className="text-2xl font-bold mb-6 text-green-700">My Profile</h2>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Full Name</label>
        <Input
          value={profile.full_name}
          onChange={e => setProfile({ ...profile, full_name: e.target.value })}
          disabled={!editing}
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Bio</label>
        <Textarea
          value={profile.bio}
          onChange={e => setProfile({ ...profile, bio: e.target.value })}
          disabled={!editing}
          rows={3}
        />
      </div>
      <div className="flex gap-2 mt-6">
        {editing ? (
          <>
            <Button onClick={handleSave} disabled={loading} className="bg-green-600 hover:bg-green-700">
              {loading ? "Saving..." : "Save"}
            </Button>
            <Button variant="outline" onClick={() => setEditing(false)} disabled={loading}>
              Cancel
            </Button>
          </>
        ) : (
          <Button onClick={() => setEditing(true)} className="bg-green-600 hover:bg-green-700">
            Edit Profile
          </Button>
        )}
        {success && <span className="text-green-600 ml-2 self-center">Saved!</span>}
      </div>
    </div>
  )
} 