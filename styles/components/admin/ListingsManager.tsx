"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Search, Edit, Trash2, MapPin, Calendar, User, Package, AlertCircle } from "lucide-react"
import OptimizedImage from "./OptimizedImage"

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
  owner_name?: string
  owner_email?: string
}

interface ListingsManagerProps {
  onStatsUpdate: () => void
}

export default function ListingsManager({ onStatsUpdate }: ListingsManagerProps) {
  const [items, setItems] = useState<Item[]>([])
  const [filteredItems, setFilteredItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [locationFilter, setLocationFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    category: "",
    quantity: "",
    pickup_location: "",
  })
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const itemsPerPage = 20

  useEffect(() => {
    fetchItems()
  }, [currentPage, searchTerm, categoryFilter, locationFilter, statusFilter])

  const fetchItems = async () => {
    try {
      setLoading(true)
      console.log("🔍 Starting to fetch items...")
      
      // Build query with filters - simplified without join
      let query = supabase
        .from("items")
        .select("*", { count: 'exact' })
        .order("created_at", { ascending: false })

      // Apply filters
      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      }
      
      if (categoryFilter !== "all") {
        query = query.eq("category", categoryFilter)
      }
      
      if (locationFilter) {
        query = query.ilike("pickup_location", `%${locationFilter}%`)
      }
      
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter)
      }

      // Apply pagination
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1
      query = query.range(from, to)

      const { data: itemsData, error, count } = await query

      console.log("📊 Query result:", { itemsData: itemsData?.length, error, count })

      if (error) {
        console.error("Supabase error:", error)
        throw new Error(`Database error: ${error.message || 'Unknown database error'}`)
      }

      // Fetch user profiles separately to avoid join issues
      const userIds = [...new Set(itemsData?.map(item => item.user_id) || [])]
      let profilesMap: Record<string, any> = {}
      
      console.log("👥 User IDs to fetch:", userIds)
      
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds)
        
        console.log("👥 Profiles result:", { profilesData: profilesData?.length, profilesError })
        
        if (profilesError) {
          console.warn("Error fetching profiles:", profilesError)
        } else {
          profilesMap = profilesData?.reduce((acc, profile) => {
            acc[profile.id] = profile
            return acc
          }, {} as Record<string, any>) || {}
        }
      }

      // Transform data to include owner info
      const itemsWithOwners = itemsData?.map((item: any) => ({
          ...item,
        owner_name: profilesMap[item.user_id]?.full_name || "Unknown",
        owner_email: profilesMap[item.user_id]?.email || "Unknown",
        })) || []

      // Debug image URLs
      console.log("🖼️ Items with image URLs:", itemsWithOwners.map(item => ({
        id: item.id,
        title: item.title,
        image_url: item.image_url,
        hasImage: !!item.image_url
      })))

      setItems(itemsWithOwners)
      setTotalItems(count || 0)
      setTotalPages(Math.ceil((count || 0) / itemsPerPage))
      
      console.log("✅ Successfully fetched items:", {
        itemsCount: itemsWithOwners.length,
        totalItems: count,
        totalPages: Math.ceil((count || 0) / itemsPerPage)
      })
    } catch (error) {
      console.error("Error fetching items:", error)
      console.error("Error type:", typeof error)
      console.error("Error message:", error instanceof Error ? error.message : String(error))
      console.error("Full error object:", JSON.stringify(error, null, 2))
      
      setItems([])
      setTotalItems(0)
      setTotalPages(0)
    } finally {
      setLoading(false)
    }
  }

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, categoryFilter, locationFilter, statusFilter])

  const handleEdit = (item: Item) => {
    setSelectedItem(item)
    setEditForm({
      title: item.title,
      description: item.description || "",
      category: item.category,
      quantity: item.quantity,
      pickup_location: item.pickup_location,
    })
    setEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedItem) return

    try {
      const { error } = await supabase
        .from("items")
        .update({
          title: editForm.title,
          description: editForm.description || null,
          category: editForm.category,
          quantity: editForm.quantity,
          pickup_location: editForm.pickup_location,
        })
        .eq("id", selectedItem.id)

      if (error) throw error

      await fetchItems()
      onStatsUpdate()
      setEditDialogOpen(false)
      alert("Item updated successfully!")
    } catch (error: any) {
      console.error("Error updating item:", error)
      alert(`Error updating item: ${error.message}`)
    }
  }

  const handleDelete = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this item? This action cannot be undone.")) {
      return
    }

    try {
      const { error } = await supabase.from("items").delete().eq("id", itemId)

      if (error) throw error

      await fetchItems()
      onStatsUpdate()
      alert("Item deleted successfully!")
    } catch (error: any) {
      console.error("Error deleting item:", error)
      alert(`Error deleting item: ${error.message}`)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      available: { color: "bg-green-100 text-green-800", label: "Available" },
      requested: { color: "bg-yellow-100 text-yellow-800", label: "Requested" },
      reserved: { color: "bg-blue-100 text-blue-800", label: "Reserved" },
      completed: { color: "bg-gray-100 text-gray-800", label: "Completed" },
      cancelled: { color: "bg-red-100 text-red-800", label: "Cancelled" },
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.available
    return <Badge className={config.color}>{config.label}</Badge>
  }

  const categories = [
    "all",
    "fruits",
    "vegetables",
    "grains",
    "dairy",
    "meat",
    "prepared",
    "clothing",
    "shoes",
    "household",
    "electronics",
    "books",
    "toys",
    "baby-items",
    "other",
  ]

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-base sm:text-lg lg:text-xl">Loading listings...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl sm:text-2xl lg:text-3xl">Manage Listings</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 text-sm sm:text-base"
              />
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="text-sm sm:text-base">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1).replace("-", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              placeholder="Filter by location..."
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="text-sm sm:text-base"
            />

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="text-sm sm:text-base">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="requested">Requested</SelectItem>
                <SelectItem value="reserved">Reserved</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Results Summary */}
          <div className="mb-4 flex justify-between items-center">
            <p className="text-sm sm:text-base text-gray-600">
              Showing {items.length} of {totalItems} items
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </div>

          {/* Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <Card 
                key={item.id} 
                clickable={true}
                onClick={() => handleEdit(item)}
              >
                  <div className="relative h-32 w-full bg-gray-100">
                    {item.image_url && item.image_url.trim() !== '' ? (
                      <OptimizedImage
                        src={item.image_url}
                      alt={item.title}
                      fill
                      className="object-cover rounded-t-lg"
                    />
                    ) : (
                      <div className="flex items-center justify-center h-full bg-gray-100 rounded-t-lg">
                        <div className="text-center">
                          <Package className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                          <span className="text-xs text-gray-500">No image</span>
                        </div>
                      </div>
                    )}
                  </div>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="relative group flex-1 min-w-0">
                      <h3 className="font-medium text-sm sm:text-base lg:text-lg line-clamp-1 group-hover:line-clamp-none group-hover:bg-gray-50 group-hover:p-2 group-hover:rounded group-hover:absolute group-hover:z-10 group-hover:shadow-lg group-hover:border group-hover:min-w-full group-hover:max-w-xs group-hover:transition-all group-hover:duration-200">
                        {item.title}
                      </h3>
                    </div>
                    {getStatusBadge(item.status)}
                  </div>

                  <div className="relative group mb-2">
                    <p className="text-xs sm:text-sm lg:text-base text-gray-600 line-clamp-2 group-hover:line-clamp-none group-hover:bg-gray-50 group-hover:p-2 group-hover:rounded group-hover:absolute group-hover:z-10 group-hover:shadow-lg group-hover:border group-hover:min-w-full group-hover:max-w-xs group-hover:transition-all group-hover:duration-200">
                      {item.description}
                    </p>
                  </div>

                  <div className="space-y-1 text-xs sm:text-sm text-gray-500 mb-3">
                    <div className="flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      <span>
                        {item.category} • {item.quantity}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span>{item.pickup_location}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{item.owner_name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(item);
                      }} 
                      className="flex-1 text-xs sm:text-sm"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item.id);
                      }}
                      className="text-red-600 hover:text-red-700 text-xs sm:text-sm"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {items.length === 0 && !loading && (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg sm:text-xl lg:text-2xl font-medium text-gray-900 mb-2">No items found</h3>
              <p className="text-sm sm:text-base lg:text-lg text-gray-600">Try adjusting your filters to see more results.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl lg:text-2xl">Edit Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title" className="text-sm sm:text-base">Title</Label>
              <Input
                id="title"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="text-sm sm:text-base"
              />
            </div>
            <div>
              <Label htmlFor="description" className="text-sm sm:text-base">Description</Label>
              <Textarea
                id="description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={3}
                className="text-sm sm:text-base"
              />
            </div>
            <div>
              <Label htmlFor="category" className="text-sm sm:text-base">Category</Label>
              <Select
                value={editForm.category}
                onValueChange={(value) => setEditForm({ ...editForm, category: value })}
              >
                <SelectTrigger className="text-sm sm:text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.slice(1).map((category) => (
                    <SelectItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1).replace("-", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="quantity" className="text-sm sm:text-base">Quantity</Label>
              <Input
                id="quantity"
                value={editForm.quantity}
                onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                className="text-sm sm:text-base"
              />
            </div>
            <div>
              <Label htmlFor="pickup_location" className="text-sm sm:text-base">Pickup Location</Label>
              <Input
                id="pickup_location"
                value={editForm.pickup_location}
                onChange={(e) => setEditForm({ ...editForm, pickup_location: e.target.value })}
                className="text-sm sm:text-base"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="flex-1 text-sm sm:text-base">
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} className="flex-1 text-sm sm:text-base">
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
