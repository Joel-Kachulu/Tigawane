/**
 * useItems Hook - React hook for item operations
 * Provides data fetching, mutations, and state management for items
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchItemsNearby,
  fetchUserItems,
  createItem,
  updateItem,
  deleteItem,
  ItemRecord,
  CreateItemData,
  UpdateItemData,
  ItemFilters,
} from '@/lib/services/itemService';
import { getItemRequestCounts } from '@/lib/services/claimService';
import { invalidateCache } from '@/lib/dataFetching';

export interface UseItemsOptions {
  filters: ItemFilters;
  enabled?: boolean;
  onSuccess?: (items: ItemRecord[]) => void;
  onError?: (error: Error) => void;
}

export interface UseItemsReturn {
  items: ItemRecord[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
  reset: () => void;
}

/**
 * Hook for fetching items with filters
 */
export function useItems(options: UseItemsOptions): UseItemsReturn {
  const { filters, enabled = true, onSuccess, onError } = options;
  const [items, setItems] = useState<ItemRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);

  const isFetchingRef = useRef(false);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchItems = useCallback(
    async (page = 0, reset = false) => {
      if (isFetchingRef.current || !enabled) {
        return;
      }

      // Debounce rapid calls
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }

      fetchTimeoutRef.current = setTimeout(async () => {
        isFetchingRef.current = true;
        setLoading(true);
        setError(null);

        try {
          const fetchedItems = await fetchItemsNearby({
            ...filters,
            page,
            limit: 12,
          });

          if (reset) {
            setItems(fetchedItems);
            setCurrentPage(0);
          } else {
            setItems(prev => (page === 0 ? fetchedItems : [...prev, ...fetchedItems]));
          }

          setHasMore(fetchedItems.length === 12);
          setCurrentPage(page);

          onSuccess?.(fetchedItems);
        } catch (err) {
          const error = err instanceof Error ? err : new Error('Failed to fetch items');
          setError(error);
          onError?.(error);
        } finally {
          setLoading(false);
          isFetchingRef.current = false;
        }
      }, 300);
    },
    [
      filters.itemType,
      filters.collaborationId,
      filters.searchTerm,
      filters.categoryFilter,
      filters.statusFilter,
      filters.lat,
      filters.lon,
      filters.radius,
      enabled,
      onSuccess,
      onError
    ]
  );

  useEffect(() => {
    if (enabled) {
      fetchItems(0, true);
    } else {
      setItems([]);
      setLoading(false);
      setHasMore(false);
    }
  }, [fetchItems, enabled]);

  const refetch = useCallback(async () => {
    await fetchItems(0, true);
  }, [fetchItems]);

  const loadMore = useCallback(async () => {
    if (!loading && hasMore) {
      await fetchItems(currentPage + 1, false);
    }
  }, [fetchItems, currentPage, loading, hasMore]);

  const reset = useCallback(() => {
    setItems([]);
    setCurrentPage(0);
    setHasMore(true);
    fetchItems(0, true);
  }, [fetchItems]);

  return {
    items,
    loading,
    error,
    hasMore,
    refetch,
    loadMore,
    reset,
  };
}

/**
 * Hook for user's items
 */
export function useUserItems(userId: string | null) {
  const [items, setItems] = useState<ItemRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [requestCounts, setRequestCounts] = useState<Record<string, number>>({});

  const fetchUserItemsData = useCallback(async () => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fetchedItems = await fetchUserItems(userId);
      setItems(fetchedItems);

      // Fetch request counts
      if (fetchedItems.length > 0) {
        const itemIds = fetchedItems.map(item => item.id);
        const counts = await getItemRequestCounts(itemIds);
        setRequestCounts(counts);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch user items');
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUserItemsData();
  }, [fetchUserItemsData]);

  return {
    items,
    loading,
    error,
    requestCounts,
    refetch: fetchUserItemsData,
  };
}

/**
 * Hook for item mutations
 */
export function useItemMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const create = useCallback(async (itemData: CreateItemData): Promise<ItemRecord | null> => {
    setLoading(true);
    setError(null);

    try {
      const item = await createItem(itemData);
      invalidateCache('items');
      return item;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create item');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const update = useCallback(async (itemId: string, updates: UpdateItemData): Promise<ItemRecord | null> => {
    setLoading(true);
    setError(null);

    try {
      const item = await updateItem(itemId, updates);
      invalidateCache('items');
      return item;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update item');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const remove = useCallback(async (itemId: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      await deleteItem(itemId);
      invalidateCache('items');
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete item');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    create,
    update,
    remove,
    loading,
    error,
  };
}

