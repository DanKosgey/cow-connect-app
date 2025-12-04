# Credit System End-to-End Test Plan

## Overview
This document outlines a comprehensive test plan to verify that the credit system works correctly end-to-end, ensuring that all components integrate properly and function as expected.

## Test Scenarios

### 1. Farmer Registration and Credit Profile Creation
**Objective**: Verify that farmers automatically receive credit profiles upon registration

**Steps**:
1. Register a new farmer account
2. Log in as the farmer
3. Navigate to the credit dashboard
4. Verify that a credit profile is automatically created
5. Check that the credit profile has appropriate default values based on registration date

**Expected Results**:
- Farmer receives a credit profile with correct tier (new/established/premium)
- Credit limit percentage and max amount are set according to tier
- Current credit balance starts at 0
- Profile is not frozen by default

### 2. Credit Granting Process
**Objective**: Verify that admins can grant credit to eligible farmers

**Steps**:
1. Log in as admin
2. Navigate to credit management section
3. Select a farmer with no existing credit balance
4. Grant credit to the farmer
5. Verify that the farmer's credit balance is updated
6. Check that a credit transaction record is created

**Expected Results**:
- Farmer's current credit balance is updated correctly
- Credit transaction record shows "credit_granted" type
- Transaction amount matches granted amount
- Farmer can now make credit purchases

### 3. Farmer Credit Request Submission
**Objective**: Verify that farmers can submit credit requests for products

**Steps**:
1. Log in as farmer with available credit
2. Navigate to agrovet shopping interface
3. Browse products and select one with packaging options
4. Add product to cart (should prompt for packaging selection)
5. Submit credit request
6. Verify that credit request is created in pending status

**Expected Results**:
- Packaging selection modal appears when adding products to cart
- Credit request is created with correct product, quantity, and packaging info
- Request status is "pending"
- Farmer's credit balance is not immediately affected

### 4. Admin Credit Request Approval
**Objective**: Verify that admins can approve credit requests and credit is properly deducted

**Steps**:
1. Log in as admin
2. Navigate to credit approval queue
3. Find pending credit request from previous test
4. Approve the credit request
5. Verify that credit is deducted from farmer's balance
6. Check that credit transaction record is created
7. Verify that request status is updated to "approved"

**Expected Results**:
- Farmer's current credit balance is reduced by request amount
- Credit transaction record shows "credit_used" type
- Transaction amount matches request amount
- Request status changes to "approved"
- Farmer receives notification of approval

### 5. Credit Limit Enforcement
**Objective**: Verify that credit limits are enforced properly

**Steps**:
1. Log in as farmer with low credit balance
2. Attempt to submit credit request exceeding available balance
3. Verify that request is rejected or limited
4. Check appropriate error messages are displayed

**Expected Results**:
- System prevents submission of requests exceeding available credit
- Clear error messages explain why request was rejected
- Farmer's credit balance remains unchanged

### 6. Credit Repayment Through Milk Collections
**Objective**: Verify that credit is repaid when farmers receive milk payments

**Steps**:
1. Ensure farmer has outstanding credit balance
2. Log in as collector or admin
3. Process milk collection payment for the farmer
4. Verify that credit is deducted from pending repayments
5. Check that credit transaction record is created

**Expected Results**:
- Farmer's pending deductions decrease by payment amount
- Credit transaction record shows "credit_repaid" type
- Farmer receives notification of credit repayment

### 7. Monthly Settlement Process
**Objective**: Verify that monthly settlements reset credit cycles correctly

**Steps**:
1. Ensure it's time for monthly settlement
2. Log in as admin
3. Trigger monthly settlement process
4. Verify that credit balances are reset
5. Check that settlement transaction is recorded

**Expected Results**:
- Farmer's current credit balance resets to max credit amount
- Pending deductions reset to 0
- Settlement transaction record is created
- Last settlement date is updated

### 8. Credit Freezing and Unfreezing
**Objective**: Verify that admins can freeze/unfreeze credit accounts

**Steps**:
1. Log in as admin
2. Navigate to credit management
3. Select a farmer with active credit
4. Freeze the farmer's credit account
5. Verify that farmer can no longer make credit requests
6. Unfreeze the account
7. Verify that farmer can make credit requests again

**Expected Results**:
- Frozen accounts prevent credit requests
- Appropriate error messages shown to farmers
- Unfrozen accounts restore credit functionality
- Transaction records created for freeze/unfreeze actions

### 9. Cross-Portal Consistency
**Objective**: Verify that credit information is consistent across all portals

**Steps**:
1. Log in as farmer and check credit balance
2. Log in as admin and check same farmer's credit balance
3. Log in as staff and check same farmer's credit balance
4. Make a credit transaction
5. Verify that all portals show updated balance

**Expected Results**:
- All portals display identical credit information
- Changes in one portal are immediately reflected in others
- No data synchronization delays or inconsistencies

## Test Data Requirements

### Farmer Accounts
- New farmer (registered < 3 months ago)
- Established farmer (registered 3-12 months ago)
- Premium farmer (registered > 12 months ago)
- Farmer with frozen credit
- Farmer with no credit history

### Products
- Products with multiple packaging options
- Products with single packaging option
- Products with no packaging options
- Credit-eligible products
- Non-credit-eligible products

### Credit Amounts
- Small credit amounts (under 1000 KES)
- Medium credit amounts (1000-10000 KES)
- Large credit amounts (over 10000 KES)
- Amounts that exceed credit limits

## Success Criteria

All test scenarios must pass with:
- No errors or exceptions
- Correct data propagation across all system components
- Proper audit trail of all credit transactions
- Appropriate user notifications
- Consistent data display across all portals

## Rollback Procedures

In case of test failures:
1. Document the failure scenario and error messages
2. Restore database to pre-test state using backups
3. Review and fix identified issues
4. Retest the specific scenario
5. Proceed with remaining tests only after successful fix verification

## Automation Opportunities

Consider automating the following test scenarios:
- Farmer registration and credit profile creation
- Basic credit granting and deduction workflows
- Cross-portal data consistency checks
- Monthly settlement process verification