-- Migration: 20251128001100_add_collector_fee_to_collection_payments.sql
-- Description: Add collector_fee column to collection_payments table to track collector deductions from farmer payments
-- Estimated time: 1 minute

BEGIN;

-- Add collector_fee column to collection_payments table
ALTER TABLE public.collection_payments 
ADD COLUMN IF NOT EXISTS collector_fee NUMERIC(10,2) DEFAULT 0.00;

-- Add a comment to describe the purpose of the column
COMMENT ON COLUMN public.collection_payments.collector_fee 
IS 'Collector fee deducted from farmer payment based on collector rate per liter';

-- Create an index for performance
CREATE INDEX IF NOT EXISTS idx_collection_payments_collector_fee 
ON public.collection_payments (collector_fee);

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'collection_payments' AND column_name = 'collector_fee';

-- Check that the index was created
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'collection_payments' AND indexname = 'idx_collection_payments_collector_fee';