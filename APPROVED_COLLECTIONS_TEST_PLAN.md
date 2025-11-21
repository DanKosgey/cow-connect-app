# Approved Collections Test Plan

This document outlines the testing procedures to verify that all system components correctly use only approved milk collections for calculations, analytics, and reporting.

## Test Environment Setup

1. Ensure you have test data with:
   - Unapproved collections (approved_for_company = false)
   - Approved collections (approved_for_company = true)
   - Mixed status collections for different farmers

2. Set up test accounts:
   - Admin user
   - Staff user
   - Farmer user

## Test Cases

### 1. Admin Dashboard Testing

**Objective**: Verify that the Admin Dashboard only displays and calculates metrics based on approved collections.

**Test Steps**:
1. Log in as an admin user
2. Navigate to the Admin Dashboard
3. Check that all metrics (Total Liters, Revenue, etc.) only include approved collections
4. Verify that charts and trends are based on approved collections only
5. Confirm that the collections list only shows approved collections

**Expected Results**:
- All dashboard metrics should reflect only approved collections
- No unapproved collections should appear in any dashboard elements

### 2. Payment System Testing

**Objective**: Verify that the Payment System only processes and displays approved collections.

**Test Steps**:
1. Navigate to the Payment System page
2. Check that all payment calculations are based on approved collections
3. Verify that farmer payment summaries only include approved collections
4. Confirm that payment analytics exclude unapproved collections

**Expected Results**:
- Payment amounts should only reflect approved collections
- Unapproved collections should not appear in payment calculations

### 3. Analytics Dashboard Testing

**Objective**: Verify that Analytics only use approved collections for reporting.

**Test Steps**:
1. Navigate to the Collections Analytics Dashboard
2. Check that all charts and metrics are based on approved collections
3. Verify that quality distribution and farmer statistics only include approved collections
4. Confirm that date range filters still respect the approved collection filter

**Expected Results**:
- All analytics should be based on approved collections only
- No unapproved collections should influence any analytical data

### 4. Collections View Testing

**Objective**: Verify that the Collections View properly displays approval status and filters correctly.

**Test Steps**:
1. Navigate to the Collections View page
2. Check that the approval status column correctly shows "Approved" or "Pending"
3. Verify that all displayed collections are approved (since we filter by approved only)
4. Test filtering and search functionality

**Expected Results**:
- All collections shown should be approved
- Approval status should be clearly visible
- Filtering should work correctly

### 5. Payment Reports Testing

**Objective**: Verify that Payment Reports only include approved collections.

**Test Steps**:
1. Navigate to the Payment Reports page
2. Generate reports for different date ranges
3. Check that all reported data is based on approved collections
4. Verify that summary statistics only include approved collections

**Expected Results**:
- All report data should reflect only approved collections
- Summary totals should match approved collection totals

### 6. Farmer Payment Details Testing

**Objective**: Verify that individual farmer payment details only show approved collections.

**Test Steps**:
1. Navigate to a farmer's payment details page
2. Check that the collection history only includes approved collections
3. Verify that payment calculations are based on approved collections
4. Confirm that approval status is displayed for each collection

**Expected Results**:
- Only approved collections should appear in the farmer's history
- Payment amounts should reflect only approved collections

### 7. Farmer Performance Dashboard Testing

**Objective**: Verify that farmer performance metrics are based on approved collections.

**Test Steps**:
1. Navigate to the Farmer Performance Dashboard
2. Check that performance scores are calculated using approved collections
3. Verify that risk assessments are based on approved collection data
4. Confirm that top performers are identified using approved collections

**Expected Results**:
- All performance metrics should be based on approved collections
- Farmer rankings should reflect approved collection performance

### 8. Credit Management Testing

**Objective**: Verify that credit calculations only consider approved collections.

**Test Steps**:
1. Navigate to the Credit Management page
2. Check that credit limits are calculated using approved collections
3. Verify that pending payments only include approved collections
4. Confirm that credit usage is tracked against approved collections

**Expected Results**:
- Credit calculations should only consider approved collections
- Pending payment amounts should reflect only approved collections

## SQL Query Verification

Run the following SQL queries to verify data integrity:

### Check collections count by approval status:
```sql
SELECT 
  approved_for_company,
  COUNT(*) as count,
  SUM(liters) as total_liters,
  SUM(total_amount) as total_amount
FROM collections
GROUP BY approved_for_company;
```

### Verify that dashboard queries only return approved collections:
```sql
-- This should return 0 rows if dashboard queries are correctly filtering
SELECT COUNT(*) 
FROM collections 
WHERE approved_for_company = false
AND id IN (
  -- Add IDs from dashboard queries here for verification
);
```

## Automated Testing

Create unit tests for the following services:
1. Admin dashboard data service
2. Payment calculation service
3. Analytics service
4. Credit calculation service

Each test should verify that:
- Only approved collections are processed
- Unapproved collections are properly filtered out
- Calculations match expected values based on approved collections only

## Manual Testing Checklist

- [ ] Admin Dashboard displays only approved collections
- [ ] Payment System calculations use only approved collections
- [ ] Analytics Dashboard metrics based on approved collections
- [ ] Collections View shows approval status correctly
- [ ] Payment Reports include only approved collections
- [ ] Farmer Payment Details show only approved collections
- [ ] Farmer Performance Dashboard uses approved collections
- [ ] Credit Management calculations consider only approved collections
- [ ] All SQL queries filter by approved_for_company = true
- [ ] Frontend components display approval information
- [ ] No unapproved collections appear in any calculations or displays

## Expected Outcomes

After implementing these changes:
1. All system dashboards and reports will show data based exclusively on approved collections
2. Payment calculations will only include approved collections
3. Analytics and performance metrics will be based on approved data
4. Credit limits and usage will be calculated using approved collections
5. Users will be able to clearly see the approval status of collections
6. The system will maintain data integrity by consistently filtering for approved collections

## Rollback Plan

If issues are discovered during testing:
1. Revert the frontend code changes
2. Restore any modified database queries
3. Document the issues found
4. Implement fixes and retest

## Sign-off

- [ ] Development team has reviewed changes
- [ ] QA team has executed test plan
- [ ] All test cases pass
- [ ] Product owner has approved changes