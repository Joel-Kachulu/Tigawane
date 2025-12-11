/**
 * useClaims Hook - React hook for claim operations
 * Provides data fetching, mutations, and state management for claims
 */

import { useState, useCallback } from 'react';
import {
  createClaim,
  updateClaim,
  deleteClaim,
  getItemClaims,
  getUserClaims,
  getItemRequestCounts,
  getClaimById,
  Claim,
  CreateClaimData,
  UpdateClaimData,
} from '@/lib/services/claimService';

/**
 * Hook for claim mutations
 */
export function useClaimMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const create = useCallback(async (data: CreateClaimData): Promise<Claim | null> => {
    setLoading(true);
    setError(null);

    try {
      const claim = await createClaim(data);
      return claim;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create claim');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const update = useCallback(async (claimId: string, updates: UpdateClaimData): Promise<Claim | null> => {
    setLoading(true);
    setError(null);

    try {
      const claim = await updateClaim(claimId, updates);
      return claim;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update claim');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const remove = useCallback(async (claimId: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      await deleteClaim(claimId);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete claim');
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

/**
 * Hook for fetching item claims
 */
export function useItemClaims(itemId: string | null) {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    if (!itemId) {
      setClaims([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getItemClaims(itemId);
      setClaims(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch claims');
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  return {
    claims,
    loading,
    error,
    refetch: fetch,
  };
}

/**
 * Hook for fetching user claims
 */
export function useUserClaims(userId: string | null) {
  const [claims, setClaims] = useState<{ asOwner: Claim[]; asClaimer: Claim[] }>({
    asOwner: [],
    asClaimer: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    if (!userId) {
      setClaims({ asOwner: [], asClaimer: [] });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getUserClaims(userId);
      setClaims(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch user claims');
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  return {
    claims,
    loading,
    error,
    refetch: fetch,
  };
}

/**
 * Utility hook for getting request counts
 * Can be used with useMemo for optimization
 */
export function useItemRequestCounts(itemIds: string[]) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (itemIds.length === 0) {
      setCounts({});
      return;
    }

    setLoading(true);
    try {
      const data = await getItemRequestCounts(itemIds);
      setCounts(data);
    } catch (err) {
      console.error('Error fetching request counts:', err);
      setCounts({});
    } finally {
      setLoading(false);
    }
  }, [itemIds.join(',')]); // Only refetch if itemIds change

  return {
    counts,
    loading,
    refetch: fetch,
  };
}

