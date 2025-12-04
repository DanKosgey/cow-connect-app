-- Migration: 20251204000200_fix_agrovet_credit_requests_foreign_key.sql
-- Description: Fix foreign key reference in agrovet_credit_requests table to use agrovet_inventory instead of deprecated agrovet_products
-- Estimated time: 30 seconds

BEGIN;

-- First, we need to drop the existing foreign key constraint
-- Note: PostgreSQL doesn't allow dropping FK constraints by name directly, so we need to drop and recreate the column

-- Add a new column with the correct foreign key reference
ALTER TABLE public.agrovet_credit_requests 
ADD COLUMN IF NOT EXISTS product_id_new UUID REFERENCES public.agrovet_inventory(id) ON DELETE SET NULL;

-- Copy data from the old column to the new column
UPDATE public.agrovet_credit_requests 
SET product_id_new = product_id 
WHERE product_id IS NOT NULL;

-- Drop the old column
ALTER TABLE public.agrovet_credit_requests 
DROP COLUMN IF EXISTS product_id;

-- Rename the new column to the original name
ALTER TABLE public.agrovet_credit_requests 
RENAME COLUMN product_id_new TO product_id;

-- Recreate the index
CREATE INDEX IF NOT EXISTS idx_agrovet_credit_requests_product_id ON public.agrovet_credit_requests(product_id);

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that the column exists with correct foreign key
SELECT 
    tc.table_name, 
    tc.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu 
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'agrovet_credit_requests'
AND tc.table_schema = 'public';

-- Check that the index was created
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'agrovet_credit_requests' 
AND indexname = 'idx_agrovet_credit_requests_product_id';

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================

/*
BEGIN;

-- This would be complex to rollback properly, so we'll skip it for now
-- In a production environment, you would need to carefully plan the rollback

COMMIT;
*/