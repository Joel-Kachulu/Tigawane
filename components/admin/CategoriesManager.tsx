"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Settings, Plus, Edit, Trash2, Tag, Eye, EyeOff } from "lucide-react"

interface Category {
  id: string
  name: string
  item_type: "food" | "non-food" | "both"
  icon: string | null
  is_active: boolean
  created_at: string
}

export default function CategoriesManager() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    item_type: "both" as "food" | "non-food" | "both",
    icon: "",
    is_active: true,
  })

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from("categories").select("*").order("name")

      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error("Error fetching categories:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    try {
      const { error } = await supabase.from("categories").insert({
        name: formData.name.toLowerCase().replace(/\s+/g, "-"),
        item_type: formData.item_type,
        icon: formData.icon || null,
        is_active: formData.is_active,
      })

      if (error) throw error

      await fetchCategories()
      setCreateDialogOpen(false)
      setFormData({ name: "", item_type: "both", icon: "", is_active: true })
      alert("Category created successfully!")
    } catch (error: any) {
      console.error("Error creating category:", error)
      alert(`Error creating category: ${error.message}`)
    }
  }

  const handleEdit = (category: Category) => {
    setSelectedCategory(category)
    setFormData({
      name: category.name,
      item_type: category.item_type,
      icon: category.icon || "",
      is_active: category.is_active,
    })
    setEditDialogOpen(true)
  }

  const handleUpdate = async () => {
    if (!selectedCategory) return

    try {
      const { error } = await supabase
        .from("categories")
        .update({
          name: formData.name.toLowerCase().replace(/\s+/g, "-"),
          item_type: formData.item_type,
          icon: formData.icon || null,
          is_active: formData.is_active,
        })
        .eq("id", selectedCategory.id)

      if (error) throw error

      await fetchCategories()
      setEditDialogOpen(false)
      alert("Category updated successfully!")
    } catch (error: any) {
      console.error("Error updating category:", error)
      alert(`Error updating category: ${error.message}`)
    }
  }

  const handleDelete = async (categoryId: string, categoryName: string) => {
    if (!confirm(`Are you sure you want to delete the "${categoryName}" category? This action cannot be undone.`)) {
      return
    }

    try {
      const { error } = await supabase.from("categories").delete().eq("id", categoryId)

      if (error) throw error

      await fetchCategories()
      alert("Category deleted successfully!")
    } catch (error: any) {
      console.error("Error deleting category:", error)
      alert(`Error deleting category: ${error.message}`)
    }
  }

  const toggleActive = async (categoryId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.from("categories").update({ is_active: !currentStatus }).eq("id", categoryId)

      if (error) throw error

      await fetchCategories()
    } catch (error: any) {
      console.error("Error toggling category status:", error)
      alert(`Error updating category: ${error.message}`)
    }
  }

  const getTypeBadge = (type: string) => {
    const typeConfig = {
      food: { color: "bg-orange-100 text-orange-800", label: "Food" },
      "non-food": { color: "bg-blue-100 text-blue-800", label: "Non-Food" },
      both: { color: "bg-green-100 text-green-800", label: "Both" },
    }
    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.both
    return <Badge className={config.color}>{config.label}</Badge>
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading categories...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Manage Categories
            </CardTitle>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Category</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Category Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Electronics, Furniture"
                    />
                  </div>
                  <div>
                    <Label htmlFor="item_type">Item Type</Label>
                    <Select
                      value={formData.item_type}
                      onValueChange={(value: "food" | "non-food" | "both") =>
                        setFormData({ ...formData, item_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="food">Food Only</SelectItem>
                        <SelectItem value="non-food">Non-Food Only</SelectItem>
                        <SelectItem value="both">Both Food & Non-Food</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="icon">Icon (Emoji)</Label>
                    <Input
                      id="icon"
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      placeholder="📱"
                      maxLength={2}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label htmlFor="is_active">Active</Label>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setCreateDialogOpen(false)} className="flex-1">
                      Cancel
                    </Button>
                    <Button onClick={handleCreate} className="flex-1">
                      Create Category
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <Card key={category.id} className={`${!category.is_active ? "opacity-60" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      {category.icon && <span className="text-lg">{category.icon}</span>}
                      <h3 className="font-medium capitalize">{category.name.replace(/-/g, " ")}</h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleActive(category.id, category.is_active)}
                        className="h-6 w-6 p-0"
                      >
                        {category.is_active ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 mb-3">
                    {getTypeBadge(category.item_type)}
                    <Badge variant={category.is_active ? "default" : "secondary"}>
                      {category.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  <div className="text-xs text-gray-500 mb-3">
                    Created: {new Date(category.created_at).toLocaleDateString()}
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(category)} className="flex-1">
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(category.id, category.name)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {categories.length === 0 && (
            <div className="text-center py-12">
              <Tag className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No categories found</h3>
              <p className="text-gray-600 mb-4">Create your first category to get started.</p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_name">Category Name</Label>
              <Input
                id="edit_name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit_item_type">Item Type</Label>
              <Select
                value={formData.item_type}
                onValueChange={(value: "food" | "non-food" | "both") => setFormData({ ...formData, item_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="food">Food Only</SelectItem>
                  <SelectItem value="non-food">Non-Food Only</SelectItem>
                  <SelectItem value="both">Both Food & Non-Food</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit_icon">Icon (Emoji)</Label>
              <Input
                id="edit_icon"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="📱"
                maxLength={2}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit_is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="edit_is_active">Active</Label>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleUpdate} className="flex-1">
                Update Category
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
