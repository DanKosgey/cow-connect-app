-- Migration: 20251031000200_add_credit_fields_to_payment_tables.sql
-- Description: Add credit-related fields to existing payment tables

BEGIN;

-- Add credit-related fields to farmer_payments table
ALTER TABLE public.farmer_payments 
ADD COLUMN IF NOT EXISTS credit_used DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS net_payment DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS credit_deduction_details JSONB;

-- Add credit-related fields to collection_payments table
ALTER TABLE public.collection_payments 
ADD COLUMN IF NOT EXISTS credit_used DECIMAL(10,2) DEFAULT 0.00;

-- Add credit-related fields to payment_batches table
ALTER TABLE public.payment_batches 
ADD COLUMN IF NOT EXISTS total_credit_used DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_net_payment DECIMAL(10,2) DEFAULT 0.00;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_farmer_payments_credit_used ON public.farmer_payments(credit_used);
CREATE INDEX IF NOT EXISTS idx_farmer_payments_net_payment ON public.farmer_payments(net_payment);
CREATE INDEX IF NOT EXISTS idx_collection_payments_credit_used ON public.collection_payments(credit_used);
CREATE INDEX IF NOT EXISTS idx_payment_batches_total_credit_used ON public.payment_batches(total_credit_used);

COMMIT;