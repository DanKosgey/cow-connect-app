-- Migration: 99990002_fix_duplicate_constraints.sql
-- Description: Fix duplicate constraint definitions that cause migration conflicts
-- This migration resolves duplicate constraint names that were created in multiple migrations

BEGIN;

-- Fix duplicate pending_farmers_status_check constraint
-- First, drop any existing constraint with this name
ALTER TABLE public.pending_farmers 
DROP CONSTRAINT IF EXISTS pending_farmers_status_check;

-- Add the constraint with the correct values (using the latest definition)
ALTER TABLE public.pending_farmers 
ADD CONSTRAINT pending_farmers_status_check 
CHECK (status IN ('pending_verification', 'email_verified', 'approved', 'rejected'));

COMMIT;

-- Verification queries
-- Check that the constraint was added correctly
SELECT conname, pg_get_constraintdef(c.oid) 
FROM pg_constraint c 
JOIN pg_class t ON c.conrelid = t.oid 
WHERE t.relname = 'pending_farmers' 
AND conname = 'pending_farmers_status_check';