# Payment Approval System

## Overview
The payment approval system allows staff members to approve farmer collections for payment and track payment history. Admin users can view payment analytics and trends.

## Features

### 1. Payment Approval (Staff)
- Review verified collections that are ready for payment
- Select multiple collections to approve for payment
- Add notes for each payment approval
- Track approval status of collections

### 2. Payment History (Staff)
- View all payment records with filtering and sorting capabilities
- Search payments by farmer name or phone number
- Filter by payment status (pending, approved, paid)
- Date range filtering
- Mark approved payments as "paid" after manual disbursement

### 3. Payment Analytics (Admin)
- View overall payment statistics
- Analyze monthly payment trends
- Visualize payment status distribution
- Track total payment amounts and counts

## Database Schema

### farmer_payments Table
```sql
CREATE TABLE IF NOT EXISTS public.farmer_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id uuid NOT NULL REFERENCES public.farmers(id) ON DELETE CASCADE,
  collection_ids uuid[] NOT NULL,
  total_amount numeric NOT NULL DEFAULT 0,
  approval_status TEXT DEFAULT 'pending',
  approved_at timestamptz,
  approved_by uuid REFERENCES public.staff(id),
  paid_at timestamptz,
  paid_by uuid REFERENCES public.staff(id),
  notes TEXT,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### collections Table (Extended)
```sql
ALTER TABLE public.collections 
ADD COLUMN IF NOT EXISTS approved_for_payment BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS approved_at timestamptz,
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.staff(id);
```

## Workflows

### Approving Collections for Payment
1. Staff navigates to Payment Approval page
2. Reviews verified collections that haven't been approved yet
3. Selects one or more collections
4. Adds optional notes
5. Clicks "Approve for Payment"
6. System creates a payment record with "approved" status
7. Collections are marked as approved for payment

### Marking Payments as Paid
1. Staff navigates to Payment History page
2. Finds payment with "approved" status
3. Clicks "Mark as Paid" button
4. System updates payment record status to "paid"
5. Records timestamp of payment completion

### Viewing Analytics
1. Admin navigates to Payment Analytics page
2. Views payment statistics dashboard
3. Analyzes monthly trends and status distribution

## API Endpoints

### Payment Service Methods
- `getUnapprovedCollections()` - Fetch collections ready for payment approval
- `approveCollectionsForPayment(collectionIds, notes)` - Approve collections and create payment record
- `getFarmerPayments()` - Fetch all payment records
- `markPaymentAsPaid(paymentId)` - Mark a payment as paid
- `getPaymentStatistics()` - Get overall payment statistics
- `getMonthlyPaymentTrends()` - Get monthly payment trends
- `searchCollections(searchTerm)` - Search collections by farmer name or collection ID

## Implementation Files

### Database Migrations
- `supabase/migrations/20251005_add_payment_approval_system.sql`
- `supabase/migrations/20251005_add_payment_analytics_functions.sql`

### Frontend Components
- `src/components/staff/PaymentApproval.tsx`
- `src/components/admin/PaymentAnalytics.tsx`
- `src/pages/staff-portal/PaymentHistory.tsx`
- `src/pages/admin-portal/PaymentAnalytics.tsx`

### Services
- `src/services/payment-service.ts`
- `src/services/payment-service.test.ts`

### Routes
- `/staff/payments/approval` - Payment approval page
- `/staff/payments/history` - Payment history page
- `/admin/payments/analytics` - Payment analytics page