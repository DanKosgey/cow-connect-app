-- Migration: 20251204000500_remove_stock_columns_from_agrovet_products.sql
-- Description: Remove stock-related columns from agrovet_products table since stock tracking is no longer needed
-- Estimated time: 30 seconds

BEGIN;

-- Remove stock-related columns from agrovet_products table
ALTER TABLE public.agrovet_products 
DROP COLUMN IF EXISTS stock_quantity;

ALTER TABLE public.agrovet_products 
DROP COLUMN IF EXISTS min_stock_level;

-- Remove indexes related to stock columns
DROP INDEX IF EXISTS idx_agrovet_products_stock;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that the columns were removed
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'agrovet_products' 
AND column_name IN ('stock_quantity', 'min_stock_level');

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================

/*
BEGIN;

-- Add back the stock columns
ALTER TABLE public.agrovet_products 
ADD COLUMN IF NOT EXISTS stock_quantity INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.agrovet_products 
ADD COLUMN IF NOT EXISTS min_stock_level INTEGER DEFAULT 10;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_agrovet_products_stock ON public.agrovet_products(stock_quantity);

COMMIT;
*/