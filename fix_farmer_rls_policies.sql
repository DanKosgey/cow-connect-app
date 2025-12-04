-- SQL Script to apply RLS policies for farmers to view agrovet inventory and product packaging
-- Run this script in your Supabase SQL editor

BEGIN;

-- Allow farmers to view agrovet inventory
DROP POLICY IF EXISTS "Farmers can view inventory" ON public.agrovet_inventory;

CREATE POLICY "Farmers can view inventory" ON public.agrovet_inventory
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'farmer'
            AND ur.active = true
        )
        AND is_credit_eligible = true
    );

-- Allow farmers to view product packaging
DROP POLICY IF EXISTS "Farmers can view packaging" ON public.product_packaging;

CREATE POLICY "Farmers can view packaging" 
ON public.product_packaging FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE public.user_roles.user_id = auth.uid() 
    AND public.user_roles.role = 'farmer'
    AND public.user_roles.active = true
  )
  AND EXISTS (
    SELECT 1 FROM public.agrovet_inventory ai
    WHERE ai.id = public.product_packaging.product_id
    AND ai.is_credit_eligible = true
  )
);

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that policies were created
SELECT polname FROM pg_policy WHERE polname LIKE '%Farmers%';