import React from 'react';
import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
  status: string;
  type?: 'transaction' | 'payment' | 'purchase' | 'default';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'default' }) => {
  // Define color schemes for different status types
  const getStatusVariant = () => {
    // Credit Transaction Status Colors
    if (type === 'transaction') {
      switch (status.toLowerCase()) {
        case 'pending':
          return 'secondary';
        case 'active':
          return 'default';
        case 'paid':
          return 'success';
        case 'cancelled':
          return 'destructive';
        case 'disputed':
          return 'warning';
        default:
          return 'default';
      }
    }
    
    // Payment/Purchase Status Colors
    if (type === 'payment' || type === 'purchase') {
      switch (status.toLowerCase()) {
        case 'pending':
          return 'secondary';
        case 'processing':
          return 'default';
        case 'paid':
          return 'success';
        case 'overdue':
          return 'destructive';
        case 'cancelled':
          return 'destructive';
        default:
          return 'default';
      }
    }
    
    // Default status colors
    switch (status.toLowerCase()) {
      case 'pending':
        return 'secondary';
      case 'active':
      case 'processing':
        return 'default';
      case 'completed':
      case 'paid':
        return 'success';
      case 'overdue':
      case 'cancelled':
      case 'rejected':
        return 'destructive';
      case 'disputed':
      case 'warning':
        return 'warning';
      default:
        return 'default';
    }
  };

  // Define user-friendly status labels
  const getDisplayLabel = () => {
    const labels: Record<string, string> = {
      'pending': 'Pending',
      'active': 'Active',
      'processing': 'Processing',
      'paid': 'Paid',
      'completed': 'Completed',
      'cancelled': 'Cancelled',
      'overdue': 'Overdue',
      'disputed': 'Disputed',
      'rejected': 'Rejected'
    };
    
    return labels[status.toLowerCase()] || status;
  };

  return (
    <Badge variant={getStatusVariant()}>
      {getDisplayLabel()}
    </Badge>
  );
};

export default StatusBadge;