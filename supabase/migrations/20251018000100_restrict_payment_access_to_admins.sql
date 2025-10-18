-- Migration: 20251018000100_restrict_payment_access_to_admins.sql
-- Description: Restrict payment operations to admin role only, removing staff access

BEGIN;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Staff and admins can view all farmer payments" ON public.farmer_payments;
DROP POLICY IF EXISTS "Staff and admins can create farmer payments" ON public.farmer_payments;
DROP POLICY IF EXISTS "Staff and admins can update farmer payments" ON public.farmer_payments;

-- Also drop the admin policies if they already exist (to avoid conflicts)
DROP POLICY IF EXISTS "Admins can view all farmer payments" ON public.farmer_payments;
DROP POLICY IF EXISTS "Admins can create farmer payments" ON public.farmer_payments;
DROP POLICY IF EXISTS "Admins can update farmer payments" ON public.farmer_payments;

-- Create new policies for admin-only access
-- Only admins can view all payments
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pol.polname = 'Admins can view all farmer payments' 
    AND pc.relname = 'farmer_payments'
  ) THEN
    CREATE POLICY "Admins can view all farmer payments" 
      ON public.farmer_payments FOR SELECT 
      USING (
        EXISTS (
          SELECT 1 FROM public.user_roles ur 
          WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
        )
      );
  END IF;
END $$;

-- Only admins can create payments
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pol.polname = 'Admins can create farmer payments' 
    AND pc.relname = 'farmer_payments'
  ) THEN
    CREATE POLICY "Admins can create farmer payments" 
      ON public.farmer_payments FOR INSERT 
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.user_roles ur 
          WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
        )
      );
  END IF;
END $$;

-- Only admins can update payments
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pol.polname = 'Admins can update farmer payments' 
    AND pc.relname = 'farmer_payments'
  ) THEN
    CREATE POLICY "Admins can update farmer payments" 
      ON public.farmer_payments FOR UPDATE 
      USING (
        EXISTS (
          SELECT 1 FROM public.user_roles ur 
          WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
        )
      );
  END IF;
END $$;

-- Refresh PostgREST schema cache
COMMENT ON TABLE public.farmer_payments IS 'Farmer payments table with admin-only access - refreshed to update PostgREST schema cache';

COMMIT;