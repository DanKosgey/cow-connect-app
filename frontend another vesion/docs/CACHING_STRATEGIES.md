# Caching Strategies Implementation

This document explains how caching strategies have been implemented in the DairyChain Pro application using React Query.

## Overview

We've implemented caching strategies to:
1. Reduce redundant API calls
2. Improve perceived performance
3. Provide optimistic updates for better UX
4. Implement pagination for large datasets

## React Query Hooks

### Farmers Hooks (`src/hooks/queries/useFarmers.ts`)

#### `useFarmers(limit, offset, search, status)`
Fetches a list of farmers with pagination and search capabilities.

**Cache Settings:**
- `staleTime`: 5 minutes (300,000 ms)
- `gcTime`: 10 minutes (600,000 ms)

#### `useFarmer(id)`
Fetches a single farmer by ID.

**Cache Settings:**
- `staleTime`: 5 minutes (300,000 ms)
- `gcTime`: 10 minutes (600,000 ms)

#### `useCreateFarmer()`
Creates a new farmer with optimistic updates.

#### `useUpdateFarmer()`
Updates a farmer with optimistic updates.

#### `useDeleteFarmer()`
Deletes a farmer with optimistic updates.

### Collections Hooks (`src/hooks/queries/useCollections.ts`)

#### `useCollections(limit, offset, farmerId, staffId)`
Fetches a list of collections with pagination.

**Cache Settings:**
- `staleTime`: 2 minutes (120,000 ms) - More dynamic data
- `gcTime`: 5 minutes (300,000 ms)
- `placeholderData`: Keeps previous data when fetching next page

#### `useCollection(id)`
Fetches a single collection by ID.

**Cache Settings:**
- `staleTime`: 2 minutes (120,000 ms)
- `gcTime`: 5 minutes (300,000 ms)

#### `useCreateCollection()`
Creates a new collection with optimistic updates.

#### `useUpdateCollection()`
Updates a collection with optimistic updates.

#### `useDeleteCollection()`
Deletes a collection with optimistic updates.

### Payments Hooks (`src/hooks/queries/usePayments.ts`)

#### `usePayments(limit, offset, farmerId)`
Fetches a list of payments with pagination.

**Cache Settings:**
- `staleTime`: 3 minutes (180,000 ms)
- `gcTime`: 10 minutes (600,000 ms)

#### `usePayment(id)`
Fetches a single payment by ID.

**Cache Settings:**
- `staleTime`: 3 minutes (180,000 ms)
- `gcTime`: 10 minutes (600,000 ms)

#### `usePaymentProjections(farmerId)`
Fetches payment projections for a farmer.

**Cache Settings:**
- `staleTime`: 3 minutes (180,000 ms)
- `gcTime`: 10 minutes (600,000 ms)

#### `usePaymentHistory(farmerId, params)`
Fetches payment history for a farmer.

**Cache Settings:**
- `staleTime`: 3 minutes (180,000 ms)
- `gcTime`: 10 minutes (600,000 ms)

#### `useCreatePayment()`
Creates a new payment with optimistic updates.

#### `useUpdatePayment()`
Updates a payment with optimistic updates.

#### `useDeletePayment()`
Deletes a payment with optimistic updates.

## Cache Configuration

### Static vs Dynamic Data

We've configured different cache times based on data type:

1. **Static Data (Farmers)**
   - `staleTime`: 5 minutes
   - `gcTime`: 10 minutes
   - Farmers' basic information doesn't change frequently

2. **Dynamic Data (Collections)**
   - `staleTime`: 2 minutes
   - `gcTime`: 5 minutes
   - Collections are created frequently, so we want fresher data

3. **Semi-Dynamic Data (Payments)**
   - `staleTime`: 3 minutes
   - `gcTime`: 10 minutes
   - Payments are processed regularly but not as frequently as collections

## Optimistic Updates

All mutation hooks implement optimistic updates to provide immediate feedback to users:

1. **onMutate**: Cancel outgoing refetches and optimistically update the cache
2. **onError**: Rollback changes if the mutation fails
3. **onSettled**: Invalidate and refetch queries after mutation completes

## Pagination

The `useCollections` hook implements pagination with:
- `keepPreviousData`: Keeps previous data when fetching the next page for smooth transitions
- Proper query keys that include pagination parameters

## Usage Examples

### Basic Data Fetching
```typescript
import { useFarmers } from '@/hooks/queries';

const MyComponent = () => {
  const { data, isLoading, error } = useFarmers(50, 0);
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      {data?.items.map(farmer => (
        <div key={farmer.id}>{farmer.name}</div>
      ))}
    </div>
  );
};
```

### With Pagination
```typescript
import { useCollections } from '@/hooks/queries';
import { useState } from 'react';

const CollectionsList = () => {
  const [page, setPage] = useState(1);
  const limit = 20;
  const { data, isLoading } = useCollections(limit, (page - 1) * limit);
  
  return (
    <div>
      {/* Collection items */}
      <button onClick={() => setPage(p => p - 1)}>Previous</button>
      <button onClick={() => setPage(p => p + 1)}>Next</button>
    </div>
  );
};
```

### With Mutations
```typescript
import { useCreateFarmer } from '@/hooks/queries';

const AddFarmerForm = () => {
  const { mutate, isLoading } = useCreateFarmer();
  
  const handleSubmit = (farmerData) => {
    mutate(farmerData, {
      onSuccess: () => {
        // Handle success
      },
      onError: (error) => {
        // Handle error
      }
    });
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Adding...' : 'Add Farmer'}
      </button>
    </form>
  );
};
```

## Benefits

1. **Reduced API Calls**: Data is cached and reused when appropriate
2. **Improved Performance**: Users see immediate feedback with optimistic updates
3. **Better UX**: Smooth pagination transitions with `keepPreviousData`
4. **Automatic Deduplication**: Multiple components requesting the same data only make one request
5. **Background Refetching**: Stale data is automatically refetched in the background