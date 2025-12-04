-- Migration: 20251203000400_enhance_product_pricing_for_tiered_system.sql
-- Description: Enhance product pricing table to better support tiered pricing with packaging information
-- Estimated time: 45 seconds

BEGIN;

-- Add new columns to product_pricing table for better tiered pricing support
ALTER TABLE public.product_pricing 
ADD COLUMN IF NOT EXISTS packaging_size DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS packaging_unit VARCHAR(50),
ADD COLUMN IF NOT EXISTS display_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Update constraints to accommodate new columns
ALTER TABLE public.product_pricing 
DROP CONSTRAINT IF EXISTS check_packaging_size,
ADD CONSTRAINT check_packaging_size CHECK (packaging_size IS NULL OR packaging_size > 0);

-- Create indexes for better query performance with new columns
CREATE INDEX IF NOT EXISTS idx_product_pricing_sort_order ON public.product_pricing(sort_order);
CREATE INDEX IF NOT EXISTS idx_product_pricing_packaging ON public.product_pricing(packaging_size, packaging_unit);

-- Update existing RLS policies to ensure they still work with new columns
-- (RLS policies remain the same as they are based on user roles, not specific columns)

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that the table was updated with new columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'product_pricing' 
AND column_name IN ('packaging_size', 'packaging_unit', 'display_name', 'sort_order');

-- Check that indexes were created
SELECT indexname FROM pg_indexes WHERE tablename = 'product_pricing' AND indexname LIKE '%packaging%';

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================

/*
BEGIN;

-- Drop indexes
DROP INDEX IF EXISTS idx_product_pricing_sort_order;
DROP INDEX IF EXISTS idx_product_pricing_packaging;

-- Drop columns
ALTER TABLE public.product_pricing 
DROP COLUMN IF EXISTS packaging_size,
DROP COLUMN IF EXISTS packaging_unit,
DROP COLUMN IF EXISTS display_name,
DROP COLUMN IF EXISTS sort_order;

-- Recreate original constraints if needed
ALTER TABLE public.product_pricing 
DROP CONSTRAINT IF EXISTS check_packaging_size;

COMMIT;
*/