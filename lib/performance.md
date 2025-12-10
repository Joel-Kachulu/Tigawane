# Performance Optimization Guide

## Implemented Optimizations

### 1. **Caching System** (`lib/cache.ts`)
- In-memory cache with TTL (Time To Live) support
- Separate cache instances for different data types:
  - Profile cache (200 entries, 10 min TTL)
  - Stats cache (50 entries, 5 min TTL)
  - Items cache (100 entries, 2 min TTL)
  - Nearby items cache (20 entries, 1 min TTL)
- Automatic cleanup of expired entries every 5 minutes

### 2. **Optimized Data Fetching** (`lib/dataFetching.ts`)
- Request deduplication to prevent duplicate API calls
- Profile caching to reduce redundant profile fetches
- Community stats caching with 5-minute TTL
- Stories caching with 10-minute TTL
- Cache invalidation utilities

### 3. **Query Optimizations**
- Only select needed fields instead of `*`
- Use RPC functions for complex queries when available
- Parallel query execution where possible
- Bounding box queries for location-based searches

### 4. **Component Optimizations**
- Debounced data fetching (300ms)
- Request deduplication at component level
- Memoized callbacks to prevent unnecessary re-renders
- Cache-first strategy for frequently accessed data

## Additional Recommendations

### 1. **Image Optimization**
```typescript
// Use Next.js Image component with lazy loading
<Image
  src={item.image_url}
  alt={item.title}
  width={400}
  height={300}
  loading="lazy"
  placeholder="blur"
/>
```

### 2. **Code Splitting**
- Lazy load heavy components:
```typescript
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <LoadingSpinner />,
  ssr: false
});
```

### 3. **Database Indexes**
Ensure these indexes exist in Supabase:
- `items(pickup_lat, pickup_lon)` - for location queries
- `items(item_type, status)` - for filtering
- `items(user_id)` - for user's items
- `profiles(id)` - for profile lookups

### 4. **Real-time Subscription Optimization**
- Limit subscription channels per component
- Clean up subscriptions properly on unmount
- Use filters to reduce unnecessary updates

### 5. **Bundle Size Optimization**
- Use dynamic imports for large libraries
- Tree-shake unused code
- Consider using React Query for advanced caching (optional)

### 6. **Network Optimization**
- Implement request batching where possible
- Use compression (gzip/brotli)
- Consider CDN for static assets

### 7. **Monitoring**
- Track cache hit rates
- Monitor API call frequency
- Measure page load times
- Use React DevTools Profiler

## Cache Invalidation Strategy

Call `invalidateCache()` when:
- User updates their profile → `invalidateCache('profiles')`
- Item is created/updated/deleted → `invalidateCache('items')`
- Stats need refresh → `invalidateCache('stats')`
- Location changes significantly → `invalidateCache('nearby')`

## Performance Metrics to Track

1. **Time to First Byte (TTFB)**
2. **First Contentful Paint (FCP)**
3. **Largest Contentful Paint (LCP)**
4. **Time to Interactive (TTI)**
5. **Cache Hit Rate**
6. **API Response Times**
7. **Bundle Size**

