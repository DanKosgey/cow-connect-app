-- Migration: Allow creditors to access agrovet_purchases
-- Description: Grant SELECT and UPDATE permissions on agrovet_purchases to creditors
-- Date: 2026-01-06

BEGIN;

-- Policy for creditors to view agrovet purchases (for disbursement page)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policy pol
        JOIN pg_class pc ON pc.oid = pol.polrelid
        WHERE pol.polname = 'Creditors can view all agrovet purchases' 
        AND pc.relname = 'agrovet_purchases'
    ) THEN
        CREATE POLICY "Creditors can view all agrovet purchases" 
        ON public.agrovet_purchases FOR SELECT 
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.user_roles ur 
                WHERE ur.user_id = auth.uid() AND ur.role = 'creditor'
            )
        );
    END IF;
END $$;

-- Policy for creditors to update agrovet purchases (for confirming collection)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policy pol
        JOIN pg_class pc ON pc.oid = pol.polrelid
        WHERE pol.polname = 'Creditors can update agrovet purchases' 
        AND pc.relname = 'agrovet_purchases'
    ) THEN
        CREATE POLICY "Creditors can update agrovet purchases" 
        ON public.agrovet_purchases FOR UPDATE
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.user_roles ur 
                WHERE ur.user_id = auth.uid() AND ur.role = 'creditor'
            )
        );
    END IF;
END $$;

COMMIT;
