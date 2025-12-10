"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { useLocation } from "@/contexts/LocationContext"
import { formatDistance } from "@/lib/locationService"
import { fetchProfiles, invalidateCache } from "@/lib/dataFetching"
import { itemsCache, generateCacheKey, CACHE_TTL } from "@/lib/cache"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CalendarDays, MapPin, Package, Search, Filter, Plus, Eye, Edit, Trash2, Image as ImageIcon, AlertCircle } from "lucide-react";
import ClaimFoodModal from "./ClaimFoodModal"
import EditItemModal from "./EditItemModal"
import ImageWithFallback from "./ImageWithFallback"



interface ItemRecord {
  id: string
  title: string
  description: string | null
  category: string
  item_type: "food" | "non-food"
  quantity: string
  condition?: string | null
  expiry_date?: string | null
  pickup_location: string
  image_url: string | null
  user_id: string
  status: string
  created_at: string
  collaboration_id?: string | null
  pickup_lat?: number | null
  pickup_lon?: number | null
  pickup_label?: string | null
  distance_m?: number | null
  profiles?: {
    full_name: string | null
    location: string | null
  }
}

interface ItemListProps {
  itemType: "food" | "non-food"
  collaborationId?: string | null
}

// Utility function to calculate expiry urgency
const getExpiryUrgency = (expiryDate: string) => {
  const now = new Date();
  const expiry = new Date(expiryDate);
  const hoursUntilExpiry = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  if (hoursUntilExpiry < 0) {
    return { level: 'expired', color: 'red', text: 'Expired' };
  } else if (hoursUntilExpiry <= 24) {
    return { level: 'urgent', color: 'red', text: 'Expires today' };
  } else if (hoursUntilExpiry <= 72) {
    return { level: 'soon', color: 'amber', text: 'Expires soon' };
  } else {
    return { level: 'fresh', color: 'green', text: 'Fresh' };
  }
};

// Memoize expensive calculations
const ItemList = React.memo(function ItemList({ itemType, collaborationId }: ItemListProps) {
  const { user } = useAuth()
  const { selectedLocation, locationRadius } = useLocation()
  const [items, setItems] = useState<ItemRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<ItemRecord | null>(null)
  const [editingItem, setEditingItem] = useState<ItemRecord | null>(null)
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
    ? ["fruits", "vegetables", "meat", "dairy", "grains", "prepared", "other"]
    : ["clothing", "shoes", "household", "electronics", "books", "toys", "baby-items", "other"]

  // Helper function to format category display names
  const formatCategoryName = (category: string) => {
    if (category === "baby-items") return "Baby Items";
    if (category === "prepared") return "Prepared Food";
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  // Refs to prevent concurrent fetches and track debouncing
  const isFetchingRef = useRef(false);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchParamsRef = useRef<string>('');

  // Memoize fetchItems to prevent infinite loops
  const fetchItems = useCallback(async (reset = false) => {
    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      console.log('⏸️ Fetch already in progress, skipping...');
      return;
    }

    // Create a unique key for this fetch to detect duplicate calls
    const fetchKey = `${itemType}-${collaborationId || 'none'}-${searchTerm}-${categoryFilter}-${statusFilter}-${selectedLocation?.latitude}-${selectedLocation?.longitude}-${locationRadius}`;
    
    // Skip if this exact fetch was just called
    if (fetchKey === lastFetchParamsRef.current && !reset) {
      console.log('⏸️ Duplicate fetch request, skipping...');
      return;
    }
    
    // Check cache first (only for non-reset fetches)
    if (!reset && selectedLocation) {
      const cacheKey = generateCacheKey('items', {
        itemType,
        collaborationId: collaborationId || 'none',
        searchTerm,
        categoryFilter,
        statusFilter,
        lat: selectedLocation.latitude,
        lon: selectedLocation.longitude,
        radius: locationRadius || 10,
      });
      
      const cached = itemsCache.get<ItemRecord[]>(cacheKey);
      if (cached) {
        console.log('✅ Using cached items');
        setItems(cached);
        setLoading(false);
        isFetchingRef.current = false;
        // Still fetch profiles for cached items
        const userIds = [...new Set(cached.map(item => item.user_id))] as string[];
        if (userIds.length > 0) {
          const profilesData = await fetchProfiles(userIds);
          setProfiles(profilesData);
        }
        return;
      }
    }
    
    lastFetchParamsRef.current = fetchKey;
    isFetchingRef.current = true;
    setLoading(true);
  try {
      // Validate location parameters before making the RPC call
      if (!selectedLocation || typeof selectedLocation.latitude !== 'number' || typeof selectedLocation.longitude !== 'number') {
        console.warn('⚠️ Location not set - items require location to be displayed');
        setItems([]);
        setLoading(false);
        isFetchingRef.current = false;
        return;
      }
      
      const pageToFetch = reset ? 0 : currentPage;
      const radius = locationRadius || 10;
      
      // Validate coordinates are not 0,0 (null island) and are within valid ranges
      const lat = selectedLocation.latitude;
      const lon = selectedLocation.longitude;
      
      if (isNaN(lat) || isNaN(lon) || isNaN(radius) ||
          lat === 0 && lon === 0 ||
          lat < -90 || lat > 90 || 
          lon < -180 || lon > 180) {
        console.error('❌ Invalid location coordinates:', {
          latitude: lat,
          longitude: lon,
          radius,
          issue: lat === 0 && lon === 0 ? 'Null island (0,0)' : 'Out of range'
        });
        setItems([]);
        setLoading(false);
        isFetchingRef.current = false;
        return;
      }
      console.log('[RPC DEBUG] Calling get_items_nearby with:', {
        lat: selectedLocation.latitude,
        lon: selectedLocation.longitude,
        radius_km: radius,
        limit_count: itemsPerPage * 2,
        item_type_filter: itemType
      });
      // Try RPC first, but fallback to direct query if it fails
      let data: ItemRecord[] | null = null;
      let useFallback = false;
      
      try {
        const result = await supabase.rpc("get_items_nearby", {
          lat: selectedLocation.latitude,
          lon: selectedLocation.longitude,
          radius_km: radius,
          limit_count: itemsPerPage * 2,
          item_type_filter: itemType
        });
        
        if (result.error) {
          // Check if function doesn't exist or has wrong signature
          const errorCode = result.error.code;
          const errorMessage = result.error.message || '';
          const isFunctionError = errorCode === '42883' || 
                                  errorCode === 'P0001' || 
                                  errorMessage.includes('function') ||
                                  errorMessage.includes('does not exist');
          
          if (isFunctionError) {
            console.warn('⚠️ RPC function get_items_nearby not available. Using fallback method.');
            useFallback = true;
          } else {
            console.warn('⚠️ RPC call failed:', result.error.message || result.error);
            useFallback = true;
          }
        } else if (result.data) {
          // RPC succeeded
          data = result.data as ItemRecord[];
          console.log(`✅ RPC query successful: ${data.length} items found`);
        } else {
          // No data but no error - might be empty result
          data = [];
        }
      } catch (rpcError: any) {
        // Catch any unexpected errors from the RPC call
        console.warn('⚠️ RPC call threw exception, using fallback:', rpcError?.message || rpcError);
        useFallback = true;
      }
      
      // Use fallback if RPC failed or function doesn't exist
      if (useFallback || !data) {
        console.log('🔄 Using fallback: direct query with manual distance calculation...');
        try {
          // Optimize query: only select needed fields instead of *
          const fallbackResult = await supabase
            .from("items")
            .select("id, title, description, category, item_type, quantity, condition, expiry_date, pickup_location, image_url, user_id, status, created_at, collaboration_id, pickup_lat, pickup_lon, pickup_label")
            .eq("item_type", itemType)
            .in("status", ["available", "requested"])
            .not("pickup_lat", "is", null)
            .not("pickup_lon", "is", null)
            .neq("pickup_lat", 0) // Exclude null island (0,0)
            .neq("pickup_lon", 0) // Exclude null island (0,0)
            .limit(itemsPerPage * 10); // Fetch more for filtering
          
          console.log(`[FALLBACK] Fetched ${fallbackResult.data?.length || 0} items from database`);
          
          if (fallbackResult.error) {
            console.error('❌ Fallback query failed:', fallbackResult.error);
            setItems([]);
            setHasMore(false);
            setLoading(false);
            return;
          }
          
          // Calculate distances manually for fallback results
          const locationService = await import('@/lib/locationService');
          const itemsWithDistance: ItemRecord[] = (fallbackResult.data || [])
            .map(item => {
              if (!item.pickup_lat || !item.pickup_lon) {
                console.warn(`[FALLBACK] Item ${item.id} missing coordinates`);
                return null;
              }
              
              // Validate coordinates
              const lat = Number(item.pickup_lat);
              const lon = Number(item.pickup_lon);
              if (isNaN(lat) || isNaN(lon) || lat === 0 && lon === 0) {
                console.warn(`[FALLBACK] Item ${item.id} has invalid coordinates: ${lat}, ${lon}`);
                return null;
              }
              
              // Additional validation: check coordinate ranges
              if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
                console.warn(`[FALLBACK] Item ${item.id} has out-of-range coordinates: ${lat}, ${lon}`);
                return null;
              }
              
              const distanceKm = locationService.calculateDistance(
                selectedLocation.latitude,
                selectedLocation.longitude,
                lat,
                lon
              );
              
              const distanceM = distanceKm * 1000; // Convert to meters
              
              return {
                ...item,
                distance_m: distanceM
              } as ItemRecord;
            })
            .filter((item): item is ItemRecord => {
              if (!item) return false;
              // Filter by radius (in meters)
              const withinRadius = (item.distance_m || 0) <= (radius * 1000);
              if (!withinRadius) {
                console.log(`[FALLBACK] Item ${item.id} outside radius: ${(item.distance_m || 0) / 1000}km > ${radius}km`);
              }
              return withinRadius;
            })
            .sort((a, b) => (a.distance_m || 0) - (b.distance_m || 0))
            .slice(0, itemsPerPage * 2); // Limit results
          
          console.log(`✅ Fallback query successful: ${itemsWithDistance.length} items found within ${radius}km of (${selectedLocation.latitude.toFixed(4)}, ${selectedLocation.longitude.toFixed(4)})`);
          data = itemsWithDistance;
        } catch (fallbackError: any) {
          console.error('❌ Fallback query failed:', fallbackError);
          setItems([]);
          setHasMore(false);
          setLoading(false);
          return;
        }
      }
      
      if (!data) {
        // If we still don't have data, give up
        setItems([]);
        setHasMore(false);
        setLoading(false);
        isFetchingRef.current = false;
        return;
      }
      // Filter and validate items
      let filteredData = (data || [])
        .filter(item => {
          // Additional validation: ensure item has valid coordinates and distance
          if (!item.pickup_lat || !item.pickup_lon) {
            console.warn('⚠️ Item missing coordinates:', item.id, item.title);
            return false;
          }
          if (item.pickup_lat === 0 && item.pickup_lon === 0) {
            console.warn('⚠️ Item has null island coordinates (0,0):', item.id, item.title);
            return false;
          }
          if (item.distance_m === null || item.distance_m === undefined) {
            console.warn('⚠️ Item missing distance:', item.id, item.title);
            return false;
          }
          // Ensure distance is within radius (in meters) - but allow a small buffer for rounding
          if (item.distance_m > (radius * 1000) + 100) { // 100m buffer for rounding
            console.log('📍 Item outside radius:', item.title, `${(item.distance_m / 1000).toFixed(2)}km > ${radius}km`);
            return false;
          }
          return true;
        })
        .filter(item => item.item_type === itemType)
        .filter(item =>
          (!collaborationId && !item.collaboration_id) ||
          (collaborationId && item.collaboration_id === collaborationId)
        );
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredData = filteredData.filter(item =>
          (item.title && item.title.toLowerCase().includes(term)) ||
          (item.description && item.description.toLowerCase().includes(term))
        );
      }
      if (categoryFilter !== "all") {
        filteredData = filteredData.filter(item => item.category === categoryFilter);
      }
      if (statusFilter !== "all") {
        filteredData = filteredData.filter(item => item.status === statusFilter);
      }
      // Sort by distance_m
      filteredData.sort((a, b) => (a.distance_m || 0) - (b.distance_m || 0));
      if (reset) {
        setItems(filteredData);
        setCurrentPage(0);
      } else {
        setItems(prev => [...prev, ...filteredData]);
      }
      setHasMore(filteredData.length === itemsPerPage);
      
      // Cache the results
      if (selectedLocation) {
        const cacheKey = generateCacheKey('items', {
          itemType,
          collaborationId: collaborationId || 'none',
          searchTerm,
          categoryFilter,
          statusFilter,
          lat: selectedLocation.latitude,
          lon: selectedLocation.longitude,
          radius: locationRadius || 10,
        });
        itemsCache.set(cacheKey, filteredData, CACHE_TTL.ITEMS);
      }
      
      // Fetch user profiles for items using optimized caching
      if (filteredData && filteredData.length > 0) {
        const userIds = [...new Set(filteredData.map(item => item.user_id))] as string[];
        const profilesData = await fetchProfiles(userIds);
        setProfiles(profilesData);
        if (user) {
          await fetchRequestCounts(filteredData.filter(item => item.user_id === user.id));
        }
      }
    } catch (error: any) {
      // Log error with more detail if possible
      if (error && typeof error === 'object') {
        console.error(`❌ Error fetching ${itemType} items (catch):`, error.message || error, error.stack || '');
      } else {
        console.error(`❌ Error fetching ${itemType} items (catch):`, error);
      }
      setItems([]);
      setHasMore(false);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [itemType, collaborationId, searchTerm, categoryFilter, statusFilter, selectedLocation?.latitude, selectedLocation?.longitude, locationRadius, user]);

  // Debounced effect to fetch items when dependencies change
  useEffect(() => {
    // Clear any pending fetch
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    // Debounce the fetch to prevent rapid successive calls
    fetchTimeoutRef.current = setTimeout(() => {
      fetchItems(true);
    }, 300); // 300ms debounce

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [itemType, collaborationId, searchTerm, categoryFilter, statusFilter, selectedLocation?.latitude, selectedLocation?.longitude, locationRadius, fetchItems]);

  // Auto-refresh items when tab becomes visible again
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && !isFetchingRef.current) {
        fetchItems(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchItems]);

  // Real-time subscription for new items
  useEffect(() => {
    if (!selectedLocation || !selectedLocation.latitude || !selectedLocation.longitude) {
      return;
    }

    // Create unique channel name
    const channelName = `items:${itemType}:${Date.now()}`;
    
    console.log(`📡 Setting up real-time subscription for ${itemType} items:`, channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'items',
          filter: `item_type=eq.${itemType}`,
        },
        async (payload) => {
          const newItem = payload.new as ItemRecord;
          console.log('🆕 New item received via real-time:', newItem.id, newItem.title);

          // Check if item matches current filters and location
          if (newItem.status !== 'available' && newItem.status !== 'requested') {
            return; // Skip if not available/requested
          }

          // Check collaboration filter
          if (collaborationId && newItem.collaboration_id !== collaborationId) {
            return; // Skip if collaboration doesn't match
          }
          if (!collaborationId && newItem.collaboration_id) {
            return; // Skip if item has collaboration but we're not filtering by one
          }

          // Check if item has valid coordinates
          if (!newItem.pickup_lat || !newItem.pickup_lon || 
              newItem.pickup_lat === 0 && newItem.pickup_lon === 0) {
            return; // Skip items without valid coordinates
          }

          // Calculate distance to user's location
          try {
            const locationService = await import('@/lib/locationService');
            const distanceKm = locationService.calculateDistance(
              selectedLocation.latitude,
              selectedLocation.longitude,
              Number(newItem.pickup_lat),
              Number(newItem.pickup_lon)
            );
            const distanceM = distanceKm * 1000;
            const radius = locationRadius || 10;

            // Only add if within radius
            if (distanceM > (radius * 1000)) {
              console.log(`📍 New item outside radius: ${distanceKm.toFixed(2)}km > ${radius}km`);
              return;
            }

            // Check search term filter
            if (searchTerm) {
              const term = searchTerm.toLowerCase();
              const matchesSearch = 
                (newItem.title && newItem.title.toLowerCase().includes(term)) ||
                (newItem.description && newItem.description.toLowerCase().includes(term));
              if (!matchesSearch) {
                return;
              }
            }

            // Check category filter
            if (categoryFilter !== 'all' && newItem.category !== categoryFilter) {
              return;
            }

            // Check status filter
            if (statusFilter !== 'all' && newItem.status !== statusFilter) {
              return;
            }

            // Add distance to item
            const itemWithDistance: ItemRecord = {
              ...newItem,
              distance_m: distanceM,
            };

            // Add item to the list (at the beginning since it's sorted by distance)
            setItems((prev) => {
              // Check if item already exists (prevent duplicates)
              if (prev.some(item => item.id === newItem.id)) {
                return prev;
              }
              
              // Insert new item in correct position (sorted by distance)
              const newList = [...prev, itemWithDistance];
              newList.sort((a, b) => (a.distance_m || 0) - (b.distance_m || 0));
              return newList;
            });

            // Fetch profile for the new item using optimized caching
            if (newItem.user_id) {
              const newProfiles = await fetchProfiles([newItem.user_id]);
              setProfiles(prev => ({ ...prev, ...newProfiles }));
            }

            console.log('✅ New item added to list:', newItem.title);
          } catch (error) {
            console.error('❌ Error processing new item:', error);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'items',
          filter: `item_type=eq.${itemType}`,
        },
        async (payload) => {
          const updatedItem = payload.new as ItemRecord;
          console.log('📝 Item updated via real-time:', updatedItem.id);

          // Update item in the list if it exists
          setItems((prev) => {
            const itemIndex = prev.findIndex(item => item.id === updatedItem.id);
            if (itemIndex === -1) {
              // Item not in list, might need to be added (if it now matches filters)
              // For simplicity, just refresh the list
              if (!isFetchingRef.current) {
                setTimeout(() => fetchItems(true), 500);
              }
              return prev;
            }

            // Check if item should still be in the list based on filters
            const shouldKeep = 
              (updatedItem.status === 'available' || updatedItem.status === 'requested') &&
              (!searchTerm || 
                (updatedItem.title && updatedItem.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (updatedItem.description && updatedItem.description.toLowerCase().includes(searchTerm.toLowerCase()))) &&
              (categoryFilter === 'all' || updatedItem.category === categoryFilter) &&
              (statusFilter === 'all' || updatedItem.status === statusFilter);

            if (!shouldKeep) {
              // Remove item if it no longer matches filters
              return prev.filter(item => item.id !== updatedItem.id);
            }

            // Update the item
            const newList = [...prev];
            newList[itemIndex] = {
              ...updatedItem,
              distance_m: prev[itemIndex].distance_m, // Preserve distance
            };
            return newList;
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'items',
          filter: `item_type=eq.${itemType}`,
        },
        (payload) => {
          const deletedItemId = payload.old.id;
          console.log('🗑️ Item deleted via real-time:', deletedItemId);

          // Invalidate cache when item is deleted
          invalidateCache('items');
          setItems((prev) => prev.filter(item => item.id !== deletedItemId));
        }
      )
      .subscribe((status) => {
        console.log(`📡 Items subscription status:`, status);
      });

    return () => {
      console.log('🧹 Cleaning up items subscription:', channelName);
      channel.unsubscribe();
    };
  }, [itemType, collaborationId, selectedLocation?.latitude, selectedLocation?.longitude, locationRadius, searchTerm, categoryFilter, statusFilter, fetchItems]);

  // fetchProfiles is now imported from @/lib/dataFetching for optimized caching

  const fetchRequestCounts = async (ownerItems: ItemRecord[]) => {
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
      {/* Search and Filters - Mobile Optimized */}
      <div className="space-y-4">
        {/* Search Bar - Full Width on Mobile */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <Input
            placeholder={`Search ${itemType} items...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 pr-4 py-4 text-base mobile-text-base rounded-xl border-2 border-gray-200 focus:border-green-500 transition-colors w-full"
          />
        </div>
        
        {/* Filters - Horizontal Scroll on Mobile */}
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide md:justify-start">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="min-w-[140px] h-12 px-4 rounded-xl border-2 border-gray-200 bg-white hover:border-green-300 transition-colors">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category}>{formatCategoryName(category)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="min-w-[120px] h-12 px-4 rounded-xl border-2 border-gray-200 bg-white hover:border-green-300 transition-colors">
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
      </div>

      {/* Items Grid */}
      {!selectedLocation || typeof selectedLocation.latitude !== 'number' || typeof selectedLocation.longitude !== 'number' ? (
        <Card>
          <CardContent className="p-8 text-center">
            <MapPin className="h-12 w-12 mx-auto mb-4 text-orange-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Location Required
            </h3>
            <p className="text-gray-600 mb-4">
              Please set your location using the Location Selector to see nearby {itemType} items. 
              Items are filtered by distance from your location.
            </p>
            <p className="text-sm text-gray-500">
              Click the location button in the top right to set your location.
            </p>
          </CardContent>
        </Card>
      ) : filteredItems.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm
                ? `${searchTerm} not available, be the first to share`
                : `No ${itemType} items found`}
            </h3>
            <p className="text-gray-600">
              {searchTerm
                ? null
                : collaborationId
                  ? "No items have been shared with this collaboration yet. Be the first to share something with your group!"
                  : `Looks like there are no ${itemType} items nearby. Be the first to share in your area!`
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile: Vertical Feed Layout */}
          <div className="lg:hidden flex flex-col gap-4 px-1">
            {filteredItems.map((item, index) => {
              // Precompute urgency to avoid IIFE in JSX
              const urgency = item.expiry_date ? getExpiryUrgency(item.expiry_date) : null;
              // Priority loading for first 3 items (above the fold)
              const isPriority = index < 3;
              
              return (
              <Card key={item.id} className="group overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer border border-gray-200 hover:border-green-300 bg-white rounded-2xl relative">
                <div className="flex min-h-36">
                  {/* Image Section - Enhanced size for mobile */}
                  <div className="relative w-32 min-h-36 flex-shrink-0 overflow-hidden rounded-l-2xl bg-gradient-to-br from-gray-50 to-gray-100">
                    {item.image_url ? (
                      // centralized image component with fallback - optimized loading
                      <ImageWithFallback
                        src={item.image_url}
                        alt={item.title}
                        className="object-cover object-center w-full h-full rounded-xl group-hover:scale-105 transition-transform duration-300"
                        priority={isPriority} // Priority for first 3 items
                        width={128}
                        height={144}
                      />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full text-gray-400 bg-gray-100 rounded-xl">
                        <ImageIcon className="h-8 w-8 mx-auto mb-1 text-gray-300" />
                        <span className="text-xs font-medium">No image</span>
                      </div>
                    )}
                    
                    {/* Status Indicator - More prominent */}
                    <div className="absolute top-2 left-2">
                      <div className={`w-4 h-4 rounded-full border-2 border-white shadow-lg ${
                        item.status === 'available' ? 'bg-green-500' :
                        item.status === 'requested' ? 'bg-amber-500' :
                        item.status === 'reserved' ? 'bg-blue-500' :
                        'bg-gray-500'
                      }`}></div>
                    </div>
                    
                    {/* Distance Badge - More prominent */}
                    {item.distance_m !== undefined && item.distance_m !== null && item.distance_m >= 0 && (
                      <div className="absolute top-2 right-2">
                        <div className="bg-blue-600 text-white text-sm px-3 py-1 rounded-full font-bold shadow-lg border-2 border-white">
                          {formatDistance(item.distance_m / 1000)}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Content Section - Enhanced mobile layout */}
                  <div className="flex-1 p-4 pr-20 flex flex-col justify-between">
                    {/* Top Section - Title, Description, and Key Info (tighter spacing) */}
                    <div>
                      <h3 className="font-bold text-base text-gray-900 line-clamp-1 leading-tight group-hover:text-green-700 transition-colors mb-1">
                        {item.title}
                      </h3>
                      {item.description && (
                        <p className="text-sm text-gray-600 line-clamp-2 leading-snug mb-2">
                          {item.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <Badge variant={"secondary" as const} className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1">
                          {formatCategoryName(item.category)}
                        </Badge>
                        <Badge 
                          variant={(item.status === 'available' ? 'default' : 'secondary') as "default" | "secondary" | "destructive" | "outline"}
                          className={`text-xs font-medium ${
                            item.status === 'available' ? 'bg-green-500 text-white' :
                            item.status === 'requested' ? 'bg-amber-100 text-amber-800' :
                            item.status === 'reserved' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {item.status}
                        </Badge>
                        {item.status === 'available' && requestCounts[item.id] > 0 && (
                          <Badge className="text-xs font-bold bg-amber-100 text-amber-800 animate-pulse">
                            {requestCounts[item.id]} requests
                          </Badge>
                        )}
                      </div>
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
                        {urgency && (
                          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                            urgency.color === 'red' ? 'bg-red-100 text-red-700' :
                            urgency.color === 'amber' ? 'bg-amber-100 text-amber-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {urgency.color === 'red' && <AlertCircle className="h-3 w-3" />}
                            {urgency.color === 'amber' && <CalendarDays className="h-3 w-3" />}
                            {urgency.color === 'green' && <CalendarDays className="h-3 w-3" />}
                            <span>{urgency.text}</span>
                          </div>
                        )}
                        {item.expiry_date && (
                          <div className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full font-medium">
                            Expires: {new Date(item.expiry_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Bottom Section - Location & Owner */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-xs text-gray-600" title={item.pickup_label ?? ''}>
                        <MapPin className="h-3 w-3 shrink-0 text-gray-500" />
                        <span className="line-clamp-1 font-medium">{item.pickup_label}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="truncate">By {profiles[item.user_id]?.full_name || 'Unknown'}</span>
                        <span className="shrink-0">{new Date(item.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Enhanced Action Button */}
                  <div className="absolute bottom-3 right-3">
                    {user && user.id !== item.user_id && item.status === 'available' ? (
                      <Button 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setRequestingItems(prev => new Set(prev).add(item.id));
                          setSelectedItem(item);
                          
                          setTimeout(() => {
                            setRequestingItems(prev => {
                              const newSet = new Set(prev);
                              newSet.delete(item.id);
                              return newSet;
                            });
                          }, 2000);
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-5 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 border-2 border-white hover:scale-105"
                        disabled={requestingItems.has(item.id)}
                      >
                        {requestingItems.has(item.id) ? "..." : "Claim"}
                      </Button>
                    ) : user && user.id === item.user_id ? (
                      <div className="flex gap-2">
                        <Button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setEditingItem(item);
                          }}
                          variant={"outline" as const}
                          className="bg-white hover:bg-gray-50 border-gray-300 hover:border-green-500 text-gray-700 hover:text-green-700 font-medium py-2 px-3 rounded-full shadow-lg hover:scale-105 transition-all duration-200"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (confirm('Are you sure you want to delete this item?')) {
                              handleDeleteItem(item.id)
                            }
                          }}
                          variant={"outline" as const}
                          className="bg-white hover:bg-red-50 border-gray-300 hover:border-red-500 text-gray-700 hover:text-red-700 font-medium py-2 px-3 rounded-full shadow-lg hover:scale-105 transition-all duration-200"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </Card>
              );
            })}
          </div>

          {/* Desktop: Grid Layout */}
          <div className="hidden lg:grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map((item, index) => {
              // Precompute urgency to avoid IIFE in JSX
              const urgency = item.expiry_date ? getExpiryUrgency(item.expiry_date) : null;
              // Priority loading for first 8 items (first 2 rows in grid)
              const isPriority = index < 8;
              return (
                <div key={item.id} className="group bg-gradient-to-br from-white via-blue-50 to-green-50 border border-blue-200 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col min-h-[420px] max-h-[440px] relative overflow-hidden">
                  <div className="flex flex-col h-full">
                    <div className="w-full h-40 flex-shrink-0 flex items-center justify-center bg-white border-b border-blue-100 relative">
                      {item.image_url ? (
                        <ImageWithFallback
                          src={item.image_url}
                          alt={item.title}
                          className="object-contain w-full h-full rounded-t-2xl"
                          style={{ maxHeight: '160px' }}
                          priority={isPriority} // Priority for first 8 items
                          width={400}
                          height={160}
                        />
                      ) : (
                        <div className="flex items-center justify-center w-full h-full text-gray-300">
                          <ImageIcon className="h-10 w-10" />
                        </div>
                      )}
                      {/* Distance Badge - float on top of image */}
                      {item.distance_m !== undefined && item.distance_m !== null && item.distance_m >= 0 && (
                        <span className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-3 py-1 rounded-full font-bold shadow-lg border-2 border-white z-10">
                          {formatDistance(item.distance_m / 1000)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 flex flex-col justify-between p-4 overflow-hidden">
                      <div className="flex flex-col gap-1 overflow-hidden">
                        <span className="font-bold text-base text-blue-900 break-words whitespace-normal">{item.title}</span>
                        {item.description && (
                          <div className="text-gray-700 text-sm break-words whitespace-normal line-clamp-2">
                            {item.description}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2 mt-1">
                          <Badge className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1">
                            {formatCategoryName(item.category)}
                          </Badge>
                          <Badge className={`text-xs font-medium ${
                            item.status === 'available' ? 'bg-green-500 text-white' :
                            item.status === 'requested' ? 'bg-amber-100 text-amber-800' :
                            item.status === 'reserved' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {item.status}
                          </Badge>
                          {urgency && (
                            <span className={`px-2 py-1 rounded-full text-xs font-bold border ${
                              urgency.color === 'red' ? 'bg-red-100 text-red-700 border-red-200' :
                              urgency.color === 'amber' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                              'bg-green-100 text-green-700 border-green-200'
                            }`}>
                              {urgency.text}
                            </span>
                          )}
                          {item.expiry_date && (
                            <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full font-medium">
                              Expires: {new Date(item.expiry_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-full">
                            <Package className="h-4 w-4 text-gray-600" />
                            <span className="text-xs font-medium text-gray-700">{item.quantity}</span>
                          </div>
                          {item.condition && (
                            <div className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-full">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span className="text-xs font-medium text-blue-700">{item.condition}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                          <MapPin className="h-4 w-4 text-gray-500 shrink-0" />
                          <span className="truncate">{item.pickup_label}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500 border-t pt-2 mt-2">
                          <span>By {profiles[item.user_id]?.full_name || 'Unknown'}</span>
                          <span>{new Date(item.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {user && user.id !== item.user_id && item.status === 'available' && (
                          <Button 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setRequestingItems(prev => new Set(prev).add(item.id));
                              setSelectedItem(item);
                              setTimeout(() => {
                                setRequestingItems(prev => {
                                  const newSet = new Set(prev);
                                  newSet.delete(item.id);
                                  return newSet;
                                });
                              }, 2000);
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-full shadow hover:scale-105 transition-all duration-200 border-2 border-white"
                            disabled={requestingItems.has(item.id)}
                          >
                            {requestingItems.has(item.id) ? "Requesting..." : "Request"}
                          </Button>
                        )}
                        {user && user.id === item.user_id && (
                          <>
                            <Button 
                              onClick={() => setEditingItem(item)}
                              variant={"outline" as const}
                              className="bg-white hover:bg-gray-50 border-gray-300 hover:border-green-500 text-gray-700 hover:text-green-700 font-medium py-2 px-3 rounded-full shadow hover:scale-105 transition-all duration-200"
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
                              variant={"outline" as const}
                              className="bg-white hover:bg-red-50 border-gray-300 hover:border-red-500 text-gray-700 hover:text-red-700 font-medium py-2 px-3 rounded-full shadow hover:scale-105 transition-all duration-200"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {item.status === 'available' && requestCounts[item.id] > 0 && (
                          <span className="bg-amber-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow animate-pulse ml-auto">
                            {requestCounts[item.id]} requests
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
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
          item={{
            ...editingItem,
            expiry_date: editingItem.expiry_date || null
          }}
          isOpen={!!editingItem}
          onClose={() => setEditingItem(null)}
          onItemUpdated={handleItemUpdated}
        />
      )}
    </div>
  );
});

export default ItemList;