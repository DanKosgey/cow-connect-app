import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, RefreshCw, AlertCircle, CheckCircle, Clock, Truck } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import StatusBadge from '@/components/StatusBadge';
import StatusFilter from '@/components/StatusFilter';
import { useToast } from '@/components/ui/use-toast';

interface DisbursementRecord {
  id: string;
  credit_request_id: string;
  farmer_id: string;
  farmer_name: string;
  farmer_phone: string;
  disbursed_by: string;
  disbursed_at: string;
  total_amount: number;
  credit_used: number;
  net_payment: number;
  credit_transaction_id: string;
  due_date: string;
  status: string;
  collection_payment_ids: string[];
  created_at: string;
  product_name: string;
  quantity: number;
  unit: string;
}

const DisbursementStatusTracker = () => {
  const [loading, setLoading] = useState(true);
  const [disbursements, setDisbursements] = useState<DisbursementRecord[]>([]);
  const [filteredDisbursements, setFilteredDisbursements] = useState<DisbursementRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  // Status options for filtering
  const statusOptions = [
    { value: 'pending_payment', label: 'Pending Payment' },
    { value: 'paid', label: 'Paid' },
    { value: 'partially_paid', label: 'Partially Paid' },
    { value: 'written_off', label: 'Written Off' },
    { value: 'overdue', label: 'Overdue' }
  ];

  useEffect(() => {
    fetchDisbursements();
  }, []);

  useEffect(() => {
    // Filter disbursements based on search term and status
    let filtered = disbursements;

    if (searchTerm) {
      filtered = filtered.filter(disbursement => 
        disbursement.farmer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        disbursement.farmer_phone.includes(searchTerm) ||
        disbursement.product_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(disbursement => disbursement.status === statusFilter);
    }

    setFilteredDisbursements(filtered);
  }, [searchTerm, statusFilter, disbursements]);

  const fetchDisbursements = async () => {
    try {
      setLoading(true);
      
      // Get agrovet disbursements with related data
      const { data, error } = await supabase
        .from('agrovet_disbursements')
        .select(`
          *,
          agrovet_credit_requests(
            agrovet_products(
              name
            ),
            quantity,
            unit_price
          ),
          farmers:farmer_id (
            full_name,
            phone
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Transform data to match our interface
      const transformedData = (data || []).map(disbursement => {
        const request = disbursement.agrovet_credit_requests;
        const product = request?.agrovet_products;
        
        return {
          id: disbursement.id,
          credit_request_id: disbursement.credit_request_id,
          farmer_id: disbursement.farmer_id,
          farmer_name: disbursement.farmers?.full_name || 'Unknown Farmer',
          farmer_phone: disbursement.farmers?.phone || 'No phone',
          disbursed_by: disbursement.disbursed_by,
          disbursed_at: disbursement.disbursed_at,
          total_amount: disbursement.total_amount,
          credit_used: disbursement.credit_used,
          net_payment: disbursement.net_payment,
          credit_transaction_id: disbursement.credit_transaction_id,
          due_date: disbursement.due_date,
          status: disbursement.status,
          collection_payment_ids: disbursement.collection_payment_ids || [],
          created_at: disbursement.created_at,
          product_name: product?.name || 'Unknown Product',
          quantity: request?.quantity || 0,
          unit: product?.unit || 'units'
        };
      });

      setDisbursements(transformedData);
      setFilteredDisbursements(transformedData);
    } catch (err) {
      console.error("Error fetching disbursement data:", err);
      toast({
        title: "Error",
        description: "Failed to load disbursement data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchDisbursements();
      toast({
        title: "Refreshed",
        description: "Disbursement data updated successfully"
      });
    } catch (err) {
      console.error("Error refreshing data:", err);
      toast({
        title: "Error",
        description: "Failed to refresh disbursement data",
        variant: "destructive"
      });
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending_payment':
        return <Clock className="h-4 w-4" />;
      case 'overdue':
        return <AlertCircle className="h-4 w-4" />;
      case 'partially_paid':
        return <Truck className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDueDateBadge = (dueDate: string, status: string) => {
    if (status === 'paid' || status === 'written_off') {
      return null;
    }

    const daysUntilDue = getDaysUntilDue(dueDate);
    
    if (daysUntilDue < 0) {
      return <Badge variant="destructive">Overdue by {Math.abs(daysUntilDue)} days</Badge>;
    } else if (daysUntilDue === 0) {
      return <Badge variant="destructive">Due today</Badge>;
    } else if (daysUntilDue <= 3) {
      return <Badge variant="secondary">Due in {daysUntilDue} days</Badge>;
    } else {
      return <Badge variant="default">Due in {daysUntilDue} days</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading disbursement data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Disbursement Status Tracker</h2>
          <p className="text-muted-foreground">Monitor the status of all agrovet product disbursements</p>
        </div>
        <Button 
          onClick={handleRefresh} 
          variant="outline"
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by farmer name, phone, or product..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="w-full md:w-64">
              <StatusFilter
                value={statusFilter}
                onValueChange={setStatusFilter}
                statusOptions={statusOptions}
                placeholder="Filter by status"
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Total Disbursements</div>
                <div className="text-2xl font-bold">{disbursements.length}</div>
              </div>
              <Truck className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Paid</div>
                <div className="text-2xl font-bold">
                  {disbursements.filter(d => d.status === 'paid').length}
                </div>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Pending</div>
                <div className="text-2xl font-bold">
                  {disbursements.filter(d => d.status === 'pending_payment').length}
                </div>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Overdue</div>
                <div className="text-2xl font-bold">
                  {disbursements.filter(d => d.status === 'overdue').length}
                </div>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Total Value</div>
                <div className="text-2xl font-bold">
                  {formatCurrency(disbursements.reduce((sum, d) => sum + d.total_amount, 0))}
                </div>
              </div>
              <div className="h-8 w-8 text-purple-500 font-bold text-xl">
                Σ
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Disbursement List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Recent Disbursements
            <span className="text-sm font-normal text-muted-foreground ml-2">
              ({filteredDisbursements.length} items)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredDisbursements.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Truck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No disbursements found</p>
              <p>
                {searchTerm || statusFilter !== "all"
                  ? "No disbursements match your search criteria"
                  : "Disbursement records will appear here once created"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDisbursements.map((disbursement) => (
                <div key={disbursement.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">
                          {disbursement.product_name}
                        </h3>
                        <StatusBadge status={disbursement.status} type="payment" />
                        {getStatusIcon(disbursement.status)}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Farmer</div>
                          <div className="font-medium">
                            {disbursement.farmer_name}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {disbursement.farmer_phone}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Quantity</div>
                          <div className="font-medium">
                            {disbursement.quantity} {disbursement.unit}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            {formatCurrency(disbursement.total_amount / disbursement.quantity)} each
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Total Amount</div>
                          <div className="font-medium text-lg">
                            {formatCurrency(disbursement.total_amount)}
                          </div>
                          <div className="flex gap-2 mt-1">
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              Credit: {formatCurrency(disbursement.credit_used)}
                            </span>
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                              Net: {formatCurrency(disbursement.net_payment)}
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Due Date</div>
                          <div className="font-medium">
                            {new Date(disbursement.due_date).toLocaleDateString()}
                          </div>
                          <div className="mt-1">
                            {getDueDateBadge(disbursement.due_date, disbursement.status)}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      Disbursed: {new Date(disbursement.disbursed_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DisbursementStatusTracker;