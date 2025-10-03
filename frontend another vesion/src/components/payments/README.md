# Payment History Component

## Overview
The Payment History component displays a farmer's payment history with filtering, sorting, and infinite scroll capabilities.

## Features Implemented

1. **Payment History Display**
   - Shows a table of payments with date, reference number, method, status, amount, fee, and net amount
   - Displays payment status with appropriate colors and icons
   - Shows payment method with appropriate icons

2. **Summary Cards**
   - Total Earned
   - Pending Payments
   - Average Per Collection

3. **Filtering Capabilities**
   - Date range filter with calendar picker
   - Status filter (all, pending, processing, completed, failed)
   - Payment method filter (all, M-Pesa, Bank Transfer, Paystack)
   - Search functionality

4. **Infinite Scroll**
   - Loads more payments as user scrolls
   - Shows loading indicator during fetch
   - Handles pagination automatically

5. **Export Functionality**
   - Export to CSV/PDF button (placeholder implementation)

6. **Responsive Design**
   - Works on mobile and desktop
   - Adapts layout based on screen size

## Component Structure

```
PaymentHistory/
├── PaymentHistory.tsx          # Main component
├── usePaymentHistory.ts        # Custom hook for data fetching
├── PaymentHistory.test.tsx     # Unit tests
├── PaymentHistory.stories.tsx  # Storybook stories
└── PaymentHistory.usage.tsx    # Usage example
```

## Integration Points

1. **API Service**
   - Uses `PaymentsAPI.getHistory()` method
   - Requires `/farmers/{farmer_id}/payments` endpoint

2. **React Query**
   - Uses `useInfiniteQuery` for pagination
   - Implements automatic caching and refetching

3. **UI Components**
   - Uses shadcn/ui components (Card, Table, Badge, Button, etc.)
   - Uses Lucide React icons

## Usage

```tsx
import PaymentHistory from '@/components/payments/PaymentHistory';

const MyComponent = () => {
  const farmerId = "farmer-123"; // Get from context or props
  
  return (
    <PaymentHistory farmerId={farmerId} />
  );
};
```

## Data Requirements

The component expects the following data structure:

```typescript
interface PaymentRecord {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  payment_method: string;
  reference_number: string;
  collections_included: number;
  processing_fee: number;
  net_amount: number;
  created_at: string;
  processed_at?: string;
  description: string;
}

interface PaymentHistoryResponse {
  payments: PaymentRecord[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    has_next: boolean;
  };
  summary: {
    total_earned: number;
    total_pending: number;
    average_per_collection: number;
  };
}
```

## Styling

The component uses Tailwind CSS classes and shadcn/ui components for styling. All colors and styling follow the existing design system.

## Testing

Unit tests are provided in `PaymentHistory.test.tsx` covering:
- Loading state
- Error state
- Empty state
- Data display

## Storybook

Storybook stories are available in `PaymentHistory.stories.tsx` for component development and documentation.