-- Migration: 20251215000200_add_penalty_status_to_collector_daily_summaries.sql
-- Description: Add penalty_status column to collector_daily_summaries table to track payment status of penalties

BEGIN;

-- Add penalty_status column to collector_daily_summaries table
-- This column will track whether a penalty has been paid or is pending
ALTER TABLE public.collector_daily_summaries 
ADD COLUMN IF NOT EXISTS penalty_status TEXT DEFAULT 'pending' 
CHECK (penalty_status IN ('pending', 'paid'));

-- Create an index for better performance when querying by penalty_status
CREATE INDEX IF NOT EXISTS idx_collector_daily_summaries_penalty_status ON public.collector_daily_summaries (penalty_status);

-- Update existing records to have 'pending' status as default
-- This ensures all existing penalties are treated as pending until explicitly marked as paid
UPDATE public.collector_daily_summaries 
SET penalty_status = 'pending' 
WHERE penalty_status IS NULL AND total_penalty_amount > 0;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that the column was added
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'collector_daily_summaries' AND column_name = 'penalty_status';

-- Check the distribution of statuses
-- SELECT penalty_status, COUNT(*) as count 
-- FROM public.collector_daily_summaries 
-- GROUP BY penalty_status;

-- Check index creation
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'collector_daily_summaries' AND indexname = 'idx_collector_daily_summaries_penalty_status';