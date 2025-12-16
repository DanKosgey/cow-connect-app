-- Migration: 202512160002_fix_penalty_data_consistency.sql
-- Description: Fix data consistency issues with penalty statuses
-- This ensures that all penalty data is consistent across tables

BEGIN;

-- Fix any inconsistencies in milk_approvals table
-- Ensure that records with penalty_status = 'paid' have their penalty_amount set to 0
-- This is a safeguard to prevent double-counting of penalties
UPDATE public.milk_approvals 
SET penalty_amount = 0 
WHERE penalty_status = 'paid' 
AND penalty_amount > 0;

-- Fix any inconsistencies in collector_daily_summaries table
-- Ensure that records with penalty_status = 'paid' have their total_penalty_amount set to 0
-- This is a safeguard to prevent double-counting of penalties
UPDATE public.collector_daily_summaries 
SET total_penalty_amount = 0 
WHERE penalty_status = 'paid' 
AND total_penalty_amount > 0;

-- Refresh the PostgREST schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check for any remaining inconsistencies
-- SELECT COUNT(*) FROM public.milk_approvals WHERE penalty_status = 'paid' AND penalty_amount > 0;
-- SELECT COUNT(*) FROM public.collector_daily_summaries WHERE penalty_status = 'paid' AND total_penalty_amount > 0;

-- Check the current state of penalty data
-- SELECT penalty_status, COUNT(*) as count, SUM(penalty_amount) as total FROM public.milk_approvals GROUP BY penalty_status;
-- SELECT penalty_status, COUNT(*) as count, SUM(total_penalty_amount) as total FROM public.collector_daily_summaries GROUP BY penalty_status;