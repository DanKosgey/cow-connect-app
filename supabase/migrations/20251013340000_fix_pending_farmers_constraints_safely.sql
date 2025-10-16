-- Migration: 20251013340000_fix_pending_farmers_constraints_safely.sql
-- Description: Safely fix pending_farmers constraints that might already exist

BEGIN;

-- Safely add age constraint if it doesn't exist
DO $$
BEGIN
    -- Check if the age constraint already exists
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'pending_farmers' 
        AND c.contype = 'c'
        AND (pg_get_constraintdef(c.oid) LIKE '%age >= 18 AND age <= 100%' 
             OR conname = 'pending_farmers_age_check')
    ) THEN
        -- Add the constraint
        ALTER TABLE public.pending_farmers 
        ADD CONSTRAINT pending_farmers_age_check 
        CHECK (age >= 18 AND age <= 100);
    END IF;
END $$;

-- Safely add breeding_method constraint if it doesn't exist
DO $$
BEGIN
    -- Check if the breeding_method constraint already exists
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'pending_farmers' 
        AND c.contype = 'c'
        AND (pg_get_constraintdef(c.oid) LIKE '%breeding_method IN%' 
             OR conname = 'pending_farmers_breeding_method_check')
    ) THEN
        -- Add the constraint
        ALTER TABLE public.pending_farmers 
        ADD CONSTRAINT pending_farmers_breeding_method_check 
        CHECK (breeding_method IN ('male_bull', 'artificial_insemination', 'both'));
    END IF;
END $$;

COMMIT;