// Payment history interfaces
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface PaymentHistoryFilter {
  dateRange: { start: Date; end: Date };
  status: PaymentStatus | 'all';
  paymentMethod: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface PaymentRecord {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  payment_method: string;
  reference_number: string;
  collections_included: number;
  processing_fee: number;
  net_amount: number;
  created_at: string;
  processed_at?: string;
  description: string;
}

export interface PaymentHistoryResponse {
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