-- Migration: 20251204000800_migrate_existing_categories.sql
-- Description: Migrate existing product categories from text fields to the new categories table
-- Estimated time: 30 seconds

BEGIN;

-- Step 1: Insert distinct categories from agrovet_inventory into product_categories
INSERT INTO public.product_categories (id, name, description, is_active, sort_order, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    category,
    '',
    true,
    0,
    NOW(),
    NOW()
FROM (
    SELECT DISTINCT category 
    FROM public.agrovet_inventory 
    WHERE category IS NOT NULL AND category != ''
) AS distinct_categories
ON CONFLICT (name) DO NOTHING;

-- Step 2: Update agrovet_inventory to set category_id based on category name
UPDATE public.agrovet_inventory ai
SET category_id = pc.id
FROM public.product_categories pc
WHERE ai.category = pc.name AND pc.is_active = true;

-- Step 3: Verify the migration
-- Count products with category_id set
SELECT COUNT(*) as products_with_category_id FROM public.agrovet_inventory WHERE category_id IS NOT NULL;

-- Count total categories created
SELECT COUNT(*) as total_categories FROM public.product_categories WHERE is_active = true;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that categories were migrated
SELECT name, is_active, sort_order FROM public.product_categories ORDER BY name;

-- Check that products have category_id set
SELECT ai.name, ai.category, pc.name as category_name 
FROM public.agrovet_inventory ai
LEFT JOIN public.product_categories pc ON ai.category_id = pc.id
WHERE ai.category_id IS NOT NULL
LIMIT 10;

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================

/*
BEGIN;

-- Clear category_id from agrovet_inventory
UPDATE public.agrovet_inventory SET category_id = NULL;

-- Delete all categories (this is destructive - in a real rollback you might want to be more selective)
DELETE FROM public.product_categories;

COMMIT;
*/