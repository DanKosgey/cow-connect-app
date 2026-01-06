-- Migration: Fix RLS for product_categories
-- Description: Drop and recreate the RLS policy for creditors to manage product categories
-- Date: 2026-01-06

BEGIN;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Creditors can manage product categories" ON public.product_categories;

-- Recreate policy with explicit permissions
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

-- Also add policy for admins just in case
DROP POLICY IF EXISTS "Admins can manage product categories" ON public.product_categories;
CREATE POLICY "Admins can manage product categories" ON public.product_categories
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'admin'
        )
    );

COMMIT;
