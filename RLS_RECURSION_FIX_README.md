# RLS Recursion Issue Fix

## Problem Summary
The application was experiencing "infinite recursion detected in policy for relation 'user_roles'" errors. This occurred because RLS policies were directly querying the user_roles table within the same policy evaluation, creating a circular reference.

## Root Cause
Several RLS policies used direct queries to the user_roles table:
```sql
EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
)
```

This creates recursion because when evaluating the policy on the user_roles table itself, it tries to query the user_roles table again.

## Solution Applied
All direct user_roles queries in RLS policies have been replaced with calls to the secure function `get_user_role_secure()` which bypasses RLS and avoids recursion.

## Files Created

### 1. Migration Files
- `supabase/migrations/20251214000700_fix_user_roles_recursion_issue.sql`
  - Fixes the infinite recursion in user_roles RLS policies
  - Replaces the recursive policy with a simpler one using get_user_role_secure()

- `supabex/migrations/20251214123000_fix_all_rls_recursion_issues.sql`
  - Fixes all remaining recursion issues in collections, staff, and farmers tables
  - Replaces all problematic EXISTS clauses with get_user_role_secure() calls

### 2. Test Scripts
- `test_user_roles_fix.sql`
  - Contains queries to verify that the fix works correctly

### 3. Documentation
- `COMPREHENSIVE_RLS_RECURSION_FIX.md`
  - Detailed explanation of the problem and solution

## How to Apply the Fix

1. **Apply the migrations:**
   ```bash
   # If using Supabase CLI
   supabase db push
   
   # Or run the SQL directly in Supabase dashboard
   # Copy contents of the migration files in chronological order
   ```

2. **Verify the fix:**
   Run the queries in `test_user_roles_fix.sql` in your Supabase SQL Editor

3. **Test the application:**
   - Login as an admin user
   - Try accessing the farmers and staff dashboards
   - Verify that no recursion errors occur

## Updated Policy Pattern

### Before (causing recursion):
```sql
CREATE POLICY "Admins can manage table" ON public.table_name
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
    )
  );
```

### After (fixed):
```sql
CREATE POLICY "Admins can manage table" ON public.table_name
  FOR ALL USING (public.get_user_role_secure(auth.uid()) = 'admin');
```

## Verification Steps

1. Check that policies were created correctly:
   ```sql
   SELECT polname FROM pg_policy WHERE polrelid = 'user_roles'::regclass;
   ```

2. Verify that an admin user can access user_roles:
   ```sql
   SELECT * FROM user_roles WHERE user_id = 'your-admin-user-id' LIMIT 5;
   ```

3. Confirm that the farmers and staff tables are accessible without recursion errors:
   ```sql
   SELECT COUNT(*) as farmers_count FROM farmers LIMIT 1;
   SELECT COUNT(*) as staff_count FROM staff LIMIT 1;
   ```

## Why This Fix Works

The `get_user_role_secure()` function is defined with `SECURITY DEFINER`, which means it runs with elevated privileges and bypasses RLS policies. This prevents the recursion that occurs when a policy tries to evaluate itself.

The function signature:
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

This approach ensures that:
1. The function can access the user_roles table without triggering RLS policies
2. The function returns the correct role for the user
3. No recursion occurs because the function bypasses the policy evaluation that was causing the issue