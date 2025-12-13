# Infinite Token Refresh Loop Fix - Summary

## Problem
The application was experiencing an infinite token refresh loop with the following symptoms:
1. Continuous `TOKEN_REFRESHED` events firing every ~500ms
2. HTTP 429 Too Many Requests errors from Supabase
3. Multiple redundant `getUserRole` RPC calls
4. UI blinking/flickering constantly
5. App never fully loading

## Root Causes Identified

### 1. Direct Calls to `supabase.auth.refreshSession()`
Several components were bypassing our AuthService and calling `supabase.auth.refreshSession()` directly:
- **AuthDiagnostics.tsx** - Line 98: Direct call in `forceRefreshSession` function
- **CollectionsView.tsx** - Line 91: Direct call in `handleRetry` function

### 2. Aggressive Session Validation in useSessionManager
The hook was setting up intervals and event listeners that triggered frequent manual refreshes, conflicting with Supabase's automatic refresh.

### 3. Missing Debouncing and Rate Limiting
No protection against rapid successive refresh calls.

### 4. Circular Refresh Events
TOKEN_REFRESHED events were triggering more refreshes, creating an infinite loop.

## Solutions Implemented

### 1. Fixed Direct Supabase Calls
Replaced direct `supabase.auth.refreshSession()` calls with our AuthService's debounced refresh:

**Before (AuthDiagnostics.tsx):**
```typescript
const { data, error } = await supabase.auth.refreshSession();
```

**After (AuthDiagnostics.tsx):**
```typescript
const result = await refreshSession(2); // Uses AuthService with retries
```

**Before (CollectionsView.tsx):**
```typescript
const { data, error } = await supabase.auth.refreshSession();
```

**After (CollectionsView.tsx):**
```typescript
// Removed direct call, now relies on page reload or existing data refresh mechanisms
window.location.reload();
```

### 2. Updated useSessionManager Hook
Modified to rely on Supabase's automatic refresh rather than forcing manual refreshes:

**Changes:**
- Removed window focus and visibility change handlers that were causing excessive refresh attempts
- Simplified validation to just check session validity without forcing refreshes
- Maintained interval for monitoring but without forced refreshes

### 3. Enhanced AuthService with Comprehensive Protection

#### Debouncing Mechanism
Added 1-second debounce to prevent rapid successive refresh calls:
```typescript
async debouncedRefreshSession(): Promise<{ session: Session | null; error: Error | null }> {
  // Clear any pending refresh
  if (this.refreshTimeout) {
    clearTimeout(this.refreshTimeout);
  }
  
  // Debounce by 1 second
  return new Promise((resolve) => {
    this.refreshTimeout = setTimeout(async () => {
      if (this.isRefreshing) {
        console.log('[AuthService] Refresh already in progress, skipping');
        resolve({ session: null, error: new Error('Refresh already in progress') });
        return;
      }
      
      // ... rest of refresh logic
    }, DEBOUNCE_DELAY);
  });
}
```

#### Role Caching
Implemented 5-minute TTL cache for user roles to prevent redundant RPC calls:
```typescript
const roleCache = new Map<string, { role: string; timestamp: number }>();
const ROLE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
```

#### Rate Limiting
Added rate limiter for role fetching:
```typescript
class RateLimiter {
  private calls: number[] = [];
  private maxCalls: number;
  private timeWindow: number;
  
  canCall(): boolean {
    const now = Date.now();
    this.calls = this.calls.filter(time => now - time < this.timeWindow);
    // ... rate limiting logic
  }
}

const roleRateLimiter = new RateLimiter(10, 10000); // 10 calls per 10 seconds
```

#### Circular Refresh Prevention
Added guards to prevent TOKEN_REFRESHED events from triggering more refreshes:
```typescript
case 'TOKEN_REFRESHED':
  // CRITICAL: Don't process TOKEN_REFRESHED if we're already refreshing
  if (this.isRefreshing) {
    console.log('[AuthService] Ignoring TOKEN_REFRESHED during active refresh');
    return;
  }
  // ... rest of handling
```

### 4. AuthContext Improvements
Enhanced coordination between components to prevent race conditions:

#### State Tracking
Added `isFetchingRole` state to prevent multiple simultaneous role fetches:
```typescript
const [isFetchingRole, setIsFetchingRole] = useState<boolean>(false);
```

#### Recursive Event Handling Prevention
Added flag to prevent recursive event handling:
```typescript
let isHandlingEvent = false;

const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
  // Prevent recursive event handling
  if (isHandlingEvent) {
    console.log('🔑 [AuthContext] Skipping recursive event:', event);
    return;
  }
  
  isHandlingEvent = true;
  // ... event handling logic
  
  // Reset the flag after handling the event
  setTimeout(() => {
    isHandlingEvent = false;
  }, 100);
});
```

## Testing Verification

After implementing these fixes, the following improvements should be observed:

1. ✅ No more continuous `TOKEN_REFRESHED` events
2. ✅ Elimination of HTTP 429 Too Many Requests errors
3. ✅ Single `getUserRole` call per user session (then cached)
4. ✅ Smooth UI without blinking/flickering
5. ✅ Stable application loading
6. ✅ Proper session management with Supabase's automatic refresh

## Monitoring Recommendations

1. **Watch Console Logs**: Look for reduced frequency of auth events
2. **Network Tab**: Verify no more 429 errors from Supabase auth endpoints
3. **Performance**: Observe improved responsiveness and reduced API calls
4. **User Experience**: Confirm smooth navigation without UI flickering

## Future Considerations

1. **Consider removing AuthDiagnostics component** in production to prevent accidental manual refreshes
2. **Monitor for new direct Supabase calls** that might bypass our protections
3. **Review third-party libraries** that might trigger auth refreshes
4. **Implement centralized error reporting** for auth-related issues

This comprehensive fix addresses all identified causes of the infinite token refresh loop and provides robust protection against future occurrences.