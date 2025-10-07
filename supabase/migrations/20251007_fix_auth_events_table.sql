-- Migration: 20251007_fix_auth_events_table.sql
-- Description: Fix auth_events table structure to ensure proper auto-incrementing id column
-- Rollback: No rollback needed for this migration

BEGIN;

-- Ensure the auth_events table has the correct structure
ALTER TABLE IF EXISTS public.auth_events
  ALTER COLUMN id SET DEFAULT nextval('auth_events_id_seq'::regclass);

-- Ensure the sequence exists and is properly configured
CREATE SEQUENCE IF NOT EXISTS public.auth_events_id_seq
  AS bigint
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

-- Associate the sequence with the id column
ALTER SEQUENCE IF EXISTS public.auth_events_id_seq
  OWNED BY public.auth_events.id;

-- Set the default value for the id column to use the sequence
ALTER TABLE IF EXISTS public.auth_events
  ALTER COLUMN id SET DEFAULT nextval('auth_events_id_seq'::regclass);

-- Ensure the id column is the primary key
ALTER TABLE IF EXISTS public.auth_events
  ADD CONSTRAINT IF NOT EXISTS auth_events_pkey PRIMARY KEY (id);

COMMIT;