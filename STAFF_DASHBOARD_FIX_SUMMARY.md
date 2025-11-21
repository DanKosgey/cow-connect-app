# Staff Dashboard Fix Summary

## Issue Description
The staff dashboard was showing "0 Pending Reviews" when there should be collections to approve. This was caused by two main issues:

1. **Incorrect Pending Reviews Calculation**: The dashboard stats hook was counting records from the `milk_approvals` table where `approved_at` is null, but it should be counting collections where `approved_for_company` is false.

2. **Missing RLS Policies**: Staff users didn't have proper access to the collections table for approval purposes, and there were missing RLS policies for several tables.

## Fixes Applied

### 1. Fixed Dashboard Stats Calculation
Updated the [useDashboardStats](file:///c:/Users/PC/OneDrive/Desktop/dairy%20new/cow-connect-app/src/hooks/useDashboardStats.ts#L26-L108) hook to correctly count pending collections:

```typescript
// Fetch pending reviews count (collections pending approval for company)
const { count: pendingReviewsCount, error: pendingError } = await supabase
  .from('collections')
  .select('*', { count: 'exact', head: true })
  .eq('approved_for_company', false);
```

### 2. Added RLS Policies for Staff Access

#### a. Collections Table Access
Created migration `20251121000500_add_staff_collections_rls.sql`:
- Added policies allowing staff users to SELECT and UPDATE collections

#### b. Milk Approvals Table Access
Created migration `20251121000600_add_staff_milk_approvals_rls.sql`:
- Added policies allowing staff users to SELECT, INSERT, and UPDATE milk approvals

#### c. Staff Table Access
Created migration `20251121000700_add_staff_table_access_for_staff_users.sql`:
- Added policy allowing staff users to SELECT staff records

#### d. Farmers Table Access
Created migration `20251121000800_add_staff_farmers_rls.sql`:
- Added policy allowing staff users to SELECT farmers

#### e. Comprehensive Milk Approvals RLS Fix
Created migration `20251121000900_check_milk_approvals_rls.sql`:
- Enabled RLS on milk_approvals table
- Added comprehensive policies for admins, staff, and collectors

## Verification

After applying these fixes, the staff dashboard should correctly show the number of pending collections that need approval.

## Files Created

1. `supabase/migrations/20251121000500_add_staff_collections_rls.sql`
2. `supabase/migrations/20251121000600_add_staff_milk_approvals_rls.sql`
3. `supabase/migrations/20251121000700_add_staff_table_access_for_staff_users.sql`
4. `supabase/migrations/20251121000800_add_staff_farmers_rls.sql`
5. `supabase/migrations/20251121000900_check_milk_approvals_rls.sql`
6. `src/hooks/useDashboardStats.ts` (updated)

## How to Apply the Fix

1. Ensure all migration files are in the `supabase/migrations` directory
2. Run the migrations using Supabase CLI:
   ```bash
   supabase db push
   ```
3. Restart the application to ensure the updated [useDashboardStats](file:///c:/Users/PC/OneDrive/Desktop/dairy%20new/cow-connect-app/src/hooks/useDashboardStats.ts#L26-L108) hook is used