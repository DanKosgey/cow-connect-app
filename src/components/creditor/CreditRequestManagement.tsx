import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { 
  Search, 
  CheckCircle, 
  Clock, 
  Package, 
  User, 
  Phone, 
  AlertCircle,
  CreditCard,
  Loader2
} from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from '@/integrations/supabase/client';

interface CreditRequest {
  id: string;
  farmer_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  status: string;
  notes?: string;
  created_at: string;
  processed_by?: string;
  processed_at?: string;
  rejection_reason?: string;
  available_credit_at_request?: number;
  packaging_id?: string;
  // Related data
  farmers?: {
    profiles?: {
      full_name: string;
      phone: string;
    };
  };
  agrovet_inventory?: {
    name: string;
    category: string;
    unit: string;
  };
  product_packaging?: {
    name: string;
    weight: number;
    unit: string;
  };
}

const CreditRequestManagement = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<CreditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<CreditRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchCreditRequests();
  }, []);

  const fetchCreditRequests = async () => {
    setLoading(true);
    try {
      // Fetch credit requests with related data
      const { data, error } = await supabase
        .from('agrovet_credit_requests')
        .select(`
          *,
          farmers!inner (
            profiles (
              full_name,
              phone
            )
          ),
          agrovet_inventory (
            name,
            category,
            unit
          ),
          product_packaging (
            name,
            weight,
            unit
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching credit requests:', error);
      toast({
        title: "Error",
        description: "Failed to load credit requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      // Call the stored procedure to process the credit request
      const { error } = await supabase.rpc('process_agrovet_credit_request', {
        request_id: requestId,
        staff_id: (await supabase.auth.getUser()).data.user?.id,
        action: 'disbursed'
      });

      if (error) throw error;

      toast({
        title: "Request Approved",
        description: "Credit request has been approved and product disbursed.",
      });

      // Refresh the list
      fetchCreditRequests();
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error approving request:', error);
      toast({
        title: "Approval Failed",
        description: error.message || "Failed to approve credit request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      // Call the stored procedure to reject the credit request
      const { error } = await supabase.rpc('process_agrovet_credit_request', {
        request_id: requestId,
        staff_id: (await supabase.auth.getUser()).data.user?.id,
        action: 'rejected'
      });

      if (error) throw error;

      toast({
        title: "Request Rejected",
        description: "Credit request has been rejected.",
      });

      // Refresh the list
      fetchCreditRequests();
      setSelectedRequest(null);
      setRejectionReason('');
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({
        title: "Rejection Failed",
        description: error.message || "Failed to reject credit request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const filteredRequests = requests.filter(request => {
    const farmerName = request.farmers?.profiles?.full_name?.toLowerCase() || '';
    const farmerPhone = request.farmers?.profiles?.phone || '';
    const productName = request.agrovet_inventory?.name?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();

    return farmerName.includes(query) ||
      farmerPhone.includes(query) ||
      productName.includes(query);
  });

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'disbursed': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'disbursed': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Credit Requests
          </CardTitle>
          <div className="flex items-center gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by farmer name, phone, or product..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button onClick={fetchCreditRequests} variant="outline">
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 text-blue-500 opacity-50" />
              <p className="text-lg font-medium">No pending credit requests</p>
              <p>Farmers will appear here when they submit credit requests.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <div key={request.id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex gap-4 mb-4 md:mb-0">
                    <div className="bg-blue-100 p-3 rounded-full h-fit">
                      <Package className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">
                        {request.agrovet_inventory?.name}
                        {request.product_packaging && (
                          <span className="ml-2 text-sm font-normal text-gray-600">
                            ({request.product_packaging.name})
                          </span>
                        )}
                      </h3>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {request.farmers?.profiles?.full_name || 'Unknown Farmer'}
                        </div>
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {request.farmers?.profiles?.phone || 'No Phone'}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(request.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <Badge variant="outline">
                          Qty: {request.quantity} {request.agrovet_inventory?.unit}
                        </Badge>
                        <Badge variant="secondary">
                          {formatCurrency(request.total_amount)}
                        </Badge>
                        <Badge className={getStatusColor(request.status)}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(request.status)}
                            <span className="capitalize">{request.status}</span>
                          </div>
                        </Badge>
                      </div>
                      {request.available_credit_at_request !== undefined && (
                        <div className="mt-2 text-sm">
                          <span className="font-medium">Available Credit:</span> 
                          <span className={request.available_credit_at_request >= request.total_amount ? 'text-green-600' : 'text-red-600'}>
                            {' '}{formatCurrency(request.available_credit_at_request)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {request.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => setSelectedRequest(request)}
                        variant="outline"
                      >
                        Review
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Review Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Credit Request Review</DialogTitle>
            <DialogDescription>
              Review and process this farmer's credit request
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="py-4 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Farmer</p>
                  <p className="font-medium">{selectedRequest.farmers?.profiles?.full_name || 'Unknown Farmer'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedRequest.farmers?.profiles?.phone || 'No Phone'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Product</p>
                  <p className="font-medium">
                    {selectedRequest.agrovet_inventory?.name}
                    {selectedRequest.product_packaging && (
                      <span className="ml-2 text-sm font-normal text-gray-600">
                        ({selectedRequest.product_packaging.name})
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Quantity</p>
                  <p className="font-medium">
                    {selectedRequest.quantity} {selectedRequest.agrovet_inventory?.unit}
                    {selectedRequest.product_packaging && (
                      <span className="ml-2 text-sm font-normal text-gray-600">
                        ({selectedRequest.product_packaging.weight} {selectedRequest.product_packaging.unit})
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Unit Price</p>
                  <p className="font-medium">{formatCurrency(selectedRequest.unit_price)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="font-medium text-green-600">{formatCurrency(selectedRequest.total_amount)}</p>
                </div>
              </div>

              {selectedRequest.available_credit_at_request !== undefined && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-blue-800">Credit Information</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Available at Request</p>
                      <p className={`font-medium ${selectedRequest.available_credit_at_request >= selectedRequest.total_amount ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(selectedRequest.available_credit_at_request)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {selectedRequest.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="font-medium">{selectedRequest.notes}</p>
                </div>
              )}

              <div className="flex items-start gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded border border-amber-200">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p>Please verify the farmer's identity and creditworthiness before approving this request.</p>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  onClick={() => {
                    setSelectedRequest(null);
                    setRejectionReason('');
                  }}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    setRejectionReason('');
                    handleRejectRequest(selectedRequest.id);
                  }}
                  variant="destructive"
                  disabled={processingId === selectedRequest.id}
                >
                  {processingId === selectedRequest.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Rejecting...
                    </>
                  ) : (
                    "Reject Request"
                  )}
                </Button>
                <Button
                  onClick={() => handleApproveRequest(selectedRequest.id)}
                  disabled={processingId === selectedRequest.id || 
                    (selectedRequest.available_credit_at_request !== undefined && 
                     selectedRequest.available_credit_at_request < selectedRequest.total_amount)}
                >
                  {processingId === selectedRequest.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    "Approve Request"
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreditRequestManagement;