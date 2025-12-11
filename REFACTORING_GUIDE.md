# Refactoring Guide - How to Use New Structure

## 🎯 Overview

We've created a new service layer and hooks to improve code organization and reusability.

## 📁 New Structure

```
lib/
├── services/
│   ├── itemService.ts      # Business logic for items
│   └── index.ts
├── hooks/
│   ├── useItems.ts         # React hooks for items
│   └── index.ts
```

## 🔄 Migration Example: ItemList.tsx

### Before (Old Way):
```typescript
// ItemList.tsx - 1,176 lines with all logic inside
const fetchItems = useCallback(async (reset = false) => {
  // 200+ lines of complex logic
  const { data, error } = await supabase.rpc('get_items_nearby', {...});
  // More logic...
}, []);
```

### After (New Way):
```typescript
// ItemList.tsx - Much simpler!
import { useItems } from '@/lib/hooks/useItems';

function ItemList({ itemType, collaborationId }: ItemListProps) {
  const { selectedLocation, locationRadius } = useLocation();
  
  const { items, loading, hasMore, loadMore, refetch } = useItems({
    filters: {
      itemType,
      collaborationId,
      lat: selectedLocation?.latitude,
      lon: selectedLocation?.longitude,
      radius: locationRadius || 10,
    },
  });

  // Component is now much simpler - just UI!
  return (
    <div>
      {items.map(item => <ItemCard key={item.id} item={item} />)}
      {hasMore && <Button onClick={loadMore}>Load More</Button>}
    </div>
  );
}
```

## 📚 Available Services

### ItemService
```typescript
import { 
  fetchItemsNearby,
  fetchUserItems,
  createItem,
  updateItem,
  deleteItem,
  getItemRequestCounts
} from '@/lib/services/itemService';
```

## 🎣 Available Hooks

### useItems
```typescript
import { useItems } from '@/lib/hooks/useItems';

const { items, loading, error, hasMore, loadMore, refetch } = useItems({
  filters: {
    itemType: 'food',
    lat: 15.5,
    lon: 35.0,
    radius: 10,
  },
});
```

### useUserItems
```typescript
import { useUserItems } from '@/lib/hooks/useItems';

const { items, loading, requestCounts, refetch } = useUserItems(userId);
```

### useItemMutations
```typescript
import { useItemMutations } from '@/lib/hooks/useItems';

const { create, update, remove, loading } = useItemMutations();

// Create item
await create({
  title: 'Fresh Apples',
  category: 'fruits',
  // ... other fields
});

// Update item
await update(itemId, { status: 'claimed' });

// Delete item
await remove(itemId);
```

## 🚀 Next Steps

1. **Start using hooks in new components** - Use `useItems` instead of direct Supabase calls
2. **Gradually migrate existing components** - Refactor one component at a time
3. **Break down large components** - Split ItemList.tsx into smaller pieces
4. **Create more services** - Extract logic from other components

## 📝 Migration Checklist

- [ ] Create service for collaborations
- [ ] Create service for claims
- [ ] Create hooks for collaborations
- [ ] Create hooks for claims
- [ ] Refactor ItemList.tsx to use new hooks
- [ ] Refactor AddItem.tsx to use new hooks
- [ ] Refactor MyItemsManager.tsx to use new hooks
- [ ] Break down large components into smaller pieces

## 💡 Benefits

✅ **Reusable Logic** - Business logic can be shared between web and mobile  
✅ **Easier Testing** - Services and hooks can be tested independently  
✅ **Better Organization** - Clear separation of concerns  
✅ **Smaller Components** - Components focus on UI, not business logic  
✅ **Type Safety** - Centralized types and interfaces  

