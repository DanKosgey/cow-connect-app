// Re-export the supabase client from the integrations directory
export { supabase } from '@/integrations/supabase/client';

// Also re-export any other exports from auth.ts that might be needed
export * from './auth';