"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Clock, User, Package } from "lucide-react"
import Image from "next/image"

interface Item {
  id: string
  title: string
  description: string | null
  category: string
  item_type: "food" | "non-food"
  quantity: string
  condition?: string | null
  expiry_date: string | null
  pickup_location: string
  image_url: string | null
  status: string
  created_at: string
  user_id: string
  owner_name?: string | null
}

interface ItemListProps {
  itemType: "food" | "non-food"
  onClaimItem: (item: Item) => void
}

export default function ItemList({ itemType, onClaimItem }: ItemListProps) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState("all")

  useEffect(() => {
    fetchItems()
  }, [itemType])

  const fetchItems = async () => {
    try {
      setError(null)
      console.log(`Fetching ${itemType} items...`)

      // Fetch items (including requested ones, but not completed)
      const { data: itemData, error: itemError } = await supabase
        .from("items")
        .select("*")
        .eq("item_type", itemType)
        .in("status", ["available", "requested", "reserved"])
        .order("created_at", { ascending: false })

      if (itemError) {
        console.error("Error fetching items:", itemError)
        setError(`Error fetching items: ${itemError.message}`)
        setLoading(false)
        return
      }

      console.log(`Successfully fetched ${itemType} items:`, itemData?.length || 0)

      if (!itemData || itemData.length === 0) {
        setItems([])
        setLoading(false)
        return
      }

      // Get all unique user IDs
      const userIds = [...new Set(itemData.map((item) => item.user_id))]
      console.log("Fetching profiles for user IDs:", userIds)

      // Fetch all profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds)

      if (profilesError) {
        console.warn("Error fetching profiles:", profilesError)
      }

      console.log("Successfully fetched profiles:", profilesData?.length || 0)

      // Create a map of user_id to profile data
      const profilesMap = new Map()
      if (profilesData) {
        profilesData.forEach((profile) => {
          profilesMap.set(profile.id, profile)
        })
      }

      // Combine items with profile data
      const itemsWithProfiles = itemData.map((item) => ({
        ...item,
        owner_name: profilesMap.get(item.user_id)?.full_name || "Community Member",
      }))

      setItems(itemsWithProfiles)
    } catch (error: any) {
      console.error("Unexpected error fetching items:", error)
      setError(`Unexpected error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const getCategories = () => {
    if (itemType === "food") {
      return ["all", "fruits", "vegetables", "grains", "dairy", "meat", "prepared", "other"]
    } else {
      return ["all", "clothing", "shoes", "household", "electronics", "books", "toys", "baby-items", "other"]
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "available":
        return <Badge className="bg-green-100 text-green-800">Available</Badge>
      case "requested":
        return <Badge className="bg-yellow-100 text-yellow-800">Requested</Badge>
      case "reserved":
        return <Badge className="bg-blue-100 text-blue-800">Reserved</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const filteredItems = filter === "all" ? items : items.filter((item) => item.category.toLowerCase() === filter)

  const categories = getCategories()

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading available {itemType} items...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-64 space-y-4">
        <div className="text-red-600 text-lg">Error loading {itemType} items</div>
        <div className="text-red-500 text-sm max-w-md text-center">{error}</div>
        <Button onClick={fetchItems} variant="outline">
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
            className={filter === category ? "bg-green-600 hover:bg-green-700" : ""}
          >
            {category.charAt(0).toUpperCase() + category.slice(1).replace("-", " ")}
          </Button>
        ))}
      </div>

      {filteredItems.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">No {itemType} items available at the moment</div>
          <div className="text-gray-400 text-sm mt-2">Check back later or be the first to share!</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              {item.image_url && (
                <div className="relative h-48 w-full">
                  <Image src={item.image_url || "/placeholder.svg"} alt={item.title} fill className="object-cover" />
                </div>
              )}
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <div className="flex flex-col gap-1">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      {item.category}
                    </Badge>
                    {getStatusBadge(item.status)}
                  </div>
                </div>
                <CardDescription className="line-clamp-2">{item.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4" />
                  <span>{item.pickup_location}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="h-4 w-4" />
                  <span>Shared by {item.owner_name}</span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    <span className="font-medium">{item.quantity}</span>
                  </div>
                  {item.condition && (
                    <Badge variant="outline" className="text-xs">
                      {item.condition}
                    </Badge>
                  )}
                </div>

                {item.expiry_date && (
                  <div className="flex items-center gap-1 text-orange-600 text-sm">
                    <Clock className="h-4 w-4" />
                    <span>Expires: {new Date(item.expiry_date).toLocaleDateString()}</span>
                  </div>
                )}

                <Button
                  onClick={() => onClaimItem(item)}
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={item.status !== "available"}
                >
                  {item.status === "available" ? "Request This Item" : "Already Requested"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
