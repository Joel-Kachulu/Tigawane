"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "@/contexts/LocationContext";
import { geocodeAddress, getCityCoordinates } from "@/lib/locationService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Camera,
  Package,
  MapPin,
  Heart,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Sparkles,
  Users,
  Globe,
} from "lucide-react";
import Image from "next/image";

interface AddItemProps {
  itemType: "food" | "non-food";
  onItemAdded: () => void;
}

const STEPS = [
  { id: 1, title: "Photo", icon: Camera, description: "Show your item" },
  {
    id: 2,
    title: "Details",
    icon: Package,
    description: "What are you sharing?",
  },
  { id: 3, title: "Location", icon: MapPin, description: "Where to collect" },
  { id: 4, title: "Impact", icon: Heart, description: "Choose destination" },
];

export default function AddItem({ itemType, onItemAdded }: AddItemProps) {
  const { user } = useAuth();
  const { selectedLocation } = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
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
    collaboration_id: null as string | null,
  });
  const [collaborations, setCollaborations] = useState<any[]>([]);
  const [loadingCollaborations, setLoadingCollaborations] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Fetch collaborations on component mount
  useEffect(() => {
    const fetchCollaborations = async () => {
      setLoadingCollaborations(true);
      try {
        const { data, error } = await supabase
          .from("collaboration_requests")
          .select("id, title, status")
          .eq("status", "active")
          .order("created_at", { ascending: false });

        if (error) {
          console.warn("Could not fetch collaborations:", error);
          setCollaborations([]);
        } else {
          setCollaborations(data || []);
        }
      } catch (error) {
        console.warn("Error fetching collaborations:", error);
        setCollaborations([]);
      } finally {
        setLoadingCollaborations(false);
      }
    };

    fetchCollaborations();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      // Food categories
      fruits: "🍎",
      vegetables: "🥕",
      grains: "🌾",
      dairy: "🥛",
      meat: "🍖",
      prepared: "🍽️",
      // Non-food categories
      clothing: "👕",
      shoes: "👟",
      household: "🏠",
      electronics: "📱",
      books: "📚",
      toys: "🧸",
      "baby-items": "🍼",
      other: "📦",
    };
    return icons[category] || "📦";
  };

  const getCategories = () => {
    if (itemType === "food") {
      return [
        { value: "fruits", label: "Fresh Fruits", icon: "🍎" },
        { value: "vegetables", label: "Vegetables", icon: "🥕" },
        { value: "grains", label: "Grains & Rice", icon: "🌾" },
        { value: "dairy", label: "Dairy Products", icon: "🥛" },
        { value: "meat", label: "Meat & Fish", icon: "🍖" },
        { value: "prepared", label: "Prepared Food", icon: "🍽️" },
        { value: "other", label: "Other Food", icon: "🥗" },
      ];
    } else {
      return [
        { value: "clothing", label: "Clothing", icon: "👕" },
        { value: "shoes", label: "Shoes", icon: "👟" },
        { value: "household", label: "Household Items", icon: "🏠" },
        { value: "electronics", label: "Electronics", icon: "📱" },
        { value: "books", label: "Books", icon: "📚" },
        { value: "toys", label: "Toys & Games", icon: "🧸" },
        { value: "baby-items", label: "Baby Items", icon: "🍼" },
        { value: "other", label: "Other Items", icon: "📦" },
      ];
    }
  };

  const conditions = [
    { value: "new", label: "Brand New", description: "Never used" },
    {
      value: "excellent",
      label: "Excellent",
      description: "Like new condition",
    },
    { value: "good", label: "Good", description: "Minor wear" },
    { value: "fair", label: "Fair", description: "Some wear but functional" },
    {
      value: "needs-repair",
      label: "Needs Repair",
      description: "Fixable issues",
    },
    { value: "old", label: "Old", description: "Well-used but working" },
  ];

  const areaOptions = [
    "area 18",
    "area 25",
    "area 23",
    "area 43",
    "area 30",
    "area 15",
    "area 14",
    "area 49",
    "Chilinde",
    "Kawale",
  ];

  const canProceedToNext = () => {
    switch (currentStep) {
      case 1:
        return true; // Image is optional but encouraged
      case 2:
        return (
          formData.title.trim() &&
          formData.category &&
          formData.quantity.trim() &&
          (itemType === "food" || formData.condition)
        );
      case 3:
        return formData.pickup_location.trim() && formData.area;
      case 4:
        return true; // Impact step has default values
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (canProceedToNext() && currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setError(null);

    if (!user) {
      setError("Please sign in to share items");
      return;
    }

    // Final validation
    if (
      !formData.title.trim() ||
      !formData.category ||
      !formData.quantity.trim() ||
      !formData.pickup_location.trim() ||
      !formData.area
    ) {
      setError("Please fill in all required fields");
      return;
    }

    if (itemType === "non-food" && !formData.condition) {
      setError("Please select condition for non-food items");
      return;
    }

    setLoading(true);

    try {
      let imageUrl = null;

      // Upload image if provided
      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        try {
          const { error: uploadError } = await supabase.storage
            .from("item-images")
            .upload(fileName, imageFile);

          if (!uploadError) {
            const {
              data: { publicUrl },
            } = supabase.storage.from("item-images").getPublicUrl(fileName);
            imageUrl = publicUrl;
          }
        } catch (uploadErr) {
          console.warn("Image upload error:", uploadErr);
        }
      }

      // Get location coordinates
      let latitude = null;
      let longitude = null;
      
      if (selectedLocation) {
        latitude = selectedLocation.latitude;
        longitude = selectedLocation.longitude;
      } else if (formData.area) {
        // Try to get coordinates from the selected area/city
        const cityLocation = getCityCoordinates(formData.area);
        if (cityLocation) {
          latitude = cityLocation.latitude;
          longitude = cityLocation.longitude;
        }
      }

      // Prepare item data
      const itemData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        category: formData.category,
        item_type: itemType,
        quantity: formData.quantity.trim(),
        pickup_location: formData.pickup_location.trim(),
        latitude,
        longitude,
        user_id: user.id,
        status: "available",
        collaboration_id: formData.collaboration_id,
        image_url: imageUrl,
        expiry_date:
          itemType === "food" && formData.expiry_date
            ? formData.expiry_date
            : null,
        condition:
          itemType === "non-food" && formData.condition
            ? formData.condition
            : null,
        area: formData.area,
        is_anonymous: formData.is_anonymous,
      };

      const { data, error: insertError } = await supabase
        .from("items")
        .insert(itemData)
        .select();

      if (insertError) {
        throw insertError;
      }

      // Show success animation
      setShowSuccess(true);

      // Wait for animation then reset
      setTimeout(() => {
        setShowSuccess(false);
        setCurrentStep(1);
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
          collaboration_id: null,
        });
        setImageFile(null);
        setImagePreview(null);
        onItemAdded();
      }, 3000);
    } catch (error: any) {
      console.error("Error adding item:", error);
      setError(`Failed to share item: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Success animation overlay
  if (showSuccess) {
    return (
      <div className="fixed inset-0 bg-green-50 flex items-center justify-center z-50">
        <div className="text-center space-y-6 animate-bounce">
          <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto">
            <Sparkles className="w-12 h-12 text-white animate-pulse" />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-green-700">Amazing! 🎉</h2>
            <p className="text-lg text-green-600">
              You've helped someone in your neighborhood!
            </p>
            <p className="text-sm text-green-500">
              {itemType === "food"
                ? "Food rescued from waste"
                : "Item given new life"}{" "}
              ✨
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white min-h-screen">
      {/* Header with Progress */}
      <div className="sticky top-0 bg-white border-b border-gray-100 p-4 z-10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">
            Share {itemType === "food" ? "Food" : "Items"}
          </h1>
          <div className="text-sm text-gray-500">{currentStep}/4</div>
        </div>

        {/* Progress Bar */}
        <div className="flex space-x-2">
          {STEPS.map((step, index) => (
            <div
              key={step.id}
              className={`flex-1 h-2 rounded-full transition-all duration-300 ${
                currentStep > step.id
                  ? "bg-green-500"
                  : currentStep === step.id
                    ? "bg-green-300"
                    : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        {/* Current Step Info */}
        <div className="mt-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-2">
            {React.createElement(STEPS[currentStep - 1].icon, {
              className: "w-5 h-5 text-green-600",
            })}
            <h2 className="text-lg font-semibold text-gray-900">
              {STEPS[currentStep - 1].title}
            </h2>
          </div>
          <p className="text-sm text-gray-600">
            {STEPS[currentStep - 1].description}
          </p>
        </div>
      </div>

      {/* Form Content */}
      <div className="p-4">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            <strong>Oops!</strong> {error}
          </div>
        )}

        {/* Step 1: Photo */}
        {currentStep === 1 && (
          <div className="space-y-6 py-6">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">Add a photo</h3>
              <p className="text-gray-600 text-sm mb-6">
                A good photo helps people connect with your{" "}
                {itemType === "food" ? "food" : "item"}
              </p>
            </div>

            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                id="image-upload"
              />
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                  imagePreview
                    ? "border-green-300 bg-green-50"
                    : "border-gray-300 bg-gray-50"
                }`}
              >
                {imagePreview ? (
                  <div className="space-y-4">
                    <Image
                      src={imagePreview}
                      alt="Preview"
                      width={200}
                      height={200}
                      className="mx-auto rounded-lg object-cover"
                    />
                    <p className="text-green-600 font-medium">Perfect! 📸</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Camera className="w-12 h-12 text-gray-400 mx-auto" />
                    <div>
                      <p className="font-medium text-gray-900">
                        Tap to add photo
                      </p>
                      <p className="text-sm text-gray-500">
                        Optional but recommended
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Details */}
        {currentStep === 2 && (
          <div className="space-y-6 py-6">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">
                Tell us about your {itemType}
              </h3>
              <p className="text-gray-600 text-sm mb-6">
                Help others understand what you're sharing
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="title" className="text-base font-medium">
                  What are you sharing? *
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder={
                    itemType === "food"
                      ? "e.g., Fresh tomatoes"
                      : "e.g., Men's running shoes"
                  }
                  className="mt-2 text-base h-12"
                />
              </div>

              <div>
                <Label className="text-base font-medium">Category *</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {getCategories().map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, category: cat.value })
                      }
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        formData.category === cat.value
                          ? "border-green-500 bg-green-50"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <div className="text-2xl mb-1">{cat.icon}</div>
                      <div className="text-sm font-medium">{cat.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="quantity" className="text-base font-medium">
                  Quantity *
                </Label>
                <Input
                  id="quantity"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity: e.target.value })
                  }
                  placeholder={
                    itemType === "food"
                      ? "e.g., 2 kg, 5 pieces"
                      : "e.g., 1 pair, 3 items"
                  }
                  className="mt-2 text-base h-12"
                />
              </div>

              {itemType === "non-food" && (
                <div>
                  <Label className="text-base font-medium">Condition *</Label>
                  <div className="space-y-2 mt-2">
                    {conditions.map((condition) => (
                      <button
                        key={condition.value}
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            condition: condition.value,
                          })
                        }
                        className={`w-full p-3 rounded-lg border text-left transition-all ${
                          formData.condition === condition.value
                            ? "border-green-500 bg-green-50"
                            : "border-gray-200 bg-white"
                        }`}
                      >
                        <div className="font-medium">{condition.label}</div>
                        <div className="text-sm text-gray-600">
                          {condition.description}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {itemType === "food" && (
                <div>
                  <Label
                    htmlFor="expiry_date"
                    className="text-base font-medium"
                  >
                    Best before (optional)
                  </Label>
                  <Input
                    id="expiry_date"
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) =>
                      setFormData({ ...formData, expiry_date: e.target.value })
                    }
                    className="mt-2 text-base h-12"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="description" className="text-base font-medium">
                  Additional details (optional)
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Any special notes..."
                  rows={3}
                  className="mt-2 text-base"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Location */}
        {currentStep === 3 && (
          <div className="space-y-6 py-6">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">
                Where can people collect?
              </h3>
              <p className="text-gray-600 text-sm mb-6">
                Help people find you easily
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label
                  htmlFor="pickup_location"
                  className="text-base font-medium"
                >
                  Pickup location *
                </Label>
                <Input
                  id="pickup_location"
                  value={formData.pickup_location}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pickup_location: e.target.value,
                    })
                  }
                  placeholder="e.g., Near Area 25 Market"
                  className="mt-2 text-base h-12"
                />
              </div>

              <div>
                <Label className="text-base font-medium">Area/Township *</Label>
                <Select
                  value={formData.area}
                  onValueChange={(value) =>
                    setFormData({ ...formData, area: value })
                  }
                >
                  <SelectTrigger className="mt-2 text-base h-12">
                    <SelectValue placeholder="Choose your area" />
                  </SelectTrigger>
                  <SelectContent>
                    {areaOptions.map((area) => (
                      <SelectItem key={area} value={area}>
                        {area.charAt(0).toUpperCase() + area.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_anonymous"
                    checked={formData.is_anonymous}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_anonymous: checked })
                    }
                  />
                  <Label htmlFor="is_anonymous" className="text-base">
                    Share anonymously
                  </Label>
                </div>
                <p className="text-sm text-blue-600 mt-2">
                  Your name won't be shown to others
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Impact */}
        {currentStep === 4 && (
          <div className="space-y-6 py-6">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">Choose your impact</h3>
              <p className="text-gray-600 text-sm mb-6">
                Who would you like to help?
              </p>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() =>
                  setFormData({ ...formData, collaboration_id: null })
                }
                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                  !formData.collaboration_id
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Globe className="w-6 h-6 text-blue-500" />
                  <div>
                    <div className="font-medium">Public Donation</div>
                    <div className="text-sm text-gray-600">
                      Available to everyone in your area
                    </div>
                  </div>
                </div>
              </button>

              {collaborations.map((collaboration) => (
                <button
                  key={collaboration.id}
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      collaboration_id: collaboration.id,
                    })
                  }
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    formData.collaboration_id === collaboration.id
                      ? "border-green-500 bg-green-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Users className="w-6 h-6 text-purple-500" />
                    <div>
                      <div className="font-medium">{collaboration.title}</div>
                      <div className="text-sm text-gray-600">
                        Specific cause or community project
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Preview Card */}
            <div className="mt-8">
              <h4 className="font-medium mb-3">Preview of your listing:</h4>
              <Card className="border-2 border-green-200">
                <CardContent className="p-4">
                  <div className="flex space-x-3">
                    {imagePreview ? (
                      <Image
                        src={imagePreview}
                        alt="Preview"
                        width={60}
                        height={60}
                        className="rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-15 h-15 bg-gray-200 rounded-lg flex items-center justify-center">
                        <span className="text-2xl">
                          {getCategoryIcon(formData.category)}
                        </span>
                      </div>
                    )}
                    <div className="flex-1">
                      <h5 className="font-medium">
                        {formData.title || "Your item title"}
                      </h5>
                      <p className="text-sm text-gray-600">
                        {formData.quantity || "Quantity"}
                      </p>
                      <p className="text-sm text-green-600">
                        📍 {formData.area || "Your area"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4">
        <div className="flex space-x-3">
          {currentStep > 1 && (
            <Button
              variant="outline"
              onClick={handlePrevious}
              className="flex-1 h-12 text-base"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}

          {currentStep < 4 ? (
            <Button
              onClick={handleNext}
              disabled={!canProceedToNext()}
              className={`h-12 text-base font-medium ${
                currentStep === 1 ? "w-full" : "flex-1"
              } bg-green-600 hover:bg-green-700 disabled:opacity-50`}
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={loading || !canProceedToNext()}
              className="flex-1 h-12 text-base font-medium bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Sharing...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Heart className="w-4 h-4" />
                  <span>Share with Community</span>
                </div>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
