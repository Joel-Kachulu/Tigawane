"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Clock, Package, Edit, Trash2 } from "lucide-react"
import Image from "next/image"
import EditItemModal from "@/components/EditItemModal"

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
}

interface MyItemsManagerProps {
  onItemUpdated: () => void
}

export default function MyItemsManager({ onItemUpdated }: MyItemsManagerProps) {
  const { user } = useAuth()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [filter, setFilter] = useState("all")
  const [deleting, setDeleting] = useState<string | null>(null)
  const [requestCounts, setRequestCounts] = useState<{ [itemId: string]: number }>({})

  // Fetch request counts for each item
  const fetchRequestCounts = useCallback(async (itemIds: string[]) => {
    if (itemIds.length === 0) return setRequestCounts({})
    const { data, error } = await supabase
      .from("claims")
      .select("item_id, status")
      .in("item_id", itemIds)
      .in("status", ["pending", "requested"])
    if (error) {
      setRequestCounts({})
      return
    }
    const counts: { [itemId: string]: number } = {}
    data.forEach((claim: { item_id: string }) => {
      counts[claim.item_id] = (counts[claim.item_id] || 0) + 1
    })
    setRequestCounts(counts)
  }, [])

  // Optimized fetch using database function
  const fetchMyItems = useCallback(async () => {
    if (!user) return

    try {
      setError(null)
      console.log("Fetching user's items...")

      const { data: itemData, error: itemError } = await supabase.rpc("get_user_items", {
        p_user_id: user.id,
        p_limit: 100,
        p_offset: 0,
      })

      if (itemError) {
        console.error("Error fetching user items:", itemError)
        setError(`Error fetching items: ${itemError.message}`)
        return
      }

      console.log("Successfully fetched user items:", itemData?.length || 0)
      setItems(itemData || [])
      // Fetch request counts for these items
      if (itemData && itemData.length > 0) {
        fetchRequestCounts(itemData.map((item: Item) => item.id))
      } else {
        setRequestCounts({})
      }
    } catch (error: any) {
      console.error("Unexpected error fetching user items:", error)
      setError(`Unexpected error: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }, [user, fetchRequestCounts])

  useEffect(() => {
    if (user) {
      fetchMyItems()
    }
  }, [user, fetchMyItems])

  const handleEditItem = useCallback((item: Item) => {
    setEditingItem(item)
    setShowEditModal(true)
  }, [])

  const handleItemUpdated = useCallback(() => {
    fetchMyItems()
    onItemUpdated()
    setShowEditModal(false)
    setEditingItem(null)
  }, [fetchMyItems, onItemUpdated])

  const handleDeleteItem = useCallback(
    async (item: Item) => {
      if (!confirm(`Are you sure you want to delete "${item.title}"?`)) {
        return
      }

      setDeleting(item.id)
      try {
        const { error } = await supabase.from("items").delete().eq("id", item.id).eq("user_id", user?.id)

        if (error) {
          console.error("Error deleting item:", error)
          alert(`Error deleting item: ${error.message}`)
          return
        }

        // Remove item from local state immediately
        setItems((prev) => prev.filter((i) => i.id !== item.id))
        onItemUpdated()
      } catch (error: any) {
        console.error("Unexpected error deleting item:", error)
        alert(`Error deleting item: ${error.message}`)
      } finally {
        setDeleting(null)
      }
    },
    [user?.id, onItemUpdated],
  )

  const getStatusBadge = useCallback((status: string) => {
    switch (status) {
      case "available":
        return <Badge className="bg-green-100 text-green-800">Available</Badge>
      case "requested":
        return <Badge className="bg-yellow-100 text-yellow-800">Requested</Badge>
      case "reserved":
        return <Badge className="bg-blue-100 text-blue-800">Reserved</Badge>
      case "completed":
        return <Badge className="bg-gray-100 text-gray-800">Completed</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }, [])

  // Memoize filtered items
  const filteredItems = useMemo(() => {
    if (filter === "requested") {
      return items.filter(
        (item) =>
          item.status === "requested" ||
          (item.status === "available" && requestCounts[item.id] > 0)
      )
    }
    return filter === "all" ? items : items.filter((item) => item.status === filter)
  }, [items, filter, requestCounts])

  // Memoize stats
  const stats = useMemo(() => {
    const requestedCount = items.filter(
      (item) =>
        item.status === "requested" ||
        (item.status === "available" && requestCounts[item.id] > 0)
    ).length;
    return {
      total: items.length,
      available: items.filter((i) => i.status === "available" && (!requestCounts[i.id] || requestCounts[i.id] === 0)).length,
      requested: requestedCount,
      completed: items.filter((i) => i.status === "completed").length,
    };
  }, [items, requestCounts])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-base sm:text-lg lg:text-xl">Loading your items...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-64 space-y-4">
        <div className="text-red-600 text-base sm:text-lg lg:text-xl">Error loading your items</div>
        <div className="text-red-500 text-sm sm:text-base max-w-md text-center">{error}</div>
        <Button onClick={fetchMyItems} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">My Shared Items</h2>
        <p className="text-sm sm:text-base lg:text-lg text-gray-600">Manage your food and item listings</p>

        {/* Stats */}
        <div className="flex justify-center gap-4 mt-4">
          <div className="text-center">
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-600">{stats.total}</div>
            <div className="text-xs sm:text-sm text-gray-500">Total</div>
          </div>
          <div className="text-center">
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-600">{stats.available}</div>
            <div className="text-xs sm:text-sm text-gray-500">Available</div>
          </div>
          <div className="text-center">
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-yellow-600">{stats.requested}</div>
            <div className="text-xs sm:text-sm text-gray-500">Requested</div>
          </div>
          <div className="text-center">
            <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-600">{stats.completed}</div>
            <div className="text-xs sm:text-sm text-gray-500">Completed</div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {["all", "available", "requested", "reserved", "completed"].map((status) => (
          <Button
            key={status}
            variant={filter === status ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(status)}
            className={`text-xs sm:text-sm lg:text-base ${filter === status ? "bg-green-600 hover:bg-green-700" : ""}`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Button>
        ))}
      </div>

      {filteredItems.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 text-base sm:text-lg lg:text-xl">
            {filter === "all" ? "You haven't shared any items yet" : `No ${filter} items found`}
          </div>
          <div className="text-gray-400 text-sm sm:text-base mt-2">
            {filter === "all" ? "Start sharing to help your community!" : "Try a different filter"}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <Card 
              key={item.id} 
              className="overflow-hidden" 
              clickable={true}
              onClick={() => handleEditItem(item)}
            >
              {item.image_url && (
                <div className="relative h-48 w-full">
                  <Image
                    src={item.image_url || "/placeholder.svg"}
                    alt={item.title}
                    fill
                    className="object-cover"
                    loading="lazy"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                </div>
              )}
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base sm:text-lg lg:text-xl flex items-center gap-2">
                    {item.title}
                    {requestCounts[item.id] > 0 && (
                      <span className="ml-1 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs sm:text-sm font-semibold bg-yellow-200 text-yellow-800">
                        {requestCounts[item.id]} Request{requestCounts[item.id] > 1 ? "s" : ""}
                      </span>
                    )}
                  </CardTitle>
                  <div className="flex flex-col gap-1">
                    <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs sm:text-sm">
                      {item.category}
                    </Badge>
                    {getStatusBadge(item.status)}
                  </div>
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

                <div className="flex justify-between items-center text-sm sm:text-base">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    <span className="font-medium">{item.quantity}</span>
                  </div>
                  {item.condition && (
                    <Badge variant="outline" className="text-xs sm:text-sm">
                      {item.condition}
                    </Badge>
                  )}
                </div>

                {item.expiry_date && (
                  <div className="flex items-center gap-1 text-orange-600 text-sm sm:text-base">
                    <Clock className="h-4 w-4" />
                    <span>Expires: {new Date(item.expiry_date).toLocaleDateString()}</span>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditItem(item);
                    }}
                    variant="outline"
                    size="sm"
                    className="flex-1 flex items-center gap-2 text-xs sm:text-sm"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteItem(item);
                    }}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 text-xs sm:text-sm"
                    disabled={deleting === item.id}
                  >
                    <Trash2 className="h-4 w-4" />
                    {deleting === item.id ? "..." : "Delete"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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
