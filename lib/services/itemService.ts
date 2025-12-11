/**
 * Item Service - Business logic for item operations
 * Extracted from components to make it reusable and testable
 */

import { supabase } from '@/lib/supabase';
import { itemsCache, generateCacheKey, CACHE_TTL } from '@/lib/cache';
import { invalidateCache } from '@/lib/dataFetching';

export interface ItemRecord {
  id: string;
  title: string;
  description: string | null;
  category: string;
  item_type: 'food' | 'non-food';
  quantity: string;
  condition?: string | null;
  expiry_date?: string | null;
  pickup_location: string;
  pickup_label?: string | null;
  pickup_lat?: number | null;
  pickup_lon?: number | null;
  image_url: string | null;
  user_id: string;
  status: string;
  created_at: string;
  collaboration_id?: string | null;
  distance_m?: number | null;
}

export interface CreateItemData {
  title: string;
  description?: string | null;
  category: string;
  item_type: 'food' | 'non-food';
  quantity: string;
  condition?: string | null;
  expiry_date?: string | null;
  pickup_location: string;
  pickup_label: string;
  pickup_lat: number;
  pickup_lon: number;
  user_id: string;
  status?: string;
  collaboration_id?: string | null;
  image_url?: string | null;
  is_anonymous?: boolean;
}

export interface UpdateItemData {
  title?: string;
  description?: string | null;
  category?: string;
  quantity?: string;
  condition?: string | null;
  expiry_date?: string | null;
  pickup_location?: string;
  pickup_label?: string;
  pickup_lat?: number;
  pickup_lon?: number;
  status?: string;
  image_url?: string | null;
}

export interface ItemFilters {
  itemType?: 'food' | 'non-food';
  collaborationId?: string | null;
  searchTerm?: string;
  categoryFilter?: string;
  statusFilter?: string;
  lat?: number;
  lon?: number;
  radius?: number;
  page?: number;
  limit?: number;
}

/**
 * Fetch items nearby a location
 */
export async function fetchItemsNearby(filters: ItemFilters): Promise<ItemRecord[]> {
  const {
    itemType,
    collaborationId,
    searchTerm,
    categoryFilter,
    statusFilter,
    lat,
    lon,
    radius = 10,
    page = 0,
    limit = 12,
  } = filters;

  // Validate location
  if (!lat || !lon || isNaN(lat) || isNaN(lon) || lat === 0 && lon === 0) {
    throw new Error('Invalid location coordinates');
  }

  // Check cache first
  const cacheKey = generateCacheKey('items', {
    itemType: itemType || 'all',
    collaborationId: collaborationId || 'none',
    searchTerm: searchTerm || '',
    categoryFilter: categoryFilter || 'all',
    statusFilter: statusFilter || 'all',
    lat,
    lon,
    radius,
  });

  const cached = itemsCache.get<ItemRecord[]>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    // Use RPC function for geospatial query
    const { data, error } = await supabase.rpc('get_items_nearby', {
      lat,
      lon,
      radius_km: radius,
      limit_count: limit * 2, // Fetch more for filtering
      item_type_filter: itemType || null,
    });

    if (error) {
      console.error('RPC error, falling back to direct query:', error);
      // Fallback to direct query
      return await fetchItemsDirect(filters);
    }

    let items: ItemRecord[] = data || [];

    // Apply filters
    if (collaborationId) {
      items = items.filter(item => item.collaboration_id === collaborationId);
    } else {
      items = items.filter(item => !item.collaboration_id);
    }

    if (categoryFilter && categoryFilter !== 'all') {
      items = items.filter(item => item.category === categoryFilter);
    }

    if (statusFilter && statusFilter !== 'all') {
      items = items.filter(item => item.status === statusFilter);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      items = items.filter(
        item =>
          item.title.toLowerCase().includes(term) ||
          (item.description && item.description.toLowerCase().includes(term))
      );
    }

    // Pagination
    const start = page * limit;
    const end = start + limit;
    items = items.slice(start, end);

    // Cache results
    itemsCache.set(cacheKey, items, CACHE_TTL.ITEMS);

    return items;
  } catch (error) {
    console.error('Error fetching items:', error);
    return [];
  }
}

/**
 * Fallback: Direct query when RPC fails
 */
async function fetchItemsDirect(filters: ItemFilters): Promise<ItemRecord[]> {
  const { itemType, collaborationId, categoryFilter, statusFilter, lat, lon, radius = 10 } = filters;

  let query = supabase.from('items').select('*');

  if (itemType) {
    query = query.eq('item_type', itemType);
  }

  if (collaborationId) {
    query = query.eq('collaboration_id', collaborationId);
  } else {
    query = query.is('collaboration_id', null);
  }

  if (categoryFilter && categoryFilter !== 'all') {
    query = query.eq('category', categoryFilter);
  }

  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query.order('created_at', { ascending: false }).limit(50);

  if (error) {
    throw error;
  }

  // Filter by distance (client-side)
  if (lat && lon && data) {
    return data
      .map(item => ({
        ...item,
        distance_m: calculateDistance(lat, lon, item.pickup_lat || 0, item.pickup_lon || 0),
      }))
      .filter(item => item.distance_m <= radius * 1000)
      .sort((a, b) => (a.distance_m || 0) - (b.distance_m || 0));
  }

  return data || [];
}

/**
 * Calculate distance between two points (Haversine formula)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Fetch user's items
 */
export async function fetchUserItems(userId: string, limit = 100, offset = 0): Promise<ItemRecord[]> {
  try {
    const { data, error } = await supabase.rpc('get_user_items', {
      p_user_id: userId,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching user items:', error);
    return [];
  }
}

/**
 * Create a new item
 */
export async function createItem(itemData: CreateItemData): Promise<ItemRecord> {
  const { data, error } = await supabase
    .from('items')
    .insert(itemData)
    .select()
    .single();

  if (error) {
    throw error;
  }

  // Invalidate cache
  invalidateCache('items');

  return data;
}

/**
 * Update an item
 */
export async function updateItem(itemId: string, updates: UpdateItemData): Promise<ItemRecord> {
  const { data, error } = await supabase
    .from('items')
    .update(updates)
    .eq('id', itemId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  // Invalidate cache
  invalidateCache('items');

  return data;
}

/**
 * Delete an item
 */
export async function deleteItem(itemId: string): Promise<void> {
  const { error } = await supabase.from('items').delete().eq('id', itemId);

  if (error) {
    throw error;
  }

  // Invalidate cache
  invalidateCache('items');
}

/**
 * Get item by ID
 */
export async function getItemById(itemId: string): Promise<ItemRecord | null> {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('id', itemId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw error;
  }

  return data;
}

/**
 * Get request count for an item
 */
export async function getItemRequestCount(itemId: string): Promise<number> {
  const { count, error } = await supabase
    .from('claims')
    .select('*', { count: 'exact', head: true })
    .eq('item_id', itemId)
    .in('status', ['pending', 'requested']);

  if (error) {
    console.error('Error fetching request count:', error);
    return 0;
  }

  return count || 0;
}


