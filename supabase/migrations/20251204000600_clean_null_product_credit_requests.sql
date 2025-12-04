-- Migration: 20251204000600_clean_null_product_credit_requests.sql
-- Description: Clean up credit requests with null product_ids since they cannot be processed
-- Estimated time: 30 seconds

BEGIN;

-- Update credit requests with null product_id to rejected status
-- This prevents errors when trying to approve them
UPDATE public.credit_requests 
SET 
  status = 'rejected',
  rejection_reason = 'Product no longer available',
  updated_at = NOW()
WHERE product_id IS NULL AND status = 'pending';

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that there are no pending requests with null product_id
SELECT COUNT(*) as pending_null_product_requests
FROM public.credit_requests 
WHERE product_id IS NULL AND status = 'pending';

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================

/*
BEGIN;

-- This migration doesn't need a rollback as it only updates data
-- If needed, you could restore the previous status, but that's not recommended

COMMIT;
*/