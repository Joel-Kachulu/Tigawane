"use client"

import React, { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { useLocation } from "@/contexts/LocationContext"
import { formatDistance } from "@/lib/locationService"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarDays, MapPin, Package, Search, Filter, Plus, Eye, Edit, Trash2, Image as ImageIcon } from "lucide-react"
import ClaimFoodModal from "./ClaimFoodModal"
import EditItemModal from "./EditItemModal"

interface Item {
  id: string
  title: string
  description: string | null
  category: string
  item_type: string
  quantity: string
  condition?: string | null
  expiry_date?: string | null
  pickup_location: string
  image_url: string | null
  user_id: string
  status: string
  created_at: string
  collaboration_id?: string | null
  latitude?: number | null
  longitude?: number | null
  distance?: number
  profiles?: {
    full_name: string | null
    location: string | null
  }
}

interface ItemListProps {
  itemType: "food" | "non-food"
  collaborationId?: string | null
}

export default function ItemList({ itemType, collaborationId }: ItemListProps) {
  const { user } = useAuth()
  const { selectedLocation, locationRadius } = useLocation()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [profiles, setProfiles] = useState<Record<string, any>>({})
  const [requestingItems, setRequestingItems] = useState<Set<string>>(new Set())
  const [requestCounts, setRequestCounts] = useState<Record<string, number>>({})

  const itemsPerPage = 12

  const categories = itemType === "food" 
    ? ["Fruits", "Vegetables", "Meat", "Dairy", "Bread", "Snacks", "Beverages", "Other"]
    : ["Clothing", "Electronics", "Furniture", "Books", "Household", "Sports", "Tools", "Other"]

  useEffect(() => {
    fetchItems(true)
  }, [itemType, collaborationId, searchTerm, categoryFilter, statusFilter, selectedLocation, locationRadius])

  const fetchItems = async (reset = false) => {
    try {
      const pageToFetch = reset ? 0 : currentPage
      console.log(`🔍 Fetching ${itemType} items (page ${pageToFetch})...`)

      let query = supabase
        .from("items")
        .select("*")
        .eq("item_type", itemType)
        .order("created_at", { ascending: false })

      // Add collaboration filtering
      if (collaborationId) {
        query = query.eq("collaboration_id", collaborationId)
      } else {
        // If not filtering by collaboration, exclude collaboration items
        query = query.is("collaboration_id", null)
      }

      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      }

      if (categoryFilter !== "all") {
        query = query.eq("category", categoryFilter)
      }

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter)
      }

      // Add location-based filtering if location is selected
      if (selectedLocation && selectedLocation.latitude && selectedLocation.longitude) {
        // Use the database function to get items within radius
        const { data: locationData, error: locationError } = await supabase
          .rpc('get_items_within_radius', {
            user_lat: selectedLocation.latitude,
            user_lon: selectedLocation.longitude,
            radius_km: locationRadius
          })
          .eq('item_type', itemType)
          .order('distance', { ascending: true });

        if (locationError) {
          console.error('Location query error:', locationError);
          // Fallback to regular query
          const { data, error } = await query
            .range(pageToFetch * itemsPerPage, (pageToFetch + 1) * itemsPerPage - 1);
          
          if (error) throw error;
          setItems(reset ? data || [] : [...items, ...(data || [])]);
          setHasMore((data || []).length === itemsPerPage);
          return;
        }

        // Filter the location results by other criteria
        let filteredData = locationData || [];
        
        if (collaborationId) {
          filteredData = filteredData.filter(item => item.collaboration_id === collaborationId);
        } else {
          filteredData = filteredData.filter(item => !item.collaboration_id);
        }

        if (searchTerm) {
          filteredData = filteredData.filter(item => 
            item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
          );
        }

        if (categoryFilter !== "all") {
          filteredData = filteredData.filter(item => item.category === categoryFilter);
        }

        if (statusFilter !== "all") {
          filteredData = filteredData.filter(item => item.status === statusFilter);
        }

        // Apply pagination
        const startIndex = pageToFetch * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedData = filteredData.slice(startIndex, endIndex);

        setItems(reset ? paginatedData : [...items, ...paginatedData]);
        setHasMore(endIndex < filteredData.length);
        return;
      }

      // Regular query without location filtering
      const { data, error } = await query
        .range(pageToFetch * itemsPerPage, (pageToFetch + 1) * itemsPerPage - 1)

      if (error) throw error

      console.log(`✅ Successfully fetched ${data?.length || 0} ${itemType} items`)

      if (reset) {
        setItems(data || [])
        setCurrentPage(0)
      } else {
        setItems(prev => [...prev, ...(data || [])])
      }

      setHasMore((data?.length || 0) === itemsPerPage)

      // Fetch user profiles for items
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(item => item.user_id))]
        await fetchProfiles(userIds)
        
        // Fetch request counts for owner's items
        if (user) {
          await fetchRequestCounts(data.filter(item => item.user_id === user.id))
        }
      }
    } catch (error) {
      console.error(`❌ Error fetching ${itemType} items:`, error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProfiles = async (userIds: string[]) => {
    try {
      console.log(`👥 Fetching profiles for ${userIds.length} users...`)
      
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, location")
        .in("id", userIds)

      if (error) throw error

      const profilesMap = (data || []).reduce((acc, profile) => {
        acc[profile.id] = profile
        return acc
      }, {} as Record<string, any>)

      setProfiles(prev => ({ ...prev, ...profilesMap }))
      console.log(`✅ Successfully fetched ${data?.length || 0} profiles`)
    } catch (error) {
      console.error("❌ Error fetching profiles:", error)
    }
  }

  const fetchRequestCounts = async (ownerItems: Item[]) => {
    try {
      const itemIds = ownerItems.map(item => item.id)
      if (itemIds.length === 0) return

      const { data, error } = await supabase
        .from("claims")
        .select("item_id")
        .in("item_id", itemIds)
        .eq("status", "pending")

      if (error) throw error

      const counts = (data || []).reduce((acc, claim) => {
        acc[claim.item_id] = (acc[claim.item_id] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      setRequestCounts(counts)
    } catch (error) {
      console.error("❌ Error fetching request counts:", error)
    }
  }

  const loadMore = () => {
    if (!loading && hasMore) {
      setCurrentPage(prev => prev + 1)
      fetchItems(false)
    }
  }

  const handleItemClaimed = () => {
    fetchItems(true)
    setSelectedItem(null)
  }

  const handleItemUpdated = () => {
    fetchItems(true)
    setEditingItem(null)
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from("items")
        .delete()
        .eq("id", itemId)
        .eq("user_id", user.id)

      if (error) throw error

      fetchItems(true)
    } catch (error) {
      console.error("❌ Error deleting item:", error)
      alert("Failed to delete item")
    }
  }

  const filteredItems = items

  if (loading && currentPage === 0) {
    return (
      <div className="space-y-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder={`Search ${itemType} items...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(category => (
              <SelectItem key={category} value={category}>{category}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="requested">Requested</SelectItem>
            <SelectItem value="reserved">Reserved</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Items Grid */}
      {filteredItems.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No {itemType} items found
            </h3>
            <p className="text-gray-600">
              {collaborationId 
                ? "No items have been shared with this collaboration yet."
                : `No ${itemType} items match your current filters.`
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile: Horizontal Scroll */}
          <div className="lg:hidden">
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {filteredItems.map((item) => (
                <div key={item.id} className="flex-shrink-0 w-[280px]">
                  <Card className="group overflow-hidden hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer border-2 hover:border-green-200 w-full h-full relative">
                    {/* Visual Enhancement: Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10"></div>
                    
                    {/* Visual Enhancement: Corner Accent */}
                    <div className="absolute top-0 right-0 w-0 h-0 border-l-[20px] border-l-transparent border-t-[20px] border-t-green-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    <div className="relative h-40 w-full overflow-hidden rounded-t-lg bg-gradient-to-br from-gray-50 to-gray-100">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="object-cover object-center w-full h-full group-hover:scale-110 transition-transform duration-300"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.parentElement!.innerHTML = '<div class="flex items-center justify-center h-full text-gray-400"><span>Image not available</span></div>';
                          }}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-400">
                          <div className="text-center">
                            <ImageIcon className="h-8 w-8 mx-auto mb-1 text-gray-300" />
                            <span className="text-xs">No image</span>
                          </div>
                        </div>
                      )}
                      
                      {/* Visual Enhancement: Status Indicator */}
                      <div className="absolute top-2 left-2">
                        <div className={`w-3 h-3 rounded-full border-2 border-white shadow-sm ${
                          item.status === 'available' ? 'bg-green-500' :
                          item.status === 'requested' ? 'bg-yellow-500' :
                          item.status === 'reserved' ? 'bg-blue-500' :
                          'bg-gray-500'
                        }`}></div>
                      </div>
                      
                      {/* Visual Enhancement: Distance Badge */}
                      {item.distance !== undefined && (
                        <div className="absolute top-2 right-2">
                          <div className="bg-white/90 backdrop-blur-sm text-blue-700 text-xs px-2 py-1 rounded-full font-medium shadow-sm">
                            {formatDistance(item.distance)}
                          </div>
                        </div>
                      )}
                    </div>
                    <CardHeader className="p-3 pb-2">
                      <div className="flex justify-between items-start">
                        <div className="flex-1 relative group">
                          <CardTitle className="text-sm font-semibold flex items-center gap-1 line-clamp-2 group-hover:line-clamp-none">
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
                          <Badge 
                            variant={item.status === 'available' ? 'default' : 'secondary'}
                            className={`text-xs ${
                              item.status === 'available' ? 'bg-green-100 text-green-800' :
                              item.status === 'requested' ? 'bg-yellow-100 text-yellow-800' :
                              item.status === 'reserved' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {item.status === 'available' && requestCounts[item.id] > 0 
                              ? `Requested (${requestCounts[item.id]})` 
                              : item.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="relative group">
                        <CardDescription className="line-clamp-2 text-xs leading-tight group-hover:line-clamp-none">
                          {item.description}
                        </CardDescription>
                        <div className="absolute hidden group-hover:block bg-black text-white text-xs p-2 rounded shadow-lg z-10 mt-1 whitespace-normal max-w-xs">
                          {item.description}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 p-3 pt-0">
                      <div className="flex items-center gap-1 text-xs text-gray-600 relative group">
                        <MapPin className="h-4 w-4 shrink-0" />
                        <span className="truncate group-hover:overflow-visible">{item.pickup_location}</span>
                        <div className="absolute hidden group-hover:block bg-black text-white text-xs p-2 rounded shadow-lg z-10 mt-6 whitespace-nowrap">
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
                          <CalendarDays className="h-4 w-4" />
                          <span>Expires: {new Date(item.expiry_date).toLocaleDateString()}</span>
                        </div>
                      )}

                      <div className="text-xs text-gray-500">
                        <span className="block">
                          By {profiles[item.user_id]?.full_name || 'Unknown'} • {new Date(item.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex gap-1 pt-2">
                        {user && user.id !== item.user_id && item.status === 'available' && (
                          <Button 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setRequestingItems(prev => new Set(prev).add(item.id));
                              setSelectedItem(item);
                              
                              // Remove loading state after a delay
                              setTimeout(() => {
                                setRequestingItems(prev => {
                                  const newSet = new Set(prev);
                                  newSet.delete(item.id);
                                  return newSet;
                                });
                              }, 2000);
                            }}
                            className="flex-1 text-xs py-2 h-auto bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 transform hover:scale-105 transition-all duration-200"
                            size="sm"
                            disabled={requestingItems.has(item.id)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            {requestingItems.has(item.id) ? "Requesting..." : "Request"}
                          </Button>
                        )}
                        
                        {user && user.id === item.user_id && (
                          <>
                            <Button 
                              onClick={() => setEditingItem(item)}
                              variant="outline"
                              size="sm"
                              className="flex-1 text-xs py-2 h-auto hover:scale-105 transition-all duration-200"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button 
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this item?')) {
                                  handleDeleteItem(item.id)
                                }
                              }}
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 text-xs py-2 h-auto px-3 hover:scale-105 transition-all duration-200"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>

          {/* Desktop: Grid Layout */}
          <div className="hidden lg:grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
            {filteredItems.map((item) => (
              <Card key={item.id} className="group overflow-hidden hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer border-2 hover:border-green-200 w-full max-w-[308px] mx-auto relative">
                {/* Visual Enhancement: Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10"></div>
                
                {/* Visual Enhancement: Corner Accent */}
                <div className="absolute top-0 right-0 w-0 h-0 border-l-[20px] border-l-transparent border-t-[20px] border-t-green-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <div className="relative h-40 w-full overflow-hidden rounded-t-lg bg-gradient-to-br from-gray-50 to-gray-100">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="object-cover object-center w-full h-full group-hover:scale-110 transition-transform duration-300"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.parentElement!.innerHTML = '<div class="flex items-center justify-center h-full text-gray-400"><span>Image not available</span></div>';
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <div className="text-center">
                        <ImageIcon className="h-8 w-8 mx-auto mb-1 text-gray-300" />
                        <span className="text-xs">No image</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Visual Enhancement: Status Indicator */}
                  <div className="absolute top-2 left-2">
                    <div className={`w-3 h-3 rounded-full border-2 border-white shadow-sm ${
                      item.status === 'available' ? 'bg-green-500' :
                      item.status === 'requested' ? 'bg-yellow-500' :
                      item.status === 'reserved' ? 'bg-blue-500' :
                      'bg-gray-500'
                    }`}></div>
                  </div>
                  
                  {/* Visual Enhancement: Distance Badge */}
                  {item.distance !== undefined && (
                    <div className="absolute top-2 right-2">
                      <div className="bg-white/90 backdrop-blur-sm text-blue-700 text-xs px-2 py-1 rounded-full font-medium shadow-sm">
                        {formatDistance(item.distance)}
                      </div>
                  </div>
                )}
                </div>
                <CardHeader className="p-3 pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 relative group">
                      <CardTitle className="text-sm font-semibold flex items-center gap-1 line-clamp-2 group-hover:line-clamp-none">
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
                    <Badge 
                      variant={item.status === 'available' ? 'default' : 'secondary'}
                        className={`text-xs ${
                        item.status === 'available' ? 'bg-green-100 text-green-800' :
                        item.status === 'requested' ? 'bg-yellow-100 text-yellow-800' :
                        item.status === 'reserved' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {item.status === 'available' && requestCounts[item.id] > 0 
                        ? `Requested (${requestCounts[item.id]})` 
                        : item.status}
                    </Badge>
                  </div>
                  </div>
                  <div className="relative group">
                    <CardDescription className="line-clamp-2 text-xs leading-tight group-hover:line-clamp-none">
                        {item.description}
                    </CardDescription>
                    <div className="absolute hidden group-hover:block bg-black text-white text-xs p-2 rounded shadow-lg z-10 mt-1 whitespace-normal max-w-xs">
                        {item.description}
                      </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-2 p-3 pt-0">
                  <div className="flex items-center gap-1 text-xs text-gray-600 relative group">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span className="truncate group-hover:overflow-visible">{item.pickup_location}</span>
                    <div className="absolute hidden group-hover:block bg-black text-white text-xs p-2 rounded shadow-lg z-10 mt-6 whitespace-nowrap">
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
                      <CalendarDays className="h-4 w-4" />
                      <span>Expires: {new Date(item.expiry_date).toLocaleDateString()}</span>
                    </div>
                  )}

                  <div className="text-xs text-gray-500">
                    <span className="block">
                      By {profiles[item.user_id]?.full_name || 'Unknown'} • {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex gap-1 pt-2">
                    {user && user.id !== item.user_id && item.status === 'available' && (
                      <Button 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setRequestingItems(prev => new Set(prev).add(item.id));
                          setSelectedItem(item);
                          
                          // Remove loading state after a delay
                          setTimeout(() => {
                            setRequestingItems(prev => {
                              const newSet = new Set(prev);
                              newSet.delete(item.id);
                              return newSet;
                            });
                          }, 2000);
                        }}
                        className="flex-1 text-xs py-2 h-auto bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 transform hover:scale-105 transition-all duration-200"
                        size="sm"
                        disabled={requestingItems.has(item.id)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {requestingItems.has(item.id) ? "Requesting..." : "Request"}
                      </Button>
                    )}
                    
                    {user && user.id === item.user_id && (
                      <>
                        <Button 
                          onClick={() => setEditingItem(item)}
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs py-2 h-auto hover:scale-105 transition-all duration-200"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this item?')) {
                              handleDeleteItem(item.id)
                            }
                          }}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 text-xs py-2 h-auto px-3 hover:scale-105 transition-all duration-200"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {hasMore && (
            <div className="text-center">
              <Button 
                onClick={loadMore}
                variant="outline"
                disabled={loading}
              >
                {loading ? "Loading..." : "Load More"}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {selectedItem && (
        <ClaimFoodModal
          foodItem={{
            ...selectedItem,
            owner_name: profiles[selectedItem.user_id]?.full_name
          }}
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          onClaimed={handleItemClaimed}
        />
      )}

      {editingItem && (
        <EditItemModal
          item={editingItem}
          isOpen={!!editingItem}
          onClose={() => setEditingItem(null)}
          onItemUpdated={handleItemUpdated}
        />
      )}
    </div>
  )
}