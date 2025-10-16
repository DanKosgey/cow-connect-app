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
  console.log('Service client environment variables check:');
  console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL ? '[REDACTED]' : 'MISSING');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', import.meta.env.SUPABASE_SERVICE_ROLE_KEY ? '[REDACTED]' : 'MISSING');
}

const SUPABASE_URL = stripQuotes(import.meta.env.VITE_SUPABASE_URL);
const SUPABASE_SERVICE_ROLE_KEY = stripQuotes(import.meta.env.SUPABASE_SERVICE_ROLE_KEY);

// Validate configuration
if (!SUPABASE_URL) {
  console.error('Missing VITE_SUPABASE_URL environment variable for service client');
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable for service client');
}

// Create service client with service role key
// NOTE: This should only be used in server-side functions or Edge functions, never in client-side code
const serviceClient = createClient<Database>(
  SUPABASE_URL ?? '',
  SUPABASE_SERVICE_ROLE_KEY ?? '',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY ?? '',
      }
    }
  }
);

export const supabaseService = serviceClient as DBClient;