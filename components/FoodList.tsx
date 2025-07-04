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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <Card 
              key={item.id} 
              className="overflow-hidden" 
              clickable={true}
              onClick={() => onClaimFood(item)}
            >
              {item.image_url && (
                <div className="relative h-48 w-full">
                  <Image src={item.image_url || "/placeholder.svg"} alt={item.title} fill className="object-cover" />
                </div>
              )}
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base sm:text-lg lg:text-xl">{item.title}</CardTitle>
                  <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs sm:text-sm">
                    {item.category}
                  </Badge>
                </div>
                <div className="relative group">
                  <CardDescription className="line-clamp-2 text-sm sm:text-base group-hover:line-clamp-none group-hover:bg-gray-50 group-hover:p-2 group-hover:rounded group-hover:absolute group-hover:z-10 group-hover:shadow-lg group-hover:border group-hover:min-w-full group-hover:max-w-xs group-hover:transition-all group-hover:duration-200">
                    {item.description}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm sm:text-base text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span>{item.pickup_location}</span>
                </div>

                <div className="flex items-center gap-2 text-sm sm:text-base text-gray-600">
                  <User className="h-4 w-4" />
                  <span>Shared by {item.owner_name || "Anonymous"}</span>
                </div>

                <div className="flex justify-between items-center text-sm sm:text-base">
                  <span className="font-medium">Quantity: {item.quantity}</span>
                  {item.expiry_date && (
                    <div className="flex items-center gap-1 text-orange-600">
                      <Clock className="h-4 w-4" />
                      <span>Expires: {new Date(item.expiry_date).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                <Button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onClaimFood(item);
                  }} 
                  className="w-full bg-green-600 hover:bg-green-700 text-sm sm:text-base"
                >
                  Request This Food
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
