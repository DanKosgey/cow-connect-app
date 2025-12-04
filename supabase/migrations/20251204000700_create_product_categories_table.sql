-- Migration: 20251204000700_create_product_categories_table.sql
-- Description: Create product_categories table for centralized category management
-- Estimated time: 30 seconds

BEGIN;

-- Create product_categories table
CREATE TABLE IF NOT EXISTS public.product_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add category_id column to agrovet_inventory table
ALTER TABLE public.agrovet_inventory 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.product_categories(id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_product_categories_name ON public.product_categories(name);
CREATE INDEX IF NOT EXISTS idx_product_categories_active ON public.product_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_product_categories_sort_order ON public.product_categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_agrovet_inventory_category_id ON public.agrovet_inventory(category_id);

-- Enable RLS
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

-- Create policies for product_categories
-- All authenticated users can view active categories
CREATE POLICY "Authenticated users can view active product categories" ON public.product_categories
    FOR SELECT TO authenticated
    USING (is_active = true);

-- Creditors can manage categories
CREATE POLICY "Creditors can manage product categories" ON public.product_categories
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'creditor'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'creditor'
        )
    );

-- Update agrovet_inventory policies to work with the new category system
DROP POLICY IF EXISTS "Authenticated users can view agrovet inventory" ON public.agrovet_inventory;

CREATE POLICY "Authenticated users can view agrovet inventory" ON public.agrovet_inventory
    FOR SELECT TO authenticated
    USING (true);

-- Grant permissions
GRANT ALL ON public.product_categories TO authenticated;
GRANT ALL ON public.agrovet_inventory TO authenticated;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_product_categories_updated_at ON public.product_categories;
CREATE TRIGGER update_product_categories_updated_at
  BEFORE UPDATE ON public.product_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that the table was created
SELECT table_name FROM information_schema.tables WHERE table_name = 'product_categories';

-- Check that indexes were created
SELECT indexname FROM pg_indexes WHERE tablename = 'product_categories';

-- Check that policies were created
SELECT polname FROM pg_policy WHERE polname LIKE '%product_categories%';

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================

/*
BEGIN;

-- Drop policies
DROP POLICY IF EXISTS "Authenticated users can view active product categories" ON public.product_categories;
DROP POLICY IF EXISTS "Creditors can manage product categories" ON public.product_categories;
DROP POLICY IF EXISTS "Authenticated users can view agrovet inventory" ON public.agrovet_inventory;

-- Recreate the original policy for agrovet_inventory
CREATE POLICY "Authenticated users can view agrovet inventory" ON public.agrovet_inventory
    FOR SELECT TO authenticated
    USING (true);

-- Drop trigger
DROP TRIGGER IF EXISTS update_product_categories_updated_at ON public.product_categories;

-- Drop indexes
DROP INDEX IF EXISTS idx_product_categories_name;
DROP INDEX IF EXISTS idx_product_categories_active;
DROP INDEX IF EXISTS idx_product_categories_sort_order;
DROP INDEX IF EXISTS idx_agrovet_inventory_category_id;

-- Drop category_id column from agrovet_inventory
ALTER TABLE public.agrovet_inventory 
DROP COLUMN IF EXISTS category_id;

-- Drop table
DROP TABLE IF EXISTS public.product_categories;

COMMIT;
*/