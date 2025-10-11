-- Migration: 20251011000800_complete_pending_farmers_schema.sql
-- Description: Ensure pending_farmers table has all required columns for complete registration workflow
-- Estimated time: 1 minute

-- ============================================
-- UP MIGRATION
-- ============================================

BEGIN;

-- Add missing columns to pending_farmers table if they don't exist
DO $$
BEGIN
    -- Add age column with validation
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'pending_farmers' 
        AND column_name = 'age'
    ) THEN
        ALTER TABLE public.pending_farmers ADD COLUMN age INTEGER CHECK (age >= 18 AND age <= 100);
    END IF;

    -- Add id_number column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'pending_farmers' 
        AND column_name = 'id_number'
    ) THEN
        ALTER TABLE public.pending_farmers ADD COLUMN id_number TEXT;
    END IF;

    -- Add breeding_method column with validation
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'pending_farmers' 
        AND column_name = 'breeding_method'
    ) THEN
        ALTER TABLE public.pending_farmers ADD COLUMN breeding_method TEXT 
        CHECK (breeding_method IN ('male_bull', 'artificial_insemination', 'both'));
    END IF;

    -- Add cow_breeds column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'pending_farmers' 
        AND column_name = 'cow_breeds'
    ) THEN
        ALTER TABLE public.pending_farmers ADD COLUMN cow_breeds JSONB DEFAULT '[]'::jsonb;
    END IF;

    -- Add indexes for performance if they don't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE tablename = 'pending_farmers' 
        AND indexname = 'idx_pending_farmers_age'
    ) THEN
        CREATE INDEX idx_pending_farmers_age ON public.pending_farmers (age);
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE tablename = 'pending_farmers' 
        AND indexname = 'idx_pending_farmers_id_number'
    ) THEN
        CREATE INDEX idx_pending_farmers_id_number ON public.pending_farmers (id_number);
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE tablename = 'pending_farmers' 
        AND indexname = 'idx_pending_farmers_breeding_method'
    ) THEN
        CREATE INDEX idx_pending_farmers_breeding_method ON public.pending_farmers (breeding_method);
    END IF;
END
$$;

-- Update the existing pending_farmers table structure to ensure all columns are properly configured
-- This will update any existing records with default values where needed
UPDATE public.pending_farmers 
SET cow_breeds = '[]'::jsonb 
WHERE cow_breeds IS NULL;

-- Ensure the table has all required columns with proper constraints
-- We need to check if the columns exist with the correct data types and constraints

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that tables have all the required columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'pending_farmers' 
AND column_name IN ('age', 'id_number', 'breeding_method', 'cow_breeds')
ORDER BY ordinal_position;

-- Check that indexes were created
SELECT indexname FROM pg_indexes WHERE tablename = 'pending_farmers' AND indexname LIKE 'idx_pending_farmers_%';

-- Check constraint information
SELECT conname, pg_get_constraintdef(c.oid) 
FROM pg_constraint c 
JOIN pg_namespace n ON n.oid = c.connamespace 
WHERE n.nspname = 'public' 
AND conname LIKE '%pending_farmers%'
AND contype = 'c';

COMMIT;

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================

/*
BEGIN;

-- This migration is additive and doesn't remove columns to avoid data loss
-- In a rollback scenario, you would need to manually remove columns if needed

COMMIT;
*/