-- Migration: 20251014000100_update_pending_farmers_status_constraint.sql
-- Description: Update pending_farmers status constraint to match application code
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
-- We need to be careful about the mapping since there's overlap between old and new values
-- For now, we'll map the clear cases and leave ambiguous ones as is
-- In practice, you should review the data and determine the correct mapping

UPDATE public.pending_farmers 
SET status = 'pending_verification' 
WHERE status = 'draft';

UPDATE public.pending_farmers 
SET status = 'email_verified' 
WHERE status = 'submitted';

-- Note: 'approved' and 'rejected' values remain the same
-- Note: 'under_review' (old) doesn't have a direct mapping to new values
-- These would need manual review

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

-- Drop the new constraint
ALTER TABLE public.pending_farmers 
DROP CONSTRAINT IF EXISTS pending_farmers_status_check;

-- Add the old constraint back
ALTER TABLE public.pending_farmers 
ADD CONSTRAINT pending_farmers_status_check 
CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected'));

-- Update records back to old values (reverse mapping)
UPDATE public.pending_farmers 
SET status = 'draft' 
WHERE status = 'pending_verification';

UPDATE public.pending_farmers 
SET status = 'submitted' 
WHERE status = 'email_verified';

-- Note: This rollback is approximate and may not be perfect due to overlapping values

COMMIT;
*/