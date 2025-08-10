"use client"

import type React from "react"
import React, { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface AddFoodProps {
  onFoodAdded: () => void
}

export default function AddFood({ onFoodAdded }: AddFoodProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    quantity: "",
    expiry_date: "",
    pickup_location: "",
  })
  const [imageFile, setImageFile] = useState<File | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)

    try {
      let imageUrl = null

      // Upload image if provided
      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop()
        const fileName = `${user.id}/${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage.from("food-images").upload(fileName, imageFile)

        if (uploadError) {
          console.error("Upload error:", uploadError)
          // Continue without image if upload fails
        } else {
          const {
            data: { publicUrl },
          } = supabase.storage.from("food-images").getPublicUrl(fileName)
          imageUrl = publicUrl
        }
      }

      // Insert food item
      const { error } = await supabase.from("food_items").insert({
        title: formData.title,
        description: formData.description || null,
        category: formData.category,
        quantity: formData.quantity,
        expiry_date: formData.expiry_date || null,
        pickup_location: formData.pickup_location,
        image_url: imageUrl,
        user_id: user.id,
      })

      if (error) {
        throw error
      }

      // Reset form
      setFormData({
        title: "",
        description: "",
        category: "",
        quantity: "",
        expiry_date: "",
        pickup_location: "",
      })
      setImageFile(null)

      onFoodAdded()
      alert("Food item shared successfully!")
    } catch (error: any) {
      console.error("Error adding food item:", error)
      alert(`Error sharing food item: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const categories = ["fruits", "vegetables", "grains", "dairy", "meat", "prepared", "other"]

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl text-green-700">Share Food</CardTitle>
        <CardDescription>Help reduce waste by sharing food with your community</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Food Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Fresh tomatoes, Cooked rice"
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
                    {category.charAt(0).toUpperCase() + category.slice(1)}
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
              placeholder="e.g., 2 kg, 5 pieces, 1 bowl"
              required
            />
          </div>

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

          <div>
            <Label htmlFor="expiry_date">Expiry Date (optional)</Label>
            <Input
              id="expiry_date"
              type="date"
              value={formData.expiry_date}
              onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Additional details about the food..."
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
            {loading ? "Sharing..." : "Share Food"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
