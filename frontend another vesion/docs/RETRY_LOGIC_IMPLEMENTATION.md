# Retry Logic Implementation

This document describes the retry logic implementation in the DairyChain Pro application.

## Overview

The retry logic is implemented at multiple levels to ensure robust error handling and improve user experience:

1. **React Query Hooks** - Automatic retries for data fetching
2. **Custom Hooks** - Manual retry functionality for specific operations
3. **API Service** - Built-in retry mechanism for all API calls
4. **Error Boundaries** - User-facing retry options for UI errors

## React Query Retry Configuration

All React Query hooks have been configured with retry logic:

### Configuration Details
- **Max Retries**: 3 attempts
- **Retry Delay**: Exponential backoff starting at 1 second
- **Max Delay**: 30 seconds between retries
- **Retry Conditions**: Only retries server errors (5xx) and network errors

### Implementation Example

```typescript
export function useCollections(limit = 50, offset = 0, farmerId?: string, staffId?: string) {
  return useQuery({
    queryKey: ['collections', limit, offset, farmerId, staffId],
    queryFn: () => apiService.Collections.list(limit, offset, farmerId, staffId),
    staleTime: COLLECTIONS_STALE_TIME,
    gcTime: COLLECTIONS_CACHE_TIME,
    placeholderData: (prev) => prev,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
```

## Custom Retry Hooks

### useRetryableOperation

A flexible hook for creating retryable operations:

```typescript
import useRetryableOperation from '@/hooks/useRetryableOperation';

const { execute, loading, error, retryCount, canRetry, reset, isRetrying } = useRetryableOperation(
  () => apiCall(),
  {
    maxRetries: 3,
    retryDelay: 1000,
    exponentialBackoff: true,
    maxDelay: 30000,
    onError: (error, attempt) => console.error(`Attempt ${attempt} failed:`, error),
    onSuccess: (result) => console.log('Success:', result),
    onRetry: (attempt, error, nextDelay) => console.log(`Retrying in ${nextDelay}ms`)
  }
);
```

### useApiRetry

A specialized hook for API calls with retry functionality:

```typescript
import useApiRetry from '@/hooks/useApiRetry';

const { data, loading, error, retryCount, canRetry, execute, reset, isRetrying } = useApiRetry(
  () => apiService.Collections.create(collectionData),
  {
    maxRetries: 3,
    retryDelay: 1000,
    exponentialBackoff: true,
    maxDelay: 30000,
    onRetry: (attempt, error, nextDelay) => {
      console.log(`Retry attempt ${attempt} in ${nextDelay}ms`);
    }
  }
);
```

## API Service Integration

The base API service now includes built-in retry functionality:

```typescript
import { executeWithRetry, RetryOptions } from '@/utils/apiRetryUtils';

async function request<T>(path: string, opts: RequestInit = {}, retryOptions?: RetryOptions): Promise<T> {
  return executeWithRetry<T>(async () => {
    // API call implementation
  }, retryOptions);
}
```

## Error Boundaries

All error boundaries have been enhanced with retry functionality:

### GlobalErrorBoundary
- Provides "Try Again" button that resets the error state
- Tracks retry attempts
- Offers multiple recovery options (Refresh, Go Home)

### ErrorBoundary
- Simple retry functionality for component-level errors
- Visual indication of retry attempts

### ComprehensiveErrorBoundary
- Full-featured error boundary with multiple recovery options
- Copy error details functionality
- Retry attempt tracking

## Retry Logic Utilities

### apiRetryUtils.ts

Contains utility functions for consistent retry behavior:

- `calculateRetryDelay` - Implements exponential backoff
- `executeWithRetry` - Core retry execution logic
- `isRetryableError` - Determines if an error should be retried
- `getRetryErrorMessage` - Provides user-friendly error messages

### Default Retry Configuration

```typescript
export const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  retryDelay: 1000,
  exponentialBackoff: true,
  maxDelay: 30000,
  shouldRetry: (error: any) => {
    // Don't retry client errors (4xx) except for 429 (rate limiting)
    if (error?.status >= 400 && error?.status < 500 && error?.status !== 429) {
      return false;
    }
    // Retry server errors (5xx) and network errors
    return true;
  }
};
```

## Best Practices

1. **Selective Retrying**: Only retry server errors and network issues
2. **Exponential Backoff**: Prevent overwhelming the server
3. **User Feedback**: Provide clear retry status to users
4. **Max Retry Limits**: Prevent infinite retry loops
5. **Error Reporting**: Log retry attempts for debugging

## Testing

The retry logic has been tested with:
- Network failure simulations
- Server error scenarios
- Rate limiting conditions
- Client error handling

## Future Improvements

1. **Persistent Retry Queue**: Store failed operations for retry when connectivity is restored
2. **Smart Retry Scheduling**: Adjust retry timing based on error types
3. **User-Controlled Retries**: Allow users to configure retry preferences
4. **Advanced Error Analysis**: Implement intelligent retry strategies based on error patterns