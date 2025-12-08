# Payment and Credit System Synchronization Test Plan

## Overview
This document outlines comprehensive tests to verify that the payment and credit systems work seamlessly together, with proper tracking of credits across payment cycles and accurate deduction processing.

## Test Environment Setup

### Prerequisites
1. Fresh database instance with all schema migrations applied
2. Test farmer accounts with varying credit profiles
3. Test admin and creditor accounts
4. Sample agrovet products in inventory
5. Sample milk collection data for testing

### Test Data Preparation
```sql
-- Create test farmer with credit profile
INSERT INTO public.farmers (id, full_name, phone_number, created_at) 
VALUES ('farmer-001', 'Test Farmer', '+254700000001', NOW());

INSERT INTO public.farmer_credit_profiles (
  farmer_id, 
  credit_tier, 
  credit_limit_percentage, 
  max_credit_amount, 
  current_credit_balance, 
  account_status
) VALUES (
  'farmer-001', 
  'established', 
  50.00, 
  50000.00, 
  50000.00, 
  'active'
);

-- Create test products
INSERT INTO public.agrovet_inventory (
  id, 
  name, 
  category, 
  unit, 
  current_stock, 
  selling_price
) VALUES 
('prod-001', 'Dairy Feed', 'feed', 'kg', 1000, 200.00),
('prod-002', 'Mineral Supplements', 'supplements', 'packet', 500, 500.00);
```

## Test Categories

### 1. Credit Request Processing Tests

#### Test 1.1: Valid Credit Request Submission
**Objective**: Verify that valid credit requests are processed correctly

**Preconditions**:
- Farmer has active credit profile with sufficient balance
- Agrovet products exist in inventory

**Steps**:
1. Farmer submits credit request for 2 kg of Dairy Feed (KES 400)
2. Admin approves the credit request
3. Verify credit transaction is created with "active" status
4. Verify farmer's pending_deductions is updated to 400
5. Verify farmer's credit balance is reduced appropriately

**Expected Results**:
- Credit transaction created with status "active"
- Farmer's pending_deductions = 400
- Farmer's current_credit_balance reduced by 400

#### Test 1.2: Credit Request Exceeding Limit
**Objective**: Verify that credit requests exceeding limits are rejected

**Preconditions**:
- Farmer has credit balance of 1000
- Farmer submits request for 1500 worth of products

**Steps**:
1. Farmer submits credit request for 1500 worth of products
2. System validates request against available credit
3. Verify request is rejected with appropriate error message

**Expected Results**:
- Request rejected
- Error message indicates insufficient credit
- Farmer's credit balance unchanged

### 2. Payment Deduction Processing Tests

#### Test 2.1: Single Payment with Credit Deduction
**Objective**: Verify that single payments correctly deduct credits

**Preconditions**:
- Farmer has pending_deductions of 1000 from active credit transactions
- Farmer has milk payment of 5000

**Steps**:
1. Admin clicks "markAsPaid" for farmer's 5000 payment
2. System processes payment and applies credit deduction
3. Verify pending_deductions reduced to 0
4. Verify credit transactions updated from "active" to "paid"
5. Verify net payment is 4000 (5000 - 1000)

**Expected Results**:
- pending_deductions = 0
- Credit transactions status changed to "paid"
- Net payment = 4000

#### Test 2.2: Partial Credit Deduction
**Objective**: Verify that partial credit deductions work correctly

**Preconditions**:
- Farmer has pending_deductions of 3000 from active credit transactions
- Farmer has milk payment of 2000

**Steps**:
1. Admin clicks "markAsPaid" for farmer's 2000 payment
2. System processes payment and applies partial credit deduction
3. Verify pending_deductions reduced to 1000
4. Verify one credit transaction updated to "paid", another remains "active"
5. Verify net payment is 0 (fully covered by credit)

**Expected Results**:
- pending_deductions = 1000
- One transaction "paid", one remains "active"
- Net payment = 0

### 3. Month-End Transition Tests

#### Test 3.1: Monthly Settlement with Active Credits
**Objective**: Verify that monthly settlement correctly handles active credits

**Preconditions**:
- Farmer has active credit transactions (status "active")
- It's time for monthly settlement

**Steps**:
1. Trigger monthly settlement process
2. Verify credit balance is reset to maximum
3. Verify pending_deductions remain unchanged
4. Verify settlement transaction is created
5. Verify next_settlement_date is updated

**Expected Results**:
- current_credit_balance = max_credit_amount
- pending_deductions unchanged
- Settlement transaction created
- next_settlement_date updated

#### Test 3.2: New Month Credit Processing
**Objective**: Verify that new month correctly processes existing credits

**Preconditions**:
- New month has started
- Farmer has pending_deductions from previous month
- New milk collections are recorded

**Steps**:
1. Record new milk collection for farmer (3000)
2. Admin clicks "markAsPaid" for new collection
3. System applies existing pending deductions
4. Verify pending_deductions are applied to new payment
5. Verify proper status updates

**Expected Results**:
- Existing pending_deductions applied to new payment
- Credit transactions properly updated
- Net payment calculated correctly

### 4. Multi-Payment Cycle Tests

#### Test 4.1: Credits Spanning Multiple Payment Cycles
**Objective**: Verify that credits are properly tracked across multiple payment cycles

**Preconditions**:
- Farmer has 2000 pending_deductions
- Month 1: Farmer collects 1000 milk payment
- Month 2: Farmer collects 1500 milk payment

**Steps**:
1. Process Month 1 payment (1000)
2. Verify 1000 of pending_deductions are cleared
3. Verify 1000 pending_deductions remain
4. Process Month 2 payment (1500)
5. Verify remaining 1000 pending_deductions are cleared
6. Verify all credit transactions are marked "paid"

**Expected Results**:
- Month 1: 1000 pending_deductions cleared, 1000 remain
- Month 2: Remaining 1000 cleared, pending_deductions = 0
- All credit transactions marked "paid"

#### Test 4.2: New Credits in New Month
**Objective**: Verify that new credits in new month are handled separately

**Preconditions**:
- Month 1: Farmer has 1000 pending_deductions
- Month 2: New month starts, farmer makes new credit request (500)

**Steps**:
1. Process Month 1 payment clearing 1000 pending_deductions
2. In Month 2, farmer makes new credit request (500)
3. Verify new credit request creates separate pending_deductions
4. Verify total pending_deductions = 500 (not 1500)
5. Process Month 2 payment
6. Verify new credits are processed correctly

**Expected Results**:
- Month 1 credits cleared separately from Month 2 credits
- New credits in Month 2 tracked independently
- No overlap or duplication in credit tracking

### 5. Status Transition Tests

#### Test 5.1: Credit Transaction Status Transitions
**Objective**: Verify that credit transaction status transitions work correctly

**Preconditions**:
- Farmer has credit request ready for processing

**Steps**:
1. Credit request created with status "pending"
2. Admin approves request → status "active"
3. Payment processed → status "paid"
4. Attempt to revert status → should fail

**Expected Results**:
- Status transitions follow defined workflow
- Final statuses cannot be reverted
- Proper error handling for invalid transitions

#### Test 5.2: Farmer Account Status Restrictions
**Objective**: Verify that account status affects credit operations

**Preconditions**:
- Farmer account with different statuses (active, frozen, suspended)

**Steps**:
1. Attempt credit request with "active" account → should succeed
2. Freeze account, attempt credit request → should fail
3. Suspend account, attempt credit request → should fail
4. Unfreeze account, attempt credit request → should succeed

**Expected Results**:
- Only "active" accounts can make credit requests
- "Frozen" and "suspended" accounts blocked from credit operations
- Status changes properly enforced

### 6. Audit and Reporting Tests

#### Test 6.1: Transaction Audit Trail
**Objective**: Verify that all credit and payment transactions are properly audited

**Preconditions**:
- Series of credit and payment transactions

**Steps**:
1. Perform series of credit requests and payments
2. Query audit logs for all transactions
3. Verify completeness of audit trail
4. Verify accuracy of transaction details

**Expected Results**:
- All transactions appear in audit logs
- Transaction details are accurate and complete
- Timestamps and user information are correct

#### Test 6.2: Credit Payment Reconciliation Report
**Objective**: Verify that reconciliation reports are accurate

**Preconditions**:
- Month of mixed credit and payment transactions

**Steps**:
1. Generate credit payment reconciliation report
2. Verify totals match actual transactions
3. Verify no missing or duplicate entries
4. Verify proper categorization of transactions

**Expected Results**:
- Report totals match actual transaction sums
- No missing or duplicate transactions
- Proper categorization of all transaction types

## Automated Test Scripts

### Script 1: End-to-End Credit Payment Flow
```javascript
async function testEndToEndCreditPaymentFlow() {
  console.log('Starting End-to-End Credit Payment Flow Test');
  
  try {
    // Step 1: Create test farmer with credit profile
    const farmerId = await createTestFarmer();
    
    // Step 2: Submit and approve credit request
    const requestId = await submitCreditRequest(farmerId, 1000);
    await approveCreditRequest(requestId);
    
    // Step 3: Verify pending deductions
    const profileAfterRequest = await getFarmerCreditProfile(farmerId);
    if (profileAfterRequest.pending_deductions !== 1000) {
      throw new Error('Pending deductions not updated correctly');
    }
    
    // Step 4: Process payment with credit deduction
    const paymentId = await createFarmerPayment(farmerId, 5000);
    await markPaymentAsPaid(paymentId);
    
    // Step 5: Verify credit deduction
    const profileAfterPayment = await getFarmerCreditProfile(farmerId);
    if (profileAfterPayment.pending_deductions !== 0) {
      throw new Error('Credit deduction not applied correctly');
    }
    
    // Step 6: Verify transaction statuses
    const transactions = await getFarmerCreditTransactions(farmerId);
    const activeTransactions = transactions.filter(t => t.status === 'active');
    const paidTransactions = transactions.filter(t => t.status === 'paid');
    
    if (activeTransactions.length !== 0 || paidTransactions.length !== 1) {
      throw new Error('Transaction statuses not updated correctly');
    }
    
    console.log('✅ End-to-End Credit Payment Flow Test Passed');
    return true;
  } catch (error) {
    console.error('❌ End-to-End Credit Payment Flow Test Failed:', error);
    return false;
  }
}
```

### Script 2: Multi-Month Credit Tracking
```javascript
async function testMultiMonthCreditTracking() {
  console.log('Starting Multi-Month Credit Tracking Test');
  
  try {
    // Step 1: Create test farmer
    const farmerId = await createTestFarmer();
    
    // Step 2: Month 1 - Create credit and partial payment
    const requestId1 = await submitCreditRequest(farmerId, 2000);
    await approveCreditRequest(requestId1);
    
    const paymentId1 = await createFarmerPayment(farmerId, 1000);
    await markPaymentAsPaid(paymentId1);
    
    // Step 3: Verify partial deduction
    const profileMidMonth = await getFarmerCreditProfile(farmerId);
    if (profileMidMonth.pending_deductions !== 1000) {
      throw new Error('Partial deduction not calculated correctly');
    }
    
    // Step 4: Month 2 - New credit and full payment
    await performMonthlySettlement(farmerId);
    
    const requestId2 = await submitCreditRequest(farmerId, 500);
    await approveCreditRequest(requestId2);
    
    const paymentId2 = await createFarmerPayment(farmerId, 2000);
    await markPaymentAsPaid(paymentId2);
    
    // Step 5: Verify proper separation of credits
    const profileEnd = await getFarmerCreditProfile(farmerId);
    if (profileEnd.pending_deductions !== 0) {
      throw new Error('Multi-month credit tracking failed');
    }
    
    console.log('✅ Multi-Month Credit Tracking Test Passed');
    return true;
  } catch (error) {
    console.error('❌ Multi-Month Credit Tracking Test Failed:', error);
    return false;
  }
}
```

## Performance Tests

### Test P1: High Volume Payment Processing
**Objective**: Verify system performance with high volume of transactions

**Preconditions**:
- 1000 farmers with credit profiles
- 5000 credit transactions
- 10000 payment records

**Steps**:
1. Process 1000 simultaneous payment operations
2. Measure response times
3. Verify data consistency
4. Monitor system resources

**Expected Results**:
- Average response time < 5 seconds
- 100% data consistency
- No system crashes or timeouts

### Test P2: Complex Credit Scenarios
**Objective**: Verify performance with complex credit scenarios

**Preconditions**:
- Farmers with 50+ active credit transactions each
- Mixed payment amounts and credit deductions

**Steps**:
1. Process payments for farmers with complex credit situations
2. Measure processing times
3. Verify accuracy of calculations
4. Monitor database performance

**Expected Results**:
- Processing time < 10 seconds per complex transaction
- 100% calculation accuracy
- Efficient database queries

## Security Tests

### Test S1: Unauthorized Access Attempts
**Objective**: Verify that unauthorized users cannot access credit functions

**Preconditions**:
- Non-admin user account
- Credit and payment operations

**Steps**:
1. Attempt credit approval with non-admin account
2. Attempt payment processing with non-admin account
3. Attempt to view other farmers' credit data
4. Verify all attempts are blocked

**Expected Results**:
- All unauthorized attempts are properly rejected
- Proper error messages are returned
- No data leakage occurs

### Test S2: Data Validation and Sanitization
**Objective**: Verify that input data is properly validated and sanitized

**Preconditions**:
- Various invalid input scenarios
- SQL injection attempts
- Malformed data inputs

**Steps**:
1. Submit credit requests with invalid data
2. Attempt SQL injection through input fields
3. Submit malformed payment data
4. Verify all attempts are properly handled

**Expected Results**:
- Invalid data is rejected with appropriate error messages
- Injection attempts are neutralized
- System remains stable and secure

## Rollback and Recovery Tests

### Test R1: Transaction Rollback on Error
**Objective**: Verify that transactions are properly rolled back on errors

**Preconditions**:
- Credit and payment operations that will cause errors

**Steps**:
1. Initiate operation that will fail midway
2. Verify that partial changes are rolled back
3. Verify that system state remains consistent
4. Verify that error is properly logged

**Expected Results**:
- Partial changes are completely rolled back
- System state remains consistent
- Error is properly logged for troubleshooting

### Test R2: System Recovery from Failure
**Objective**: Verify that system can recover from failures

**Preconditions**:
- System failure during credit/payment operation
- Backup systems in place

**Steps**:
1. Simulate system failure during operation
2. Restart system
3. Verify data integrity
4. Resume operations
5. Verify no data loss

**Expected Results**:
- System recovers without data loss
- Data integrity maintained
- Operations can resume normally

## Success Criteria

All tests must pass with the following criteria:
- 100% functional accuracy
- Response times within specified limits
- Proper error handling and recovery
- Data consistency and integrity maintained
- Security requirements satisfied
- Audit trail completeness verified

## Test Execution Schedule

### Phase 1: Unit Testing (Week 1)
- Execute all functional unit tests
- Verify individual component functionality
- Document and fix any issues found

### Phase 2: Integration Testing (Week 2)
- Execute integration tests
- Verify component interactions
- Test end-to-end workflows
- Address integration issues

### Phase 3: Performance and Security Testing (Week 3)
- Execute performance tests
- Conduct security assessments
- Validate scalability requirements
- Optimize system performance

### Phase 4: User Acceptance Testing (Week 4)
- Conduct user acceptance testing
- Gather feedback from stakeholders
- Address usability concerns
- Final validation of requirements

This comprehensive test plan ensures that the payment and credit systems work seamlessly together with proper synchronization across all scenarios.