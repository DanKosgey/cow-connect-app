-- Migration: Add additional fields to credit_requests table
-- Description: Add fields for better tracking and management of credit requests

BEGIN;

-- Add columns if they don't exist
ALTER TABLE public.credit_requests 
ADD COLUMN IF NOT EXISTS farmer_name TEXT,
ADD COLUMN IF NOT EXISTS farmer_phone TEXT,
ADD COLUMN IF NOT EXISTS credit_deduction_date DATE,
ADD COLUMN IF NOT EXISTS settlement_status TEXT DEFAULT 'pending' CHECK (settlement_status IN ('pending', 'processed', 'failed'));

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_credit_requests_farmer_name ON public.credit_requests(farmer_name);
CREATE INDEX IF NOT EXISTS idx_credit_requests_settlement_status ON public.credit_requests(settlement_status);

COMMIT;