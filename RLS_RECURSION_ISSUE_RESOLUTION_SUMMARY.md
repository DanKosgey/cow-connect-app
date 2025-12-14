# RLS Recursion Issue Resolution Summary

## Problem Identified
The application was experiencing "infinite recursion detected in policy for relation 'user_roles'" errors when accessing the farmers and staff endpoints. This was causing 500 Internal Server Errors.

## Root Cause Analysis
Multiple RLS policies were using a pattern that directly queried the user_roles table within the same policy evaluation:

```sql
EXISTS (
  SELECT 1 FROM user_roles ur 
  WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
)
```

This creates recursion because when evaluating a policy on the user_roles table itself, it tries to query the user_roles table again, leading to an infinite loop.

## Affected Files
1. `supabase/migrations/20251214000600_fix_user_roles_rls_for_staff_management.sql` - Direct recursion on user_roles table
2. `supabase/migrations/20251214121916_fix_collections_rls_and_relationships.sql` - Multiple recursion points
3. `supabase/migrations/20251214122331_consolidate_collections_rls_policies.sql` - Multiple recursion points

## Solution Implemented
Created migration files that replace all direct user_roles queries with calls to the secure function `get_user_role_secure()` which bypasses RLS and avoids recursion.

### New Migration Files:
1. `supabase/migrations/20251214000700_fix_user_roles_recursion_issue.sql` - Fixes direct recursion on user_roles table
2. `supabase/migrations/20251214123000_fix_all_rls_recursion_issues.sql` - Fixes all remaining recursion issues

### Updated Policy Pattern:
**Before (causing recursion):**
```sql
CREATE POLICY "Admins can manage table" ON public.table_name
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
  );
```

**After (fixed):**
```sql
CREATE POLICY "Admins can manage table" ON public.table_name
  FOR ALL USING (public.get_user_role_secure(auth.uid()) = 'admin');
```

## Why This Fix Works
The `get_user_role_secure()` function is defined with `SECURITY DEFINER`, which means it runs with elevated privileges and bypasses RLS policies. This prevents the recursion that occurs when a policy tries to evaluate itself.

Function signature:
```sql
CREATE OR REPLACE FUNCTION public.get_user_role_secure(user_id_param UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER  -- This allows the function to run with elevated privileges
SET search_path = public
AS $$
  SELECT role 
  FROM user_roles 
  WHERE user_id = user_id_param 
    AND active = true
  LIMIT 1;
$$;
```

## Verification Steps
1. Apply the migration files in chronological order
2. Check that policies were created correctly:
   ```sql
   SELECT polname FROM pg_policy WHERE polrelid = 'user_roles'::regclass;
   ```
3. Verify that an admin user can access user_roles:
   ```sql
   SELECT * FROM user_roles WHERE user_id = 'your-admin-user-id' LIMIT 5;
   ```
4. Confirm that the farmers and staff tables are accessible without recursion errors:
   ```sql
   SELECT COUNT(*) as farmers_count FROM farmers LIMIT 1;
   SELECT COUNT(*) as staff_count FROM staff LIMIT 1;
   ```

## Expected Outcome
After applying these fixes:
- The "infinite recursion detected in policy for relation 'user_roles'" error should be resolved
- Farmers and staff endpoints should return 200 OK instead of 500 Internal Server Error
- Admin users should be able to access all required data without issues
- The application should function normally with all RLS policies working as intended

## Additional Documentation
- `RLS_RECURSION_FIX_README.md` - Detailed explanation of the fix
- `COMPREHENSIVE_RLS_RECURSION_FIX.md` - Technical documentation
- `test_user_roles_fix.sql` - Test queries to verify the fix