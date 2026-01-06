-- Migration: Add agrovet_settlement_status to credit_requests
-- Description: Add column to track settlement status between Dairy and Agrovet
-- Date: 2026-01-06

BEGIN;

ALTER TABLE public.credit_requests 
ADD COLUMN IF NOT EXISTS agrovet_settlement_status TEXT DEFAULT 'pending' CHECK (agrovet_settlement_status IN ('pending', 'processed', 'paid'));

CREATE INDEX IF NOT EXISTS idx_credit_requests_agrovet_settlement_status ON public.credit_requests(agrovet_settlement_status);

COMMIT;
