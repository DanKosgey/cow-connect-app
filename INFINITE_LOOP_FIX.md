# Fix for Infinite Token Refresh Loop

## Problem
Your app was stuck in an infinite loop where:
- `TOKEN_REFRESHED` fires every ~500ms
- Multiple `getUserRole` RPC calls happen simultaneously
- UI blinks/flickers constantly
- App never fully loads

## Root Causes

1. **Circular Token Refresh**: Each token refresh triggers another refresh
2. **No Debouncing**: Session refresh called multiple times without delay
3. **Redundant RPC Calls**: Same user role fetched multiple times per second
4. **Race Conditions**: Multiple auth state changes processed simultaneously

## Solutions Implemented

### 1. Added Debouncing to Session Refresh

In `auth-service.ts`, we implemented a debounced refresh session function:

```typescript
private refreshTimeout: NodeJS.Timeout | null = null;

async debouncedRefreshSession(): Promise<any> {
  // Clear any pending refresh
  if (this.refreshTimeout) {
    clearTimeout(this.refreshTimeout);
  }
  
  // Debounce by 1 second
  return new Promise((resolve) => {
    this.refreshTimeout = setTimeout(async () => {
      if (this.isRefreshing) {
        console.log('[AuthService] Refresh already in progress, skipping');
        resolve(null);
        return;
      }
      
      this.isRefreshing = true;
      try {
        console.log('[AuthService] Starting session refresh');
        const { data, error } = await supabase.auth.refreshSession();
        
        if (error) {
          console.error('[AuthService] Session refresh error:', error);
        }
        resolve(data);
      } finally {
        this.isRefreshing = false;
      }
    }, 1000);
  });
}
```

### 2. Added Caching for User Roles

We implemented a role cache with TTL (Time To Live):

```typescript
// Role cache
const roleCache = new Map<string, { role: string; timestamp: number }>();
const ROLE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// In getUserRole method:
// Check cache first
const cached = roleCache.get(userId);
if (cached && Date.now() - cached.timestamp < ROLE_CACHE_TTL) {
  console.log(`🔐 [AuthService] Returning cached role: ${cached.role}`);
  return cached.role as UserRole;
}
```

### 3. Added Rate Limiting

To prevent excessive calls, we implemented a rate limiter:

```typescript
class RateLimiter {
  private calls: number[] = [];
  private maxCalls: number;
  private timeWindow: number;
  
  constructor(maxCalls: number, timeWindowMs: number) {
    this.maxCalls = maxCalls;
    this.timeWindow = timeWindowMs;
  }
  
  canCall(): boolean {
    const now = Date.now();
    this.calls = this.calls.filter(time => now - time < this.timeWindow);
    
    if (this.calls.length >= this.maxCalls) {
      console.warn('[AuthService] Rate limit exceeded');
      return false;
    }
    
    this.calls.push(now);
    return true;
  }
}

const roleRateLimiter = new RateLimiter(10, 10000); // 10 calls per 10 seconds
```

### 4. Fixed Auth State Handler

Prevented TOKEN_REFRESHED from triggering another refresh:

```typescript
private handleAuthStateChange(event: string, session: Session | null): void {
  switch (event) {
    // ... other cases
    
    case 'TOKEN_REFRESHED':
      // CRITICAL: Don't process TOKEN_REFRESHED if we're already refreshing
      if (this.isRefreshing) {
        console.log('[AuthService] Ignoring TOKEN_REFRESHED during active refresh');
        return;
      }
      
      this.currentSession = session;
      this.currentUser = session?.user || null;
      console.log('Token refreshed:', session?.user?.id);
      break;
      
    // ... other cases
  }
}
```

### 5. Optimized AuthContext

Prevented multiple simultaneous role fetches in AuthContext:

```typescript
const [isFetchingRole, setIsFetchingRole] = useState<boolean>(false);

// In TOKEN_REFRESHED handler:
if (userRole && !isFetchingRole) {
  console.log('🔑 [AuthContext] TOKEN_REFRESHED: Using existing role, not refetching');
  // Just update session, don't refetch role if we have it
} else if (!isFetchingRole) {
  console.log('🔑 [AuthContext] TOKEN_REFRESHED: Refreshing user role for:', session.user.id);
  setIsFetchingRole(true);
  authService.getUserRole(session.user.id).then(role => {
    console.log('🔑 [AuthContext] TOKEN_REFRESHED: User role refreshed:', role);
    setUserRole(role);
  }).catch(error => {
    console.error('🔑 [AuthContext] TOKEN_REFRESHED: Error refreshing user role:', error);
  }).finally(() => {
    setIsFetchingRole(false);
  });
}
```

## Quick Fix Checklist

✅ Added `isRefreshing` flag to prevent concurrent refreshes
✅ Debounce session refresh by 1 second
✅ Cache user roles with 5-minute TTL
✅ Ignore TOKEN_REFRESHED events during active refresh
✅ Add rate limiting to getUserRole
✅ Prevent redundant session refresh calls from AuthContext
✅ Clear role cache on sign out

## Testing

After applying fixes, you should see:
- No more rapid TOKEN_REFRESHED events
- getUserRole called once per user session (then cached)
- Smooth UI without blinking
- App loads fully and stays stable

## Production Config

For Supabase client initialization, ensure:

```typescript
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    // Set reasonable refresh threshold
    refreshThreshold: 300, // 5 minutes before expiry
  },
});
```

This prevents too-frequent token refreshes.