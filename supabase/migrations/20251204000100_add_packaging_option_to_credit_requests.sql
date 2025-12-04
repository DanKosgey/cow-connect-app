-- Migration: 20251204000100_add_packaging_option_to_credit_requests.sql
-- Description: Add packaging_option_id column to credit_requests table to track selected packaging option
-- Estimated time: 30 seconds

BEGIN;

-- Add packaging_option_id column to credit_requests table
ALTER TABLE public.credit_requests 
ADD COLUMN IF NOT EXISTS packaging_option_id UUID REFERENCES public.product_packaging(id) ON DELETE SET NULL;

-- Add comment to document the new column
COMMENT ON COLUMN public.credit_requests.packaging_option_id IS 'Reference to the selected packaging option for this credit request';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_credit_requests_packaging_option_id ON public.credit_requests(packaging_option_id);

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'credit_requests' 
AND column_name = 'packaging_option_id';

-- Check that the index was created
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'credit_requests' 
AND indexname = 'idx_credit_requests_packaging_option_id';

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================

/*
BEGIN;

-- Drop the index
DROP INDEX IF EXISTS public.idx_credit_requests_packaging_option_id;

-- Drop the column
ALTER TABLE public.credit_requests 
DROP COLUMN IF EXISTS packaging_option_id;

COMMIT;
*/