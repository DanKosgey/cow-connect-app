-- Migration: 20251014000500_update_pending_farmers_status_constraint.sql
-- Description: Update pending_farmers status constraint to use correct values
-- Estimated time: 1 minute

-- ============================================
-- UP MIGRATION
-- ============================================

BEGIN;

-- Drop the existing constraint and add the new one with correct values
-- We need to do this carefully to avoid data loss
ALTER TABLE public.pending_farmers 
DROP CONSTRAINT IF EXISTS pending_farmers_status_check;

-- Add the new constraint with correct status values
ALTER TABLE public.pending_farmers 
ADD CONSTRAINT pending_farmers_status_check 
CHECK (status IN ('pending_verification', 'email_verified', 'approved', 'rejected'));

-- Update any existing records with old status values to use new values
-- Map old values to new values (careful mapping to avoid conflicts)
UPDATE public.pending_farmers 
SET status = 'pending_verification' 
WHERE status = 'draft';

UPDATE public.pending_farmers 
SET status = 'email_verified' 
WHERE status = 'submitted';

-- Note: 'under_review' doesn't have a direct mapping to new values
-- Note: 'approved' and 'rejected' values remain the same

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that the constraint was added correctly
SELECT conname, pg_get_constraintdef(c.oid) 
FROM pg_constraint c 
JOIN pg_class t ON c.conrelid = t.oid 
WHERE t.relname = 'pending_farmers' 
AND conname = 'pending_farmers_status_check';

-- Check that there are no records violating the new constraint
SELECT DISTINCT status FROM pending_farmers;

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================

/*
BEGIN;

-- This migration updates data, so rollback would require careful consideration
-- In a rollback scenario, you would need to map values back to old status values

COMMIT;
*/