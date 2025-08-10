"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Clock, User } from "lucide-react"
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
        <div className="text-base sm:text-lg lg:text-xl">Loading available food...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-64 space-y-4">
        <div className="text-red-600 text-base sm:text-lg lg:text-xl">Error loading food items</div>
        <div className="text-red-500 text-sm sm:text-base max-w-md text-center">{error}</div>
        <Button onClick={fetchFoodItems} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <Button
            key={category}
            variant={filter === category ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(category)}
            className={`text-xs sm:text-sm lg:text-base ${filter === category ? "bg-green-600 hover:bg-green-700" : ""}`}
          >
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </Button>
        ))}
      </div>

      {filteredItems.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 text-base sm:text-lg lg:text-xl">No food items available at the moment</div>
          <div className="text-gray-400 text-sm sm:text-base mt-2">Check back later or be the first to share!</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredItems.map((item) => (
            <Card 
              key={item.id} 
              className="group overflow-hidden hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer border-2 hover:border-green-200 w-full max-w-[280px] mx-auto"
            >
              {item.image_url && (
                <div className="relative h-40 w-full overflow-hidden rounded-t-lg">
                  <Image 
                    src={item.image_url || "/placeholder.svg"} 
                    alt={item.title} 
                    fill 
                    className="object-cover object-center group-hover:scale-110 transition-transform duration-300" 
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                </div>
              )}
              <CardHeader className="p-3 pb-2">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-sm font-semibold line-clamp-2 leading-tight">
                      {item.title}
                    </CardTitle>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs shrink-0">
                    {item.category}
                  </Badge>
                </div>
                {item.description && (
                  <div className="relative group/desc">
                    <CardDescription className="line-clamp-2 text-xs leading-tight">
                      {item.description}
                    </CardDescription>
                    <div className="absolute hidden group-hover/desc:block bg-white/95 backdrop-blur-sm text-gray-800 text-xs p-3 rounded-lg shadow-lg border z-20 mt-1 whitespace-normal max-w-xs left-0">
                      {item.description}
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-2">
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.pickup_location}</span>
                </div>

                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <User className="h-4 w-4 shrink-0" />
                  <span className="truncate">By {item.owner_name || "Anonymous"}</span>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium">{item.quantity}</span>
                  {item.expiry_date && (
                    <div className="flex items-center gap-1 text-orange-600 shrink-0">
                      <Clock className="h-4 w-4" />
                      <span>{new Date(item.expiry_date).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

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
                  className="w-full bg-green-600 hover:bg-green-700 text-white text-xs py-2 h-auto disabled:opacity-50 transform hover:scale-105 transition-all duration-200"
                  size="sm"
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