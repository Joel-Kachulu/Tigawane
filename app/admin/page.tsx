"use client"

import { AdminAuthProvider, useAdminAuth } from "@/contexts/AdminAuthContext"
import AdminDashboard from "@/components/admin/AdminDashboard"
import AdminLogin from "@/components/admin/AdminLogin"
import AdminLoading from "@/components/admin/AdminLoading"
import StoriesManager from "@/components/admin/StoriesManager"

function AdminPageContent() {
  const { user, isAdmin, loading } = useAdminAuth()

  if (loading) {
    return <AdminLoading />
  }

  if (!user || !isAdmin) {
    return <AdminLogin />
  }

  return <AdminDashboard />
}

export default function AdminPage() {
  return (
    <AdminAuthProvider>
      <AdminPageContent />
    </AdminAuthProvider>
  )
}
