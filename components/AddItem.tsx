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

interface AddItemProps {
  itemType: "food" | "non-food"
  onItemAdded: () => void
}

export default function AddItem({ itemType, onItemAdded }: AddItemProps) {
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
  })
  const [imageFile, setImageFile] = useState<File | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      alert("Please sign in to share items")
      return
    }

    console.log("Starting item submission...")
    console.log("Form data:", formData)
    console.log("User ID:", user.id)
    console.log("Item type:", itemType)

    setLoading(true)

    try {
      let imageUrl = null

      // Upload image if provided
      if (imageFile) {
        console.log("Uploading image...")
        const fileExt = imageFile.name.split(".").pop()
        const fileName = `${user.id}/${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage.from("item-images").upload(fileName, imageFile)

        if (uploadError) {
          console.error("Upload error:", uploadError)
          // Continue without image if upload fails
          alert("Image upload failed, but item will be shared without photo")
        } else {
          const {
            data: { publicUrl },
          } = supabase.storage.from("item-images").getPublicUrl(fileName)
          imageUrl = publicUrl
          console.log("Image uploaded successfully:", imageUrl)
        }
      }

      // Prepare item data
      const itemData = {
        title: formData.title,
        description: formData.description || null,
        category: formData.category,
        item_type: itemType,
        quantity: formData.quantity,
        condition: itemType === "non-food" ? formData.condition || null : null,
        expiry_date: itemType === "food" && formData.expiry_date ? formData.expiry_date : null,
        pickup_location: formData.pickup_location,
        image_url: imageUrl,
        user_id: user.id,
      }

      console.log("Inserting item data:", itemData)

      // Insert item
      const { data, error } = await supabase.from("items").insert(itemData).select()

      if (error) {
        console.error("Database error:", error)
        throw error
      }

      console.log("Item inserted successfully:", data)

      // Reset form
      setFormData({
        title: "",
        description: "",
        category: "",
        quantity: "",
        condition: "",
        expiry_date: "",
        pickup_location: "",
      })
      setImageFile(null)

      // Reset file input
      const fileInput = document.getElementById("image") as HTMLInputElement
      if (fileInput) {
        fileInput.value = ""
      }

      onItemAdded()
      alert(`${itemType === "food" ? "Food" : "Item"} shared successfully!`)
    } catch (error: any) {
      console.error("Error adding item:", error)
      alert(`Error sharing item: ${error.message}`)
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
  const conditions = ["new", "excellent", "good", "fair", "needs-repair, old"]

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl text-green-700">Share {itemType === "food" ? "Food" : "Items"}</CardTitle>
        <CardDescription>
          Help reduce waste by sharing {itemType === "food" ? "food" : "items"} with your community
        </CardDescription>
      </CardHeader>
      <CardContent>
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
            />
          </div>

          <div>
            <Label htmlFor="category">Category *</Label>
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
            <Label htmlFor="quantity">Quantity *</Label>
            <Input
              id="quantity"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              placeholder={itemType === "food" ? "e.g., 2 kg, 5 pieces, 1 bowl" : "e.g., 1 pair, 3 pieces, 1 set"}
              required
            />
          </div>

          {itemType === "non-food" && (
            <div>
              <Label htmlFor="condition">Condition *</Label>
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
            <Label htmlFor="pickup_location">Pickup Location *</Label>
            <Input
              id="pickup_location"
              value={formData.pickup_location}
              onChange={(e) => setFormData({ ...formData, pickup_location: e.target.value })}
              placeholder="e.g., Area 25, Lilongwe"
              required
            />
          </div>

          {itemType === "food" && (
            <div>
              <Label htmlFor="expiry_date">Expiry Date (optional)</Label>
              <Input
                id="expiry_date"
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
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
            />
          </div>

          <div>
            <Label htmlFor="image">Photo (optional)</Label>
            <Input
              id="image"
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            />
          </div>

          <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={loading}>
            {loading ? "Sharing..." : `Share ${itemType === "food" ? "Food" : "Item"}`}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
