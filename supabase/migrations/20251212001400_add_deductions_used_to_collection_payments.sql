-- Migration: 20251212001400_add_deductions_used_to_collection_payments.sql
-- Description: Add deductions_used column to collection_payments table to track deduction amounts
-- This fixes the "Could not find the 'deductions_used' column" error

BEGIN;

-- Add deductions_used column to collection_payments table
ALTER TABLE public.collection_payments 
ADD COLUMN IF NOT EXISTS deductions_used NUMERIC(10,2) DEFAULT 0;

-- Update existing records to set default values
UPDATE public.collection_payments 
SET deductions_used = 0 
WHERE deductions_used IS NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_collection_payments_deductions ON public.collection_payments (deductions_used);

-- Refresh PostgREST schema cache
COMMENT ON TABLE public.collection_payments IS 'Collection payments table with deductions tracking - refreshed to update PostgREST schema cache';

COMMIT;

-- Verification queries
-- Check that the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'collection_payments' AND column_name = 'deductions_used';

-- Check that the index was created
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'collection_payments' AND indexname = 'idx_collection_payments_deductions';