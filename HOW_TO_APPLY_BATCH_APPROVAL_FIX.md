# How to Apply the Batch Approval Function Fix

## Issue Summary

The batch approval functionality had a mismatch between frontend expectations and backend implementation:

- **Frontend**: Expected to provide a "Total Weighed Liters" value representing the total liters for ALL collections of a collector on a given date
- **Backend**: Treated the parameter as received liters for EACH individual collection

This caused incorrect variance calculations and penalty applications.

## Solution

We've created a complete fix that:
1. Drops the old function with the incorrect parameter name
2. Creates a new function with the correct logic for proportional distribution
3. Updates the frontend to use the correct parameter name

## Files Included

1. `scripts/apply-batch-approval-fix.sql` - Complete migration script
2. `scripts/test-batch-approval-fix.sql` - Verification script
3. `src/services/milk-approval-service.ts` - Updated frontend service (already applied)

## How to Apply the Fix

### Step 1: Apply the Database Migration

1. Open your Supabase Dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `scripts/apply-batch-approval-fix.sql`
4. Run the query

This will:
- Drop the existing function
- Create the new function with corrected logic
- Grant proper permissions

### Step 2: Redeploy the Frontend Application

The frontend service has already been updated to use the correct parameter name (`p_total_received_liters`), so you just need to redeploy your application.

### Step 3: Verify the Fix

1. Run the verification script `scripts/test-batch-approval-fix.sql` in your Supabase SQL Editor
2. Check that the function signature shows `p_total_received_liters` instead of `p_default_received_liters`
3. Test the batch approval functionality in the UI

## How the Fix Works

### Before (Incorrect):
```sql
-- If total received liters = 1000
-- Collection A (200L) would get 1000L
-- Collection B (300L) would get 1000L
-- Total distributed: 2000L (incorrect!)
```

### After (Correct):
```sql
-- If total received liters = 1000
-- Collection A (200L): (200/500) × 1000 = 400L
-- Collection B (300L): (300/500) × 1000 = 600L
-- Total distributed: 1000L (correct!)
```

## Expected Results

After applying the fix:
- ✅ Total received liters in approval summary matches the "Total Weighed Liters" entered in UI
- ✅ Individual collections receive proportional amounts based on their collected liters
- ✅ Variance calculations are accurate based on distributed amounts
- ✅ Penalty calculations work correctly
- ✅ Collector performance metrics are updated accurately
- ✅ Variance tracking functions as intended with proper penalty application

## Troubleshooting

### If you get permission errors:
Make sure you're running the script as a user with sufficient privileges (preferably the service role).

### If the function still shows the old parameter name:
Double-check that you've run the complete migration script and that there were no errors.

### If the frontend doesn't work:
Make sure you've redeployed the application with the updated service code.

## Rollback (if needed)

If you need to rollback to the previous version:
1. Drop the new function: `DROP FUNCTION IF EXISTS public.batch_approve_collector_collections(uuid, uuid, date, numeric);`
2. Restore the previous function from your backups or migration history
3. Update the frontend service to use the old parameter name again

## Testing the Fix

You can test the fix by:
1. Creating test collections for a collector
2. Using the batch approval form with a "Total Weighed Liters" value
3. Verifying that the total received liters in the approval summary matches your input
4. Checking that individual collections received proportional amounts