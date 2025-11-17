-- SQL Script to apply RLS policies for creditors to manage agrovet inventory
-- Run this script in your Supabase SQL editor

BEGIN;

-- Ensure RLS is enabled on the inventory table
ALTER TABLE public.agrovet_inventory ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Creditors can manage products" ON public.agrovet_inventory;
DROP POLICY IF EXISTS "Creditors can view inventory" ON public.agrovet_inventory;

-- Creditors can manage inventory
CREATE POLICY "Creditors can manage products" ON public.agrovet_inventory
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

-- View policy
CREATE POLICY "Creditors can view inventory" ON public.agrovet_inventory
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'creditor'
        )
    );

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that policies were created
SELECT polname FROM pg_policy WHERE polname LIKE '%Creditors%';