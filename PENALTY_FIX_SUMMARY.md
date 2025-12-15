# Penalty Calculation Fix Summary

## Issue Description
The collectors page was showing incorrect penalty calculations due to malformed Supabase queries that were causing 400 Bad Request errors. The logs showed errors like:
```
GET https://oevxapmcmcaxpaluehyg.supabase.co/rest/v1/milk_approvals?select=penalty_amount&collector_id=eq.3943fa01-60c4-4e7d-8c46-5e0d33bf6c9c&penalty_status=eq.pending&or=%28penalty_amount.gt.0%2Cpenalty_amount.gt.%220%22%29 400 (Bad Request)
```

## Root Cause
The issue was with the `or()` clause in Supabase queries that used invalid syntax:
```typescript
.or('penalty_amount.gt.0,penalty_amount.gt."0"')
```

This syntax was incorrect and caused the Supabase API to return 400 Bad Request errors.

## Fixes Applied

### 1. Fixed calculatePendingPenaltiesForCollector Function
**File:** `src/services/collector-earnings-service.ts`

**Before (lines 1002-1005):**
```typescript
const { data: milkApprovals, error: approvalsError } = await supabase
  .from('milk_approvals')
  .select('penalty_amount')
  .eq('staff_id', collectorId)
  .eq('penalty_status', 'pending')
  .or('penalty_amount.gt.0,penalty_amount.gt."0"');
```

**After:**
```typescript
const { data: milkApprovals, error: approvalsError } = await supabase
  .from('milk_approvals')
  .select('penalty_amount')
  .eq('staff_id', collectorId)
  .eq('penalty_status', 'pending')
  .gt('penalty_amount', 0);
```

Similar fixes were applied to all instances of the problematic `or()` clause in the function.

### 2. Fixed Debug Query
**File:** `src/services/collector-earnings-service.ts`

**Before (lines 103-105):**
```typescript
.select('*')
.eq('staff_id', collectorId)
.eq('penalty_status', 'pending')
.or('penalty_amount.neq.0,penalty_amount.neq."0"');
```

**After:**
```typescript
.select('*')
.eq('staff_id', collectorId)
.eq('penalty_status', 'pending')
.neq('penalty_amount', 0);
```

## Validation
All other Supabase queries in the codebase were reviewed and confirmed to be using valid syntax:
- Queries using `.or()` with proper Supabase operators like `ilike`, `eq`, `is.null`, etc.
- JSON field access queries using `new_data->>field_name`
- Range queries using `gte`, `lte`, etc.

## Testing
The fix resolves the 400 Bad Request errors and should allow the penalty calculations to work correctly. The collectors page should now properly:
1. Calculate pending penalties using valid database queries
2. Show correct penalty status information
3. Update penalty_status when marking collections as paid
4. Exclude paid penalties from future calculations

## Impact
- Resolves the Supabase query errors
- Fixes incorrect penalty calculations on the collectors page
- Maintains all existing functionality while improving reliability