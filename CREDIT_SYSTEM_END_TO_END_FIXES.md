# Credit System End-to-End Fixes

## Overview
This document outlines the gaps identified in the current credit system implementation and proposes fixes to ensure a complete end-to-end workflow with proper status tracking across all tables.

## Current Gaps Analysis

### 1. farmer_credit_profiles Table
**Missing Field:**
- `account_status` field is completely missing

**Required Fields:**
- `account_status` with values: 'inactive', 'active', 'frozen', 'suspended'

### 2. credit_requests Table
**Incomplete Status Field:**
- Current status values: 'pending', 'approved', 'rejected'
- Missing status values: 'ready_for_pickup', 'ready_for_delivery', 'disbursed', 'cancelled'

### 3. credit_transactions Table
**Missing Field:**
- `status` field is completely missing
- Currently has `approval_status` but needs separate `status` field

**Required Fields:**
- `status` field with appropriate values for different transaction types

### 4. agrovet_disbursements Table
**Incomplete Status Field:**
- Current status values: 'pending', 'paid', 'overdue'
- Missing status values: 'partially_paid', 'written_off'

### 5. milk_collections Table
**Missing Fields:**
- `payment_status` field is missing
- Current `status` field may not have all required values

**Required Fields:**
- `payment_status` with values: 'recorded', 'pending', 'paid'

### 6. collection_payments Table
**Missing Field:**
- `payment_status` field is missing (table exists but lacks this field)

**Required Fields:**
- `payment_status` with values: 'calculating', 'pending_approval', 'processing', 'completed', 'failed'

### 7. agrovet_inventory Table
**Missing Field:**
- `reserved_stock` field is missing

**Required Fields:**
- `reserved_stock` field for tracking reserved inventory

### 8. payment_statements Table
**Missing Table:**
- Entire table is missing

**Required Table:**
- `payment_statements` table with `delivery_status` field having values: 'pending', 'sent', 'viewed', 'downloaded'

## Proposed Fixes

### Fix 1: Add account_status to farmer_credit_profiles
```sql
ALTER TABLE public.farmer_credit_profiles 
ADD COLUMN account_status TEXT DEFAULT 'inactive' 
CHECK (account_status IN ('inactive', 'active', 'frozen', 'suspended'));
```

### Fix 2: Extend status values in credit_requests
```sql
ALTER TABLE public.credit_requests 
DROP CONSTRAINT credit_requests_status_check;

ALTER TABLE public.credit_requests 
ADD CONSTRAINT credit_requests_status_check 
CHECK (status IN ('pending', 'approved', 'rejected', 'ready_for_pickup', 'ready_for_delivery', 'disbursed', 'cancelled'));
```

### Fix 3: Add status field to credit_transactions
```sql
ALTER TABLE public.credit_transactions 
ADD COLUMN status TEXT DEFAULT 'completed' 
CHECK (status IN ('pending', 'active', 'completed', 'cancelled', 'disputed', 'paid', 'partially_paid', 'written_off'));
```

### Fix 4: Extend status values in agrovet_disbursements
```sql
ALTER TABLE public.agrovet_disbursements 
DROP CONSTRAINT agrovet_disbursements_status_check;

ALTER TABLE public.agrovet_disbursements 
ADD CONSTRAINT agrovet_disbursements_status_check 
CHECK (status IN ('pending_payment', 'paid', 'partially_paid', 'written_off', 'overdue'));
```

### Fix 5: Add payment_status to milk_collections
```sql
ALTER TABLE public.collections 
ADD COLUMN payment_status TEXT DEFAULT 'recorded' 
CHECK (payment_status IN ('recorded', 'pending', 'paid'));
```

### Fix 6: Add payment_status to collection_payments
```sql
ALTER TABLE public.collection_payments 
ADD COLUMN payment_status TEXT DEFAULT 'calculating' 
CHECK (payment_status IN ('calculating', 'pending_approval', 'processing', 'completed', 'failed'));
```

### Fix 7: Add reserved_stock to agrovet_inventory
```sql
ALTER TABLE public.agrovet_inventory 
ADD COLUMN reserved_stock DECIMAL(10,2) NOT NULL DEFAULT 0;
```

### Fix 8: Create payment_statements table
```sql
CREATE TABLE IF NOT EXISTS public.payment_statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES public.farmers(id) ON DELETE CASCADE,
    statement_date DATE NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    delivery_status TEXT DEFAULT 'pending' 
        CHECK (delivery_status IN ('pending', 'sent', 'viewed', 'downloaded')),
    file_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Fix 9: Implement Status Transition Triggers
Create triggers to enforce proper status transitions according to the workflow rules.

### Fix 10: Create Comprehensive Tests
Develop end-to-end tests to verify all status transitions and workflow paths.

## Status Transition Rules Implementation

### One-Way Final States (Cannot be Reversed)
- credit_requests: rejected, disbursed
- credit_transactions: completed
- agrovet_disbursements: paid, written_off
- collection_payments: completed

### Conditional Transitions
- pending → approved (requires admin action)
- approved → disbursed (requires creditor action)
- pending_deduction → completed (requires payment processing)

### Parallel Updates
When payment is processed, ALL these update simultaneously:
- credit_transactions: pending_deduction → completed
- agrovet_disbursements: pending_payment → paid
- farmer_credit_profiles: current_balance → 0
- collection_payments: processing → completed

### Reversible States
Only these can be undone by admin:
- farmer_credit_profiles: frozen ↔ active
- credit_requests: pending → cancelled (farmer only)

### Automatic Triggers
- Stock < reorder_level → triggers alert
- current_balance > 80% of limit → triggers warning
- 2 months with 0 collections → auto-freeze account

## Implementation Priority

1. **Critical Schema Changes** (Fixes 1, 2, 3, 4, 7, 8)
2. **Status Transition Logic** (Fix 9)
3. **Testing and Verification** (Fix 10)
4. **Monitoring and Alerts**

## Testing Strategy

### Unit Tests
- Verify each status field accepts only valid values
- Test constraint validations
- Verify default values are set correctly

### Integration Tests
- Test complete workflow scenarios
- Verify parallel updates occur correctly
- Test edge cases and error conditions

### End-to-End Tests
- Scenario 1: Normal Successful Flow
- Scenario 2: Request Rejected
- Scenario 3: Partial Payment
- Scenario 4: Account Frozen
- Scenario 5: Request Cancelled

## Conclusion

The current credit system implementation is missing several critical status fields and tables needed for proper end-to-end tracking. Implementing these fixes will ensure that the system can accurately monitor credit usage and maintain proper status across all tables and workflows as documented.