import React from 'react';
import PaymentHistory from './PaymentHistory';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

const PaymentHistoryUsage: React.FC = () => {
  // In a real application, you would get the farmerId from context, props, or authentication
  const farmerId = 'farmer-123'; // Example farmer ID

  return (
    <QueryClientProvider client={queryClient}>
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Payment History</h1>
        <PaymentHistory farmerId={farmerId} />
      </div>
    </QueryClientProvider>
  );
};

export default PaymentHistoryUsage;