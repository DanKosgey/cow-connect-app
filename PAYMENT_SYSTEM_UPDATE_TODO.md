# Payment System Update TODO List

## Overview
Update the payment system to match the following requirements:
- Pending Payments: Total amount of collections with status "Collected" or "Verified" (not "Paid") AND approved_for_company = true
- Paid Amount: Total amount for a specific farmer with status "Paid"
- Deductions: All deductions for a farmer
- Credit Used: All credit requests with status "approved" and settlement_status "pending"
- Net Payment: Pending Collections - Deductions - Credit Used (Status Pending) - Collector Fee (Pending)
- Total Amount: All amount for all collections regardless of status for a farmer

## Phase 1: Update Data Models

### 1.1 Update FarmerPaymentSummary Interface
File: [src/hooks/usePaymentSystemData.ts](file:///c:/Users/PC/OneDrive/Desktop/dairy%20new/cow-connect-app/src/hooks/usePaymentSystemData.ts)
- [ ] Replace existing FarmerPaymentSummary interface with:
```typescript
interface FarmerPaymentSummary {
  farmer_id: string;
  farmer_name: string;
  farmer_phone: string;
  total_collections: number;
  total_liters: number;
  pending_payments: number;        // Collections with status "Collected" or "Verified" AND approved_for_company = true
  paid_amount: number;             // Collections with status "Paid"
  total_deductions: number;        // All deductions for farmer
  credit_used: number;             // Approved credit requests with settlement_status "pending"
  net_payment: number;             // Pending - Deductions - Credit Used - Collector Fees (Pending)
  total_amount: number;            // All collections regardless of status
  bank_info: string;
}
```

### 1.2 Update PaymentAnalytics Interface
File: [src/hooks/usePaymentSystemData.ts](file:///c:/Users/PC/OneDrive/Desktop/dairy%20new/cow-connect-app/src/hooks/usePaymentSystemData.ts)
- [ ] Replace existing PaymentAnalytics interface with:
```typescript
interface PaymentAnalytics {
  total_pending: number;           // Total pending payments (collections with status "Collected" or "Verified" AND approved_for_company = true)
  total_paid: number;              // Total paid amount (collections with status "Paid")
  total_farmers: number;
  avg_payment: number;
  daily_trend: { date: string; collections: number; paidAmount: number; pendingAmount: number; creditUsed: number }[];
  farmer_distribution: { name: string; value: number }[];
  total_credit_used: number;       // All approved credit requests with settlement_status "pending"
  total_deductions: number;        // Total deductions across all farmers
  total_net_payment: number;       // Total net payment across all farmers
  total_amount: number;            // Total amount for all collections regardless of status
}
```

### 1.3 Update Interfaces in PaymentSystem.tsx
File: [src/pages/admin/PaymentSystem.tsx](file:///c:/Users/PC/OneDrive/Desktop/dairy%20new/cow-connect-app/src/pages/admin/PaymentSystem.tsx)
- [ ] Update FarmerPaymentSummary interface (same as above)
- [ ] Update PaymentAnalytics interface (same as above)

## Phase 2: Update Calculation Logic

### 2.1 Update calculateFarmerSummaries Function
File: [src/hooks/usePaymentSystemData.ts](file:///c:/Users/PC/OneDrive/Desktop/dairy%20new/cow-connect-app/src/hooks/usePaymentSystemData.ts)
- [ ] Update pending payments calculation to filter by status "Collected" or "Verified" AND approved_for_company = true
- [ ] Update paid amount calculation to filter by status "Paid"
- [ ] Ensure deductions are calculated using deductionService.calculateTotalDeductionsForFarmer
- [ ] Update credit used calculation to filter by status "approved" AND settlement_status "pending"
- [ ] Update net payment calculation: Pending Payments - Deductions - Credit Used - Collector Fees (Pending)
- [ ] Update total amount calculation to include all collections regardless of status

### 2.2 Update calculateAnalytics Function
File: [src/hooks/usePaymentSystemData.ts](file:///c:/Users/PC/OneDrive/Desktop/dairy%20new/cow-connect-app/src/hooks/usePaymentSystemData.ts)
- [ ] Update pending collections calculation to filter by status "Collected" or "Verified" AND approved_for_company = true
- [ ] Update paid collections calculation to filter by status "Paid"
- [ ] Update credit used calculation to filter by status "approved" AND settlement_status "pending"
- [ ] Update total amount calculation to include all collections regardless of status

## Phase 3: Update UI Components

### 3.1 Update Farmer Payment Summary Table Headers
File: [src/pages/admin/PaymentSystem.tsx](file:///c:/Users/PC/OneDrive/Desktop/dairy%20new/cow-connect-app/src/pages/admin/PaymentSystem.tsx)
- [ ] Update table headers to match new structure:
  - Farmer
  - Collections
  - Total Liters
  - Pending
  - Paid
  - Deductions
  - Credit Used
  - Net Payment
  - Total
  - Action

### 3.2 Update Table Data Mapping
File: [src/pages/admin/PaymentSystem.tsx](file:///c:/Users/PC/OneDrive/Desktop/dairy%20new/cow-connect-app/src/pages/admin/PaymentSystem.tsx)
- [ ] Update table cell data to use new FarmerPaymentSummary properties
- [ ] Update pending amount to use pending_payments
- [ ] Update paid amount to use paid_amount
- [ ] Update deductions to use total_deductions
- [ ] Update credit used to use credit_used
- [ ] Update net payment to use net_payment
- [ ] Update total to use total_amount

### 3.3 Update Grid View
File: [src/pages/admin/PaymentSystem.tsx](file:///c:/Users/PC/OneDrive/Desktop/dairy%20new/cow-connect-app/src/pages/admin/PaymentSystem.tsx)
- [ ] Update grid card data mapping to use new FarmerPaymentSummary properties
- [ ] Update labels and values to match new structure

### 3.4 Update Analytics Cards
File: [src/pages/admin/PaymentSystem.tsx](file:///c:/Users/PC/OneDrive/Desktop/dairy%20new/cow-connect-app/src/pages/admin/PaymentSystem.tsx)
- [ ] Update analytics cards to use new PaymentAnalytics properties
- [ ] Update Pending Payments card to use total_pending
- [ ] Update Total Paid card to use total_paid
- [ ] Update Credit Used card to use total_credit_used
- [ ] Update Net Payment card to use total_net_payment

## Phase 4: Update Data Fetching Logic

### 4.1 Update usePaymentSystemData Hook
File: [src/hooks/usePaymentSystemData.ts](file:///c:/Users/PC/OneDrive/Desktop/dairy%20new/cow-connect-app/src/hooks/usePaymentSystemData.ts)
- [ ] Update collection query to ensure proper filtering
- [ ] Ensure collections are filtered by approved_for_company = true where needed

## Phase 5: Testing and Validation

### 5.1 Unit Tests
- [ ] Create unit tests for new calculation logic
- [ ] Test edge cases for each calculation
- [ ] Validate time frame filtering functionality

### 5.2 Integration Tests
- [ ] Test end-to-end payment processing workflow
- [ ] Validate data consistency across components
- [ ] Test performance with large datasets

### 5.3 User Acceptance Testing
- [ ] Validate UI changes with stakeholders
- [ ] Test all user flows
- [ ] Verify calculations match business requirements

## Detailed Implementation Steps

### Step 1: Update Data Models
1. Update FarmerPaymentSummary interface in usePaymentSystemData.ts
2. Update PaymentAnalytics interface in usePaymentSystemData.ts
3. Update interfaces in PaymentSystem.tsx

### Step 2: Update Calculation Logic
1. Modify calculateFarmerSummaries function:
   - Update pending payments calculation to filter by status "Collected" or "Verified" AND approved_for_company = true
   - Update paid amount calculation to filter by status "Paid"
   - Ensure proper credit used calculation
   - Update net payment formula
   - Update total amount calculation

2. Modify calculateAnalytics function:
   - Update pending collections calculation
   - Update paid collections calculation
   - Update credit used calculation
   - Update total amount calculation

### Step 3: Update UI
1. Update table headers in PaymentSystem.tsx
2. Update table data mapping
3. Update grid view data mapping
4. Update analytics cards

### Step 4: Testing
1. Run unit tests
2. Perform integration testing
3. Conduct user acceptance testing

## Risk Assessment

### High Risk Items
1. Data consistency across components
2. Performance with large datasets
3. Backward compatibility

### Medium Risk Items
1. UI layout changes
2. Calculation accuracy
3. Time frame filtering

### Low Risk Items
1. Interface updates
2. Documentation
3. Minor UI tweaks

## Rollback Plan
1. Git version control with feature branches
2. Database backup before deployment
3. Staged rollout with monitoring
4. Quick rollback procedure if issues arise

## Timeline Estimate
- Phase 1 (Data Models): 1 day
- Phase 2 (Calculation Logic): 2 days
- Phase 3 (UI Updates): 2 days
- Phase 4 (Testing): 1 day
- Total Estimated Time: 6 days