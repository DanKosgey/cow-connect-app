# Collector Penalty Calculation Fix Summary

## Issue Description
The collectors page was showing incorrect penalty calculations due to malformed Supabase queries that were causing 400 Bad Request errors. The logs showed errors like:
```
GET https://oevxapmcmcaxpaluehyg.supabase.co/rest/v1/milk_approvals?select=penalty_amount%2Cpenalty_status%2Cstaff_id%2Ccollector_id&staff_id=eq.ba272430-5a7d-494b-b8f7-300f84abec88 400 (Bad Request)
```

## Root Cause Analysis
There were multiple issues:
1. **Incorrect column reference**: Trying to select `collector_id` from the `milk_approvals` table which doesn't have this column
2. **Incorrect query logic**: Redundant queries that were the same
3. **Malformed query syntax**: Some queries had incorrect syntax that was causing parsing errors

## Fixes Applied

### 1. Fixed Column Reference Issues
**File:** `src/services/collector-earnings-service.ts`

Corrected references to use proper column names:
- Removed `collector_id` from SELECT clause when querying the `milk_approvals` table since this column doesn't exist in that table
- Kept proper usage of `staff_id` for referencing staff members in the `milk_approvals` table

### 2. Fixed Query Logic
**File:** `src/services/collector-earnings-service.ts`

Improved the query approach:
- Removed redundant "Approach 2" that was identical to "Approach 1"
- Restructured logic to check `collector_daily_summaries` only when `milk_approvals` doesn't yield results
- Made the debug query more focused and correct

### 3. Fixed Query Syntax
**File:** `src/services/collector-earnings-service.ts`

Ensured all queries use proper Supabase syntax without malformed conditions.

### Specific Changes Made:

1. **Lines ~1000-1015:** Fixed the main penalty calculation query to properly use `staff_id`
2. **Lines ~1020-1035:** Restructured approach to eliminate redundancy and improve logic flow
3. **Lines ~1080-1090:** Fixed the debug query to not select non-existent `collector_id` column

## Validation
All Supabase queries in the collector earnings service were reviewed and confirmed to be using:
- Valid column names (`staff_id` for milk_approvals table, `collector_id` for collector_daily_summaries table)
- Proper Supabase query syntax
- Logical flow that makes sense for the data structures

## Testing
The fixes should resolve the 400 Bad Request errors and allow the penalty calculations to work correctly. The collectors page should now properly:
1. Calculate pending penalties using valid database queries
2. Show correct penalty status information
3. Update penalty_status when marking collections as paid
4. Exclude paid penalties from future calculations

## Impact
- Resolves the Supabase query errors
- Fixes incorrect penalty calculations on the collectors page
- Maintains all existing functionality while improving reliability
- Uses correct database schema references
- Improves code logic and eliminates redundancy