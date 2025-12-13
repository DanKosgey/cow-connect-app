import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import type { DBClient } from '@/types/supabase-types';

// ============================================
// HELPER FUNCTIONS
// ============================================

const stripQuotes = (value: string | undefined): string => {
  if (!value || typeof value !== 'string') return '';
  return value.replace(/^['"]|['"]$/g, '');
};

const devLog = (message: string, data?: unknown): void => {
  if (import.meta.env.DEV) {
    console.log(`[Supabase] ${message}`, data ?? '');
  }
};

// ============================================
// ENVIRONMENT CONFIGURATION
// ============================================

const getEnvVar = (key: string): string => {
  const value = stripQuotes(import.meta.env[key]);
  if (!value) {
    throw new Error(`Missing ${key} environment variable`);
  }
  return value;
};

const SUPABASE_URL = (() => {
  try {
    return getEnvVar('VITE_SUPABASE_URL');
  } catch (error) {
    if (import.meta.env.DEV) {
      devLog('Configuration Error', error);
    }
    throw error;
  }
})();

const SUPABASE_KEY = (() => {
  const key = stripQuotes(import.meta.env.VITE_SUPABASE_ANON_KEY);
  if (!key) {
    throw new Error('Missing VITE_SUPABASE_ANON_KEY');
  }
  return key;
})();

// Validate configuration
if (import.meta.env.DEV) {
  devLog('Configuration Status', {
    url: SUPABASE_URL ? '✓ Valid' : '✗ Missing',
    key: SUPABASE_KEY ? '✓ Valid' : '✗ Missing',
    mode: import.meta.env.MODE
  });
}

// Prevent localhost in production
if (import.meta.env.PROD && SUPABASE_URL.includes('localhost')) {
  throw new Error('Cannot use localhost Supabase URL in production build');
}

// ============================================
// ENHANCED FETCH WITH RETRY LOGIC
// ============================================

interface FetchOptions extends RequestInit {
  retries?: number;
  timeout?: number;
}

const sleep = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

const createEnhancedFetch = () => {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const MAX_RETRIES = 3;
    const TIMEOUT = 90000; // 90 seconds
    const RETRY_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

      try {
        const response = await fetch(input, {
          ...init,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        // Log errors in development
        if (import.meta.env.DEV && !response.ok) {
          const errorMessages: Record<number, string> = {
            400: 'Bad Request - Invalid payload',
            401: 'Unauthorized - Authentication required',
            403: 'Forbidden - Check RLS policies',
            404: 'Not Found - Resource missing',
            406: 'Not Acceptable - Invalid headers',
            500: 'Internal Server Error',
            502: 'Bad Gateway',
            503: 'Service Unavailable'
          };

          const message = errorMessages[response.status] || `HTTP ${response.status}`;
          console.warn(`⚠️ Supabase: ${message}`);
        }

        // Only retry on specific status codes
        if (response.ok || !RETRY_STATUS_CODES.has(response.status)) {
          return response;
        }

        // If not ok and retryable, throw to trigger retry
        throw new Error(`Retryable error: ${response.status}`);
      } catch (error) {
        clearTimeout(timeoutId);
        
        const isLastAttempt = attempt === MAX_RETRIES;
        const isAbortError = error instanceof Error && error.name === 'AbortError';

        if (isLastAttempt) {
          devLog('Request failed after all retries', { 
            error: error instanceof Error ? error.message : 'Unknown error',
            attempts: attempt + 1
          });
          throw error;
        }

        // Exponential backoff with jitter: ~1s, ~2s, ~4s (capped at 8s base)
        const baseDelay = Math.min(1000 * Math.pow(2, attempt), 8000);
        const jitter = Math.random() * 1000;
        const delay = baseDelay + jitter;

        devLog(`Retrying request (${attempt + 1}/${MAX_RETRIES})`, { 
          delay: `${Math.round(delay)}ms`,
          reason: isAbortError ? 'Timeout' : 'Network error'
        });
        
        await sleep(delay);
      }
    }

    throw new Error('Maximum retry attempts exceeded');
  };
};

// ============================================
// SUPABASE CLIENT CONFIGURATION
// ============================================

const isTestEnvironment = (): boolean => {
  return typeof window !== 'undefined' && 
         'Cypress' in window && 
         typeof window.Cypress === 'object';
};

const getTestCredentials = (): { url: string; key: string } | null => {
  if (!isTestEnvironment()) return null;
  
  try {
    const url = stripQuotes(window.Cypress?.env('SUPABASE_URL'));
    const key = stripQuotes(window.Cypress?.env('SUPABASE_KEY'));
    
    if (url && key) {
      devLog('Using Cypress test credentials');
      return { url, key };
    }
  } catch (error) {
    devLog('Failed to load Cypress credentials', error);
  }
  
  return null;
};

const testCreds = getTestCredentials();
const clientUrl = testCreds?.url || SUPABASE_URL;
const clientKey = testCreds?.key || SUPABASE_KEY;

const client = createClient<Database>(clientUrl, clientKey, {
  auth: {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-web'
    },
    fetch: createEnhancedFetch()
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    },
    heartbeatIntervalMs: 30000,
    timeout: 60000
  }
});

// ============================================
// DEBUGGING ADDITIONS (DEV only)
// ============================================

// Immediate client initialization logging
if (import.meta.env.DEV && typeof window !== 'undefined') {
  devLog('Client initialized', {
    url: clientUrl,
    keyPreview: `${clientKey.slice(0, 4)}...${clientKey.slice(-4)}`,
    storageAvailable: (() => {
      try { return !!window.localStorage; } catch { return false; }
    })()
  });
}

// Enhanced auth state change logging
client.auth.onAuthStateChange((event, session) => {
  if (import.meta.env.DEV) {
    console.debug('[Auth RAW]', event, session);
    
    // Additional detailed logging
    devLog('Auth state changed', { 
      event,
      hasSession: !!session,
      userId: session?.user?.id ? '[REDACTED]' : null,
      expiresAt: session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null
    });
  }

  // Handle visibility change for inactive tabs
  if (typeof window !== 'undefined' && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'visible') {
        try {
          await refreshSession();
          await scheduleRefresh();
        } catch (error) {
          devLog('Failed to refresh on visibility change', { error });
        }
      }
    });
  }
});

// ============================================
// TYPE EXTENSIONS
// ============================================

declare global {
  interface Window {
    Cypress?: {
      env: (key: string) => string | undefined;
    };
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await client.auth.getUser();
    
    if (error) {
      devLog('Error fetching user', { error: error.message });
      throw error; // Throw to allow callers to handle
    }
    
    return user;
  } catch (error) {
    devLog('Exception getting user', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    throw error;
  }
};

export const getCurrentSession = async () => {
  try {
    const { data: { session }, error } = await client.auth.getSession();
    
    if (error) {
      devLog('Error fetching session', { error: error.message });
      throw error;
    }
    
    return session;
  } catch (error) {
    devLog('Exception getting session', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    throw error;
  }
};

export const isClientReady = (): boolean => {
  return !!client;
};

export const refreshSession = async (force = false) => {
  try {
    if (!force) {
      const currentSession = await getCurrentSession();
      if (currentSession) {
        // Check if session is near expiration (e.g., within 5 minutes)
        const expiresAt = currentSession.expires_at;
        if (expiresAt && (expiresAt * 1000 - Date.now()) > 5 * 60 * 1000) {
          return currentSession;
        }
      }
    }

    const { data, error } = await client.auth.refreshSession();
    
    if (error) {
      devLog('Error refreshing session', { error: error.message });
      throw error;
    }
    
    return data.session;
  } catch (error) {
    devLog('Exception refreshing session', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
};

export const signOut = async () => {
  try {
    const { error } = await client.auth.signOut();
    if (error) {
      devLog('Error signing out', { error: error.message });
      throw error;
    }
    // Clear any persisted data if needed
    if (typeof window !== 'undefined') {
      // Clear the correct localStorage key used by Supabase
      const localStorageKey = `sb-${new URL(clientUrl).hostname.split('.')[0]}-auth-token`;
      window.localStorage.removeItem(localStorageKey);
    }
  } catch (error) {
    devLog('Exception signing out', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
};

// Optional: Add a proactive session check wrapper for queries
export const withValidSession = async <T>(operation: () => Promise<T>): Promise<T> => {
  await refreshSession();
  return operation();
};

// ============================================
// AUTOMATIC SESSION HANDLING
// ============================================

let refreshTimeout: ReturnType<typeof setTimeout> | null = null;

const scheduleRefresh = async () => {
  if (refreshTimeout) {
    clearTimeout(refreshTimeout);
    refreshTimeout = null;
  }

  const session = await getCurrentSession();
  if (!session || !session.expires_in) return;

  const refreshDelay = (session.expires_in - 60) * 1000; // Refresh 1 minute before expiration
  if (refreshDelay > 0) {
    refreshTimeout = setTimeout(async () => {
      try {
        await refreshSession(true);
        await scheduleRefresh(); // Reschedule after successful refresh
      } catch (error) {
        devLog('Failed to refresh session automatically', { error });
        // Optionally sign out on failure
        // await signOut();
      }
    }, refreshDelay);
  }
};

// ============================================
// EXPORTS
// ============================================

export const supabase = client as DBClient;
export const getSupabaseClient = () => client as DBClient;

export default supabase;