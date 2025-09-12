"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Clock, User, ImageIcon, Package, Loader2 } from "lucide-react"
import Image from "next/image"

interface FoodItem {
  id: string
  title: string
  description: string | null
  category: string
  quantity: string
  expiry_date: string | null
  pickup_location: string
  image_url: string | null
  status: string
  created_at: string
  user_id: string
  owner_name?: string | null
}

interface FoodListProps {
  onClaimFood: (foodItem: FoodItem) => void
}

export default function FoodList({ onClaimFood }: FoodListProps) {
  const [foodItems, setFoodItems] = useState<FoodItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState("all")
  const [requestingItems, setRequestingItems] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchFoodItems()
  }, [])

  const fetchFoodItems = async () => {
    try {
      setError(null)
      console.log("Fetching food items...")

      // Fetch food items first
      const { data: foodData, error: foodError } = await supabase
        .from("food_items")
        .select("*")
        .eq("status", "available")
        .order("created_at", { ascending: false })

      if (foodError) {
        console.error("Error fetching food items:", foodError)
        setError(`Error fetching food items: ${foodError.message}`)
        setLoading(false)
        return
      }

      console.log("Successfully fetched food items:", foodData?.length || 0)

      if (!foodData || foodData.length === 0) {
        setFoodItems([])
        setLoading(false)
        return
      }

      // Get all unique user IDs
      const userIds = [...new Set(foodData.map((item) => item.user_id))]
      console.log("Fetching profiles for user IDs:", userIds)

      // Fetch all profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds)

      if (profilesError) {
        console.warn("Error fetching profiles:", profilesError)
        // Continue without profile data
      }

      console.log("Successfully fetched profiles:", profilesData?.length || 0)

      // Create a map of user_id to profile data
      const profilesMap = new Map()
      if (profilesData) {
        profilesData.forEach((profile) => {
          profilesMap.set(profile.id, profile)
        })
      }

      // Combine food items with profile data
      const foodItemsWithProfiles = foodData.map((item) => ({
        ...item,
        owner_name: profilesMap.get(item.user_id)?.full_name || null,
      }))

      setFoodItems(foodItemsWithProfiles)
    } catch (error: any) {
      console.error("Unexpected error fetching food items:", error)
      setError(`Unexpected error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const filteredItems =
    filter === "all" ? foodItems : foodItems.filter((item) => item.category.toLowerCase() === filter)

  const categories = ["all", "fruits", "vegetables", "grains", "dairy", "meat", "prepared", "other"]

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto"></div>
          <div className="text-lg font-semibold text-gray-700">Loading available food...</div>
          <div className="text-sm text-gray-500">Please wait while we fetch the latest items</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-64 space-y-6">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
          <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-white text-2xl font-bold">!</span>
          </div>
        </div>
        <div className="text-center space-y-2">
          <div className="text-red-600 text-xl font-bold">Error loading food items</div>
          <div className="text-red-500 text-sm max-w-md">{error}</div>
        </div>
        <Button 
          onClick={fetchFoodItems} 
          className="bg-white hover:bg-gray-50 text-gray-700 border-gray-300 hover:border-emerald-300 hover:text-emerald-700 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300"
        >
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        {categories.map((category) => (
          <Button
            key={category}
            onClick={() => setFilter(category)}
            className={`text-sm font-semibold transition-all duration-300 ${
              filter === category 
                ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105" 
                : "bg-white hover:bg-gray-50 text-gray-700 border-gray-300 hover:border-emerald-300 hover:text-emerald-700 shadow-md hover:shadow-lg transform hover:scale-105"
            }`}
          >
            {category === "all" ? "All Categories" : category.charAt(0).toUpperCase() + category.slice(1)}
          </Button>
        ))}
      </div>

      {filteredItems.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-gray-500 text-3xl">🍽️</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="text-gray-700 text-xl font-bold">No food items available at the moment</div>
            <div className="text-gray-500 text-base">Check back later or be the first to share!</div>
            <div className="text-gray-400 text-sm">Your generosity can make a difference in someone's day</div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {filteredItems.map((item) => (
            <Card 
              key={item.id} 
              className="group overflow-hidden hover:shadow-2xl hover:scale-105 transition-all duration-500 cursor-pointer border-0 bg-gradient-to-br from-white via-gray-50/50 to-blue-50/30 w-full max-w-[320px] mx-auto shadow-lg hover:shadow-2xl"
            >
              {/* Enhanced Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none z-10"></div>
              
              {/* Enhanced Corner Accent with Animation */}
              <div className="absolute top-0 right-0 w-0 h-0 border-l-[25px] border-l-transparent border-t-[25px] border-t-emerald-400 opacity-0 group-hover:opacity-100 transition-all duration-500 transform rotate-12 scale-110"></div>
              
              {/* Enhanced Image Container with Better Gradients */}
              <div className="relative h-44 w-full overflow-hidden rounded-t-xl bg-gradient-to-br from-gray-100 via-gray-50 to-white shadow-inner">
                {item.image_url && (
                  <Image 
                    src={item.image_url || "/placeholder.svg"} 
                    alt={item.title} 
                    fill 
                    className="object-cover object-center group-hover:scale-110 transition-transform duration-700 ease-out" 
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                )}
                {!item.image_url && (
                  <div className="flex items-center justify-center h-full text-gray-400 bg-gradient-to-br from-gray-100 to-gray-200">
                    <div className="text-center">
                      <ImageIcon className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                      <span className="text-sm font-medium">No image</span>
                    </div>
                  </div>
                )}
                
                {/* Enhanced Status Indicator with Pulse Animation */}
                <div className="absolute top-3 left-3">
                  <div className="w-4 h-4 rounded-full border-3 border-white shadow-lg bg-emerald-500 animate-pulse"></div>
                </div>
                
                {/* Enhanced Category Badge with Glassmorphism */}
                <div className="absolute top-3 right-3">
                  <div className="bg-white/95 backdrop-blur-md text-emerald-700 text-xs px-3 py-1.5 rounded-full font-semibold shadow-lg border border-white/20">
                    {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
                  </div>
                </div>
              </div>
              
              {/* Enhanced Card Header with Better Typography */}
              <CardHeader className="p-4 pb-3 bg-gradient-to-r from-white to-gray-50/50">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 relative group">
                    <CardTitle className="text-base font-bold line-clamp-2 leading-tight text-gray-800 group-hover:line-clamp-none transition-all duration-300">
                      {item.title}
                    </CardTitle>
                    <div className="absolute hidden group-hover:block bg-gray-900 text-white text-sm p-3 rounded-xl shadow-2xl z-20 mt-2 whitespace-normal max-w-xs backdrop-blur-sm">
                      {item.title}
                    </div>
                  </div>
                </div>
                
                {/* Enhanced Description with Better Hover Effect */}
                {item.description && (
                  <div className="relative group/desc">
                    <CardDescription className="line-clamp-2 text-sm leading-relaxed text-gray-600 group-hover/desc:line-clamp-none transition-all duration-300">
                      {item.description}
                    </CardDescription>
                    <div className="absolute hidden group-hover/desc:block bg-gray-900 text-white text-sm p-3 rounded-xl shadow-2xl z-20 mt-2 whitespace-normal max-w-xs backdrop-blur-sm">
                      {item.description}
                    </div>
                  </div>
                )}
              </CardHeader>
              
              {/* Enhanced Card Content with Better Spacing and Icons */}
              <CardContent className="p-4 pt-0 space-y-3 bg-gradient-to-b from-gray-50/30 to-white">
                <div className="flex items-center gap-2 text-sm text-gray-600 relative group">
                  <MapPin className="h-4 w-4 shrink-0 text-blue-500" />
                  <span className="truncate group-hover:overflow-visible font-medium">{item.pickup_location}</span>
                  <div className="absolute hidden group-hover:block bg-gray-900 text-white text-sm p-3 rounded-xl shadow-2xl z-20 mt-2 whitespace-nowrap backdrop-blur-sm">
                    {item.pickup_location}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                  <User className="h-4 w-4 text-emerald-500" />
                  <span className="font-medium">By <span className="font-semibold text-gray-700">{item.owner_name || "Anonymous"}</span></span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-emerald-500" />
                    <span className="font-semibold text-gray-700">{item.quantity}</span>
                  </div>
                  {item.expiry_date && (
                    <div className="flex items-center gap-2 text-orange-600 bg-orange-50 px-3 py-2 rounded-lg border border-orange-200">
                      <Clock className="h-4 w-4" />
                      <span className="font-medium">{new Date(item.expiry_date).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {/* Enhanced Action Button */}
                <Button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setRequestingItems(prev => new Set(prev).add(item.id));
                    onClaimFood(item);
                    
                    // Remove loading state after a delay
                    setTimeout(() => {
                      setRequestingItems(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(item.id);
                        return newSet;
                      });
                    }, 2000);
                  }} 
                  className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-sm py-2.5 h-auto disabled:opacity-50 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl font-semibold rounded-lg"
                  disabled={requestingItems.has(item.id)}
                >
                  {requestingItems.has(item.id) ? "Requesting..." : "Request"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
