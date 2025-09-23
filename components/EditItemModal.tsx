"use client"

import { useState, useEffect } from "react"
import { geocodeAddress } from "@/lib/locationService"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

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

interface EditItemModalProps {
  item: Item | null
  isOpen: boolean
  onClose: () => void
  onItemUpdated: () => void
}

export default function EditItemModal({ item, isOpen, onClose, onItemUpdated }: EditItemModalProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    quantity: "",
    condition: "",
    expiry_date: "",
    pickup_location: "",
    status: "",
  })
  const [imageFile, setImageFile] = useState<File | null>(null)

  useEffect(() => {
    if (item) {
      setFormData({
        title: item.title || "",
        description: item.description || "",
        category: item.category || "",
        quantity: item.quantity || "",
        condition: item.condition || "",
        expiry_date: item.expiry_date || "",
        pickup_location: item.pickup_location || "",
        status: item.status || "available",
      })
    }
  }, [item])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !item) {
      alert("Unable to update item")
      return
    }

    // Validate required fields
    if (!formData.title.trim()) {
      alert("Please enter a title")
      return
    }
    if (!formData.category) {
      alert("Please select a category")
      return
    }
    if (!formData.quantity.trim()) {
      alert("Please enter quantity")
      return
    }
    if (!formData.pickup_location.trim()) {
      alert("Please enter pickup location")
      return
    }
    if (item.item_type === "non-food" && !formData.condition) {
      alert("Please select condition")
      return
    }

    console.log("Starting item update...")
    console.log("Form data:", formData)
    console.log("Item ID:", item.id)

    setLoading(true)

    try {
      let imageUrl = item.image_url

      // Upload new image if provided
      if (imageFile) {
        console.log("Uploading new image...")
        const fileExt = imageFile.name.split(".").pop()
        const fileName = `${user.id}/${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage.from("item-images").upload(fileName, imageFile)

        if (uploadError) {
          console.error("Upload error:", uploadError)
          alert("Image upload failed, but item will be updated without new photo")
        } else {
          const {
            data: { publicUrl },
          } = supabase.storage.from("item-images").getPublicUrl(fileName)
          imageUrl = publicUrl
          console.log("New image uploaded successfully:", imageUrl)
        }
      }

      // Geocode pickup location to get coordinates
      let pickup_lat = null;
      let pickup_lon = null;
      let pickup_label = formData.pickup_location.trim();
      try {
        const geo = await geocodeAddress(pickup_label);
        pickup_lat = geo.latitude;
        pickup_lon = geo.longitude;
      } catch (geoError) {
        alert("Could not find that location. Please enter a more specific address or landmark.");
        setLoading(false);
        return;
      }

      // Prepare update data
      const updateData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        category: formData.category,
        quantity: formData.quantity.trim(),
        condition: item.item_type === "non-food" ? formData.condition || null : null,
        expiry_date: item.item_type === "food" && formData.expiry_date ? formData.expiry_date : null,
        pickup_location: pickup_label,
        pickup_label,
        pickup_lat,
        pickup_lon,
        image_url: imageUrl,
        status: formData.status,
      }

      console.log("Updating item data:", updateData)

      // Update item
      const { data, error } = await supabase
        .from("items")
        .update(updateData)
        .eq("id", item.id)
        .eq("user_id", user.id) // Ensure user can only update their own items
        .select()

      if (error) {
        console.error("Database error:", error)
        throw error
      }

      console.log("Item updated successfully:", data)

      onItemUpdated()
      onClose()
      alert(`${item.item_type === "food" ? "Food" : "Item"} updated successfully!`)
    } catch (error: any) {
      console.error("Error updating item:", error)
      alert(`Error updating item: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const getCategories = () => {
    if (item?.item_type === "food") {
      return ["fruits", "vegetables", "grains", "dairy", "meat", "prepared", "other"]
    } else {
      return ["clothing", "shoes", "household", "electronics", "books", "toys", "baby-items", "other"]
    }
  }

  const categories = getCategories()
  const conditions = ["new", "excellent", "good", "fair", "needs-repair", "old"]
  const statuses = ["available", "requested", "reserved", "completed"]

  if (!item) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-green-700">
            Edit {item.item_type === "food" ? "Food" : "Item"}
          </DialogTitle>
          <DialogDescription>Update your {item.item_type === "food" ? "food" : "item"} listing</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="edit-title">{item.item_type === "food" ? "Food" : "Item"} Title *</Label>
            <Input
              id="edit-title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={
                item.item_type === "food" ? "e.g., Fresh tomatoes, Cooked rice" : "e.g., Men's shoes, Baby clothes"
              }
              required
            />
          </div>

          <div>
            <Label htmlFor="edit-category">Category *</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1).replace("-", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="edit-quantity">Quantity *</Label>
            <Input
              id="edit-quantity"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              placeholder={item.item_type === "food" ? "e.g., 2 kg, 5 pieces, 1 bowl" : "e.g., 1 pair, 3 pieces, 1 set"}
              required
            />
          </div>

          {item.item_type === "non-food" && (
            <div>
              <Label htmlFor="edit-condition">Condition *</Label>
              <Select
                value={formData.condition}
                onValueChange={(value) => setFormData({ ...formData, condition: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  {conditions.map((condition) => (
                    <SelectItem key={condition} value={condition}>
                      {condition.charAt(0).toUpperCase() + condition.slice(1).replace("-", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="edit-pickup-location">Pickup Location *</Label>
            <Input
              id="edit-pickup-location"
              value={formData.pickup_location}
              onChange={(e) => setFormData({ ...formData, pickup_location: e.target.value })}
              placeholder="e.g., Area 25, Lilongwe"
              required
            />
          </div>

          {item.item_type === "food" && (
            <div>
              <Label htmlFor="edit-expiry-date">Expiry Date (optional)</Label>
              <Input
                id="edit-expiry-date"
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              />
            </div>
          )}

          <div>
            <Label htmlFor="edit-status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={
                item.item_type === "food"
                  ? "Additional details about the food..."
                  : "Additional details about the item..."
              }
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="edit-image">Update Photo (optional)</Label>
            <Input
              id="edit-image"
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            />
            {item.image_url && (
              <p className="text-sm text-gray-500 mt-1">Current photo will be replaced if you upload a new one</p>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700" disabled={loading}>
              {loading ? "Updating..." : "Update Item"}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
