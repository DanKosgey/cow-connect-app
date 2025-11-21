# End-to-End Test Plan: Approved Milk Collections Payment and Credit Workflow

## Overview
This document outlines the test plan to verify that only approved/verified milk collections are processed for payments and credits in the system.

## Test Scenarios

### 1. Collection Creation and Approval Flow

#### 1.1 Create New Milk Collection
- [ ] Log in as collector
- [ ] Create new milk collection for a farmer
- [ ] Verify collection is created with status "Collected"
- [ ] Verify collection is NOT approved for payment

#### 1.2 Approve Milk Collection
- [ ] Log in as admin/staff
- [ ] Navigate to milk approval section
- [ ] Approve the collection
- [ ] Verify collection status is updated to "approved_for_payment = true"
- [ ] Verify farmer receives notification about approval

### 2. Payment Processing Flow

#### 2.1 Attempt Payment for Unapproved Collection
- [ ] Log in as admin
- [ ] Try to create payment for unapproved collection
- [ ] Verify system rejects the payment with appropriate error message

#### 2.2 Create Payment for Approved Collection
- [ ] Log in as admin
- [ ] Create payment for approved collection
- [ ] Verify payment is created successfully
- [ ] Verify collection status is updated to "Paid"
- [ ] Verify farmer receives payment notification

#### 2.3 Verify Credit Deduction
- [ ] Check that credit is properly deducted from farmer's balance
- [ ] Verify credit transaction is recorded
- [ ] Verify net payment amount is calculated correctly

### 3. Credit System Integration

#### 3.1 Credit Eligibility Calculation
- [ ] Verify that only approved collections are considered for credit eligibility
- [ ] Check that pending (unapproved) collections are not included in credit calculations

#### 3.2 Credit Request Submission
- [ ] Log in as farmer
- [ ] Submit credit request
- [ ] Verify system only allows requests based on approved collections

#### 3.3 Credit Request Processing
- [ ] Log in as admin
- [ ] Approve credit request
- [ ] Log in as creditor
- [ ] Verify credit request details show only approved collections
- [ ] Process credit disbursement

### 4. UI Verification

#### 4.1 Admin Portal
- [ ] Verify collections table shows approval status clearly
- [ ] Verify pending tab only shows unpaid collections
- [ ] Verify paid tab shows payment details and approval status

#### 4.2 Creditor Portal
- [ ] Verify credit requests show collection verification status
- [ ] Verify only farmers with approved collections can request credit
- [ ] Verify collection details are displayed with approval indicators

### 5. Database Constraints

#### 5.1 Payment Constraints
- [ ] Attempt to insert payment for unapproved collection directly in database
- [ ] Verify constraint prevents insertion
- [ ] Verify appropriate error message is returned

#### 5.2 Data Consistency
- [ ] Verify all related tables are updated consistently
- [ ] Verify no orphaned records are created

### 6. Real-time Notifications

#### 6.1 Approval Notifications
- [ ] Verify farmer receives real-time notification when collection is approved
- [ ] Verify notification contains correct collection details

#### 6.2 Payment Notifications
- [ ] Verify farmer receives real-time notification when payment is processed
- [ ] Verify notification contains correct payment details

## Test Data Requirements

### Farmers
- Farmer with approved collections
- Farmer with pending (unapproved) collections
- Farmer with no collections

### Collections
- Approved collection (approved_for_payment = true)
- Pending collection (approved_for_payment = false)
- Paid collection (status = 'Paid')

### Credit Scenarios
- Farmer eligible for credit (has approved collections)
- Farmer not eligible for credit (only has pending collections)
- Farmer with credit balance
- Farmer with no credit balance

## Success Criteria

1. Only approved collections can be processed for payments
2. Farmers receive appropriate notifications at each step
3. Credit system only considers approved collections
4. UI clearly indicates approval status
5. Database constraints prevent invalid operations
6. All related data is updated consistently
7. Real-time notifications work correctly

## Test Execution Steps

### Setup
1. Create test farmers
2. Create test collections (approved and pending)
3. Set up credit profiles for farmers

### Execution
1. Run through each test scenario
2. Document results
3. Identify and report any issues
4. Retest fixed issues

### Verification
1. Confirm all success criteria are met
2. Validate data consistency across all tables
3. Ensure no security or performance issues

## Rollback Plan

If issues are found:
1. Document the issue with screenshots/logs
2. Rollback database to previous state if needed
3. Fix the issue in code
4. Retest the specific scenario
5. Revalidate the entire workflow