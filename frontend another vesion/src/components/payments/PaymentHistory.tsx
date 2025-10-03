import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Badge 
} from '@/components/ui/badge';
import { 
  Button 
} from '@/components/ui/button';
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  CreditCard, 
  Smartphone, 
  Building,
  Download,
  Search,
  Filter
} from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Input 
} from '@/components/ui/input';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { 
  Calendar as CalendarComponent 
} from '@/components/ui/calendar';
import { 
  cn 
} from '@/lib/utils';
import { format, subMonths } from 'date-fns';
import { usePaymentHistory } from '@/hooks/usePaymentHistory';
import { PaymentStatus, PaymentHistoryFilter } from '@/types/payment';

interface PaymentHistoryProps {
  farmerId: string;
}

const PaymentHistory: React.FC<PaymentHistoryProps> = ({ farmerId }) => {
  const [filters, setFilters] = useState<PaymentHistoryFilter>({
    dateRange: {
      start: subMonths(new Date(), 1),
      end: new Date()
    },
    status: 'all',
    paymentMethod: 'all',
    minAmount: undefined,
    maxAmount: undefined
  });
  
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { 
    data, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage,
    isLoading,
    isError,
    error
  } = usePaymentHistory({
    farmerId,
    ...filters
  });
  
  // Flatten the paginated data
  const payments = data?.pages.flatMap(page => page.payments) || [];
  const summary = data?.pages[0]?.summary;
  
  const getPaymentIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'mpesa':
        return <Smartphone className="h-4 w-4" />;
      case 'bank':
        return <Building className="h-4 w-4" />;
      case 'credit_card':
      case 'paystack':
        return <CreditCard className="h-4 w-4" />;
      default:
        return <CreditCard className="h-4 w-4" />;
    }
  };
  
  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800"><Clock className="h-3 w-3 mr-1" />Processing</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };
  
  const handleDateRangeSelect = (range: { start: Date; end: Date }) => {
    setFilters(prev => ({
      ...prev,
      dateRange: range
    }));
    setDatePickerOpen(false);
  };
  
  const formatDateRange = () => {
    const { start, end } = filters.dateRange;
    return `${format(start, 'MMM d, yyyy')} - ${format(end, 'MMM d, yyyy')}`;
  };
  
  const exportToCSV = () => {
    // In a real implementation, this would generate a CSV file
    console.log('Exporting to CSV');
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-dairy-blue"></div>
      </div>
    );
  }
  
  if (isError) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-500">
            <p>Error loading payment history: {error?.message || 'Unknown error'}</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Earned</CardDescription>
              <CardTitle className="text-2xl">
                KSh {summary.total_earned.toLocaleString()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                All completed payments
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending Payments</CardDescription>
              <CardTitle className="text-2xl">
                KSh {summary.total_pending.toLocaleString()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Awaiting processing
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Avg. Per Collection</CardDescription>
              <CardTitle className="text-2xl">
                KSh {summary.average_per_collection.toFixed(2)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Based on all payments
              </p>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Payment History</span>
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </CardTitle>
          <CardDescription>
            View and filter your payment history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            {/* Date Range Filter */}
            <div className="flex-1">
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal">
                <Calendar className="mr-2 h-4 w-4" />
                <span>{formatDateRange()}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="range"
                selected={{
                  from: filters.dateRange.start,
                  to: filters.dateRange.end
                }}
                onSelect={(range) => {
                  if (range?.from && range?.to) {
                    handleDateRangeSelect({
                      start: range.from,
                      end: range.to
                    });
                  }
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
        
        {/* Status Filter */}
        <div className="flex-1">
          <Select 
            value={filters.status === 'all' ? 'all' : filters.status}
            onValueChange={(value) => 
              setFilters(prev => ({
                ...prev,
                status: value as PaymentStatus | 'all'
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Payment Method Filter */}
        <div className="flex-1">
          <Select 
            value={filters.paymentMethod}
            onValueChange={(value) => 
              setFilters(prev => ({
                ...prev,
                paymentMethod: value
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All Methods" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              <SelectItem value="mpesa">M-Pesa</SelectItem>
              <SelectItem value="bank">Bank Transfer</SelectItem>
              <SelectItem value="paystack">Paystack</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search payments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
  
  {/* Payment Table */}
  <Card>
    <CardContent className="p-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Fee</TableHead>
            <TableHead className="text-right">Net Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                No payments found matching your criteria
              </TableCell>
            </TableRow>
          ) : (
            payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>
                  <div className="font-medium">
                    {format(new Date(payment.created_at), 'MMM d, yyyy')}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(payment.created_at), 'h:mm a')}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-mono text-sm">
                    {payment.reference_number}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    {getPaymentIcon(payment.payment_method)}
                    <span className="ml-2 capitalize">
                      {payment.payment_method.replace('_', ' ')}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  {getStatusBadge(payment.status)}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {payment.currency} {payment.amount.toLocaleString()}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {payment.currency} {payment.processing_fee.toLocaleString()}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {payment.currency} {payment.net_amount.toLocaleString()}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
  
  {/* Load More Button */}
  {hasNextPage && (
    <div className="flex justify-center">
      <Button
        onClick={() => fetchNextPage()}
        disabled={isFetchingNextPage}
        variant="outline"
      >
        {isFetchingNextPage ? (
          <>
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Loading...
          </>
        ) : (
          'Load More'
        )}
      </Button>
    </div>
  )}
</div>
);
};

export default PaymentHistory;
