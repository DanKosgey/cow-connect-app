# Staff Performance Dashboard Error Handling Test Plan

## Test Objectives
1. Verify graceful handling of database errors
2. Confirm proper user feedback for error conditions
3. Ensure application stability under error conditions
4. Validate edge case handling

## Test Cases

### Test Case 1: Database Connection Errors
**Steps:**
1. Simulate database connectivity issues
2. Load the staff performance dashboard
3. Observe error handling

**Expected Results:**
- User-friendly error message displayed
- Toast notification shows "Failed to fetch performance data"
- Dashboard remains functional
- Refresh button still works

### Test Case 2: Invalid Staff IDs
**Steps:**
1. Call database functions with invalid UUIDs
2. Check function behavior

**Expected Results:**
- Functions handle invalid IDs gracefully
- No crashes or unhandled exceptions
- Return empty or default values

### Test Case 3: Invalid Date Ranges
**Steps:**
1. Call functions with start date after end date
2. Check function behavior

**Expected Results:**
- Functions handle invalid date ranges gracefully
- No crashes or unhandled exceptions
- Return empty or default values

### Test Case 4: Missing Staff Records
**Steps:**
1. Load dashboard when no staff records exist
2. Observe display behavior

**Expected Results:**
- "No performance records found" message displayed
- Summary cards show zeros
- No JavaScript errors in console

### Test Case 5: Missing User Roles
**Steps:**
1. Load dashboard when no users have 'staff' role
2. Observe display behavior

**Expected Results:**
- "No performance records found" message displayed
- Summary cards show zeros
- No JavaScript errors in console

### Test Case 6: Missing Milk Approvals
**Steps:**
1. Load dashboard when no milk approvals exist
2. Observe display behavior

**Expected Results:**
- Performance records show zero values
- Accuracy scores may be default values
- No JavaScript errors in console

### Test Case 7: RLS Policy Violations
**Steps:**
1. Attempt to access data without proper permissions
2. Observe error handling

**Expected Results:**
- 403 errors handled gracefully
- User-friendly error messages
- Dashboard remains functional

## Manual Verification Queries

Run these queries to check data integrity:

```sql
-- Check for invalid accuracy scores
SELECT 
  COUNT(*) as invalid_scores
FROM public.staff_performance 
WHERE accuracy_score < 0 OR accuracy_score > 100;

-- Check for missing staff references
SELECT 
  COUNT(*) as orphaned_records
FROM public.staff_performance sp
LEFT JOIN public.staff s ON sp.staff_id = s.id
WHERE s.id IS NULL;

-- Check for data consistency
SELECT 
  COUNT(*) as negative_approvals
FROM public.staff_performance 
WHERE total_approvals < 0;

SELECT 
  COUNT(*) as negative_penalty_amounts
FROM public.staff_performance 
WHERE total_penalty_amount < 0;
```

## Edge Cases to Test

### Empty Database
- No staff records
- No user roles
- No milk approvals
- No performance records

### Partial Data
- Some staff without user roles
- Some staff without milk approvals
- Mixed date ranges in performance data

### Invalid Data
- Negative approval counts
- Negative penalty amounts
- Accuracy scores outside 0-100 range
- Future dates in historical data

### Concurrent Access
- Multiple users accessing simultaneously
- Simultaneous data updates
- Race conditions in performance calculations

## Troubleshooting

### If Error Messages Don't Appear
1. Check browser console for JavaScript errors
2. Verify `useToastNotifications` hook is working
3. Confirm error handling in `fetchPerformanceData` function

### If Dashboard Crashes
1. Check for unhandled promise rejections
2. Verify all async operations have proper error handling
3. Ensure `finally` blocks properly set loading states

### If Data Doesn't Refresh
1. Check network tab for failed requests
2. Verify refresh button calls `fetchPerformanceData`
3. Confirm database functions are accessible