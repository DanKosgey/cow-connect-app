-- SQL Script to apply pending_farmers schema updates to remote database
-- Run this script in your Supabase SQL editor

BEGIN;

-- Add missing columns to pending_farmers table
ALTER TABLE public.pending_farmers ADD COLUMN IF NOT EXISTS age INTEGER CHECK (age >= 18 AND age <= 100);
ALTER TABLE public.pending_farmers ADD COLUMN IF NOT EXISTS id_number TEXT;
ALTER TABLE public.pending_farmers ADD COLUMN IF NOT EXISTS breeding_method TEXT CHECK (breeding_method IN ('male_bull', 'artificial_insemination', 'both'));
ALTER TABLE public.pending_farmers ADD COLUMN IF NOT EXISTS cow_breeds JSONB DEFAULT '[]'::jsonb;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_pending_farmers_age ON public.pending_farmers (age);
CREATE INDEX IF NOT EXISTS idx_pending_farmers_id_number ON public.pending_farmers (id_number);
CREATE INDEX IF NOT EXISTS idx_pending_farmers_breeding_method ON public.pending_farmers (breeding_method);

-- Update existing records with default values where needed
UPDATE public.pending_farmers 
SET cow_breeds = '[]'::jsonb 
WHERE cow_breeds IS NULL;

COMMIT;

-- Verification queries
-- Run these to verify the migration was successful:

-- Check that tables have all the required columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'pending_farmers' 
AND column_name IN ('age', 'id_number', 'breeding_method', 'cow_breeds')
ORDER BY ordinal_position;

-- Check that indexes were created
SELECT indexname FROM pg_indexes WHERE tablename = 'pending_farmers' AND indexname LIKE 'idx_pending_farmers_%';