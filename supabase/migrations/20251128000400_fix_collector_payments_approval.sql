-- Migration: 20251128000400_fix_collector_payments_approval.sql
-- Description: Fix collector payments by updating approved_for_payment status
-- This will set approved_for_payment = true for all collections that are approved_for_company = true

BEGIN;

-- Update existing collections that are approved for company to also be approved for payment
-- This fixes the issue where collections were approved for company but not for collector payments
UPDATE public.collections 
SET approved_for_payment = true 
WHERE approved_for_company = true AND approved_for_payment = false;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that the update was applied
SELECT COUNT(*) as updated_collections
FROM public.collections 
WHERE approved_for_company = true AND approved_for_payment = true;

-- Check some sample data
SELECT id, approved_for_company, approved_for_payment 
FROM public.collections 
WHERE approved_for_company = true
LIMIT 5;