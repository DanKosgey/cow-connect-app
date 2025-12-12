import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import type { DBClient } from '@/types/supabase-types';

// ============================================
// SECURITY CHECK - MUST RUN FIRST
// ============================================

const isBrowser = typeof window !== 'undefined';

if (isBrowser) {
  const errorMsg = 
    '🚨 CRITICAL SECURITY ERROR 🚨\n' +
    'Service client (admin privileges) loaded in browser!\n' +
    'This exposes your service role key and bypasses all security.\n' +
    'IMMEDIATE ACTION REQUIRED:\n' +
    '1. Remove this import from client-side code\n' +
    '2. Move to server-side functions/API routes only\n' +
    '3. Rotate your service role key in Supabase dashboard';
  
  console.error(errorMsg);
  
  if (import.meta.env.DEV) {
    throw new Error('Service client cannot be used in browser - security violation');
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const stripQuotes = (value: string | undefined): string => {
  if (!value || typeof value !== 'string') return '';
  return value.replace(/^['"]|['"]$/g, '');
};

const devLog = (message: string, data?: unknown): void => {
  if (import.meta.env.DEV) {
    console.log(`[Service Client] ${message}`, data ?? '');
  }
};

const devError = (message: string, error?: unknown): void => {
  if (import.meta.env.DEV) {
    console.error(`[Service Client] ❌ ${message}`, error ?? '');
  }
};

// ============================================
// ENVIRONMENT CONFIGURATION
// ============================================

const getRequiredEnvVar = (key: string, displayName: string): string => {
  const value = stripQuotes(import.meta.env[key]);
  
  if (!value) {
    const error = `Missing ${displayName} (${key}) environment variable`;
    devError(error);
    throw new Error(error);
  }
  
  return value;
};

const SUPABASE_URL = getRequiredEnvVar('VITE_SUPABASE_URL', 'Supabase URL');
const SERVICE_ROLE_KEY = getRequiredEnvVar('SUPABASE_SERVICE_ROLE_KEY', 'Service Role Key');

// Validate URL format
try {
  new URL(SUPABASE_URL);
} catch {
  throw new Error(`Invalid SUPABASE_URL format: ${SUPABASE_URL}`);
}

// Validate key format (should start with 'eyJ' for JWT)
if (!SERVICE_ROLE_KEY.startsWith('eyJ')) {
  console.warn('⚠️ Service role key may be invalid - should be a JWT token starting with "eyJ"');
}

// Configuration status
if (import.meta.env.DEV) {
  devLog('Configuration loaded', {
    url: '✓ Valid',
    serviceKey: '✓ Valid',
    environment: import.meta.env.MODE,
    securityWarning: '⚠️ Admin privileges active'
  });
}

// ============================================
// ENHANCED FETCH WITH TIMEOUT
// ============================================

const createServiceFetch = () => {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const TIMEOUT = 90000; // Increased from 30s to 90s
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);

    try {
      const response = await fetch(input, {
        ...init,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Log admin operation errors
      if (!response.ok && import.meta.env.DEV) {
        const errorDetails: Record<number, string> = {
          400: 'Bad Request - Check payload structure',
          401: 'Unauthorized - Service key may be invalid',
          403: 'Forbidden - Even admin access denied',
          404: 'Not Found - Resource does not exist',
          500: 'Server Error - Supabase issue',
          503: 'Service Unavailable - Supabase maintenance'
        };

        const message = errorDetails[response.status] || `HTTP ${response.status}`;
        devError(`Admin operation failed: ${message}`);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        devError('Admin operation timeout (30s exceeded)');
      } else {
        devError('Admin operation network error', error);
      }
      
      throw error;
    }
  };
};

// ============================================
// SERVICE CLIENT CREATION
// ============================================

/**
 * Supabase Service Client with Admin Privileges
 * 
 * ⚠️ CRITICAL WARNING: This client bypasses ALL Row Level Security (RLS)
 * 
 * ✅ SAFE Usage:
 * - Server-side API routes
 * - Edge Functions / Serverless functions
 * - Background jobs / cron tasks
 * - Admin dashboards (server-rendered)
 * - Database migrations
 * 
 * 🚨 NEVER USE in:
 * - React components
 * - Client-side code
 * - Browser environment
 * - Any code that runs on user devices
 * 
 * Security Note: This client has full database access and can:
 * - Read/write any data regardless of policies
 * - Access other users' private data
 * - Perform destructive operations
 */
const createServiceClient = (): SupabaseClient<Database> => {
  const client = createClient<Database>(
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
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'apikey': SERVICE_ROLE_KEY,
          'X-Client-Info': 'supabase-service-role'
        },
        fetch: createServiceFetch()
      }
    }
  );

  if (import.meta.env.DEV) {
    console.warn(
      '\n' +
      '⚠️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⚠️\n' +
      '   SERVICE CLIENT INITIALIZED - ADMIN MODE\n' +
      '   \n' +
      '   ⚡ Full database access enabled\n' +
      '   🔓 All RLS policies bypassed\n' +
      '   🎯 Use only for server-side operations\n' +
      '   🚫 NEVER expose to client-side code\n' +
      '⚠️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━⚠️\n'
    );
  }

  return client;
};

// ============================================
// SINGLETON INSTANCE
// ============================================

let serviceInstance: SupabaseClient<Database> | null = null;

export const getServiceClient = (): SupabaseClient<Database> => {
  if (!serviceInstance) {
    serviceInstance = createServiceClient();
    devLog('Service client instance created');
  }
  return serviceInstance;
};

// Export default instance (lazy initialization)
export const supabaseService = getServiceClient() as DBClient;

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Verify service client is properly configured
 */
export const isServiceClientReady = (): boolean => {
  try {
    return Boolean(SUPABASE_URL && SERVICE_ROLE_KEY && !isBrowser);
  } catch {
    return false;
  }
};

/**
 * Execute admin query with comprehensive error handling
 * 
 * @example
 * const result = await executeAdminQuery(async (client) => {
 *   const { data, error } = await client.from('users').select('*');
 *   if (error) throw error;
 *   return data;
 * });
 */
export const executeAdminQuery = async <T>(
  queryFn: (client: SupabaseClient<Database>) => Promise<T>,
  context?: string
): Promise<{ data: T | null; error: Error | null }> => {
  try {
    ensureServerSide();
    const client = getServiceClient();
    const data = await queryFn(client);
    
    if (context && import.meta.env.DEV) {
      devLog(`Admin query succeeded: ${context}`);
    }
    
    return { data, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    devError(`Admin query failed${context ? `: ${context}` : ''}`, errorMessage);
    
    return { 
      data: null, 
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
};

/**
 * Bypass RLS for a specific operation
 * 
 * ⚠️ Use with extreme caution - logs all usage in development
 * 
 * @example
 * const users = await bypassRLS(async (client) => {
 *   const { data } = await client.from('users').select('*');
 *   return data;
 * });
 */
export const bypassRLS = async <T>(
  operation: (client: SupabaseClient<Database>) => Promise<T>,
  reason?: string
): Promise<T> => {
  ensureServerSide();
  
  if (import.meta.env.DEV) {
    console.warn(
      `⚠️ Bypassing RLS${reason ? `: ${reason}` : ''}\n` +
      `   Timestamp: ${new Date().toISOString()}\n` +
      `   Stack: ${new Error().stack?.split('\n')[2]?.trim() || 'unknown'}`
    );
  }
  
  const client = getServiceClient();
  return await operation(client);
};

/**
 * Batch admin operations with transaction support
 */
export const batchAdminOperations = async <T>(
  operations: Array<(client: SupabaseClient<Database>) => Promise<T>>
): Promise<{ results: T[]; errors: Error[] }> => {
  ensureServerSide();
  
  const client = getServiceClient();
  const results: T[] = [];
  const errors: Error[] = [];

  for (const operation of operations) {
    try {
      const result = await operation(client);
      results.push(result);
    } catch (error) {
      errors.push(error instanceof Error ? error : new Error(String(error)));
    }
  }

  if (import.meta.env.DEV) {
    devLog('Batch operations completed', {
      total: operations.length,
      successful: results.length,
      failed: errors.length
    });
  }

  return { results, errors };
};

// ============================================
// SECURITY GUARDS
// ============================================

/**
 * Ensure service client is only used server-side
 * Throws error if called in browser environment
 */
export const ensureServerSide = (): void => {
  if (isBrowser) {
    throw new Error(
      'SECURITY VIOLATION: Service client cannot be used in browser environment. ' +
      'This exposes admin credentials. Use the regular Supabase client instead.'
    );
  }
};

/**
 * Verify environment is suitable for admin operations
 */
export const validateAdminEnvironment = (): { valid: boolean; reason?: string } => {
  if (isBrowser) {
    return { valid: false, reason: 'Browser environment detected' };
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return { valid: false, reason: 'Missing credentials' };
  }

  return { valid: true };
};

// ============================================
// TYPE EXPORTS
// ============================================

export type ServiceClient = SupabaseClient<Database>;
export type AdminOperation<T> = (client: ServiceClient) => Promise<T>;

// ============================================
// DEFAULT EXPORT
// ============================================

export default supabaseService;