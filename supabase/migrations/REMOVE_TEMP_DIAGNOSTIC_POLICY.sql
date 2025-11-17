-- Remove Temporary Diagnostic Policy: REMOVE_TEMP_DIAGNOSTIC_POLICY.sql
-- Description: Remove the temporary permissive policies after testing

BEGIN;

-- Remove temporary permissive policies
DROP POLICY IF EXISTS "Temp diagnostic policy for collections" ON public.collections;
DROP POLICY IF EXISTS "Temp diagnostic policy for farmers" ON public.farmers;
DROP POLICY IF EXISTS "Temp diagnostic policy for staff" ON public.staff;
DROP POLICY IF EXISTS "Temp diagnostic policy for pending_farmers" ON public.pending_farmers;

COMMIT;

-- After running this, your original policies should be in effect again