-- Migration: 20251201002_fix_existing_payment_records.sql
-- Description: Fix existing payment records and improve payment generation logic

BEGIN;

-- First, let's add a unique constraint on collector_id + period_start + period_end to prevent duplicates
-- This will replace the overly broad constraint check that was causing issues
ALTER TABLE collector_payments DROP CONSTRAINT IF EXISTS collector_payments_collector_id_period_start_period_end_key;
ALTER TABLE collector_payments ADD CONSTRAINT unique_collector_payment_period 
UNIQUE (collector_id, period_start, period_end);

-- Update the status check constraint to be more explicit
ALTER TABLE collector_payments DROP CONSTRAINT IF EXISTS collector_payments_status_check;
ALTER TABLE collector_payments ADD CONSTRAINT collector_payments_status_check 
CHECK (status IN ('pending', 'paid'));

-- Create an index to improve performance of payment lookups
CREATE INDEX IF NOT EXISTS idx_collector_payments_collector_period 
ON collector_payments (collector_id, period_start, period_end);

-- Create an index for status lookups
CREATE INDEX IF NOT EXISTS idx_collector_payments_status 
ON collector_payments (status);

-- Add a unique constraint to prevent duplicate payment records for the same collections
-- This ensures that we don't create multiple payment records for the same collector and period
ALTER TABLE collector_payments 
ADD CONSTRAINT unique_collector_payment_unique_period 
UNIQUE (collector_id, period_start, period_end);

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check constraints
-- SELECT conname, conkey, confkey 
-- FROM pg_constraint 
-- WHERE conrelid = 'collector_payments'::regclass;

-- Check indexes
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'collector_payments';

-- Sample data check
-- SELECT collector_id, period_start, period_end, total_collections, status 
-- FROM collector_payments 
-- ORDER BY created_at DESC 
-- LIMIT 10;