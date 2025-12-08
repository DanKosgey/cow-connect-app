import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';

interface StatusDetailsProps {
  title: string;
  currentStatus: string;
  statusHistory: {
    status: string;
    timestamp: string;
    updatedBy?: string;
  }[];
  type?: 'transaction' | 'payment' | 'purchase';
}

const StatusDetails: React.FC<StatusDetailsProps> = ({ 
  title, 
  currentStatus, 
  statusHistory, 
  type = 'default' 
}) => {
  // Get status variant for the current status
  const getCurrentStatusVariant = () => {
    if (type === 'transaction') {
      switch (currentStatus.toLowerCase()) {
        case 'pending': return 'secondary';
        case 'active': return 'default';
        case 'paid': return 'success';
        case 'cancelled': return 'destructive';
        case 'disputed': return 'warning';
        default: return 'default';
      }
    }
    
    if (type === 'payment' || type === 'purchase') {
      switch (currentStatus.toLowerCase()) {
        case 'pending': return 'secondary';
        case 'processing': return 'default';
        case 'paid': return 'success';
        case 'overdue': return 'destructive';
        case 'cancelled': return 'destructive';
        default: return 'default';
      }
    }
    
    switch (currentStatus.toLowerCase()) {
      case 'pending': return 'secondary';
      case 'active':
      case 'processing': return 'default';
      case 'completed':
      case 'paid': return 'success';
      case 'overdue':
      case 'cancelled':
      case 'rejected': return 'destructive';
      case 'disputed':
      case 'warning': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          <Badge variant={getCurrentStatusVariant()}>
            {currentStatus}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Status History</h4>
            <div className="space-y-3">
              {statusHistory.map((entry, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">
                      {entry.status}
                    </Badge>
                    {entry.updatedBy && (
                      <span className="text-muted-foreground">
                        by {entry.updatedBy}
                      </span>
                    )}
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {format(new Date(entry.timestamp), 'MMM dd, yyyy HH:mm')}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          <Separator />
          
          <div className="text-xs text-muted-foreground">
            Last updated: {format(new Date(), 'MMM dd, yyyy HH:mm')}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatusDetails;