"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Clock, Package, Edit, Trash2, CheckCircle } from "lucide-react"
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
  const [markingShared, setMarkingShared] = useState<string | null>(null)
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set())

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

  const handleImageError = useCallback((itemId: string) => {
    setFailedImages(prev => new Set([...prev, itemId]))
  }, [])

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

  const handleMarkAsShared = useCallback(async (item: Item) => {
    if (!confirm("Mark this item as shared? This will complete the sharing and remove it from active listings.")) return
    setMarkingShared(item.id)
    try {
      await supabase.from("items").update({ status: "completed" }).eq("id", item.id)
      fetchMyItems()
      onItemUpdated()
    } catch (error) {
      alert("Error marking as shared.")
    } finally {
      setMarkingShared(null)
    }
  }, [fetchMyItems, onItemUpdated])

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
        <>
        {/* Mobile: Horizontal Card Layout */}
        <div className="md:hidden space-y-4">
          {filteredItems.map((item) => (
            <Card 
              key={item.id} 
              className="group overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer border border-gray-200 hover:border-green-300 bg-white rounded-2xl relative pb-6"
              onClick={() => handleEditItem(item)}
            >
              <div className="flex h-32">
                {/* Image Section */}
                <div className="relative w-36 h-28 flex-shrink-0 overflow-hidden rounded-l-2xl bg-gradient-to-br from-gray-50 to-gray-100">
                  {item.image_url && !failedImages.has(item.id) ? (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="object-cover object-center w-full h-full group-hover:scale-110 transition-transform duration-300"
                      loading="lazy"
                      onError={() => handleImageError(item.id)}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <div className="text-center">
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-2 mx-auto">
                          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                          </svg>
                        </div>
                        <span className="text-xs font-medium">No image</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Status Indicator */}
                  <div className="absolute top-3 left-3">
                    <div className={`w-4 h-4 rounded-full border-3 border-white shadow-lg ${
                      item.status === 'available' ? 'bg-green-500' :
                      item.status === 'requested' ? 'bg-amber-500' :
                      item.status === 'reserved' ? 'bg-blue-500' :
                      'bg-gray-500'
                    }`}></div>
                  </div>
                  
                  {/* Request Count Indicator */}
                  {requestCounts[item.id] > 0 && (
                    <div className="absolute bottom-3 right-3">
                      <div className="bg-amber-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg animate-pulse">
                        {requestCounts[item.id]} requests
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Content Section */}
                <div className="flex-1 p-4 pr-20 flex flex-col justify-between">
                  {/* Top Section */}
                  <div className="space-y-2">
                    <h3 className="font-bold text-base text-gray-900 whitespace-normal break-words leading-tight group-hover:text-green-700 transition-colors">
                      {item.title}
                    </h3>
                    
                    {/* Category and Status */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
                        {item.category}
                      </div>
                      {getStatusBadge(item.status)}
                    </div>
                    
                    {/* Key Details */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-full">
                        <Package className="h-3 w-3 text-gray-600" />
                        <span className="text-xs font-medium text-gray-700">{item.quantity}</span>
                      </div>
                      {item.condition && (
                        <div className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-full">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="text-xs font-medium text-blue-700">{item.condition}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Bottom Section */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs text-gray-600 flex-wrap">
                        <MapPin className="h-3 w-3 shrink-0 text-gray-500" />
                        <span className="font-medium break-words max-w-full">{item.pickup_location}</span>
                      </div>
                    {item.expiry_date && (
                      <div className="flex items-center gap-1 text-xs text-amber-600">
                        <Clock className="h-3 w-3" />
                        <span>Expires: {new Date(item.expiry_date).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="absolute bottom-4 right-4">
                  <div className="flex gap-1">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditItem(item);
                      }}
                      variant="outline"
                      size="sm"
                      className="bg-white hover:bg-gray-50 border-gray-300 hover:border-green-500 text-gray-700 hover:text-green-700 font-medium py-1.5 px-2 rounded-full shadow-lg hover:scale-105 transition-all duration-200"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteItem(item);
                      }}
                      variant="outline"
                      size="sm"
                      className="bg-white hover:bg-red-50 border-gray-300 hover:border-red-500 text-gray-700 hover:text-red-700 font-medium py-1.5 px-2 rounded-full shadow-lg hover:scale-105 transition-all duration-200"
                      disabled={deleting === item.id}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                    {item.status !== "completed" && (
                      <Button
                        onClick={e => { e.stopPropagation(); handleMarkAsShared(item); }}
                        variant="outline"
                        size="sm"
                        className="bg-white hover:bg-green-50 border-gray-300 hover:border-green-500 text-gray-700 hover:text-green-700 font-medium py-1.5 px-2 rounded-full shadow-lg hover:scale-105 transition-all duration-200"
                        disabled={markingShared === item.id}
                      >
                        <CheckCircle className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Desktop: Grid Layout */}
        <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {filteredItems.map((item) => (
            <Card 
              key={item.id} 
              className="group overflow-hidden hover:shadow-lg hover:scale-[1.02] transition-all duration-300 cursor-pointer border border-gray-200 hover:border-green-300 w-full max-w-[300px] mx-auto" 
              onClick={() => handleEditItem(item)}
            >
              {item.image_url && !failedImages.has(item.id) && (
                <div className="relative h-40 w-full overflow-hidden rounded-t-lg">
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-300"
                    loading="lazy"
                    onError={() => handleImageError(item.id)}
                  />
                </div>
              )}
              {!item.image_url || failedImages.has(item.id) && (
                <div className="relative h-40 w-full overflow-hidden rounded-t-lg bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-3 mx-auto">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                      </svg>
                    </div>
                    <span className="text-sm font-medium">No image</span>
                  </div>
                </div>
              )}
              <CardHeader className="p-3 pb-2">
                <div className="flex justify-between items-start">
                  <div className="flex-1 relative group">
                    <CardTitle className="text-sm font-semibold flex items-center gap-1 whitespace-normal break-words">
                      {item.title}
                      {requestCounts[item.id] > 0 && (
                        <span className="ml-1 inline-flex items-center justify-center px-1 py-0.5 rounded-full text-xs font-semibold bg-yellow-200 text-yellow-800 animate-pulse">
                          {requestCounts[item.id]}
                        </span>
                      )}
                    </CardTitle>
                    <div className="absolute hidden group-hover:block bg-black text-white text-xs p-2 rounded shadow-lg z-10 mt-1 whitespace-normal max-w-xs">
                      {item.title}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                      {item.category}
                    </Badge>
                    {getStatusBadge(item.status)}
                  </div>
                </div>
                <div className="relative group">
                  <CardDescription className="text-xs leading-tight whitespace-normal break-words">
                    {item.description}
                  </CardDescription>
                  <div className="absolute hidden group-hover:block bg-black text-white text-xs p-2 rounded shadow-lg z-10 mt-1 whitespace-normal max-w-xs">
                    {item.description}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 p-3 pt-0">
                <div className="flex items-center gap-1 text-xs text-gray-600 relative group flex-wrap">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span className="font-medium break-words max-w-full">{item.pickup_location}</span>
                  <div className="absolute hidden group-hover:block bg-black text-white text-xs p-2 rounded shadow-lg z-10 mt-6 whitespace-normal max-w-xs">
                    {item.pickup_location}
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-1">
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
                  <div className="flex items-center gap-1 text-orange-600 text-xs">
                    <Clock className="h-4 w-4" />
                    <span>Expires: {new Date(item.expiry_date).toLocaleDateString()}</span>
                  </div>
                )}

                <div className="flex gap-1 pt-2">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditItem(item);
                    }}
                    variant="outline"
                    size="sm"
                    className="flex-1 flex items-center gap-1 text-xs py-2 h-auto hover:scale-105 transition-all duration-200"
                  >
                    <Edit className="h-3 w-3" />
                    Edit
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteItem(item);
                    }}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 text-xs py-2 h-auto px-2 hover:scale-105 transition-all duration-200"
                    disabled={deleting === item.id}
                  >
                    <Trash2 className="h-3 w-3" />
                    {deleting === item.id ? "..." : "Delete"}
                  </Button>
                  {item.status !== "completed" && (
                    <Button
                      onClick={e => { e.stopPropagation(); handleMarkAsShared(item); }}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1 text-green-700 border-green-400 hover:bg-green-50 text-xs py-2 h-auto px-2 hover:scale-105 transition-all duration-200"
                      disabled={markingShared === item.id}
                    >
                      <CheckCircle className="h-3 w-3" />
                      {markingShared === item.id ? "..." : "Shared"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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
