# RLS Policy Recursion Issue Fixes

## Problem
The application was experiencing "infinite recursion detected in policy for relation 'user_roles'" errors. This was caused by RLS policies that directly queried the user_roles table, creating a circular reference.

## Root Cause
Several RLS policies were using patterns like:
```sql
EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
)
```

This creates recursion because when evaluating the policy on the user_roles table itself, it tries to query the user_roles table again.

## Solution
Replace all direct user_roles queries in RLS policies with calls to the secure function `get_user_role_secure()` which avoids recursion.

## Fixed Migrations

### 1. 20251212000700_fix_deduction_system_rls_policies.sql
Fixed policies on deduction system tables:
- deduction_types
- farmer_deductions  
- deduction_records

### 2. 20251212000800_fix_collector_payments_rls_policies.sql
Fixed policies on collector_payments table

### 3. 20251212000900_fix_credit_system_rls_policies.sql
Fixed policies on credit system tables:
- farmer_credit_profiles
- credit_transactions
- agrovet_inventory

### 4. 20251212001000_fix_invitations_rls_policies.sql
Fixed policies on invitations table

### 5. 20251212001100_fix_collections_rls_policies.sql
Fixed collector access policies on collections table

### 6. 20251212001200_fix_staff_collections_rls_policies.sql
Fixed staff access policies on collections table

### 7. 20251212001300_fix_staff_rls_policies.sql
Fixed policies on staff table

## Updated Policy Patterns

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

## Verification
After applying these migrations, the recursion error should be resolved and the recurring deduction service should work properly.