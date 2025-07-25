"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Clock, User, Package } from "lucide-react"
import Image from "next/image"
import EditItemModal from "@/components/EditItemModal"
import { useAuth } from "@/contexts/AuthContext"

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
  collaborationId?: string | null // null for public items, string for specific collaboration
  onClaimItem: (item: Item) => void
}

export default function ItemList({ itemType, collaborationId, onClaimItem }: ItemListProps) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState("all")
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  const { user } = useAuth()
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  // Memoize categories to prevent unnecessary re-renders
  const categories = useMemo(() => {
    if (itemType === "food") {
      return ["all", "fruits", "vegetables", "grains", "dairy", "meat", "prepared", "other"]
    } else {
      return ["all", "clothing", "shoes", "household", "electronics", "books", "toys", "baby-items", "other"]
    }
  }, [itemType])

  // Optimized fetch function with manual profile fetching
  const fetchItems = useCallback(
    async (pageNum = 0, isLoadMore = false) => {
      try {
        setError(null)
        if (!isLoadMore) setLoading(true)

        console.log(`🔍 Fetching ${itemType} items (page ${pageNum})...`)

        // First, fetch items
        let query = supabase
          .from("items")
          .select("*")
          .eq("item_type", itemType)
          .in("status", ["available", "requested", "reserved"])

        // Apply collaboration filtering
        if (collaborationId === null || collaborationId === undefined) {
          // Show only public donations (collaboration_id is null)
          query = query.is("collaboration_id", null)
        } else {
          // Show only items for specific collaboration
          query = query.eq("collaboration_id", collaborationId)
        }

        query = query
          .order("created_at", { ascending: false })
          .range(pageNum * 20, (pageNum + 1) * 20 - 1)

        const { data: itemData, error: itemError } = await query;

        if (itemError) {
          console.error("❌ Error fetching items:", itemError)
          setError(`Error fetching items: ${itemError.message}`)
          return
        }

        console.log(`✅ Successfully fetched ${itemData?.length || 0} ${itemType} items`)

        if (!itemData || itemData.length === 0) {
          if (isLoadMore) {
            setHasMore(false)
          } else {
            setItems([])
          }
          return
        }

        // Get unique user IDs
        const userIds = [...new Set(itemData.map((item) => item.user_id))]
        console.log(`👥 Fetching profiles for ${userIds.length} users...`)

        // Fetch profiles for these users
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds)

        if (profilesError) {
          console.warn("⚠️ Error fetching profiles:", profilesError)
          // Continue without profile names if profiles fetch fails
        }

        console.log(`✅ Successfully fetched ${profilesData?.length || 0} profiles`)

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

        if (isLoadMore) {
          setItems((prev) => [...prev, ...itemsWithProfiles])
        } else {
          setItems(itemsWithProfiles)
        }

        setHasMore(itemData.length === 20)
        setPage(pageNum)
      } catch (error: any) {
        console.error("💥 Unexpected error fetching items:", error)
        setError(`Unexpected error: ${error.message}`)
      } finally {
        setLoading(false)
      }
    },
    [itemType, collaborationId],
  )

  // Reset and fetch when itemType changes
  useEffect(() => {
    setPage(0)
    setHasMore(true)
    fetchItems(0, false)
  }, [itemType, collaborationId, fetchItems])

  // Load more items
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchItems(page + 1, true)
    }
  }, [loading, hasMore, page, fetchItems])

  const getStatusBadge = useCallback((status: string) => {
    switch (status) {
      case "available":
        return <Badge className="bg-green-100 text-green-800 text-xs py-0 h-4">Available</Badge>
      case "requested":
        return <Badge className="bg-yellow-100 text-yellow-800 text-xs py-0 h-4">Requested</Badge>
      case "reserved":
        return <Badge className="bg-blue-100 text-blue-800 text-xs py-0 h-4">Reserved</Badge>
      default:
        return (
          <Badge variant="secondary" className="text-xs py-0 h-4">
            {status}
          </Badge>
        )
    }
  }, [])

  const handleEditItem = useCallback((item: Item) => {
    setEditingItem(item)
    setShowEditModal(true)
  }, [])

  const handleItemUpdated = useCallback(() => {
    fetchItems(0, false)
    setShowEditModal(false)
    setEditingItem(null)
  }, [fetchItems])

  // Memoize filtered items to prevent unnecessary recalculations
  const filteredItems = useMemo(() => {
    return filter === "all" ? items : items.filter((item) => item.category.toLowerCase() === filter)
  }, [items, filter])

  if (loading && items.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-base sm:text-lg lg:text-xl">Loading available {itemType} items...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-64 space-y-4">
        <div className="text-red-600 text-base sm:text-lg lg:text-xl">Error loading {itemType} items</div>
        <div className="text-red-500 text-sm sm:text-base max-w-md text-center">{error}</div>
        <Button onClick={() => fetchItems(0, false)} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <Button
            key={category}
            variant={filter === category ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(category)}
            className={`text-xs sm:text-sm lg:text-base h-7 sm:h-8 lg:h-9 ${filter === category ? "bg-green-600 hover:bg-green-700" : ""}`}
          >
            {category.charAt(0).toUpperCase() + category.slice(1).replace("-", " ")}
          </Button>
        ))}
      </div>

      {filteredItems.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 text-base sm:text-lg lg:text-xl">No {itemType} items available at the moment</div>
          <div className="text-gray-400 text-sm sm:text-base mt-2">Check back later or be the first to share!</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredItems.map((item) => (
              <Card 
                key={item.id} 
                className="overflow-hidden border border-gray-200" 
                clickable={true}
                onClick={() => onClaimItem(item)}
              >
                {item.image_url && (
                  <div className="relative h-28 w-full">
                    <Image
                      src={item.image_url || "/placeholder.svg"}
                      alt={item.title}
                      fill
                      className="object-cover"
                      loading="lazy"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
                    />
                  </div>
                )}
                <CardHeader className="p-2">
                  <div className="flex justify-between items-start gap-1">
                    <div className="relative group flex-1 min-w-0">
                      <CardTitle className="text-xs sm:text-sm lg:text-base font-medium line-clamp-1 group-hover:line-clamp-none group-hover:bg-gray-50 group-hover:p-2 group-hover:rounded group-hover:absolute group-hover:z-10 group-hover:shadow-lg group-hover:border group-hover:min-w-full group-hover:max-w-xs group-hover:transition-all group-hover:duration-200">
                        {item.title}
                      </CardTitle>
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs py-0 h-4">
                        {item.category}
                      </Badge>
                      {getStatusBadge(item.status)}
                    </div>
                  </div>
                  <div className="relative group mt-0.5">
                    <CardDescription className="text-xs sm:text-sm line-clamp-1 text-gray-600 group-hover:line-clamp-none group-hover:bg-gray-50 group-hover:p-2 group-hover:rounded group-hover:absolute group-hover:z-10 group-hover:shadow-lg group-hover:border group-hover:min-w-full group-hover:max-w-xs group-hover:transition-all group-hover:duration-200">
                      {item.description}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-2 pt-0 space-y-1">
                  <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-600">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{item.pickup_location}</span>
                  </div>

                  <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-600">
                    <User className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{item.owner_name}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      <span className="font-medium text-xs sm:text-sm">{item.quantity}</span>
                    </div>
                    {item.condition && (
                      <Badge variant="outline" className="text-xs px-1 py-0 h-4">
                        {item.condition}
                      </Badge>
                    )}
                  </div>

                  {item.expiry_date && (
                    <div className="flex items-center gap-1 text-orange-600">
                      <Clock className="h-3 w-3" />
                      <span className="text-xs sm:text-sm">
                        Exp:{" "}
                        {new Date(item.expiry_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  )}

                  <div className="flex gap-1 pt-1">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        onClaimItem(item);
                      }}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-xs sm:text-sm h-6 sm:h-7 px-1"
                      disabled={item.status !== "available"}
                    >
                      {item.status === "available" ? "Request" : "Requested"}
                    </Button>

                    {user && user.id === item.user_id && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditItem(item);
                        }}
                        variant="outline"
                        size="sm"
                        className="px-1 text-xs sm:text-sm h-6 sm:h-7"
                      >
                        Edit
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {hasMore && (
            <div className="text-center pt-4">
              <Button onClick={loadMore} variant="outline" disabled={loading} className="min-w-32 h-8 sm:h-9 text-xs sm:text-sm">
                {loading ? "Loading..." : "Load More"}
              </Button>
            </div>
          )}
        </>
      )}

      <EditItemModal
        item={editingItem}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onItemUpdated={handleItemUpdated}
      />
    </div>
  )
}