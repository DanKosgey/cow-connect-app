import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import type { DBClient } from '@/types/supabase-types';

// ============================================
// HELPER FUNCTIONS
// ============================================

const stripQuotes = (value: string | undefined): string => {
  if (!value || typeof value !== 'string') return '';
  return value.replace(/^['"]|['"]$/g, '');
};

const devLog = (message: string, data?: any) => {
  if (import.meta.env.DEV) {
    console.log(`[Service Client] ${message}`, data || '');
  }
};

const devError = (message: string) => {
  if (import.meta.env.DEV) {
    console.error(`[Service Client] ❌ ${message}`);
  }
};

// ============================================
// ENVIRONMENT CONFIGURATION
// ============================================

const SUPABASE_URL = stripQuotes(import.meta.env.VITE_SUPABASE_URL);
const SERVICE_ROLE_KEY = stripQuotes(import.meta.env.SUPABASE_SERVICE_ROLE_KEY);

// Validate configuration
if (import.meta.env.DEV) {
  devLog('Configuration check', {
    url: SUPABASE_URL ? '✓ Found' : '✗ Missing',
    serviceKey: SERVICE_ROLE_KEY ? '✓ Found' : '✗ Missing'
  });
}

if (!SUPABASE_URL) {
  devError('Missing VITE_SUPABASE_URL');
  throw new Error('VITE_SUPABASE_URL is required for service client');
}

if (!SERVICE_ROLE_KEY) {
  devError('Missing SUPABASE_SERVICE_ROLE_KEY');
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for service client');
}

// ⚠️ SECURITY WARNING
if (import.meta.env.DEV) {
  console.warn(
    '⚠️ SERVICE CLIENT LOADED\n' +
    '   This client has ADMIN privileges and bypasses RLS.\n' +
    '   NEVER use this in client-side code!\n' +
    '   Only use in server-side functions or Edge functions.'
  );
}

// ============================================
// SERVICE CLIENT CREATION
// ============================================

/**
 * Supabase Service Client with Admin Privileges
 * 
 * ⚠️ WARNING: This client bypasses Row Level Security (RLS)
 * 
 * Usage:
 * - Server-side functions only
 * - Edge functions / API routes
 * - Background jobs
 * - Admin operations
 * 
 * DO NOT USE in:
 * - React components
 * - Client-side code
 * - Browser environment
 */
const createServiceClient = (): SupabaseClient<Database> => {
  return createClient<Database>(
    SUPABASE_URL,
    SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'apikey': SERVICE_ROLE_KEY
        }
      }
    }
  );
};

// Create singleton instance
let serviceInstance: SupabaseClient<Database> | null = null;

export const getServiceClient = (): SupabaseClient<Database> => {
  if (!serviceInstance) {
    serviceInstance = createServiceClient();
    devLog('Service client initialized (Admin mode)');
  }
  return serviceInstance;
};

// Export default instance
export const supabaseService = getServiceClient() as DBClient;

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Check if service client is properly configured
 */
export const isServiceClientReady = (): boolean => {
  try {
    return !!(SUPABASE_URL && SERVICE_ROLE_KEY);
  } catch {
    return false;
  }
};

/**
 * Execute admin query safely with error handling
 */
export const executeAdminQuery = async <T>(
  queryFn: (client: SupabaseClient<Database>) => Promise<T>
): Promise<{ data: T | null; error: Error | null }> => {
  try {
    const client = getServiceClient();
    const data = await queryFn(client);
    return { data, error: null };
  } catch (error) {
    devError('Admin query failed');
    console.error(error);
    return { data: null, error: error as Error };
  }
};

/**
 * Bypass RLS for a specific operation
 * Use with extreme caution!
 */
export const bypassRLS = async <T>(
  operation: (client: SupabaseClient<Database>) => Promise<T>
): Promise<T> => {
  if (import.meta.env.DEV) {
    console.warn('⚠️ Bypassing RLS - Admin operation');
  }
  
  const client = getServiceClient();
  return await operation(client);
};

// ============================================
// TYPE GUARDS
// ============================================

/**
 * Ensure service client is only used server-side
 */
export const ensureServerSide = () => {
  if (typeof window !== 'undefined') {
    throw new Error(
      'Service client cannot be used in browser environment! ' +
      'This is a security risk. Use regular client instead.'
    );
  }
};

// Log warning if used in browser
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  console.error(
    '🚨 SECURITY ALERT 🚨\n' +
    'Service client is being loaded in browser!\n' +
    'This exposes admin privileges and is a critical security issue.\n' +
    'Move this code to server-side functions immediately!'
  );
}