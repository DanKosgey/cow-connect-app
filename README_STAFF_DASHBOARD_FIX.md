# Staff Dashboard Fix Implementation Guide

## Problem Summary
The staff dashboard was showing "0 Pending Reviews" when there should be collections to approve. This issue was caused by:

1. **Incorrect calculation** in the dashboard stats hook
2. **Missing RLS policies** preventing staff users from accessing required data

## Solution Overview
This fix addresses both issues by:
1. Correcting the pending reviews calculation to count collections where `approved_for_company` is false
2. Adding proper RLS policies for staff access to all required tables

## Files to Deploy

### 1. Source Code Changes
- `src/hooks/useDashboardStats.ts` - Updated pending reviews calculation

### 2. Database Migrations
All migration files should be placed in your `supabase/migrations` directory:

1. `supabase/migrations/20251121000500_add_staff_collections_rls.sql`
2. `supabase/migrations/20251121000600_add_staff_milk_approvals_rls.sql`
3. `supabase/migrations/20251121000700_add_staff_table_access_for_staff_users.sql`
4. `supabase/migrations/20251121000800_add_staff_farmers_rls.sql`
5. `supabase/migrations/20251121000900_check_milk_approvals_rls.sql`

## Deployment Steps

### Step 1: Apply Database Migrations
```bash
# Navigate to your project directory
cd /path/to/your/project

# Apply the migrations
supabase db push
```

### Step 2: Update Source Code
Replace your existing `src/hooks/useDashboardStats.ts` with the updated version that correctly calculates pending reviews.

### Step 3: Restart the Application
```bash
# If using development server
npm run dev
# or
yarn dev

# If using production build
npm run build && npm run start
```

## Verification

### 1. Check Database Policies
Run the verification script `VERIFY_STAFF_DASHBOARD_FIX.sql` in your Supabase SQL Editor to confirm:
- All RLS policies are properly applied
- Tables have the correct structure
- Queries return expected results

### 2. Test Dashboard Functionality
1. Log in as a staff user
2. Navigate to the staff dashboard
3. Verify that "Pending Reviews" shows the correct count
4. Navigate to the Milk Approval page
5. Verify that pending collections are displayed correctly

## Expected Results

After applying these fixes:
- Staff dashboard should show the actual count of collections pending approval
- Staff users should be able to access and approve collections
- No 403 Forbidden errors should occur when accessing dashboard data

## Troubleshooting

### If Dashboard Still Shows 0 Pending Reviews
1. Check that there are actually collections with `approved_for_company = false`
2. Verify that the staff user has the correct role assigned in `user_roles` table
3. Confirm that all migrations have been applied successfully

### If Access Denied Errors Occur
1. Verify that all RLS policies have been applied
2. Check that the staff user has an active 'staff' role in `user_roles` table
3. Ensure that the `is_admin()` function exists and works correctly

### If Data Doesn't Load
1. Check the browser console for any JavaScript errors
2. Verify that the Supabase client is properly configured
3. Confirm network connectivity to your Supabase instance

## Additional Resources

- `STAFF_DASHBOARD_FIX_SUMMARY.md` - Detailed summary of all changes
- `VERIFY_STAFF_DASHBOARD_FIX.sql` - SQL verification script