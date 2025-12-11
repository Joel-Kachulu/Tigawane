/**
 * Simple in-memory cache utility with TTL (Time To Live) support
 * Used for caching frequently accessed data to reduce API calls
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class Cache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Get data from cache if it exists and hasn't expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    const age = now - entry.timestamp;

    // Check if entry has expired
    if (age > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set data in cache with TTL
   */
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    // If cache is full, remove oldest entry
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Check if key exists and is valid (not expired)
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    const now = Date.now();
    const age = now - entry.timestamp;

    if (age > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a specific key from cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      const age = now - entry.timestamp;
      if (age > entry.ttl) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Create singleton instances for different cache types
export const profileCache = new Cache(200); // Cache up to 200 profiles
export const statsCache = new Cache(50); // Cache stats
export const itemsCache = new Cache(100); // Cache item queries
export const nearbyItemsCache = new Cache(20); // Cache nearby items queries
export const collaborationsCache = new Cache(50); // Cache collaboration queries
export const claimsCache = new Cache(100); // Cache claim queries

// Cache TTL constants (in milliseconds)
export const CACHE_TTL = {
  PROFILE: 10 * 60 * 1000, // 10 minutes - profiles don't change often
  STATS: 5 * 60 * 1000, // 5 minutes - stats update periodically
  ITEMS: 2 * 60 * 1000, // 2 minutes - items can change frequently
  NEARBY_ITEMS: 1 * 60 * 1000, // 1 minute - nearby items change often
  STORIES: 10 * 60 * 1000, // 10 minutes - stories don't change often
  COLLABORATIONS: 3 * 60 * 1000, // 3 minutes - collaborations update moderately
  COLLABORATION_DETAILS: 2 * 60 * 1000, // 2 minutes - details change more often
  CLAIMS: 1 * 60 * 1000, // 1 minute - claims change frequently
} as const;

/**
 * Generate cache key from parameters
 */
export function generateCacheKey(prefix: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}:${JSON.stringify(params[key])}`)
    .join('|');
  return `${prefix}:${sortedParams}`;
}

/**
 * Invalidate cache entries matching a pattern
 * @param pattern - Pattern to match (e.g., 'items', 'profile:123', 'collaborations')
 */
export function invalidateCache(pattern: string): void {
  const caches = [
    profileCache,
    statsCache,
    itemsCache,
    nearbyItemsCache,
    collaborationsCache,
    claimsCache,
  ];
  
  caches.forEach(cache => {
    const stats = cache.getStats();
    stats.keys.forEach(key => {
      if (key.startsWith(pattern)) {
        cache.delete(key);
      }
    });
  });
}

