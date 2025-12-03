-- Migration: 202512030001_add_deductions_to_farmer_payments.sql
-- Description: Add deductions_used column to farmer_payments table to track deduction amounts
-- Rollback: ALTER TABLE public.farmer_payments DROP COLUMN IF EXISTS deductions_used;

BEGIN;

-- Add deductions_used column to farmer_payments table
ALTER TABLE public.farmer_payments 
ADD COLUMN IF NOT EXISTS deductions_used NUMERIC(10,2) DEFAULT 0;

-- Update existing records to set default values
UPDATE public.farmer_payments 
SET deductions_used = 0 
WHERE deductions_used IS NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_farmer_payments_deductions ON public.farmer_payments (deductions_used);

COMMIT;