-- Migration: 20251201006_add_total_penalties_to_collector_payments.sql
-- Description: Add total_penalties column to collector_payments table to store penalty information

BEGIN;

-- Add total_penalties column to collector_payments table
ALTER TABLE public.collector_payments 
ADD COLUMN IF NOT EXISTS total_penalties NUMERIC(10,2) DEFAULT 0;

-- Add adjusted_earnings column to store net earnings after penalties
ALTER TABLE public.collector_payments 
ADD COLUMN IF NOT EXISTS adjusted_earnings NUMERIC(10,2) DEFAULT 0;

-- Update existing records to set default values
UPDATE public.collector_payments 
SET total_penalties = 0 
WHERE total_penalties IS NULL;

UPDATE public.collector_payments 
SET adjusted_earnings = total_earnings 
WHERE adjusted_earnings IS NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_collector_payments_penalties ON public.collector_payments (total_penalties);
CREATE INDEX IF NOT EXISTS idx_collector_payments_adjusted_earnings ON public.collector_payments (adjusted_earnings);

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that columns were added
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'collector_payments' 
--   AND column_name IN ('total_penalties', 'adjusted_earnings');

-- Check sample data
-- SELECT id, collector_id, total_earnings, total_penalties, adjusted_earnings 
-- FROM collector_payments 
-- LIMIT 5;