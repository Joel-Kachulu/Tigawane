"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "@/contexts/LocationContext";
import { geocodeAddress } from "@/lib/locationService";
import AddItemHeader from "@/components/forms/AddItemHeader";
import PhotoStep from "@/components/forms/PhotoStep";
import DetailsStep from "@/components/forms/DetailsStep";
import LocationStep from "@/components/forms/LocationStep";
import ImpactStep from "@/components/forms/ImpactStep";
import SuccessAnimation from "@/components/forms/SuccessAnimation";
import AddItemNavigation from "@/components/forms/AddItemNavigation";

interface AddItemProps {
  itemType: "food" | "non-food";
  onItemAdded: () => void;
}

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
  pickup_label: "",
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



  const canProceedToNext = () => {
    switch (currentStep) {
      case 1:
        return true; // Image is optional but encouraged
      case 2:
        return !!(
          formData.title.trim() &&
          formData.category &&
          formData.quantity.trim() &&
          (itemType === "food" || formData.condition)
        );
      case 3:
        return !!formData.pickup_label.trim();
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
      !formData.pickup_label.trim()
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
  let imageUrl: string | null = null;

      // Upload image if provided
      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        try {
          const { error: uploadError } = await supabase.storage
            .from("item-images")
            .upload(fileName, imageFile);

          if (!uploadError) {
            const { data } = supabase.storage.from("item-images").getPublicUrl(fileName);
            imageUrl = data?.publicUrl ?? null;
          }
        } catch (uploadErr) {
          console.warn("Image upload error:", uploadErr);
        }
      }

      // Step 1: Try to geocode the pickup address entered by the user
      // Step 2: If geocoding fails, fall back to user's current GPS location
      let pickup_lat: number | null = null;
      let pickup_lon: number | null = null;
      let usedGeocoding = false;
      
      // Prepare address for geocoding - ensure it includes Malawi context if needed
      const addressToGeocode = formData.pickup_label.trim();
      
      // First, try to geocode the pickup address
      try {
        console.log('📍 Step 1: Geocoding pickup address:', addressToGeocode);
        const geo = await geocodeAddress(addressToGeocode);

        // Coerce to numbers and validate (geocoder may return strings)
        const latVal: any = (geo as any)?.latitude
        const lonVal: any = (geo as any)?.longitude

        const latNum = latVal == null ? null : Number(latVal)
        const lonNum = lonVal == null ? null : Number(lonVal)

        if (latNum === null || lonNum === null || Number.isNaN(latNum) || Number.isNaN(lonNum)) {
          throw new Error('Invalid coordinates from geocoding')
        }

        // Validate coordinate ranges
        if (latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180 || 
            (latNum === 0 && lonNum === 0)) {
          throw new Error('Coordinates out of valid range')
        }

        // Successfully geocoded!
        pickup_lat = latNum
        pickup_lon = lonNum
        usedGeocoding = true
        console.log('✅ Step 1 SUCCESS: Geocoded pickup coordinates:', { 
          lat: pickup_lat, 
          lon: pickup_lon,
          address: addressToGeocode
        });
      } catch (geoError) {
        console.warn('⚠️ Step 1 FAILED: Geocoding error:', geoError);
        console.log('📍 Step 2: Falling back to user\'s current GPS location...');
        
        // Step 2: Fall back to user's current GPS location
        if (selectedLocation && 
            typeof selectedLocation.latitude === 'number' && 
            typeof selectedLocation.longitude === 'number' &&
            selectedLocation.latitude >= -90 && selectedLocation.latitude <= 90 &&
            selectedLocation.longitude >= -180 && selectedLocation.longitude <= 180 &&
            !(selectedLocation.latitude === 0 && selectedLocation.longitude === 0)) {
          // Use GPS coordinates as fallback
          pickup_lat = selectedLocation.latitude;
          pickup_lon = selectedLocation.longitude;
          usedGeocoding = false
          console.log('✅ Step 2 SUCCESS: Using GPS coordinates as fallback:', { 
            lat: pickup_lat, 
            lon: pickup_lon 
          });
        } else {
          // Try to get current location if not already available
          console.log('📍 Attempting to get current GPS location...');
          try {
            const { getCurrentLocation } = await import('@/lib/locationService');
            const currentLoc = await getCurrentLocation();
            if (currentLoc && 
                typeof currentLoc.latitude === 'number' && 
                typeof currentLoc.longitude === 'number' &&
                currentLoc.latitude >= -90 && currentLoc.latitude <= 90 &&
                currentLoc.longitude >= -180 && currentLoc.longitude <= 180 &&
                !(currentLoc.latitude === 0 && currentLoc.longitude === 0)) {
              pickup_lat = currentLoc.latitude;
              pickup_lon = currentLoc.longitude;
              usedGeocoding = false;
              console.log('✅ Step 2 SUCCESS: Got current GPS location:', { 
                lat: pickup_lat, 
                lon: pickup_lon 
              });
            } else {
              throw new Error('Invalid GPS coordinates');
            }
          } catch (gpsError) {
            // Both geocoding and GPS failed
            console.error('❌ Both geocoding and GPS location failed:', gpsError);
            setError("Could not determine location coordinates. Please enable location services in your browser settings or enter a more specific address in format 'Location, District' (e.g., 'COM, Blantyre' or 'Area 25, Lilongwe').");
            setLoading(false);
            return;
          }
        }
      }
      
      // Final validation - ensure we have valid coordinates
      if (pickup_lat === null || pickup_lon === null || 
          isNaN(pickup_lat) || isNaN(pickup_lon) ||
          pickup_lat < -90 || pickup_lat > 90 || 
          pickup_lon < -180 || pickup_lon > 180 ||
          (pickup_lat === 0 && pickup_lon === 0)) {
        console.error('❌ Final validation failed - invalid coordinates');
        setError("Invalid location coordinates. Please try again or enable location services.");
        setLoading(false);
        return;
      }
      
      // Log final result
      console.log(`📍 Final coordinates: ${usedGeocoding ? 'Geocoded' : 'GPS fallback'}`, {
        lat: pickup_lat,
        lon: pickup_lon,
        address: addressToGeocode
      });

      // Prepare item data with pickup location
      const itemData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        category: formData.category,
        item_type: itemType,
        quantity: formData.quantity.trim(),
        pickup_label: formData.pickup_label.trim(),
        pickup_lat,
        pickup_lon,
        pickup_location: formData.pickup_label.trim(), // for backward compatibility
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
          pickup_label: "",
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
    return <SuccessAnimation itemType={itemType} />;
  }

  return (
    <div className="max-w-2xl mx-auto bg-white min-h-screen">
      <AddItemHeader itemType={itemType} currentStep={currentStep} />

      {/* Form Content */}
      <div className="p-4">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            <strong>Oops!</strong> {error}
          </div>
        )}

        {/* Step 1: Photo */}
        {currentStep === 1 && (
          <PhotoStep
            itemType={itemType}
            imagePreview={imagePreview}
            onImageChange={handleImageChange}
          />
        )}

        {/* Step 2: Details */}
        {currentStep === 2 && (
          <DetailsStep
            itemType={itemType}
            formData={formData}
            onFormDataChange={(data) => setFormData({ ...formData, ...data })}
            getCategories={getCategories}
            conditions={conditions}
          />
        )}

        {/* Step 3: Location */}
        {currentStep === 3 && (
          <LocationStep
            formData={formData}
            onFormDataChange={(data) => setFormData({ ...formData, ...data })}
            selectedLocation={selectedLocation}
          />
        )}

        {/* Step 4: Impact */}
        {currentStep === 4 && (
          <ImpactStep
            formData={formData}
            onFormDataChange={(data) => setFormData({ ...formData, ...data })}
            collaborations={collaborations}
            imagePreview={imagePreview}
            getCategoryIcon={getCategoryIcon}
          />
        )}
      </div>

      {/* Navigation Buttons */}
      <AddItemNavigation
        currentStep={currentStep}
        canProceed={canProceedToNext()}
        loading={loading}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
