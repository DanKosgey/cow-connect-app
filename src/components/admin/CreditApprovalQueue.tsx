import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search, 
  Filter,
  User,
  Package
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
import { useToast } from "@/components/ui/use-toast";
import { CreditRequestService } from "@/services/credit-request-service";

interface CreditRequest {
  id: string;
  farmer_id: string;
  product_id: string;
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
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
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
        setRequests([]);
        setFilteredRequests([]);
        return;
      }

      // Enhance requests with farmer details
      const enhancedRequests = (data || []).map(request => ({
        ...request,
        farmer_name: request.farmers?.profiles?.full_name || 'Unknown Farmer',
        farmer_phone: request.farmers?.profiles?.phone || 'No phone'
      }));

      setRequests(enhancedRequests);
      setFilteredRequests(enhancedRequests);
    } catch (err) {
      console.error("Error fetching credit requests:", err);
      toast({
        title: "Error",
        description: "Failed to load credit requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    let filtered = requests;
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(request => 
        request.farmer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.farmer_phone?.includes(searchTerm) ||
        request.product_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter(request => request.status === filterStatus);
    }
    
    setFilteredRequests(filtered);
  }, [searchTerm, filterStatus, requests]);

  const handleApproveRequest = async (requestId: string) => {
    try {
      // Get the request details
      const request = requests.find(r => r.id === requestId);
      if (!request) return;

      // Approve the credit request
      await CreditRequestService.approveCreditRequest(
        requestId,
        (await supabase.auth.getUser()).data.user?.id
      );

      // Update local state
      setRequests(requests.map(req => 
        req.id === requestId 
          ? { ...req, status: 'approved', approved_at: new Date().toISOString() } 
          : req
      ));

      toast({
        title: "Request Approved",
        description: `Credit request for ${request.farmer_name} has been approved`,
      });
    } catch (error) {
      console.error("Error approving credit request:", error);
      toast({
        title: "Error",
        description: "Failed to approve credit request",
        variant: "destructive",
      });
    }
  };

  const handleRejectRequest = async (requestId: string, reason: string) => {
    try {
      await CreditRequestService.rejectCreditRequest(
        requestId,
        reason,
        (await supabase.auth.getUser()).data.user?.id
      );

      // Update local state
      setRequests(requests.map(req => 
        req.id === requestId 
          ? { ...req, status: 'rejected', rejection_reason: reason, approved_at: new Date().toISOString() } 
          : req
      ));

      toast({
        title: "Request Rejected",
        description: "Credit request has been rejected",
      });
    } catch (error) {
      console.error("Error rejecting credit request:", error);
      toast({
        title: "Error",
        description: "Failed to reject credit request",
        variant: "destructive",
      });
    }
  };

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
                          <h4 className="font-medium text-gray-900">{request.product_name}</h4>
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
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-red-600 border-red-600 hover:bg-red-50"
                            onClick={() => {
                              const reason = prompt("Enter rejection reason:");
                              if (reason) {
                                handleRejectRequest(request.id, reason);
                              }
                            }}
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
    </div>
  );
};

export default CreditApprovalQueue;