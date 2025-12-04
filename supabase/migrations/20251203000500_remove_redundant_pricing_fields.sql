-- Migration: 20251203000500_remove_redundant_pricing_fields.sql
-- Description: Remove redundant pricing fields from agrovet_inventory table since pricing is now handled in product_pricing table
-- Estimated time: 30 seconds

BEGIN;

-- Remove redundant pricing columns from agrovet_inventory table
-- Note: We'll keep cost_price for inventory costing purposes
ALTER TABLE public.agrovet_inventory 
DROP COLUMN IF EXISTS selling_price;

-- Update comments to clarify that pricing is now handled in product_pricing table
COMMENT ON TABLE public.agrovet_inventory IS 'Agrovet inventory items. Pricing information is stored separately in product_pricing table.';
COMMENT ON COLUMN public.agrovet_inventory.cost_price IS 'Cost price for inventory costing purposes. Selling prices are defined in product_pricing table.';

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that the selling_price column was removed
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'agrovet_inventory' 
AND column_name = 'selling_price';

-- Check that cost_price still exists
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'agrovet_inventory' 
AND column_name = 'cost_price';

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================

/*
BEGIN;

-- Add back the selling_price column if needed
ALTER TABLE public.agrovet_inventory 
ADD COLUMN IF NOT EXISTS selling_price DECIMAL(10,2);

-- Restore any data if it was moved (this would require a separate data migration)

COMMIT;
*/