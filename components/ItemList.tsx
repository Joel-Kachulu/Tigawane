"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { useLocation } from "@/contexts/LocationContext"
import { formatDistance } from "@/lib/locationService"
import { fetchProfiles, invalidateCache } from "@/lib/dataFetching"
import { useItems } from "@/lib/hooks/useItems"
import { useItemMutations } from "@/lib/hooks/useItems"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import ClaimFoodModal from "./ClaimFoodModal"
import EditItemModal from "./EditItemModal"
import ItemFilters from "./items/ItemFilters"
import ItemCard from "./items/ItemCard"
import ItemListEmptyState from "./items/ItemListEmptyState"
import ItemListLoading from "./items/ItemListLoading"



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
  const [selectedItem, setSelectedItem] = useState<ItemRecord | null>(null)
  const [editingItem, setEditingItem] = useState<ItemRecord | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [profiles, setProfiles] = useState<Record<string, any>>({})
  const [requestingItems, setRequestingItems] = useState<Set<string>>(new Set())
  const [requestCounts, setRequestCounts] = useState<Record<string, number>>({})

  const categories = itemType === "food" 
    ? ["fruits", "vegetables", "meat", "dairy", "grains", "prepared", "other"]
    : ["clothing", "shoes", "household", "electronics", "books", "toys", "baby-items", "other"]

  // Helper function to format category display names
  const formatCategoryName = (category: string) => {
    if (category === "baby-items") return "Baby Items";
    if (category === "prepared") return "Prepared Food";
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  // ✨ Use the new useItems hook instead of manual fetching
  const { 
    items, 
    loading, 
    hasMore, 
    loadMore: loadMoreItems, 
    refetch 
  } = useItems({
    filters: {
      itemType,
      collaborationId,
      searchTerm,
      categoryFilter,
      statusFilter,
      lat: selectedLocation?.latitude,
      lon: selectedLocation?.longitude,
      radius: locationRadius || 10,
    },
    enabled: !!selectedLocation?.latitude && !!selectedLocation?.longitude,
  });

  // Get item mutations hook
  const { remove: deleteItemMutation } = useItemMutations();

  // Refs for real-time subscriptions
  const channelRef = useRef<any>(null);
  // Fetch profiles when items change
  useEffect(() => {
    if (items.length > 0) {
      const userIds = [...new Set(items.map(item => item.user_id))] as string[];
      if (userIds.length > 0) {
        fetchProfiles(userIds).then(setProfiles);
      }
    }
  }, [items]);

  // Fetch request counts for user's items
  useEffect(() => {
    if (user && items.length > 0) {
      const ownerItems = items.filter(item => item.user_id === user.id);
      if (ownerItems.length > 0) {
        fetchRequestCounts(ownerItems);
      }
    }
  }, [items, user]);

  // Auto-refresh items when tab becomes visible again
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refetch();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [refetch]);

  // Real-time subscription for new items - simplified to use refetch
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
        (payload) => {
          console.log('🆕 New item received via real-time:', payload.new.id);
          // Refetch items to get the new item with proper filtering
          setTimeout(() => refetch(), 500);
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
        (payload) => {
          console.log('📝 Item updated via real-time:', payload.new.id);
          // Refetch to get updated item with proper filtering
          setTimeout(() => refetch(), 500);
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
          console.log('🗑️ Item deleted via real-time:', payload.old.id);
          // Invalidate cache and refetch
          invalidateCache('items');
          setTimeout(() => refetch(), 300);
        }
      )
      .subscribe((status) => {
        console.log(`📡 Items subscription status:`, status);
      });

    channelRef.current = channel;

    return () => {
      console.log('🧹 Cleaning up items subscription:', channelName);
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [itemType, selectedLocation?.latitude, selectedLocation?.longitude, refetch]);

  // Fetch request counts for owner items
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

  const handleItemClaimed = () => {
    refetch()
    setSelectedItem(null)
  }

  const handleItemUpdated = () => {
    refetch()
    setEditingItem(null)
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!user) return

    try {
      await deleteItemMutation(itemId)
      refetch()
    } catch (error) {
      console.error("❌ Error deleting item:", error)
      alert("Failed to delete item")
    }
  }

  const filteredItems = items;
  const hasLocation = !!selectedLocation?.latitude && !!selectedLocation?.longitude;
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (loading && items.length === 0) {
    return <ItemListLoading />;
  }

  return (
    <div className="space-y-6">
      <ItemFilters
        itemType={itemType}
        searchTerm={searchTerm}
        categoryFilter={categoryFilter}
        statusFilter={statusFilter}
        categories={categories}
        onSearchChange={setSearchTerm}
        onCategoryChange={setCategoryFilter}
        onStatusChange={setStatusFilter}
        formatCategoryName={formatCategoryName}
      />

      {!hasLocation || filteredItems.length === 0 ? (
        <ItemListEmptyState
          itemType={itemType}
          searchTerm={searchTerm}
          collaborationId={collaborationId}
          hasLocation={hasLocation}
        />
      ) : (
        <>
          {/* Mobile: Vertical Feed Layout */}
          <div className="lg:hidden flex flex-col gap-4 px-1">
            {filteredItems.map((item, index) => (
              <ItemCard
                key={item.id}
                item={item}
                index={index}
                isMobile={true}
                currentUserId={user?.id}
                requestCount={requestCounts[item.id] || 0}
                requestingItems={requestingItems}
                profiles={profiles}
                formatCategoryName={formatCategoryName}
                getExpiryUrgency={getExpiryUrgency}
                onClaim={(item) => {
                  setRequestingItems((prev) => new Set(prev).add(item.id));
                  setSelectedItem(item);
                  setTimeout(() => {
                    setRequestingItems((prev) => {
                      const newSet = new Set(prev);
                      newSet.delete(item.id);
                      return newSet;
                    });
                  }, 2000);
                }}
                onEdit={setEditingItem}
                onDelete={handleDeleteItem}
              />
            ))}
          </div>

          {/* Desktop: Grid Layout */}
          <div className="hidden lg:grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map((item, index) => (
              <ItemCard
                key={item.id}
                item={item}
                index={index}
                isMobile={false}
                currentUserId={user?.id}
                requestCount={requestCounts[item.id] || 0}
                requestingItems={requestingItems}
                profiles={profiles}
                formatCategoryName={formatCategoryName}
                getExpiryUrgency={getExpiryUrgency}
                onClaim={(item) => {
                  setRequestingItems((prev) => new Set(prev).add(item.id));
                  setSelectedItem(item);
                  setTimeout(() => {
                    setRequestingItems((prev) => {
                      const newSet = new Set(prev);
                      newSet.delete(item.id);
                      return newSet;
                    });
                  }, 2000);
                }}
                onEdit={setEditingItem}
                onDelete={handleDeleteItem}
              />
            ))}
          </div>

          {hasMore && (
            <div className="text-center">
              <Button 
                onClick={loadMoreItems}
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