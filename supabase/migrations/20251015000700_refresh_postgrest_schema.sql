-- Migration: 20251015000700_refresh_postgrest_schema.sql
-- Description: Refresh PostgREST schema cache by making a harmless change to collections table

BEGIN;

-- Add a comment to the collections table to trigger PostgREST schema refresh
COMMENT ON TABLE public.collections IS 'Collections table storing milk collection data - refreshed to update PostgREST schema cache';

COMMIT;