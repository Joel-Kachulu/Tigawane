"use client"

import { useState, useEffect, lazy, Suspense } from "react"
import { supabase } from "@/lib/supabase"
import { useAdminAuth } from "@/contexts/AdminAuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BarChart3, Users, Package, Flag, Settings, TrendingUp, LogOut, Shield } from "lucide-react"
import AdminLoading from "./AdminLoading"
import { StoriesSkeleton } from "./AdminSkeleton"

// Lazy load admin components for better performance
const ListingsManager = lazy(() => import("./ListingsManager"))
const ReportsManager = lazy(() => import("./ReportsManager"))
const CategoriesManager = lazy(() => import("./CategoriesManager"))
const UsersManager = lazy(() => import("./UsersManager"))
const Analytics = lazy(() => import("./Analytics"))
const StoriesManager = lazy(() => import("./StoriesManager"))

interface DashboardStats {
  totalItems: number
  activeItems: number
  totalUsers: number
  pendingReports: number
  weeklyItems: number
  topCategory: string
}

export default function AdminDashboard() {
  const { user, isAdmin, adminRole, loading: authLoading, signOut } = useAdminAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalItems: 0,
    activeItems: 0,
    totalUsers: 0,
    pendingReports: 0,
    weeklyItems: 0,
    topCategory: "",
  })

  useEffect(() => {
    if (!authLoading && isAdmin) {
      fetchDashboardStats()
    }
  }, [authLoading, isAdmin])

  const fetchDashboardStats = async () => {
    try {
      // Use Promise.all to run all queries in parallel for faster loading
      const [
        totalItemsResult,
        activeItemsResult,
        totalUsersResult,
        pendingReportsResult,
        weeklyItemsResult,
        categoryDataResult
      ] = await Promise.all([
      // Get total items
        supabase.from("items").select("*", { count: "exact", head: true }),

      // Get active items
        supabase
        .from("items")
        .select("*", { count: "exact", head: true })
          .in("status", ["available", "requested"]),

      // Get total users
        supabase.from("profiles").select("*", { count: "exact", head: true }),

      // Get pending reports
        supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
          .eq("status", "pending"),

      // Get weekly items (last 7 days)
        (() => {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
          return supabase
        .from("items")
        .select("*", { count: "exact", head: true })
        .gte("created_at", weekAgo.toISOString())
        })(),

        // Get top category (limit to 500 for better performance)
        supabase.from("items").select("category").limit(500)
      ])

      // Process category data
      const categoryCounts = categoryDataResult.data?.reduce((acc: any, item) => {
        acc[item.category] = (acc[item.category] || 0) + 1
        return acc
      }, {})

      const topCategory = Object.keys(categoryCounts || {}).reduce(
        (a, b) => ((categoryCounts || {})[a] > (categoryCounts || {})[b] ? a : b),
        "",
      )

      setStats({
        totalItems: totalItemsResult.count || 0,
        activeItems: activeItemsResult.count || 0,
        totalUsers: totalUsersResult.count || 0,
        pendingReports: pendingReportsResult.count || 0,
        weeklyItems: weeklyItemsResult.count || 0,
        topCategory: topCategory || "N/A",
      })
    } catch (error) {
      console.error("Error fetching dashboard stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  // Show loading while checking auth
  if (authLoading || loading) {
    return <AdminLoading />
  }

  // This should not happen as the parent component handles auth,
  // but keeping as fallback
  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🤝</span>
              <h1 className="text-xl font-bold text-green-700">Tigawane Admin</h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-600" />
                <span className="text-sm text-gray-600">{user?.email}</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  {adminRole === "super_admin" ? "Super Admin" : "Admin"}
                </Badge>
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut} className="flex items-center gap-2">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalItems}</div>
              <p className="text-xs text-muted-foreground">{stats.activeItems} currently active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">Registered community members</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Reports</CardTitle>
              <Flag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.pendingReports}</div>
              <p className="text-xs text-muted-foreground">Require review</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.weeklyItems}</div>
              <p className="text-xs text-muted-foreground">New items shared</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="listings" className="w-full">
          <TabsList className="grid w-full grid-cols-6 max-w-2xl mx-auto mb-8">
            <TabsTrigger value="listings" className="flex flex-col items-center gap-1 text-xs p-2">
              <Package className="h-4 w-4" />
              <span>Listings</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex flex-col items-center gap-1 text-xs p-2">
              <Flag className="h-4 w-4" />
              <span>Reports</span>
              {stats.pendingReports > 0 && (
                <Badge className="h-4 w-4 rounded-full p-0 text-xs bg-red-500">{stats.pendingReports}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex flex-col items-center gap-1 text-xs p-2">
              <Settings className="h-4 w-4" />
              <span>Categories</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex flex-col items-center gap-1 text-xs p-2">
              <Users className="h-4 w-4" />
              <span>Users</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex flex-col items-center gap-1 text-xs p-2">
              <BarChart3 className="h-4 w-4" />
              <span>Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="stories" className="flex flex-col items-center gap-1 text-xs p-2">
              <span role="img" aria-label="Stories">📖</span>
              <span>Stories</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="listings">
            <Suspense fallback={<AdminLoading />}>
            <ListingsManager onStatsUpdate={fetchDashboardStats} />
            </Suspense>
          </TabsContent>

          <TabsContent value="reports">
            <Suspense fallback={<AdminLoading />}>
            <ReportsManager onStatsUpdate={fetchDashboardStats} />
            </Suspense>
          </TabsContent>

          <TabsContent value="categories">
            <Suspense fallback={<AdminLoading />}>
            <CategoriesManager />
            </Suspense>
          </TabsContent>

          <TabsContent value="users">
            <Suspense fallback={<AdminLoading />}>
            <UsersManager />
            </Suspense>
          </TabsContent>

          <TabsContent value="analytics">
            <Suspense fallback={<AdminLoading />}>
            <Analytics stats={stats} />
            </Suspense>
          </TabsContent>

          <TabsContent value="stories">
            <Suspense fallback={<StoriesSkeleton />}>
            <StoriesManager />
            </Suspense>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
