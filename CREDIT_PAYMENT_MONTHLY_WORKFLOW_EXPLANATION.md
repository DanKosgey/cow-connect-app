# Credit and Payment Monthly Workflow Explanation

## Overview
This document explains how the credit and payment systems work together to handle the monthly transition and ensure proper tracking of credits across payment cycles, specifically addressing your question about how the system knows which credits are already paid when you click the "mark as paid" button.

## How the System Tracks Credits

### 1. Credit Transaction Status Management
The system uses status fields to track the lifecycle of each credit transaction:

- **active**: Credit has been approved and is awaiting repayment through milk collections
- **paid**: Credit has been repaid through milk collection payments
- **cancelled**: Credit request was cancelled or rejected
- **disputed**: Credit is under dispute and requires resolution

### 2. Pending Deductions Calculation
The `pending_deductions` field in the `farmer_credit_profiles` table is dynamically calculated based on credit transactions with "active" status:

```sql
-- Only "active" transactions contribute to pending deductions
SELECT SUM(amount) as pending_deductions
FROM credit_transactions 
WHERE farmer_id = ? AND status = 'active'
```

### 3. Credit Lifecycle Example
Let's walk through a typical credit lifecycle:

1. **Farmer Requests Credit**: 
   - Farmer submits request for KES 3,000 worth of feed
   - Admin approves request
   - Credit transaction created with status "active"
   - Farmer's `pending_deductions` increased by 3,000

2. **First Month Payment**:
   - Farmer collects KES 5,000 in milk payments
   - Admin clicks "mark as paid" 
   - System deducts KES 3,000 from payment (credit deduction)
   - Farmer receives net payment of KES 2,000
   - Credit transaction status changed from "active" to "paid"
   - Farmer's `pending_deductions` reduced to 0

## Monthly Transition Process

### End-of-Month Settlement
At the end of each month, the system performs a settlement process:

1. **Credit Balance Reset**: 
   - Farmer's `current_credit_balance` is reset to their maximum credit limit
   - This allows them to make new credit requests in the coming month

2. **Pending Deductions Preservation**:
   - Unlike credit balance, `pending_deductions` are NOT reset
   - Any remaining "active" credit transactions carry over to the next month

### New Month Operations
When the new month begins:

1. **Existing Obligations**: 
   - Any "active" credit transactions from previous months remain active
   - These will be deducted from the farmer's first payment of the new month

2. **New Credit Requests**:
   - Farmer can make new credit requests using their refreshed credit limit
   - New credit transactions are created with "active" status
   - Both old and new "active" transactions contribute to `pending_deductions`

## How "Mark as Paid" Button Works

### Intelligent Credit Deduction
When you click the "mark as paid" button, the system performs these steps:

1. **Check Pending Deductions**:
   ```javascript
   // System checks farmer's current pending deductions
   const pendingDeductions = farmerCreditProfile.pending_deductions; // e.g., 3,000
   ```

2. **Calculate Credit Deduction**:
   ```javascript
   // Deduct up to the pending amount from the payment
   const creditUsed = Math.min(pendingDeductions, totalPayment); // e.g., min(3,000, 5,000) = 3,000
   ```

3. **Update Transaction Statuses**:
   - System identifies "active" credit transactions (oldest first)
   - Marks them as "paid" up to the amount being deducted
   - Updates farmer's `pending_deductions` field

4. **Record Audit Trail**:
   - Creates "credit_repaid" transaction for audit purposes
   - Updates all related records consistently

### Example Scenario
Let's look at a practical example:

**Month 1**:
- Farmer requests KES 2,000 credit → `pending_deductions` = 2,000
- Farmer collects KES 1,000 milk payment
- Admin clicks "mark as paid" → KES 1,000 deducted as credit
- Result: `pending_deductions` = 1,000 (remaining)

**Month 2 Begins**:
- Farmer's credit limit resets (can make new requests)
- `pending_deductions` = 1,000 (carried over from Month 1)
- Farmer makes new request for KES 1,500 → `pending_deductions` = 2,500

**Month 2 Payment Processing**:
- Farmer collects KES 3,000 milk payment
- Admin clicks "mark as paid":
  1. System sees `pending_deductions` = 2,500
  2. Deducts KES 2,500 as credit from KES 3,000 payment
  3. Farmer receives net payment of KES 500
  4. All "active" credit transactions marked as "paid"
  5. `pending_deductions` = 0

## System Intelligence Features

### 1. Automatic Status Management
The system automatically:
- Calculates `pending_deductions` based on "active" transactions
- Excludes "paid", "cancelled", and "disputed" transactions
- Updates statuses consistently across all related records

### 2. Month-End Awareness
The system distinguishes between:
- Credits belonging to previous months (carried over)
- Credits belonging to current month (new requests)
- Both contribute to `pending_deductions` but can be tracked separately if needed

### 3. Audit Trail Maintenance
Every credit deduction creates:
- A "credit_repaid" transaction for accounting
- Status updates for individual credit transactions
- Payment record updates with credit deduction details

## Key Benefits

### 1. Seamless Monthly Transition
- No manual intervention needed for month-end processing
- Credits automatically carry over when not fully paid
- New credit limits refresh automatically

### 2. Accurate Credit Tracking
- System knows exactly which credits are paid vs pending
- Status fields provide clear visibility into credit lifecycle
- Audit trail ensures accountability and traceability

### 3. Flexible Payment Processing
- Farmers can make partial payments
- System correctly applies credits in order (FIFO)
- Net payments calculated automatically

## Best Practices for Admin Users

### 1. Regular Monitoring
- Check farmer credit profiles regularly
- Monitor `pending_deductions` vs. expected values
- Review credit transaction statuses for anomalies

### 2. Month-End Procedures
- Verify settlement process ran successfully
- Check that credit balances reset correctly
- Confirm pending deductions carried over appropriately

### 3. Troubleshooting
- If credits aren't deducting properly, check transaction statuses
- If `pending_deductions` seems incorrect, verify "active" transactions
- Use audit trail to trace credit deduction history

## Common Questions Answered

### Q: How does the system know which credits are from previous months?
A: While the system doesn't explicitly tag credits by month, it tracks them through status fields. "Active" credits from any period contribute to pending deductions until paid.

### Q: What happens if I forget to mark a payment as paid?
A: The credit remains "active" and will be deducted from the next payment. The farmer's `pending_deductions` field preserves the obligation.

### Q: Can I see which credits were paid in which month?
A: Yes, by checking the `created_at` timestamp on credit transactions and the `updated_at` timestamp when status changed to "paid".

### Q: What if a farmer has more pending deductions than their payment?
A: The system deducts up to the payment amount. Remaining pending deductions carry over to the next payment.

This system ensures that credit and payment processing works seamlessly together, with proper tracking across monthly transitions and accurate deduction processing when you click the "mark as paid" button.