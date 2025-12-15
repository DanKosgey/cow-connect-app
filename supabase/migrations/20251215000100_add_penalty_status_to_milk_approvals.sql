-- Migration: 20251215000100_add_penalty_status_to_milk_approvals.sql
-- Description: Add penalty_status column to milk_approvals table to track payment status of penalties

BEGIN;

-- Add penalty_status column to milk_approvals table
-- This column will track whether a penalty has been paid or is pending
ALTER TABLE public.milk_approvals 
ADD COLUMN IF NOT EXISTS penalty_status TEXT DEFAULT 'pending' 
CHECK (penalty_status IN ('pending', 'paid'));

-- Create an index for better performance when querying by penalty_status
CREATE INDEX IF NOT EXISTS idx_milk_approvals_penalty_status ON public.milk_approvals (penalty_status);

-- Update existing records to have 'pending' status as default
-- This ensures all existing penalties are treated as pending until explicitly marked as paid
UPDATE public.milk_approvals 
SET penalty_status = 'pending' 
WHERE penalty_status IS NULL AND penalty_amount > 0;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that the column was added
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'milk_approvals' AND column_name = 'penalty_status';

-- Check the distribution of statuses
-- SELECT penalty_status, COUNT(*) as count 
-- FROM public.milk_approvals 
-- GROUP BY penalty_status;

-- Check index creation
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'milk_approvals' AND indexname = 'idx_milk_approvals_penalty_status';