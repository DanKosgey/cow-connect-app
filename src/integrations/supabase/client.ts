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
          console.log('Supabase client: Making request', { input, retries });
          
          const response = await fetch(input, { 
            ...init, 
            signal: AbortSignal.timeout(60000) // 60 second timeout
          });
          
          console.log('Supabase client: Response received', { 
            status: response.status, 
            statusText: response.statusText,
            url: typeof input === 'string' ? input : 'REQUEST_OBJECT'
          });
          
          // If we get a 400 error, it might be due to an expired session
          if (response.status === 400) {
            if (import.meta.env.DEV) {
              console.warn('Received 400 error from Supabase, may be due to expired session or malformed request', {
                url: typeof input === 'string' ? input : 'REQUEST_OBJECT',
                status: response.status,
                statusText: response.statusText
              });
            }
          }
          
          // If we get a 401 error, it's likely an auth issue
          if (response.status === 401) {
            if (import.meta.env.DEV) {
              console.warn('Received 401 Unauthorized error from Supabase, session may be invalid', {
                url: typeof input === 'string' ? input : 'REQUEST_OBJECT',
                status: response.status,
                statusText: response.statusText
              });
            }
          }
          
          // If we get a 406 error, log it for debugging
          if (response.status === 406) {
            if (import.meta.env.DEV) {
              console.warn('Received 406 Not Acceptable error from Supabase', {
                url: typeof input === 'string' ? input : 'REQUEST_OBJECT',
                status: response.status,
                statusText: response.statusText,
                headers: init?.headers
              });
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

// Validate configuration
if (!SUPABASE_URL) {
  console.error('Missing VITE_SUPABASE_URL environment variable');
}

if (!SUPABASE_PUBLISHABLE_KEY) {
  console.error('Missing VITE_SUPABASE_PUBLISHABLE_KEY environment variable');
}

// Create client with enhanced error handling
const client = createClient<Database>(
  useTestInstance ? (stripQuotes(window.Cypress?.env('SUPABASE_URL') ?? '') ?? '') : (SUPABASE_URL ?? ''),
  useTestInstance ? (stripQuotes(window.Cypress?.env('SUPABASE_KEY') ?? '') ?? '') : (SUPABASE_PUBLISHABLE_KEY ?? ''),
  options
);

// Add connection state monitoring (only in development)
if (import.meta.env.DEV) {
  client.auth.onAuthStateChange((event, session) => {
    console.log('Supabase auth state change:', { event, session: session?.user?.id });
    
    if (event === 'SIGNED_IN') {
      console.log('User signed in, session established');
    } else if (event === 'SIGNED_OUT') {
      console.log('User signed out, session cleared');
    } else if (event === 'TOKEN_REFRESHED') {
      console.log('Token refreshed, connection maintained');
    } else if (event === 'USER_UPDATED') {
      console.log('User updated');
    }
  });
}

export const supabase = client as DBClient;