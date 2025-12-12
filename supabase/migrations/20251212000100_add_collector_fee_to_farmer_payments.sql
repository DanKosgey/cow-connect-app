-- Migration: 20251212000100_add_collector_fee_to_farmer_payments.sql
-- Description: Add collector_fee column to farmer_payments table to track collector deductions from farmer payments
-- Rollback: ALTER TABLE public.farmer_payments DROP COLUMN IF EXISTS collector_fee;

BEGIN;

-- Add collector_fee column to farmer_payments table
ALTER TABLE public.farmer_payments 
ADD COLUMN IF NOT EXISTS collector_fee NUMERIC(10,2) DEFAULT 0.00;

-- Add comment to document the new column
COMMENT ON COLUMN public.farmer_payments.collector_fee 
IS 'Collector fee deduction from farmer payments';

-- Update existing records to set default values
UPDATE public.farmer_payments 
SET collector_fee = 0.00 
WHERE collector_fee IS NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_farmer_payments_collector_fee 
ON public.farmer_payments (collector_fee);

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that column was added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'farmer_payments' AND column_name = 'collector_fee';

-- Check index was created
SELECT indexname FROM pg_indexes WHERE tablename = 'farmer_payments' AND indexname = 'idx_farmer_payments_collector_fee';

-- Check some sample data
SELECT id, collector_fee 
FROM public.farmer_payments 
LIMIT 5;