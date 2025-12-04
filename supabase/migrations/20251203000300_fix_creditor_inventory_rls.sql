-- Migration: Fix agrovet_inventory RLS policies to allow creditors to manage inventory
-- Description: Update RLS policies to properly allow creditors to manage agrovet inventory
-- Estimated time: 30 seconds

BEGIN;

-- Drop existing conflicting policies
DROP POLICY IF EXISTS "Admins can manage agrovet inventory" ON public.agrovet_inventory;
DROP POLICY IF EXISTS "Creditors can manage products" ON public.agrovet_inventory;
DROP POLICY IF EXISTS "Creditors can view inventory" ON public.agrovet_inventory;
DROP POLICY IF EXISTS "Authenticated users can view agrovet inventory" ON public.agrovet_inventory;

-- Create new policies that allow both admins and creditors to manage inventory
CREATE POLICY "Admins and creditors can manage agrovet inventory" 
  ON public.agrovet_inventory FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'creditor')
    )
  );

-- Create policy for viewing inventory (authenticated users)
CREATE POLICY "Authenticated users can view agrovet inventory" 
  ON public.agrovet_inventory FOR SELECT 
  TO authenticated 
  USING (true);

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that policies were created
SELECT polname FROM pg_policy WHERE polname LIKE '%agrovet_inventory%';

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================

/*
BEGIN;

-- Drop new policies
DROP POLICY IF EXISTS "Admins and creditors can manage agrovet inventory" ON public.agrovet_inventory;
DROP POLICY IF EXISTS "Authenticated users can view agrovet inventory" ON public.agrovet_inventory;

-- Recreate original policies
CREATE POLICY "Authenticated users can view agrovet inventory" 
  ON public.agrovet_inventory FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Admins can manage agrovet inventory" 
  ON public.agrovet_inventory FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

COMMIT;
*/