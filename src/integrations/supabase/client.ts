import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import type { DBClient } from '@/types/supabase-types';

// ============================================
// HELPER FUNCTIONS
// ============================================

// Strip quotes from environment variables
const stripQuotes = (value: string | undefined): string => {
  if (!value || typeof value !== 'string') return '';
  return value.replace(/^['"]|['"]$/g, '');
};

// Development-only logging
const devLog = (message: string, data?: any) => {
  if (import.meta.env.DEV) {
    console.log(`[Supabase] ${message}`, data || '');
  }
};

// ============================================
// ENVIRONMENT CONFIGURATION
// ============================================

const SUPABASE_URL = stripQuotes(import.meta.env.VITE_SUPABASE_URL);
const SUPABASE_KEY = stripQuotes(
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Validate configuration on load
if (import.meta.env.DEV) {
  devLog('Configuration check', {
    url: SUPABASE_URL ? '✓ Found' : '✗ Missing',
    key: SUPABASE_KEY ? '✓ Found' : '✗ Missing'
  });
}

// Critical validation
if (!SUPABASE_URL) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable');
}

if (!SUPABASE_KEY) {
  throw new Error('Missing VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY');
}

// Prevent localhost in production
if (!import.meta.env.DEV && SUPABASE_URL.includes('localhost')) {
  throw new Error('Cannot use localhost Supabase URL in production');
}

// ============================================
// ENHANCED FETCH WITH RETRY LOGIC
// ============================================

const createEnhancedFetch = () => {
  return async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
    const MAX_RETRIES = 3;
    const TIMEOUT = 60000; // 60 seconds

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

        const response = await fetch(input, {
          ...init,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        // Log important errors in development
        if (import.meta.env.DEV && !response.ok) {
          const errorMap: Record<number, string> = {
            400: 'Bad Request - Check request payload',
            401: 'Unauthorized - Session may be invalid',
            403: 'Forbidden - Check RLS policies',
            404: 'Not Found - Resource does not exist',
            406: 'Not Acceptable - Check request headers',
            500: 'Server Error - Supabase issue'
          };

          const message = errorMap[response.status] || `HTTP ${response.status}`;
          console.warn(`⚠️ ${message}`);
        }

        return response;
      } catch (error) {
        const isLastAttempt = attempt === MAX_RETRIES;

        if (isLastAttempt) {
          devLog('Request failed after all retries', { error });
          throw error;
        }

        // Exponential backoff: 1s, 2s, 3s
        const delay = 1000 * (attempt + 1);
        devLog(`Retry ${attempt + 1}/${MAX_RETRIES}`, { delay: `${delay}ms` });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error('Max retries exceeded');
  };
};

// ============================================
// SUPABASE CLIENT CONFIGURATION
// ============================================

// Check if running in Cypress test environment
const isTestEnvironment = typeof window !== 'undefined' && window.Cypress;

// Get test credentials if available
const testUrl = isTestEnvironment ? stripQuotes(window.Cypress?.env('SUPABASE_URL')) : '';
const testKey = isTestEnvironment ? stripQuotes(window.Cypress?.env('SUPABASE_KEY')) : '';

// Create Supabase client with optimized configuration
const client = createClient<Database>(
  testUrl || SUPABASE_URL,
  testKey || SUPABASE_KEY,
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce' as const
    },
    db: {
      schema: 'public' as const
    },
    global: {
      headers: {},
      fetch: createEnhancedFetch()
    },
    realtime: {
      heartbeatInterval: 30000, // 30 seconds
      timeout: 60000 // 60 seconds
    }
  }
);

// ============================================
// AUTH STATE MONITORING (Development Only)
// ============================================

if (import.meta.env.DEV) {
  client.auth.onAuthStateChange((event, session) => {
    devLog('Auth state changed', { 
      event,
      hasSession: !!session,
      userId: session?.user?.id ? '[REDACTED]' : null
    });
  });
}

// ============================================
// TYPE EXTENSIONS
// ============================================

declare global {
  interface Window {
    Cypress?: {
      env: (key: string) => string;
    };
  }
}

// ============================================
// EXPORTS
// ============================================

export const supabase = client as DBClient;

// Export utility functions
export const getSupabaseClient = () => client as DBClient;

export const isClientReady = (): boolean => {
  try {
    return !!client;
  } catch {
    return false;
  }
};

// Safe user retrieval
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await client.auth.getUser();
    if (error) throw error;
    return user;
  } catch (error) {
    devLog('Error getting current user', { error });
    return null;
  }
};

// Safe session retrieval
export const getCurrentSession = async () => {
  try {
    const { data: { session }, error } = await client.auth.getSession();
    if (error) throw error;
    return session;
  } catch (error) {
    devLog('Error getting current session', { error });
    return null;
  }
};