"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"

export function AdminRegistration() {
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("admin")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const handlePromoteUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")
    setError("")

    try {
      // First, find the user by email
      const { data: userData, error: userError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .single()

      if (userError || !userData) {
        throw new Error("User not found. Make sure they have signed up first.")
      }

      // Check if user is already an admin
      const { data: existingAdmin } = await supabase
        .from("admin_users")
        .select("role")
        .eq("user_id", userData.id)
        .single()

      if (existingAdmin) {
        throw new Error("User is already an admin with role: " + existingAdmin.role)
      }

      // Promote user to admin
      const { error: adminError } = await supabase.from("admin_users").insert({
        user_id: userData.id,
        role: role,
      })

      if (adminError) {
        throw adminError
      }

      setMessage(`Successfully promoted ${email} to ${role}!`)
      setEmail("")
      setRole("admin")
    } catch (err: any) {
      console.error("Error promoting user:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Promote User to Admin</CardTitle>
        <CardDescription>Enter the email of an existing user to promote them to admin</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handlePromoteUser} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              User Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
            />
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium mb-2">
              Admin Role
            </label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Promoting..." : "Promote to Admin"}
          </Button>
        </form>

        {message && (
          <Alert className="mt-4">
            <AlertDescription className="text-green-600">{message}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="mt-4" variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
