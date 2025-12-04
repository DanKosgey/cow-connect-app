-- Migration: 20251204000400_remove_stock_columns_from_agrovet_inventory.sql
-- Description: Remove stock-related columns from agrovet_inventory table since stock tracking is no longer needed
-- Estimated time: 30 seconds

BEGIN;

-- Remove stock-related columns from agrovet_inventory table
ALTER TABLE public.agrovet_inventory 
DROP COLUMN IF EXISTS current_stock;

ALTER TABLE public.agrovet_inventory 
DROP COLUMN IF EXISTS reorder_level;

-- Remove indexes related to stock columns
DROP INDEX IF EXISTS idx_agrovet_inventory_stock;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that the columns were removed
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'agrovet_inventory' 
AND column_name IN ('current_stock', 'reorder_level');

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================

/*
BEGIN;

-- Add back the stock columns
ALTER TABLE public.agrovet_inventory 
ADD COLUMN IF NOT EXISTS current_stock DECIMAL(10,2) NOT NULL DEFAULT 0;

ALTER TABLE public.agrovet_inventory 
ADD COLUMN IF NOT EXISTS reorder_level DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_agrovet_inventory_stock ON public.agrovet_inventory(current_stock);

COMMIT;
*/