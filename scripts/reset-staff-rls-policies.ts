import { supabase } from '../src/integrations/supabase/client';

/**
 * Utility script to reset RLS policies for staff-related tables
 * Use this when policies become corrupted or need to be rebuilt
 */

async function resetStaffRLSPolicies() {
  try {
    console.log('=== Reset Staff RLS Policies ===\n');
    
    // This script is meant to be run in the Supabase SQL editor
    // But we can output the SQL commands needed
    
    const resetCommands = `
-- ============================================
-- RESET STAFF RLS POLICIES
-- Run these commands in the Supabase SQL Editor
-- ============================================

-- 1. Disable RLS temporarily
ALTER TABLE public.milk_approvals DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_performance DISABLE ROW LEVEL SECURITY;

-- 2. Drop all existing policies
DROP POLICY IF EXISTS "milk_approvals_select_by_staff" ON public.milk_approvals;
DROP POLICY IF EXISTS "milk_approvals_insert_by_staff" ON public.milk_approvals;
DROP POLICY IF EXISTS "milk_approvals_update_by_staff" ON public.milk_approvals;
DROP POLICY IF EXISTS "Staff can select their own milk approvals" ON public.milk_approvals;
DROP POLICY IF EXISTS "Staff can insert milk approvals for their collections" ON public.milk_approvals;
DROP POLICY IF EXISTS "Staff can update their own milk approvals" ON public.milk_approvals;

DROP POLICY IF EXISTS "Admins can view all staff performance records" ON public.staff_performance;
DROP POLICY IF EXISTS "Admins can insert staff performance records" ON public.staff_performance;
DROP POLICY IF EXISTS "Admins can update staff performance records" ON public.staff_performance;
DROP POLICY IF EXISTS "Admins can delete staff performance records" ON public.staff_performance;
DROP POLICY IF EXISTS "Staff can view their own performance records" ON public.staff_performance;
DROP POLICY IF EXISTS "Staff can insert performance records" ON public.staff_performance;
DROP POLICY IF EXISTS "Staff can insert their own performance records" ON public.staff_performance;
DROP POLICY IF EXISTS "Staff can update their own performance records" ON public.staff_performance;

-- 3. Re-enable RLS
ALTER TABLE public.milk_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_performance ENABLE ROW LEVEL SECURITY;

-- 4. Apply fresh policies (run the migration 20251127000500_fix_staff_rls_policies.sql)
-- You can now re-run the migration or apply the policies manually:

-- For milk_approvals table:
CREATE POLICY "Staff can select their own milk approvals"
ON public.milk_approvals 
FOR SELECT 
TO authenticated
USING (
  staff_id IN (
    SELECT id FROM public.staff WHERE user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
    AND ur.active = true
  )
);

CREATE POLICY "Staff can insert milk approvals for their collections"
ON public.milk_approvals 
FOR INSERT 
WITH CHECK (
  staff_id IN (
    SELECT id FROM public.staff WHERE user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
    AND ur.active = true
  )
);

CREATE POLICY "Staff can update their own milk approvals"
ON public.milk_approvals 
FOR UPDATE 
USING (
  staff_id IN (
    SELECT id FROM public.staff WHERE user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'admin'
    AND ur.active = true
  )
);

-- For staff_performance table:
CREATE POLICY "Admins can view all staff performance records" 
ON public.staff_performance 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.staff s ON ur.user_id = s.user_id
    WHERE s.id = staff_id AND ur.role = 'admin' AND ur.active = true
  )
);

CREATE POLICY "Staff can view their own performance records" 
ON public.staff_performance 
FOR SELECT 
TO authenticated 
USING (
  staff_id IN (
    SELECT id FROM public.staff WHERE user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.staff s ON ur.user_id = s.user_id
    WHERE s.id = staff_id AND ur.role = 'admin' AND ur.active = true
  )
);

CREATE POLICY "Staff can insert their own performance records"
ON public.staff_performance 
FOR INSERT 
TO authenticated 
WITH CHECK (
  staff_id IN (
    SELECT id FROM public.staff WHERE user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.staff s ON ur.user_id = s.user_id
    WHERE s.id = staff_id AND ur.role = 'admin' AND ur.active = true
  )
);

CREATE POLICY "Staff can update their own performance records"
ON public.staff_performance 
FOR UPDATE 
USING (
  staff_id IN (
    SELECT id FROM public.staff WHERE user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.staff s ON ur.user_id = s.user_id
    WHERE s.id = staff_id AND ur.role = 'admin' AND ur.active = true
  )
);

CREATE POLICY "Admins can insert staff performance records" 
ON public.staff_performance 
FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.staff s ON ur.user_id = s.user_id
    WHERE s.id = staff_id AND ur.role = 'admin' AND ur.active = true
  )
);

CREATE POLICY "Admins can update staff performance records" 
ON public.staff_performance 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.staff s ON ur.user_id = s.user_id
    WHERE s.id = staff_id AND ur.role = 'admin' AND ur.active = true
  )
);

CREATE POLICY "Admins can delete staff performance records" 
ON public.staff_performance 
FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.staff s ON ur.user_id = s.user_id
    WHERE s.id = staff_id AND ur.role = 'admin' AND ur.active = true
  )
);

-- 5. Verify policies
SELECT polname FROM pg_policy WHERE polname LIKE '%milk_approvals%' OR polname LIKE '%staff_performance%';
`;

    console.log('Run the following SQL commands in your Supabase SQL Editor:\n');
    console.log(resetCommands);
    
    console.log('\n=== Reset Commands Ready ===');
    console.log('Copy the above SQL commands and run them in your Supabase SQL Editor.');
    
  } catch (error) {
    console.error('Error in resetStaffRLSPolicies:', error);
  }
}

// Run the script if called directly
if (require.main === module) {
  resetStaffRLSPolicies()
    .then(() => {
      console.log('\nReset script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nReset script failed:', error);
      process.exit(1);
    });
}

export default resetStaffRLSPolicies;