# Batch Approval Function Fix

## Problem Description

The batch approval functionality had an issue with how the "Total Weighed Liters" parameter was being interpreted:

1. **Frontend Expectation**: The UI collects a "Total Weighed Liters" value that represents the total liters received for ALL collections of a collector on a given date. This total should be distributed proportionally among the individual collections.

2. **Backend Implementation Issue**: The original database function treated the parameter as the received liters for EACH individual collection, rather than distributing a total amount proportionally.

## Solution Implemented

### 1. Database Function Fix (`fix-batch-approval-function.sql`)

The `batch_approve_collector_collections` function was updated to properly handle the total received liters parameter:

#### Changes Made:
- Renamed parameter from `p_default_received_liters` to `p_total_received_liters` for clarity
- Added logic to calculate the total collected liters across all collections for the collector/date combination
- Implemented proportional distribution formula: `(individual_collection_liters / total_collected_liters) * total_received_liters`
- Maintained all existing validation and error handling

#### Example:
If a collector has two collections on a date:
- Collection A: 200L collected
- Collection B: 300L collected
- Total collected: 500L
- Total received (from UI): 450L

Distribution:
- Collection A receives: (200/500) × 450 = 180L
- Collection B receives: (300/500) × 450 = 270L
- Total distributed: 450L ✓

### 2. Frontend Service Update (`src/services/milk-approval-service.ts`)

Updated the RPC call parameter name to match the new function signature:
- Changed `p_default_received_liters` to `p_total_received_liters`

### 3. UI Component (`src/components/staff/BatchApprovalForm.tsx`)

The UI component was already correctly implementing the concept of "Total Weighed Liters" - no changes needed here.

## Testing

### Test Scripts Provided:
1. `scripts/test-fixed-batch-approval.ts` - TypeScript test for the frontend service
2. `scripts/test-proportional-distribution.sql` - SQL test for the database function

### Manual Testing Steps:
1. Apply the database function fix by running `fix-batch-approval-function.sql`
2. Navigate to the batch approval form in the UI
3. Select a collector with pending collections
4. Enter a "Total Weighed Liters" value
5. Click "Review Batch Approval"
6. Verify the preview shows correct calculations
7. Click "Confirm & Approve"
8. Check that the total received liters in the approval summary matches the input value

## Applying the Fix

1. Execute the SQL script `scripts/fix-batch-approval-function.sql` in your Supabase SQL editor
2. Deploy the updated frontend code (parameter name change is backward compatible)
3. Test the functionality with sample data

## Verification

After applying the fix, you should observe:
- The total received liters in the approval summary matches the "Total Weighed Liters" entered in the UI
- Individual collections receive proportional amounts based on their collected liters
- Variance and penalty calculations work correctly based on the distributed amounts
- Collector performance metrics are updated accurately