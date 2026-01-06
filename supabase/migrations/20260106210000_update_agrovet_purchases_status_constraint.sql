-- Migration: Update agrovet_purchases status constraint
-- Description: Allow 'pending_collection' status in agrovet_purchases table. This status is required for the credit disbursement flow.
-- Date: 2026-01-06

BEGIN;

-- Drop verify existing constraint (if names vary, we might need dynamic SQL, but standard naming is table_column_check)
ALTER TABLE public.agrovet_purchases 
DROP CONSTRAINT IF EXISTS agrovet_purchases_status_check;

-- Add updated constraint including 'pending_collection'
ALTER TABLE public.agrovet_purchases 
ADD CONSTRAINT agrovet_purchases_status_check 
CHECK (status IN ('pending', 'completed', 'cancelled', 'pending_collection'));

COMMIT;
