-- Migration: 20251114000500_create_product_pricing_table.sql
-- Description: Create product pricing table for different quantity tiers
-- Estimated time: 30 seconds

BEGIN;

-- Create product pricing table
CREATE TABLE IF NOT EXISTS public.product_pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.agrovet_inventory(id) ON DELETE CASCADE,
    min_quantity INTEGER NOT NULL DEFAULT 1,
    max_quantity INTEGER,
    price_per_unit DECIMAL(10,2) NOT NULL,
    is_credit_eligible BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT check_min_quantity CHECK (min_quantity >= 0),
    CONSTRAINT check_max_quantity CHECK (max_quantity IS NULL OR max_quantity > min_quantity),
    CONSTRAINT check_price_per_unit CHECK (price_per_unit >= 0)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_product_pricing_product_id ON public.product_pricing(product_id);
CREATE INDEX IF NOT EXISTS idx_product_pricing_quantity_range ON public.product_pricing(min_quantity, max_quantity);

-- Add RLS policies
ALTER TABLE public.product_pricing ENABLE ROW LEVEL SECURITY;

-- Create policies for creditors
CREATE POLICY "Creditors can view product pricing" ON public.product_pricing
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'creditor'
        )
    );

CREATE POLICY "Creditors can manage product pricing" ON public.product_pricing
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

-- Grant permissions
GRANT ALL ON public.product_pricing TO authenticated;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that the table was created
SELECT table_name FROM information_schema.tables WHERE table_name = 'product_pricing';

-- Check that indexes were created
SELECT indexname FROM pg_indexes WHERE tablename = 'product_pricing';

-- Check that policies were created
SELECT polname FROM pg_policy WHERE polname LIKE '%product_pricing%';

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================

/*
BEGIN;

-- Drop policies
DROP POLICY IF EXISTS "Creditors can view product pricing" ON public.product_pricing;
DROP POLICY IF EXISTS "Creditors can manage product pricing" ON public.product_pricing;

-- Drop table
DROP TABLE IF EXISTS public.product_pricing;

COMMIT;
*/