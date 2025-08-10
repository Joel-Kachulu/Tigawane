"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart3, TrendingUp, Package, Users, Calendar } from "lucide-react"

interface AnalyticsProps {
  stats: {
    totalItems: number
    activeItems: number
    totalUsers: number
    pendingReports: number
    weeklyItems: number
    topCategory: string
  }
}

interface WeeklyData {
  week: string
  items: number
}

interface CategoryData {
  category: string
  count: number
}

interface LocationData {
  location: string
  count: number
}

export default function Analytics({ stats }: AnalyticsProps) {
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([])
  const [categoryData, setCategoryData] = useState<CategoryData[]>([])
  const [locationData, setLocationData] = useState<LocationData[]>([])
  const [timeRange, setTimeRange] = useState("30")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange])

  const fetchAnalytics = async () => {
    try {
      const daysAgo = Number.parseInt(timeRange)
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - daysAgo)

      // Fetch weekly data
      const { data: itemsData } = await supabase
        .from("items")
        .select("created_at")
        .gte("created_at", startDate.toISOString())

      // Group by week
      const weeklyMap = new Map<string, number>()
      itemsData?.forEach((item) => {
        const date = new Date(item.created_at)
        const weekStart = new Date(date.setDate(date.getDate() - date.getDay()))
        const weekKey = weekStart.toISOString().split("T")[0]
        weeklyMap.set(weekKey, (weeklyMap.get(weekKey) || 0) + 1)
      })

      const weekly = Array.from(weeklyMap.entries())
        .map(([week, items]) => ({ week, items }))
        .sort((a, b) => a.week.localeCompare(b.week))

      setWeeklyData(weekly)

      // Fetch category data
      const { data: categoryItems } = await supabase
        .from("items")
        .select("category")
        .gte("created_at", startDate.toISOString())

      const categoryMap = new Map<string, number>()
      categoryItems?.forEach((item) => {
        categoryMap.set(item.category, (categoryMap.get(item.category) || 0) + 1)
      })

      const categories = Array.from(categoryMap.entries())
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      setCategoryData(categories)

      // Fetch location data
      const { data: locationItems } = await supabase
        .from("items")
        .select("pickup_location")
        .gte("created_at", startDate.toISOString())

      const locationMap = new Map<string, number>()
      locationItems?.forEach((item) => {
        // Extract city/area from pickup location
        const location = item.pickup_location.split(",")[0].trim()
        locationMap.set(location, (locationMap.get(location) || 0) + 1)
      })

      const locations = Array.from(locationMap.entries())
        .map(([location, count]) => ({ location, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      setLocationData(locations)
    } catch (error) {
      console.error("Error fetching analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading analytics...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Platform Analytics
            </CardTitle>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Package className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <div className="text-2xl font-bold text-blue-600">{stats.totalItems}</div>
              <div className="text-sm text-gray-600">Total Items</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <div className="text-2xl font-bold text-green-600">{stats.activeItems}</div>
              <div className="text-sm text-gray-600">Active Items</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Users className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <div className="text-2xl font-bold text-purple-600">{stats.totalUsers}</div>
              <div className="text-sm text-gray-600">Total Users</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-orange-600" />
              <div className="text-2xl font-bold text-orange-600">{stats.weeklyItems}</div>
              <div className="text-sm text-gray-600">This Week</div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Weekly Items Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Items Shared Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {weeklyData.map((week, index) => (
                    <div key={week.week} className="flex items-center gap-3">
                      <div className="text-sm text-gray-600 w-20">Week {index + 1}</div>
                      <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                        <div
                          className="bg-blue-500 h-4 rounded-full"
                          style={{
                            width: `${Math.max(5, (week.items / Math.max(...weeklyData.map((w) => w.items))) * 100)}%`,
                          }}
                        />
                      </div>
                      <div className="text-sm font-medium w-8">{week.items}</div>
                    </div>
                  ))}
                </div>
                {weeklyData.length === 0 && (
                  <div className="text-center py-8 text-gray-500">No data available for the selected period</div>
                )}
              </CardContent>
            </Card>

            {/* Top Categories */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {categoryData.map((category, index) => (
                    <div key={category.category} className="flex items-center gap-3">
                      <div className="text-sm text-gray-600 w-4">#{index + 1}</div>
                      <div className="text-sm capitalize flex-1">{category.category.replace("-", " ")}</div>
                      <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                        <div
                          className="bg-green-500 h-4 rounded-full"
                          style={{
                            width: `${Math.max(5, (category.count / Math.max(...categoryData.map((c) => c.count))) * 100)}%`,
                          }}
                        />
                      </div>
                      <div className="text-sm font-medium w-8">{category.count}</div>
                    </div>
                  ))}
                </div>
                {categoryData.length === 0 && (
                  <div className="text-center py-8 text-gray-500">No category data available</div>
                )}
              </CardContent>
            </Card>

            {/* Top Locations */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top Locations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {locationData.map((location, index) => (
                    <div key={location.location} className="flex items-center gap-3">
                      <div className="text-sm text-gray-600 w-4">#{index + 1}</div>
                      <div className="text-sm flex-1">{location.location}</div>
                      <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                        <div
                          className="bg-purple-500 h-4 rounded-full"
                          style={{
                            width: `${Math.max(5, (location.count / Math.max(...locationData.map((l) => l.count))) * 100)}%`,
                          }}
                        />
                      </div>
                      <div className="text-sm font-medium w-8">{location.count}</div>
                    </div>
                  ))}
                </div>
                {locationData.length === 0 && (
                  <div className="text-center py-8 text-gray-500">No location data available</div>
                )}
              </CardContent>
            </Card>

            {/* Summary Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Most Popular Category</span>
                    <span className="font-medium capitalize">{stats.topCategory.replace("-", " ")}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Completion Rate</span>
                    <span className="font-medium">
                      {stats.totalItems > 0
                        ? Math.round(((stats.totalItems - stats.activeItems) / stats.totalItems) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Avg Items per User</span>
                    <span className="font-medium">
                      {stats.totalUsers > 0 ? Math.round((stats.totalItems / stats.totalUsers) * 10) / 10 : 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Growth This Week</span>
                    <span className="font-medium text-green-600">+{stats.weeklyItems}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
