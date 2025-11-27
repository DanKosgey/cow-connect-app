# Staff Performance Dashboard Testing Plan

## Test Objectives
1. Verify the dashboard displays real data from the database
2. Confirm all metrics are calculated correctly
3. Ensure proper error handling
4. Validate timeframe filtering works correctly

## Test Cases

### Test Case 1: Dashboard Loads Without Errors
**Steps:**
1. Navigate to `/staff-only/staff-performance` route
2. Observe loading states
3. Check for console errors

**Expected Results:**
- Dashboard loads without JavaScript errors
- Loading indicators display during data fetch
- No 403/404 errors in console

### Test Case 2: Summary Statistics Display
**Steps:**
1. Load the dashboard
2. Check the four summary cards:
   - Total Staff
   - Avg. Accuracy
   - Top Performer
   - Needs Attention

**Expected Results:**
- All cards display numerical values (not loading states)
- Values are reasonable (e.g., accuracy between 0-100)
- Top performer shows a staff name
- "Needs Attention" count is logical

### Test Case 3: Performance Records Table
**Steps:**
1. Load the dashboard
2. Scroll to the performance records table
3. Check table columns:
   - Staff Member
   - Approvals
   - Collections
   - Liters Approved
   - Avg. Variance %
   - Positive
   - Negative
   - Penalties
   - Accuracy Score

**Expected Results:**
- Table shows real staff names (not "Unknown Staff")
- Numerical values are populated
- Accuracy scores are between 0-100
- Positive/Negative variance counts make sense

### Test Case 4: Timeframe Filtering
**Steps:**
1. Load the dashboard
2. Click "Quarterly" button
3. Click "Yearly" button
4. Click "Monthly" button

**Expected Results:**
- Data updates for each timeframe
- No errors when switching timeframes
- Different data appears for different periods (if data exists)

### Test Case 5: Refresh Functionality
**Steps:**
1. Load the dashboard
2. Click the refresh button
3. Observe loading state
4. Check data after refresh

**Expected Results:**
- Refresh button shows loading state
- Data reloads without page refresh
- Same data appears after refresh

## Manual Verification Queries

Run these queries in Supabase SQL editor to verify data exists:

```sql
-- Check if staff_performance table has data
SELECT COUNT(*) as total_records FROM public.staff_performance;

-- Check sample data
SELECT 
  sp.id,
  sp.total_approvals,
  sp.accuracy_score,
  s.user_id,
  p.full_name
FROM public.staff_performance sp
JOIN public.staff s ON sp.staff_id = s.id
JOIN public.profiles p ON s.user_id = p.id
LIMIT 5;

-- Check data for different timeframes
SELECT 
  COUNT(*) as monthly_count
FROM public.staff_performance 
WHERE period_start >= DATE_TRUNC('month', CURRENT_DATE);

SELECT 
  COUNT(*) as quarterly_count
FROM public.staff_performance 
WHERE period_start >= DATE_TRUNC('quarter', CURRENT_DATE);

SELECT 
  COUNT(*) as yearly_count
FROM public.staff_performance 
WHERE period_start >= DATE_TRUNC('year', CURRENT_DATE);
```

## Troubleshooting

### If No Data Displays
1. Check if `staff_performance` table has records
2. Verify staff members exist in `staff` table
3. Confirm user roles are properly assigned
4. Check RLS policies on `staff_performance` table

### If Accuracy Scores Are All Zero
1. Verify `milk_approvals` table has data
2. Check if `calculate_staff_performance` function works
3. Ensure trigger is updating performance records

### If Staff Names Show as "Unknown Staff"
1. Verify join between `staff_performance`, `staff`, and `profiles` tables
2. Check if `profiles` table has `full_name` data
3. Confirm foreign key relationships are intact