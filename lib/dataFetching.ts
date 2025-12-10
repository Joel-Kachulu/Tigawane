/**
 * Optimized data fetching utilities with caching and request deduplication
 */

import { supabase } from '@/lib/supabase';
import { profileCache, statsCache, itemsCache, nearbyItemsCache, CACHE_TTL, generateCacheKey } from './cache';

// Request deduplication - prevent multiple identical requests
const pendingRequests = new Map<string, Promise<any>>();

/**
 * Deduplicate requests - if a request with the same key is already pending, return that promise
 */
function deduplicateRequest<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key)!;
  }

  const promise = fetcher().finally(() => {
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, promise);
  return promise;
}

/**
 * Fetch user profiles with caching
 */
export async function fetchProfiles(userIds: string[]): Promise<Record<string, any>> {
  if (!userIds || userIds.length === 0) {
    return {};
  }

  // Filter out user IDs we already have cached
  const uncachedIds: string[] = [];
  const cachedProfiles: Record<string, any> = {};

  userIds.forEach((id) => {
    const cached = profileCache.get<any>(`profile:${id}`);
    if (cached) {
      cachedProfiles[id] = cached;
    } else {
      uncachedIds.push(id);
    }
  });

  // If all profiles are cached, return them
  if (uncachedIds.length === 0) {
    return cachedProfiles;
  }

  // Fetch uncached profiles
  const cacheKey = `profiles:${uncachedIds.sort().join(',')}`;
  
  const profiles = await deduplicateRequest(cacheKey, async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, location')
      .in('id', uncachedIds);

    if (error) {
      console.error('Error fetching profiles:', error);
      return {};
    }

    const profilesMap: Record<string, any> = {};
    if (data) {
      data.forEach((profile) => {
        profilesMap[profile.id] = profile;
        // Cache individual profiles
        profileCache.set(`profile:${profile.id}`, profile, CACHE_TTL.PROFILE);
      });
    }

    return profilesMap;
  });

  return { ...cachedProfiles, ...profiles };
}

/**
 * Fetch community stats with caching
 */
export async function fetchCommunityStats(): Promise<{
  itemsShared: number;
  communityMembers: number;
  activeCollaborations: number;
}> {
  const cacheKey = 'community:stats';
  
  // Check cache first
  const cached = statsCache.get<{
    itemsShared: number;
    communityMembers: number;
    activeCollaborations: number;
  }>(cacheKey);
  if (cached) {
    return cached;
  }

  const stats = await deduplicateRequest(cacheKey, async () => {
    try {
      // Run all queries in parallel for better performance
      const [itemsResult, membersResult, collaborationsResult] = await Promise.all([
        supabase
          .from('items')
          .select('*', { count: 'exact', head: true }),
        supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true }),
        supabase
          .from('collaboration_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active'),
      ]);

      const result = {
        itemsShared: itemsResult.count || 0,
        communityMembers: membersResult.count || 0,
        activeCollaborations: collaborationsResult.count || 0,
      };

      // Cache the result
      statsCache.set(cacheKey, result, CACHE_TTL.STATS);
      return result;
    } catch (error) {
      console.error('Error fetching community stats:', error);
      return {
        itemsShared: 0,
        communityMembers: 0,
        activeCollaborations: 0,
      };
    }
  });

  return stats;
}

/**
 * Fetch stories with caching
 */
export async function fetchStories(limit: number = 4): Promise<any[]> {
  const cacheKey = `stories:${limit}`;
  
  // Check cache first
  const cached = statsCache.get<any[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const stories = await deduplicateRequest(cacheKey, async () => {
    const { data, error } = await supabase
      .from('stories')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching stories:', error);
      return [];
    }

    const result = data || [];
    // Cache stories for 10 minutes
    statsCache.set(cacheKey, result, CACHE_TTL.STORIES);
    return result;
  });

  return stories;
}

/**
 * Invalidate cache entries (call when data is updated)
 */
export function invalidateCache(pattern: string): void {
  if (pattern === 'profiles') {
    profileCache.clear();
  } else if (pattern === 'stats') {
    statsCache.clear();
  } else if (pattern === 'items') {
    itemsCache.clear();
  } else if (pattern === 'nearby') {
    nearbyItemsCache.clear();
  } else if (pattern === 'all') {
    profileCache.clear();
    statsCache.clear();
    itemsCache.clear();
    nearbyItemsCache.clear();
  }
}

/**
 * Clear a specific profile from cache
 */
export function invalidateProfile(userId: string): void {
  profileCache.delete(`profile:${userId}`);
}

