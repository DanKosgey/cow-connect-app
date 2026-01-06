-- Migration: Allow creditors to insert agrovet_purchases
-- Description: Grant INSERT permissions on agrovet_purchases to creditors. This is required for creditors to create purchases when processing credit requests on behalf of farmers.
-- Date: 2026-01-06

BEGIN;

-- Policy for creditors to insert agrovet purchases
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policy pol
        JOIN pg_class pc ON pc.oid = pol.polrelid
        WHERE pol.polname = 'Creditors can insert agrovet purchases' 
        AND pc.relname = 'agrovet_purchases'
    ) THEN
        CREATE POLICY "Creditors can insert agrovet purchases" 
        ON public.agrovet_purchases FOR INSERT
        TO authenticated
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.user_roles ur 
                WHERE ur.user_id = auth.uid() AND ur.role = 'creditor'
            )
        );
    END IF;
END $$;

-- Policy for creditors to insert credit transactions (deducting credit)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policy pol
        JOIN pg_class pc ON pc.oid = pol.polrelid
        WHERE pol.polname = 'Creditors can insert credit transactions' 
        AND pc.relname = 'credit_transactions'
    ) THEN
        CREATE POLICY "Creditors can insert credit transactions" 
        ON public.credit_transactions FOR INSERT
        TO authenticated
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.user_roles ur 
                WHERE ur.user_id = auth.uid() AND ur.role = 'creditor'
            )
        );
    END IF;
END $$;

COMMIT;
