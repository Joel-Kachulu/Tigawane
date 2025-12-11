/**
 * useCollaborations Hook - React hook for collaboration operations
 * Provides data fetching, mutations, and state management for collaborations
 */

import { useState, useEffect, useCallback } from 'react';
import {
  fetchCollaborations,
  fetchCollaborationDetails,
  createCollaboration,
  updateCollaboration,
  joinCollaboration,
  leaveCollaboration,
  deleteCollaboration,
  Collaboration,
  CollaborationDetails,
  CreateCollaborationData,
  UpdateCollaborationData,
} from '@/lib/services/collaborationService';

export interface UseCollaborationsReturn {
  collaborations: Collaboration[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching all collaborations
 */
export function useCollaborations(userId?: string): UseCollaborationsReturn {
  const [collaborations, setCollaborations] = useState<Collaboration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchCollaborations(userId);
      setCollaborations(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch collaborations');
      setError(error);
      
      // Handle table missing error
      if (err instanceof Error && err.message === 'COLLABORATION_TABLE_MISSING') {
        setCollaborations([]);
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return {
    collaborations,
    loading,
    error,
    refetch: fetch,
  };
}

/**
 * Hook for fetching a single collaboration's details
 */
export function useCollaborationDetails(
  collaborationId: string | null,
  userId?: string
) {
  const [collaboration, setCollaboration] = useState<CollaborationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    if (!collaborationId) {
      setCollaboration(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchCollaborationDetails(collaborationId, userId);
      setCollaboration(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch collaboration details');
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [collaborationId, userId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return {
    collaboration,
    loading,
    error,
    refetch: fetch,
  };
}

/**
 * Hook for collaboration mutations
 */
export function useCollaborationMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const create = useCallback(async (data: CreateCollaborationData): Promise<Collaboration | null> => {
    setLoading(true);
    setError(null);

    try {
      const collaboration = await createCollaboration(data);
      return collaboration;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create collaboration');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const update = useCallback(async (
    collaborationId: string,
    updates: UpdateCollaborationData
  ): Promise<Collaboration | null> => {
    setLoading(true);
    setError(null);

    try {
      const collaboration = await updateCollaboration(collaborationId, updates);
      return collaboration;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update collaboration');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const join = useCallback(async (collaborationId: string, userId: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      await joinCollaboration(collaborationId, userId);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to join collaboration');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const leave = useCallback(async (collaborationId: string, userId: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      await leaveCollaboration(collaborationId, userId);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to leave collaboration');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const remove = useCallback(async (collaborationId: string, creatorId: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      await deleteCollaboration(collaborationId, creatorId);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete collaboration');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    create,
    update,
    join,
    leave,
    remove,
    loading,
    error,
  };
}

