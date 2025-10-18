import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import type { DBClient } from '@/types/supabase-types';

// Helper to strip surrounding single/double quotes which sometimes appear in .env values
const stripQuotes = (v: any) => {
  if (!v || typeof v !== 'string') return v;
  return v.replace(/^['"]|['"]$/g, '');
};

// IMPORTANT: Never log sensitive information in production
if (import.meta.env.DEV) {
  console.log('Environment variables check:');
  console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL ? '[REDACTED]' : 'MISSING');
  console.log('VITE_SUPABASE_PUBLISHABLE_KEY:', import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ? '[REDACTED]' : 'MISSING');
  console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? '[REDACTED]' : 'MISSING');
}

const SUPABASE_URL = stripQuotes(import.meta.env.VITE_SUPABASE_URL);
// We use the publishable key env (anon/publishable) across the app
const SUPABASE_PUBLISHABLE_KEY = stripQuotes(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY);

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    Cypress?: any;
  }
}

// This ensures we're using the test instance when running in Cypress
const useTestInstance = typeof window !== 'undefined' && window.Cypress;

// Enhanced options with better session handling and increased timeouts
const options = {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce' as const,
  },
  db: {
    schema: 'public' as const,
  },
  global: {
    // Removed restrictive headers that might cause 406 errors
    // Let the Supabase client handle headers automatically
    headers: {},
    // Enhanced fetch with better error handling and retry logic
    fetch: (input: RequestInfo, init?: RequestInit) => {
      // Add retry logic for failed requests
      const fetchWithRetry = async (input: RequestInfo, init?: RequestInit, retries = 3): Promise<Response> => {
        try {
          // Only log in development and with reduced verbosity
          if (import.meta.env.DEV) {
            // Removed detailed request logging to reduce sensitive info exposure
          }
          
          const response = await fetch(input, { 
            ...init, 
            signal: AbortSignal.timeout(60000) // 60 second timeout
          });
          
          // Only log in development and with reduced verbosity
          if (import.meta.env.DEV) {
            // Removed detailed response logging to reduce sensitive info exposure
          }
          
          // If we get a 400 error, it might be due to an expired session
          if (response.status === 400) {
            if (import.meta.env.DEV) {
              console.warn('Received 400 error from Supabase, may be due to expired session');
            }
          }
          
          // If we get a 401 error, it's likely an auth issue
          if (response.status === 401) {
            if (import.meta.env.DEV) {
              console.warn('Received 401 Unauthorized error from Supabase, session may be invalid');
            }
          }
          
          // If we get a 406 error, log it for debugging
          if (response.status === 406) {
            if (import.meta.env.DEV) {
              console.warn('Received 406 Not Acceptable error from Supabase');
            }
          }
          
          // If we get a 404 error when trying to access collections, it might be due to session issues
          if (response.status === 404 && typeof input === 'string' && input.includes('/collections')) {
            if (import.meta.env.DEV) {
              console.warn('Received 404 error when accessing collections, may be due to session or permissions');
            }
          }
          
          return response;
        } catch (error) {
          if (retries > 0) {
            if (import.meta.env.DEV) {
              console.warn(`Fetch failed, retrying... (${retries} retries left)`, error);
            }
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)));
            return fetchWithRetry(input, init, retries - 1);
          }
          throw error;
        }
      };
      
      return fetchWithRetry(input, init);
    }
  },
  // Add realtime options to handle connection stability
  realtime: {
    heartbeatInterval: 30000, // 30 seconds
    timeout: 60000, // 60 seconds
  }
};

// Log the values being used (redacted in production)
if (import.meta.env.DEV) {
  console.log('Supabase client configuration:');
  console.log('SUPABASE_URL:', SUPABASE_URL ? '[REDACTED]' : 'MISSING');
  console.log('SUPABASE_PUBLISHABLE_KEY:', SUPABASE_PUBLISHABLE_KEY ? '[REDACTED]' : 'MISSING');
}

// Validate configuration and provide clear error messages
if (!SUPABASE_URL) {
  const errorMessage = 'CRITICAL ERROR: Missing VITE_SUPABASE_URL environment variable. Application will not be able to connect to Supabase.';
  console.error(errorMessage);
  throw new Error(errorMessage);
}

if (!SUPABASE_PUBLISHABLE_KEY) {
  const errorMessage = 'CRITICAL ERROR: Missing VITE_SUPABASE_PUBLISHABLE_KEY environment variable. Application will not be able to connect to Supabase.';
  console.error(errorMessage);
  throw new Error(errorMessage);
}

// Additional validation to prevent localhost connections in production
if (SUPABASE_URL.includes('localhost') && !import.meta.env.DEV) {
  const errorMessage = 'SECURITY WARNING: Using localhost Supabase URL in production environment. This will not work.';
  console.error(errorMessage);
  throw new Error(errorMessage);
}

// Create client with enhanced error handling
const client = createClient<Database>(
  useTestInstance ? (stripQuotes(window.Cypress?.env('SUPABASE_URL') ?? '') ?? '') : (SUPABASE_URL ?? ''),
  useTestInstance ? (stripQuotes(window.Cypress?.env('SUPABASE_KEY') ?? '') ?? '') : (SUPABASE_PUBLISHABLE_KEY ?? ''),
  options
);

// Add connection state monitoring (only minimal logging in development)
if (import.meta.env.DEV) {
  client.auth.onAuthStateChange((event, session) => {
    // Reduced logging to only show event type
    console.log('Supabase auth state change:', { event });
    
    // If we detect a SIGNED_OUT event, we might want to redirect to login
    if (event === 'SIGNED_OUT') {
      console.log('User signed out, redirecting to login');
      // We could trigger a redirect here if needed
    }
  });
}

export const supabase = client as DBClient;