-- Migration: 20251118000400_add_approved_for_payment_column.sql
-- Description: Add approved_for_payment column to collections table for payment system integration
-- Estimated time: 1 minute

BEGIN;

-- Add approved_for_payment column to collections table
ALTER TABLE public.collections 
ADD COLUMN IF NOT EXISTS approved_for_payment BOOLEAN DEFAULT false;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_collections_approved_for_payment ON public.collections (approved_for_payment);

-- Update existing collections that are approved for company to also be approved for payment
UPDATE public.collections 
SET approved_for_payment = true 
WHERE approved_for_company = true;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that column was added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'collections' AND column_name = 'approved_for_payment';

-- Check index was created
SELECT indexname FROM pg_indexes WHERE tablename = 'collections' AND indexname = 'idx_collections_approved_for_payment';

-- Check some sample data
SELECT id, approved_for_company, approved_for_payment 
FROM public.collections 
LIMIT 5;