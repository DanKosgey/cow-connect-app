import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// Environment variables validation
const getEnvVar = (key: string): string => {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(`Missing ${key} environment variable`);
  }
  return value;
};

// Supabase configuration
const SUPABASE_URL = getEnvVar('VITE_SUPABASE_URL');
const SUPABASE_KEY = getEnvVar('VITE_SUPABASE_ANON_KEY');

// Validate configuration
if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Missing Supabase configuration');
}

// Prevent localhost in production
if (import.meta.env.PROD && SUPABASE_URL.includes('localhost')) {
  throw new Error('Cannot use localhost Supabase URL in production build');
}

// Enhanced fetch with retry logic
const createEnhancedFetch = () => {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const MAX_RETRIES = 3;
    const TIMEOUT = 30000; // 30 seconds
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
          throw error;
        }

        // Exponential backoff with jitter
        const baseDelay = Math.min(1000 * Math.pow(2, attempt), 8000);
        const jitter = Math.random() * 1000;
        const delay = baseDelay + jitter;
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error('Maximum retry attempts exceeded');
  };
};

// Create Supabase client with enhanced configuration
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    // Use cookies for session storage (more secure than localStorage)
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
    }
  }
});

// Type-safe client export
export type SupabaseClient = typeof supabase;

export default supabase;