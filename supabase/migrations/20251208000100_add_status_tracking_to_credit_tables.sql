-- Migration: 20251208000100_add_status_tracking_to_credit_tables.sql
-- Description: Add status tracking columns to credit_transactions and agrovet_purchases tables for better payment tracking
-- Estimated time: 30 seconds

BEGIN;

-- Add status column to credit_transactions table
ALTER TABLE public.credit_transactions 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('pending', 'active', 'paid', 'cancelled', 'disputed'));

-- Add comment to document the new column
COMMENT ON COLUMN public.credit_transactions.status IS 'Status of the credit transaction for tracking payment lifecycle';

-- Add status column to agrovet_purchases table
ALTER TABLE public.agrovet_purchases 
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'paid', 'overdue', 'cancelled'));

-- Add comment to document the new column
COMMENT ON COLUMN public.agrovet_purchases.payment_status IS 'Payment status of the agrovet purchase for tracking payment lifecycle';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_credit_transactions_status ON public.credit_transactions(status);
CREATE INDEX IF NOT EXISTS idx_agrovet_purchases_payment_status ON public.agrovet_purchases(payment_status);

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that the columns were added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'credit_transactions' 
AND column_name = 'status';

SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'agrovet_purchases' 
AND column_name = 'payment_status';

-- Check that the indexes were created
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'credit_transactions' 
AND indexname = 'idx_credit_transactions_status';

SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'agrovet_purchases' 
AND indexname = 'idx_agrovet_purchases_payment_status';

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================

/*
BEGIN;

-- Drop the indexes
DROP INDEX IF EXISTS public.idx_credit_transactions_status;
DROP INDEX IF EXISTS public.idx_agrovet_purchases_payment_status;

-- Drop the columns
ALTER TABLE public.credit_transactions 
DROP COLUMN IF EXISTS status;

ALTER TABLE public.agrovet_purchases 
DROP COLUMN IF EXISTS payment_status;

COMMIT;
*/