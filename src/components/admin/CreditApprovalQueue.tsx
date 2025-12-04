import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search, 
  Filter,
  User,
  Package,
  RefreshCw,
  Bell,
  Check,
  X
} from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { CreditRequestService } from "@/services/credit-request-service";

interface CreditRequest {
  id: string;
  farmer_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  farmer_name?: string;
  farmer_phone?: string;
}

const CreditApprovalQueue = () => {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<CreditRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<CreditRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("pending");
  const [rejectionDialog, setRejectionDialog] = useState<{open: boolean, requestId: string, farmerName: string}>({open: false, requestId: '', farmerName: ''});
  const [rejectionReason, setRejectionReason] = useState("");
  const { toast } = useToast();
  
  // Refs for guards
  const isFetchingRef = useRef(false);
  const isMountedRef = useRef(true);

  // Stable fetch function with empty dependencies
  const fetchData = useCallback(async () => {
    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      console.log('CreditApprovalQueue: Fetch skipped, already fetching');
      return;
    }
    
    console.log('CreditApprovalQueue: Starting data fetch');
    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    
    try {
      isFetchingRef.current = true;
      setLoading(true);
      
      // Get all credit requests with farmer details
      const { data, error } = await supabase
        .from('credit_requests')
        .select(`
          *,
          farmers(profiles(full_name, phone))
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Handle case when no requests exist
      if (!data || data.length === 0) {
        if (!isMountedRef.current) return;
        setRequests([]);
        setFilteredRequests([]);
        return;
      }

      // Enhance requests with farmer details
      const enhancedRequests = (data || []).map(request => ({
        ...request,
        farmer_name: request.farmer?.profiles?.full_name || 'Unknown Farmer',
        farmer_phone: request.farmer?.profiles?.phone || 'No phone'
      }));

      if (!isMountedRef.current) return;
      setRequests(enhancedRequests);
      setFilteredRequests(enhancedRequests);
      
      const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
      console.log(`CreditApprovalQueue: Completed data fetch in ${(endTime - startTime).toFixed(2)}ms, count:`, enhancedRequests.length);
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error("Error fetching credit requests:", err);
      toast({
        title: "Error",
        description: "Failed to load credit requests",
        variant: "destructive",
      });
    } finally {
      isFetchingRef.current = false;
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []); // Empty dependencies for stable reference

  // Manual refresh function
  const refreshData = useCallback(() => {
    console.log('CreditApprovalQueue: Manual refresh triggered');
    fetchData();
  }, [fetchData]);

  // Single effect that runs once on mount
  useEffect(() => {
    console.log('CreditApprovalQueue: Component mounted, fetching data');
    fetchData();
    
    // Set up real-time subscription for credit requests
    const channel = supabase
      .channel('credit_requests_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'credit_requests',
        },
        (payload) => {
          console.log('New credit request:', payload.new);
          // Only fetch if component is still mounted and not already fetching
          if (isMountedRef.current && !isFetchingRef.current) {
            fetchData();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'credit_requests',
        },
        (payload) => {
          console.log('Credit request updated:', payload.new);
          // Only fetch if component is still mounted and not already fetching
          if (isMountedRef.current && !isFetchingRef.current) {
            fetchData();
          }
        }
      )
      .subscribe();

    // Cleanup function
    return () => {
      console.log('CreditApprovalQueue: Component unmounting');
      isMountedRef.current = false;
      supabase.removeChannel(channel);
    };
  }, []); // Empty dependencies - runs only once

  // Custom debounce hook
  const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);

      return () => {
        clearTimeout(handler);
      };
    }, [value, delay]);

    return debouncedValue;
  };

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    let filtered = requests;
    
    // Apply search filter
    if (debouncedSearchTerm) {
      const searchValue = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(request => 
        request.farmer_name?.toLowerCase().includes(searchValue) ||
        request.farmer_phone?.includes(searchValue) ||
        request.product_name.toLowerCase().includes(searchValue)
      );
    }
    
    // Apply status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter(request => request.status === filterStatus);
    }
    
    setFilteredRequests(filtered);
  }, [debouncedSearchTerm, filterStatus, requests]);

  const handleApproveRequest = useCallback(async (requestId: string) => {
    try {
      // Get the request details
      const request = requests.find(r => r.id === requestId);
      if (!request) return;

      // Check if product_id is null and handle appropriately
      if (!request.product_id) {
        toast({
          title: "Cannot Approve",
          description: "This request cannot be approved because the product is no longer available.",
          variant: "destructive",
        });
        return;
      }

      // Approve the credit request
      await CreditRequestService.approveCreditRequest(
        requestId,
        (await supabase.auth.getUser()).data.user?.id
      );

      toast({
        title: "Request Approved",
        description: `Credit request for ${request.farmer_name} has been approved`,
      });
      
      // Refresh data after approval
      if (isMountedRef.current && !isFetchingRef.current) {
        fetchData();
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error("Error approving credit request:", error);
      toast({
        title: "Error",
        description: "Failed to approve credit request",
        variant: "destructive",
      });
    }
  }, [requests, fetchData]);

  const handleRejectRequest = useCallback(async () => {
    try {
      if (!rejectionReason.trim()) {
        toast({
          title: "Reason Required",
          description: "Please provide a reason for rejection",
          variant: "destructive",
        });
        return;
      }

      const request = requests.find(r => r.id === rejectionDialog.requestId);
      if (!request) return;

      await CreditRequestService.rejectCreditRequest(
        rejectionDialog.requestId,
        rejectionReason,
        (await supabase.auth.getUser()).data.user?.id
      );

      toast({
        title: "Request Rejected",
        description: `Credit request for ${rejectionDialog.farmerName} has been rejected`,
      });
      
      setRejectionDialog({open: false, requestId: '', farmerName: ''});
      setRejectionReason("");
      
      // Refresh data after rejection
      if (isMountedRef.current && !isFetchingRef.current) {
        fetchData();
      }
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error("Error rejecting credit request:", error);
      toast({
        title: "Error",
        description: "Failed to reject credit request",
        variant: "destructive",
      });
    }
  }, [rejectionReason, requests, rejectionDialog, fetchData]);


  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading credit requests...</p>
        </div>
      </div>
    );
  }

  // Add error boundary
  if (!filteredRequests) {
    return (
      <div className="text-center py-8 text-red-500">
        <p>Error loading credit requests. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search by farmer name, phone, or product..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Requests</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        
        <Button variant="outline" onClick={refreshData}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Requests List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Credit Approval Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredRequests.length > 0 ? (
              filteredRequests.map(request => (
                <div key={request.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <div className="bg-blue-100 p-2 rounded-full">
                          <User className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{request.farmer_name}</h3>
                          <p className="text-sm text-gray-500">{request.farmer_phone}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3 mt-3">
                        <div className="bg-green-100 p-2 rounded-full">
                          <Package className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {request.product_name}
                            {!request.product_id && (
                              <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                                Product Unavailable
                              </span>
                            )}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {request.quantity} × {formatCurrency(request.unit_price)} = {formatCurrency(request.total_amount)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-3 text-sm text-gray-500">
                        Requested: {new Date(request.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        request.status === 'approved' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>
                      
                      {request.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-green-600 border-green-600 hover:bg-green-50"
                            onClick={() => handleApproveRequest(request.id)}
                            disabled={!request.product_id}
                            title={!request.product_id ? "Cannot approve - product no longer available" : ""}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-red-600 border-red-600 hover:bg-red-50"
                            onClick={() => setRejectionDialog({
                              open: true, 
                              requestId: request.id, 
                              farmerName: request.farmer_name || 'Unknown Farmer'
                            })}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                      
                      {request.status === 'approved' && request.approved_at && (
                        <div className="text-sm text-gray-500">
                          Approved: {new Date(request.approved_at).toLocaleDateString()}
                        </div>
                      )}
                      
                      {request.status === 'rejected' && request.rejection_reason && (
                        <div className="text-sm text-red-600 max-w-xs">
                          Reason: {request.rejection_reason}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No credit requests found in the system</p>
                <p className="text-sm mt-1">Farmers will appear here when they submit credit requests</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Rejection Reason Dialog */}
      <AlertDialog open={rejectionDialog.open} onOpenChange={(open) => {
        setRejectionDialog({...rejectionDialog, open});
        if (!open) setRejectionReason("");
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Credit Request</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting the credit request for {rejectionDialog.farmerName}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Enter rejection reason..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRejectRequest} className="bg-red-600 hover:bg-red-700">
              Reject Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CreditApprovalQueue;