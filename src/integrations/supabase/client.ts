import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import type { DBClient } from '@/types/supabase-types';

// Helper to strip surrounding single/double quotes which sometimes appear in .env values
const stripQuotes = (v: any) => {
  if (!v || typeof v !== 'string') return v;
  return v.replace(/^['"]|['"]$/g, '');
};

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
};

const client = createClient<Database>(
  useTestInstance ? (stripQuotes(window.Cypress?.env('SUPABASE_URL') ?? '') ?? '') : (SUPABASE_URL ?? ''),
  useTestInstance ? (stripQuotes(window.Cypress?.env('SUPABASE_KEY') ?? '') ?? '') : (SUPABASE_PUBLISHABLE_KEY ?? ''),
  options
);

export const supabase = client as DBClient;