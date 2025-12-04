# Comprehensive Credit System Test Plan

## Overview
This test plan identifies and addresses all issues in the end-to-end credit system flow from farmer shopping to admin approval and transaction recording.

## Test Scenarios

### 1. Farmer Shopping Flow
- [ ] Farmer adds product to cart with packaging selection
- [ ] Farmer requests credit for items in cart
- [ ] Credit request is created with correct packaging option IDs
- [ ] Credit request includes correct quantities and prices

### 2. Credit Request Validation
- [ ] System validates farmer has sufficient credit
- [ ] System validates packaging options still exist
- [ ] System validates product is still available
- [ ] System validates quantities and prices are positive

### 3. Admin Approval Process
- [ ] Admin can view pending credit requests with farmer details
- [ ] Admin can approve credit requests
- [ ] System deducts approved amount from farmer's pending payments
- [ ] System updates farmer's credit profile (credit used, available balance)
- [ ] System creates credit transaction record
- [ ] System creates agrovet purchase record
- [ ] System updates credit request status to approved

### 4. Data Consistency Checks
- [ ] Farmer credit profile reflects correct credit used
- [ ] Farmer credit profile reflects correct available balance
- [ ] Farmer credit profile reflects correct pending deductions
- [ ] Credit transaction record is created with correct details
- [ ] Agrovet purchase record is created with correct details
- [ ] Collections/pending payments are reduced by approved amount

### 5. Error Handling
- [ ] System handles missing packaging options gracefully
- [ ] System handles insufficient credit appropriately
- [ ] System handles database errors without data corruption
- [ ] System provides clear error messages to users

## Specific Issues to Address

### Packaging Option Issues
- [ ] Verify packaging option IDs are correctly stored in credit requests
- [ ] Verify packaging options exist when credit requests are approved
- [ ] Handle cases where packaging options are deleted after request creation

### Credit Profile Updates
- [ ] Ensure `current_credit_balance` is correctly reduced
- [ ] Ensure `total_credit_used` is correctly increased
- [ ] Ensure `pending_deductions` is correctly reduced (not increased)
- [ ] Ensure profile updates happen atomically

### Transaction Recording
- [ ] Ensure credit transactions are recorded with correct amounts
- [ ] Ensure agrovet purchases are recorded with correct details
- [ ] Ensure transaction links between tables are maintained

### Portal Integration
- [ ] Farmer portal displays correct credit information
- [ ] Admin portal displays correct request information
- [ ] Creditor portal displays correct purchase information
- [ ] Analytics dashboards show correct data

## Test Data Setup
1. Create test farmer with credit profile
2. Create test products with packaging options
3. Create test collections/pending payments for farmer
4. Create test credit request

## Expected Outcomes
- [ ] Credit requests can be approved without errors
- [ ] Farmer credit balances are correctly updated
- [ ] Pending payments are correctly reduced
- [ ] All transactions are properly recorded
- [ ] All portals display consistent information

## Rollback Plan
If issues are found:
1. Identify the specific component causing the issue
2. Create targeted fix for that component
3. Test the fix in isolation
4. Test the complete flow with the fix
5. Deploy fix to production

# Credit System End-to-End Test Plan

## Overview
This document outlines the comprehensive test plan for the credit system end-to-end flow between the farmer portal, admin portal, and creditor portal.

## Test Scenarios

### 1. Farmer Portal Tests

#### 1.1 Credit Dashboard Functionality
- [ ] Farmer can view credit dashboard with available credit
- [ ] Farmer can see credit profile details (tier, limit, balance)
- [ ] Farmer can see recent credit transactions
- [ ] Farmer can see pending credit requests
- [ ] Farmer with no credit profile gets appropriate messaging

#### 1.2 Credit Request Submission
- [ ] Farmer can submit credit request for agrovet purchases
- [ ] Farmer can view submitted credit requests
- [ ] Farmer can see status of credit requests (pending, approved, rejected)
- [ ] Farmer cannot submit request if not eligible for credit
- [ ] Farmer gets validation errors for invalid requests

#### 1.3 Credit Eligibility Calculation
- [ ] New farmer gets correct credit tier and limits
- [ ] Established farmer gets correct credit tier and limits
- [ ] Premium farmer gets correct credit tier and limits
- [ ] Farmer with frozen account cannot request credit
- [ ] Farmer with no pending payments gets appropriate messaging

### 2. Admin Portal Tests

#### 2.1 Credit Management Dashboard
- [ ] Admin can view all farmers with credit profiles
- [ ] Admin can filter farmers by credit status
- [ ] Admin can search for specific farmers
- [ ] Admin can see credit utilization metrics
- [ ] Admin can view pending credit requests

#### 2.2 Credit Granting Functionality
- [ ] Admin can grant credit to eligible farmers
- [ ] Admin cannot grant credit to ineligible farmers
- [ ] Credit granting updates farmer's available balance
- [ ] Credit granting creates transaction record
- [ ] Admin gets confirmation of successful credit granting

#### 2.3 Credit Request Approval
- [ ] Admin can view pending credit requests
- [ ] Admin can approve credit requests
- [ ] Admin can reject credit requests with reason
- [ ] Approved requests update farmer's credit balance
- [ ] Rejected requests notify farmer appropriately

#### 2.4 Credit Profile Management
- [ ] Admin can adjust credit limits for farmers
- [ ] Admin can freeze/unfreeze farmer credit accounts
- [ ] Admin can view credit transaction history
- [ ] Admin can view credit analytics and reports

### 3. Creditor Portal Tests

#### 3.1 Credit Management
- [ ] Creditor can view all credit requests
- [ ] Creditor can filter requests by status
- [ ] Creditor can search for specific requests
- [ ] Creditor can view detailed request information
- [ ] Creditor can see farmer credit profile details

#### 3.2 Credit Reports & Analytics
- [ ] Creditor can view credit utilization reports
- [ ] Creditor can view risk distribution analytics
- [ ] Creditor can view payment tracking data
- [ ] Creditor can filter reports by time range
- [ ] Reports display accurate data

#### 3.3 Farmer Profiles
- [ ] Creditor can view all farmer credit profiles
- [ ] Creditor can filter farmers by credit tier
- [ ] Creditor can filter farmers by account status
- [ ] Creditor can search for specific farmers
- [ ] Creditor can view detailed farmer credit information

#### 3.4 Payment Tracking
- [ ] Creditor can view credit transaction history
- [ ] Creditor can filter transactions by type
- [ ] Creditor can search for specific transactions
- [ ] Creditor can view payment analytics charts
- [ ] Transaction data is accurate and up-to-date

### 4. End-to-End Flow Tests

#### 4.1 Complete Credit Flow
- [ ] Farmer submits credit request
- [ ] Request appears in admin portal for approval
- [ ] Admin approves request
- [ ] Farmer's credit balance is updated
- [ ] Request appears in creditor portal
- [ ] Creditor can disburse product
- [ ] Transaction is recorded in all portals

#### 4.2 Credit Utilization Flow
- [ ] Farmer uses credit for agrovet purchase
- [ ] Credit balance is reduced appropriately
- [ ] Transaction appears in all portals
- [ ] Admin can view utilization reports
- [ ] Creditor can track payment history

#### 4.3 Credit Repayment Flow
- [ ] Farmer makes milk collection payment
- [ ] Credit is repaid automatically
- [ ] Credit balance is restored
- [ ] Transaction appears in all portals
- [ ] Admin and creditor can track repayments

### 5. Edge Cases and Error Handling

#### 5.1 Data Consistency
- [ ] Credit balances remain consistent across all portals
- [ ] Transaction history is synchronized
- [ ] Farmer profile changes propagate to all portals
- [ ] Status updates appear in real-time

#### 5.2 Error Conditions
- [ ] System handles database connection errors gracefully
- [ ] System handles network timeouts appropriately
- [ ] System validates user inputs
- [ ] System prevents duplicate transactions
- [ ] System handles concurrent access

#### 5.3 Security Tests
- [ ] Farmers cannot access admin/creditor functions
- [ ] Admins cannot access creditor-only functions
- [ ] Creditors cannot modify farmer profiles
- [ ] All data transfers are secure
- [ ] User sessions are properly managed

## Test Data Requirements

### Farmer Accounts
- New farmer (registered < 3 months)
- Established farmer (registered 3-12 months)
- Premium farmer (registered > 12 months)
- Farmer with frozen credit account
- Farmer with high credit utilization

### Credit Scenarios
- Farmer with pending milk collections
- Farmer with no pending collections
- Farmer with maximum credit limit
- Farmer with low credit balance
- Farmer with overdue payments

### Transaction Data
- Credit grant transactions
- Credit use transactions
- Credit repayment transactions
- Credit adjustment transactions
- Settlement transactions

## Success Criteria

1. All test scenarios pass with no critical or high severity issues
2. Data consistency is maintained across all portals
3. User experience is smooth and intuitive
4. System performance meets requirements
5. Security measures are effective
6. Error handling is appropriate and user-friendly

## Test Execution Schedule

| Phase | Activities | Duration |
|-------|------------|----------|
| Phase 1 | Unit tests for individual components | 2 days |
| Phase 2 | Integration tests between portals | 3 days |
| Phase 3 | End-to-end flow testing | 3 days |
| Phase 4 | Edge case and error handling tests | 2 days |
| Phase 5 | Security and performance tests | 2 days |
| Phase 6 | Final validation and reporting | 1 day |

## Test Tools and Environment

- Jest for unit testing
- Cypress for end-to-end testing
- Supabase local development environment
- Test accounts for each user role
- Mock data generation scripts
- Performance monitoring tools