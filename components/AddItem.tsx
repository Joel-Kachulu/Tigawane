"use client"

import type React from "react"
import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

interface AddItemProps {
  itemType: "food" | "non-food"
  onItemAdded: () => void
}

export default function AddItem({ itemType, onItemAdded }: AddItemProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    quantity: "",
    condition: "",
    expiry_date: "",
    pickup_location: "",
    area: "",
    is_anonymous: false,
  })
  const [imageFile, setImageFile] = useState<File | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!user) {
      setError("Please sign in to share items")
      return
    }

    // Validate required fields
    if (!formData.title.trim()) {
      setError("Please enter a title")
      return
    }
    if (!formData.category) {
      setError("Please select a category")
      return
    }
    if (!formData.quantity.trim()) {
      setError("Please enter quantity")
      return
    }
    if (!formData.pickup_location.trim()) {
      setError("Please enter pickup location")
      return
    }
    if (!formData.area) {
      setError("Please select your area/township")
      return
    }
    if (itemType === "non-food" && !formData.condition) {
      setError("Please select condition")
      return
    }

    console.log("🚀 Starting item submission...")
    console.log("📝 Form data:", formData)
    console.log("👤 User ID:", user.id)
    console.log("📦 Item type:", itemType)

    setLoading(true)

    try {
      let imageUrl = null

      // Upload image if provided
      if (imageFile) {
        console.log("📸 Uploading image...")
        const fileExt = imageFile.name.split(".").pop()
        const fileName = `${user.id}/${Date.now()}.${fileExt}`

        try {
          const { error: uploadError } = await supabase.storage.from("item-images").upload(fileName, imageFile)

          if (uploadError) {
            console.warn("⚠️ Image upload failed:", uploadError)
            // Continue without image
          } else {
            const {
              data: { publicUrl },
            } = supabase.storage.from("item-images").getPublicUrl(fileName)
            imageUrl = publicUrl
            console.log("✅ Image uploaded successfully:", imageUrl)
          }
        } catch (uploadErr) {
          console.warn("⚠️ Image upload error:", uploadErr)
          // Continue without image
        }
      }

      // Prepare item data with ALL required fields
      const itemData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        category: formData.category,
        item_type: itemType, // ✅ This was missing!
        quantity: formData.quantity.trim(),
        pickup_location: formData.pickup_location.trim(),
        user_id: user.id,
        status: "available", // ✅ Add default status
        // Optional fields
        image_url: imageUrl,
        expiry_date: itemType === "food" && formData.expiry_date ? formData.expiry_date : null,
        condition: itemType === "non-food" && formData.condition ? formData.condition : null,
        area: formData.area,
        is_anonymous: formData.is_anonymous,
      }

      console.log("💾 Inserting item data:", itemData)

      // Insert into items table
      const { data, error: insertError } = await supabase.from("items").insert(itemData).select()

      if (insertError) {
        console.error("❌ Database error:", insertError)
        throw insertError
      }

      console.log("🎉 Item inserted successfully:", data)

      // Reset form
      setFormData({
        title: "",
        description: "",
        category: "",
        quantity: "",
        condition: "",
        expiry_date: "",
        pickup_location: "",
        area: "",
        is_anonymous: false,
      })
      setImageFile(null)

      // Reset file input
      const fileInput = document.getElementById("image") as HTMLInputElement
      if (fileInput) {
        fileInput.value = ""
      }

      onItemAdded()
      setError(null)
      alert(`✅ ${itemType === "food" ? "Food" : "Item"} shared successfully!`)
    } catch (error: any) {
      console.error("💥 Error adding item:", error)
      setError(`Failed to share item: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const getCategories = () => {
    if (itemType === "food") {
      return ["fruits", "vegetables", "grains", "dairy", "meat", "prepared", "other"]
    } else {
      return ["clothing", "shoes", "household", "electronics", "books", "toys", "baby-items", "other"]
    }
  }

  const categories = getCategories()
  const conditions = ["new", "excellent", "good", "fair", "needs-repair", "old"]
  const areaOptions = [
    "area 18", "area 25", "area 23", "area 43", "area 30", "area 15", "area 14", "area 49", "Chilinde", "Kawale"
  ]

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl text-green-700">Share {itemType === "food" ? "Food" : "Items"}</CardTitle>
        <CardDescription>
          Help reduce waste by sharing {itemType === "food" ? "food" : "items"} with your community
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            <strong>Error:</strong> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">{itemType === "food" ? "Food" : "Item"} Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={
                itemType === "food" ? "e.g., Fresh tomatoes, Cooked rice" : "e.g., Men's shoes, Baby clothes"
              }
              required
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="category">Category *</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
              required
              disabled={loading}
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
            <Label htmlFor="quantity">Quantity *</Label>
            <Input
              id="quantity"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              placeholder={itemType === "food" ? "e.g., 2 kg, 5 pieces, 1 bowl" : "e.g., 1 pair, 3 pieces, 1 set"}
              required
              disabled={loading}
            />
          </div>

          {itemType === "non-food" && (
            <div>
              <Label htmlFor="condition">Condition *</Label>
              <Select
                value={formData.condition}
                onValueChange={(value) => setFormData({ ...formData, condition: value })}
                required
                disabled={loading}
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
            <Label htmlFor="pickup_location">Pickup Location *</Label>
            <Input
              id="pickup_location"
              value={formData.pickup_location}
              onChange={(e) => setFormData({ ...formData, pickup_location: e.target.value })}
              placeholder="e.g., Area 25, Lilongwe"
              required
              disabled={loading}
            />
          </div>
          <div>
            <Label htmlFor="area">Area/Township *</Label>
            <Select
              value={formData.area}
              onValueChange={(value) => setFormData({ ...formData, area: value })}
              required
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select area/township" />
              </SelectTrigger>
              <SelectContent>
                {areaOptions.map((area) => (
                  <SelectItem key={area} value={area}>{area.charAt(0).toUpperCase() + area.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="is_anonymous"
              checked={formData.is_anonymous}
              onCheckedChange={(checked) => setFormData({ ...formData, is_anonymous: checked })}
              disabled={loading}
            />
            <Label htmlFor="is_anonymous">Share Anonymously</Label>
          </div>

          {itemType === "food" && (
            <div>
              <Label htmlFor="expiry_date">Expiry Date (optional)</Label>
              <Input
                id="expiry_date"
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                disabled={loading}
              />
            </div>
          )}

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={
                itemType === "food" ? "Additional details about the food..." : "Additional details about the item..."
              }
              rows={3}
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="image">Photo (optional)</Label>
            <Input
              id="image"
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              disabled={loading}
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Sharing...
              </div>
            ) : (
              `Share ${itemType === "food" ? "Food" : "Item"}`
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
