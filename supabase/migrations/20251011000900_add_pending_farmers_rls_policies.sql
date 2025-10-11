-- Migration: 20251011000900_add_pending_farmers_rls_policies.sql
-- Description: Add RLS policies for pending_farmers table to allow farmers to insert their own records
-- Estimated time: 1 minute

-- ============================================
-- UP MIGRATION
-- ============================================

BEGIN;

-- Ensure RLS is enabled on pending_farmers
ALTER TABLE IF EXISTS public.pending_farmers ENABLE ROW LEVEL SECURITY;

-- Create policy allowing authenticated users to insert their own pending farmer records
DROP POLICY IF EXISTS "pending_farmers_insert_own" ON public.pending_farmers;
CREATE POLICY "pending_farmers_insert_own" ON public.pending_farmers
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Create policy allowing users to select their own pending farmer records
DROP POLICY IF EXISTS "pending_farmers_select_own" ON public.pending_farmers;
CREATE POLICY "pending_farmers_select_own" ON public.pending_farmers
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Create policy allowing users to update their own pending farmer records
DROP POLICY IF EXISTS "pending_farmers_update_own" ON public.pending_farmers;
CREATE POLICY "pending_farmers_update_own" ON public.pending_farmers
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Create policy allowing admins to delete pending farmer records
DROP POLICY IF EXISTS "pending_farmers_delete_admin" ON public.pending_farmers;
CREATE POLICY "pending_farmers_delete_admin" ON public.pending_farmers
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that RLS is enabled
SELECT relname as tablename, relrowsecurity 
FROM pg_class c 
JOIN pg_namespace n ON n.oid = c.relnamespace 
WHERE n.nspname = 'public' 
AND relname = 'pending_farmers';

-- Check that policies were created
SELECT polname as policyname, polpermissive as permissive, polroles as roles, polcmd as cmd 
FROM pg_policy pol 
JOIN pg_class pc ON pc.oid = pol.polrelid 
JOIN pg_namespace n ON n.oid = pc.relnamespace 
WHERE n.nspname = 'public' 
AND pc.relname = 'pending_farmers';

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================

/*
BEGIN;

DROP POLICY IF EXISTS "pending_farmers_insert_own" ON public.pending_farmers;
DROP POLICY IF EXISTS "pending_farmers_select_own" ON public.pending_farmers;
DROP POLICY IF EXISTS "pending_farmers_update_own" ON public.pending_farmers;
DROP POLICY IF EXISTS "pending_farmers_delete_admin" ON public.pending_farmers;

COMMIT;
*/