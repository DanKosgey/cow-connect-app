import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PaymentHistory from './PaymentHistory';

// Mock the usePaymentHistory hook
jest.mock('@/hooks/usePaymentHistory', () => ({
  usePaymentHistory: jest.fn()
}));

// Mock the format function from date-fns
jest.mock('date-fns', () => ({
  ...jest.requireActual('date-fns'),
  format: jest.fn().mockImplementation((date, formatString) => {
    if (formatString === 'MMM d, yyyy') return 'Jan 1, 2023';
    if (formatString === 'h:mm a') return '12:00 PM';
    return date.toString();
  }),
  subMonths: jest.fn().mockImplementation((date) => date)
}));

const mockUsePaymentHistory = require('@/hooks/usePaymentHistory');

const queryClient = new QueryClient();

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('PaymentHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state', () => {
    mockUsePaymentHistory.usePaymentHistory.mockReturnValue({
      isLoading: true,
      isError: false,
      data: undefined,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      error: null
    });

    renderWithProviders(<PaymentHistory farmerId="farmer-123" />);
    
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders error state', () => {
    mockUsePaymentHistory.usePaymentHistory.mockReturnValue({
      isLoading: false,
      isError: true,
      data: undefined,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      error: new Error('Failed to load payments')
    });

    renderWithProviders(<PaymentHistory farmerId="farmer-123" />);
    
    expect(screen.getByText('Error loading payment history: Failed to load payments')).toBeInTheDocument();
  });

  it('renders empty state', () => {
    mockUsePaymentHistory.usePaymentHistory.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        pages: [{
          payments: [],
          pagination: {
            total: 0,
            page: 1,
            limit: 20,
            has_next: false
          },
          summary: {
            total_earned: 0,
            total_pending: 0,
            average_per_collection: 0
          }
        }]
      },
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      error: null
    });

    renderWithProviders(<PaymentHistory farmerId="farmer-123" />);
    
    expect(screen.getByText('No payments found matching your criteria')).toBeInTheDocument();
  });

  it('renders payment data', () => {
    const mockPayment = {
      id: 'payment-1',
      amount: 1000,
      currency: 'KSh',
      status: 'completed',
      payment_method: 'mpesa',
      reference_number: 'REF123',
      collections_included: 5,
      processing_fee: 50,
      net_amount: 950,
      created_at: '2023-01-01T12:00:00Z',
      processed_at: '2023-01-01T12:05:00Z',
      description: 'Payment for January collections'
    };

    mockUsePaymentHistory.usePaymentHistory.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        pages: [{
          payments: [mockPayment],
          pagination: {
            total: 1,
            page: 1,
            limit: 20,
            has_next: false
          },
          summary: {
            total_earned: 1000,
            total_pending: 0,
            average_per_collection: 200
          }
        }]
      },
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      error: null
    });

    renderWithProviders(<PaymentHistory farmerId="farmer-123" />);
    
    // Check that summary cards are rendered
    expect(screen.getByText('Total Earned')).toBeInTheDocument();
    expect(screen.getByText('KSh 1,000')).toBeInTheDocument();
    
    // Check that payment data is rendered
    expect(screen.getByText('REF123')).toBeInTheDocument();
    expect(screen.getByText('Jan 1, 2023')).toBeInTheDocument();
    expect(screen.getByText('KSh 1,000')).toBeInTheDocument();
  });
});