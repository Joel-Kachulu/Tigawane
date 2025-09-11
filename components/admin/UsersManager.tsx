"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Users, Search, UserX, UserCheck, Mail, Calendar, Package, AlertTriangle } from "lucide-react"

interface UserStats {
  user_id: string
  full_name: string | null
  email: string
  total_items: number
  active_items: number
  completed_items: number
  reports_count: number
  last_activity: string | null
  is_suspended?: boolean
  suspension_reason?: string
}

export default function UsersManager() {
  const [users, setUsers] = useState<UserStats[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserStats | null>(null)
  const [suspensionForm, setSuspensionForm] = useState({
    reason: "",
    isPermanent: false,
    suspendedUntil: "",
  })
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)
  const usersPerPage = 15

  useEffect(() => {
    fetchUsers()
  }, [currentPage, searchTerm])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      
      // Get user stats with pagination
      const { data: userStats, error, count } = await supabase
        .rpc("get_user_stats", {}, { count: 'exact' })
        .range((currentPage - 1) * usersPerPage, currentPage * usersPerPage - 1)

      if (error) throw error

      // Get all user IDs for suspension check
      const userIds = userStats?.map(user => user.user_id) || []
      
      // Get suspensions in one query
      const { data: suspensions } = await supabase
        .from("user_suspensions")
        .select("user_id, reason, suspended_until, is_permanent")
        .in("user_id", userIds)
        .or(`is_permanent.eq.true,suspended_until.gte.${new Date().toISOString()}`)
        .order("created_at", { ascending: false })

      // Create suspension map
      const suspensionMap = new Map()
      suspensions?.forEach(suspension => {
        if (!suspensionMap.has(suspension.user_id)) {
          suspensionMap.set(suspension.user_id, suspension)
        }
      })

      // Combine user stats with suspension info
      const usersWithSuspensions = userStats?.map(user => ({
        ...user,
        is_suspended: suspensionMap.has(user.user_id),
        suspension_reason: suspensionMap.get(user.user_id)?.reason || null,
      })) || []

      setUsers(usersWithSuspensions)
      setTotalUsers(count || 0)
      setTotalPages(Math.ceil((count || 0) / usersPerPage))
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setLoading(false)
    }
  }

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  const handleSuspendUser = async () => {
    if (!selectedUser) return

    try {
      const suspendedUntil = suspensionForm.isPermanent
        ? null
        : suspensionForm.suspendedUntil
          ? new Date(suspensionForm.suspendedUntil).toISOString()
          : null

      const { error } = await supabase.from("user_suspensions").insert({
        user_id: selectedUser.user_id,
        admin_id: (await supabase.auth.getUser()).data.user?.id,
        reason: suspensionForm.reason,
        suspended_until: suspendedUntil,
        is_permanent: suspensionForm.isPermanent,
      })

      if (error) throw error

      await fetchUsers()
      setSuspendDialogOpen(false)
      setSuspensionForm({ reason: "", isPermanent: false, suspendedUntil: "" })
      alert("User suspended successfully!")
    } catch (error: any) {
      console.error("Error suspending user:", error)
      alert(`Error suspending user: ${error.message}`)
    }
  }

  const handleUnsuspendUser = async (userId: string) => {
    if (!confirm("Are you sure you want to unsuspend this user?")) {
      return
    }

    try {
      const { error } = await supabase.from("user_suspensions").delete().eq("user_id", userId)

      if (error) throw error

      await fetchUsers()
      alert("User unsuspended successfully!")
    } catch (error: any) {
      console.error("Error unsuspending user:", error)
      alert(`Error unsuspending user: ${error.message}`)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading users...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Users List */}
          <div className="space-y-4">
            {users.map((user) => (
              <Card key={user.user_id} className={`${user.is_suspended ? "border-red-200 bg-red-50" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium">{user.full_name || "No Name"}</h3>
                        {user.is_suspended && (
                          <Badge className="bg-red-100 text-red-800">
                            <UserX className="h-3 w-3 mr-1" />
                            Suspended
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            <span>{user.email}</span>
                          </div>
                          {user.last_activity && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>Last active: {new Date(user.last_activity).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            <span>{user.total_items} total items</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                            <span>{user.active_items} active</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                            <span>{user.completed_items} completed</span>
                          </div>
                          {user.reports_count > 0 && (
                            <div className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3 text-red-500" />
                              <span className="text-red-600">{user.reports_count} reports</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {user.is_suspended && user.suspension_reason && (
                        <div className="mt-2 p-2 bg-red-100 rounded text-sm">
                          <strong>Suspension reason:</strong> {user.suspension_reason}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 ml-4">
                      {user.is_suspended ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUnsuspendUser(user.user_id)}
                          className="text-green-600 hover:text-green-700"
                        >
                          <UserCheck className="h-3 w-3 mr-1" />
                          Unsuspend
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedUser(user)
                            setSuspendDialogOpen(true)
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <UserX className="h-3 w-3 mr-1" />
                          Suspend
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
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

          {users.length === 0 && !loading && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
              <p className="text-gray-600">Try adjusting your search terms.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suspend User Dialog */}
      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Suspend User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-4">
                You are about to suspend <strong>{selectedUser?.full_name || selectedUser?.email}</strong>
              </p>
            </div>

            <div>
              <Label htmlFor="reason">Reason for suspension *</Label>
              <Textarea
                id="reason"
                value={suspensionForm.reason}
                onChange={(e) => setSuspensionForm({ ...suspensionForm, reason: e.target.value })}
                placeholder="Explain why this user is being suspended..."
                rows={3}
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isPermanent"
                checked={suspensionForm.isPermanent}
                onChange={(e) => setSuspensionForm({ ...suspensionForm, isPermanent: e.target.checked })}
              />
              <Label htmlFor="isPermanent">Permanent suspension</Label>
            </div>

            {!suspensionForm.isPermanent && (
              <div>
                <Label htmlFor="suspendedUntil">Suspend until</Label>
                <Input
                  id="suspendedUntil"
                  type="datetime-local"
                  value={suspensionForm.suspendedUntil}
                  onChange={(e) => setSuspensionForm({ ...suspensionForm, suspendedUntil: e.target.value })}
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSuspendDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleSuspendUser}
                className="flex-1 bg-red-600 hover:bg-red-700"
                disabled={!suspensionForm.reason.trim()}
              >
                Suspend User
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
