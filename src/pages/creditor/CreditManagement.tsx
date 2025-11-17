import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
import { 
  CreditCard, 
  Users, 
  Search, 
  Filter, 
  Eye, 
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Check,
  X
} from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { CreditService } from '@/services/credit-service';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import AdvancedFilter from '@/components/AdvancedFilter';
import SortControl from '@/components/SortControl';
import PaginationControl from '@/components/PaginationControl';
import { useEnhancedErrorHandling } from '@/hooks/use-enhanced-error-handling';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { OfflineCacheService } from '@/services/offline-cache-service';
import ResponsiveTable from '@/components/ResponsiveTable';

interface CreditRequest {
  id: string;
  farmer_id: string;
  farmer_name: string;
  farmer_phone: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  status: string;
  created_at: string;
  available_credit_at_request?: number;
  credit_profile?: {
    max_credit_amount: number;
    current_credit_balance: number;
  };
}

const CreditManagement = () => {
  const [loading, setLoading] = useState(true);
  const [creditRequests, setCreditRequests] = useState<CreditRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<CreditRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isApproving, setIsApproving] = useState<string | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);
  // Add new state for advanced filters, sorting, and pagination
  const [advancedFilters, setAdvancedFilters] = useState<Record<string, any>>({});
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, session } = useAuth();

  // Add enhanced error handling and network status
  const { 
    error: errorHandler, 
    isLoading, 
    isOffline, 
    executeWithErrorHandling 
  } = useEnhancedErrorHandling({ componentName: 'CreditManagement' });
  
  const { isOnline, connectionType } = useNetworkStatus();

  useEffect(() => {
    if (!user) {
      navigate('/auth/creditor-login');
      return;
    }
    fetchData();
  }, [user]);

  const handleApprove = async (requestId: string) => {
    try {
      setIsApproving(requestId);
      await CreditService.approveCreditRequest(requestId);
      toast({
        title: "Success",
        description: "Credit request approved successfully",
      });
      fetchData(); // Refresh the data
    } catch (error) {
      console.error("Error approving credit request:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to approve credit request",
        variant: "destructive",
      });
    } finally {
      setIsApproving(null);
    }
  };

  const handleReject = async () => {
    if (!rejectingRequestId || !rejectionReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a rejection reason",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsRejecting(true);
      await CreditService.rejectCreditRequest(rejectingRequestId, rejectionReason);
      toast({
        title: "Success",
        description: "Credit request rejected successfully",
      });
      setRejectingRequestId(null);
      setRejectionReason("");
      fetchData(); // Refresh the data
    } catch (error) {
      console.error("Error rejecting credit request:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reject credit request",
        variant: "destructive",
      });
    } finally {
      setIsRejecting(false);
    }
  };

  useEffect(() => {
    // Filter requests based on search term and status
    let filtered = creditRequests;

    if (searchTerm) {
      filtered = filtered.filter(request => 
        request.farmer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.farmer_phone.includes(searchTerm) ||
        request.product_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter(request => request.status === filterStatus);
    }

    // Apply advanced filters
    if (advancedFilters.status && advancedFilters.status !== "all") {
      filtered = filtered.filter(request => request.status === advancedFilters.status);
    }

    if (advancedFilters.dateFrom) {
      filtered = filtered.filter(request => new Date(request.created_at) >= new Date(advancedFilters.dateFrom));
    }

    if (advancedFilters.dateTo) {
      filtered = filtered.filter(request => new Date(request.created_at) <= new Date(advancedFilters.dateTo));
    }

    if (advancedFilters.minAmount !== undefined) {
      filtered = filtered.filter(request => request.total_amount >= advancedFilters.minAmount);
    }

    if (advancedFilters.maxAmount !== undefined) {
      filtered = filtered.filter(request => request.total_amount <= advancedFilters.maxAmount);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case "created_at":
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case "farmer_name":
          comparison = a.farmer_name.localeCompare(b.farmer_name);
          break;
        case "product_name":
          comparison = a.product_name.localeCompare(b.product_name);
          break;
        case "total_amount":
          comparison = a.total_amount - b.total_amount;
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
        default:
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      
      return sortOrder === "asc" ? comparison : -comparison;
    });

    // Apply pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginated = filtered.slice(startIndex, endIndex);
    
    setFilteredRequests(paginated);
  }, [searchTerm, filterStatus, creditRequests, advancedFilters, sortBy, sortOrder, currentPage, itemsPerPage]);

  const fetchData = async () => {
    await executeWithErrorHandling(async () => {
      try {
        setLoading(true);
        
        // Check if user is authenticated
        if (!user || !session) {
          setError("User not authenticated");
          toast({
            title: "Authentication Error",
            description: "Please log in again",
            variant: "destructive",
          });
          navigate('/auth/creditor-login');
          return;
        }
        
        // Try to load from cache first if offline
        if (!isOnline) {
          const cachedData = await OfflineCacheService.load<CreditRequest[]>('credit_requests');
          if (cachedData) {
            setCreditRequests(cachedData);
            setFilteredRequests(cachedData);
            return;
          }
        }
        
        // Get all agrovet credit requests with farmer details
        console.log("Fetching agrovet credit requests with Supabase query");
        const { data, error } = await supabase
          .from('agrovet_credit_requests')
          .select(`
            *,
            farmers:farmer_id (
              full_name,
              phone
            ),
            agrovet_products:product_id (
              name
            )
          `)
          .order('created_at', { ascending: false });

        if (error) {
          console.error("Supabase error details:", {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
          });
          throw error;
        }

        // Transform data to match our interface
        const transformedData = (data || []).map(request => ({
          id: request.id,
          farmer_id: request.farmer_id,
          farmer_name: request.farmers?.full_name || 'Unknown Farmer',
          farmer_phone: request.farmers?.phone || 'No phone',
          product_name: request.agrovet_products?.name || request.product_name || 'Unknown Product',
          quantity: request.quantity,
          unit_price: request.unit_price,
          total_amount: request.total_amount,
          status: request.status,
          created_at: request.created_at,
          available_credit_at_request: request.available_credit_at_request,
          credit_profile: request.credit_profile
        }));

        setCreditRequests(transformedData);
        setFilteredRequests(transformedData);
        
        // Cache the data for offline use
        if (isOnline) {
          await OfflineCacheService.save('credit_requests', transformedData);
        }
      } catch (err: any) {
        console.error("Error fetching credit requests:", err);
        setError("Failed to load credit requests");
        
        // Handle specific error cases
        if (err?.message?.includes('Invalid authentication')) {
          toast({
            title: "Session Expired",
            description: "Please log in again",
            variant: "destructive",
          });
          navigate('/auth/creditor-login');
        } else {
          toast({
            title: "Error",
            description: err?.message || "Failed to load credit requests",
            variant: "destructive",
          });
        }
      } finally {
        setLoading(false);
      }
    }, 'CreditManagement - fetchData');
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'rejected': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getActionButtons = (request: CreditRequest) => {
    if (request.status !== 'pending') {
      return (
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate(`/creditor/credit-request/${request.id}`)}
        >
          <Eye className="w-4 h-4 mr-1" />
          View
        </Button>
      );
    }

    return (
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate(`/creditor/credit-request/${request.id}`)}
        >
          <Eye className="w-4 h-4 mr-1" />
          View
        </Button>
        <Button 
          variant="default" 
          size="sm"
          onClick={() => handleApprove(request.id)}
          disabled={isApproving === request.id}
        >
          {isApproving === request.id ? (
            <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Check className="w-4 h-4 mr-1" />
          )}
          Approve
        </Button>
        <Dialog open={rejectingRequestId === request.id} onOpenChange={(open) => {
          if (!open) setRejectingRequestId(null);
        }}>
          <DialogTrigger asChild>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => setRejectingRequestId(request.id)}
            >
              <X className="w-4 h-4 mr-1" />
              Reject
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Credit Request</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this credit request for {request.farmer_name}.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Textarea
                placeholder="Enter rejection reason..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setRejectingRequestId(null);
                  setRejectionReason("");
                }}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleReject}
                disabled={isRejecting || !rejectionReason.trim()}
              >
                {isRejecting ? (
                  <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <X className="w-4 h-4 mr-1" />
                )}
                Reject Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading credit management data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <h3 className="text-lg font-semibold text-red-900">Error</h3>
          </div>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  // Calculate total pages for pagination
  const totalItems = creditRequests.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Offline indicator */}
      {isOffline && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
            <p className="text-yellow-700">You are currently offline. Displaying cached data.</p>
          </div>
        </div>
      )}
      
      {/* Error indicator */}
      {errorHandler && (
        <div className="bg-red-100 border-l-4 border-red-500 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-red-700">An error occurred: {errorHandler.message}</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchData}
              disabled={isLoading}
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Retry
            </Button>
          </div>
        </div>
      )}
      
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Credit Management</h1>
          <p className="text-gray-600 mt-2">Manage farmer credit requests and applications</p>
        </div>

        {/* Search and Filter Bar */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search by farmer name, phone, or product..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={fetchData} disabled={loading}>
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Credit Requests Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Credit Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredRequests.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No credit requests found</h3>
                <p className="text-gray-500">
                  {searchTerm || filterStatus !== "all" 
                    ? "No credit requests match your search criteria" 
                    : "Credit requests will appear here when farmers submit them"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Farmer</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Credit Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{request.farmer_name}</div>
                            <div className="text-sm text-gray-500">{request.farmer_phone}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{request.product_name}</div>
                        </TableCell>
                        <TableCell>
                          {request.quantity}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{formatCurrency(request.total_amount)}</div>
                        </TableCell>
                        <TableCell>
                          {request.credit_profile && (
                            <div className="text-sm">
                              <div>Limit: {formatCurrency(request.credit_profile.max_credit_amount)}</div>
                              <div>Balance: {formatCurrency(request.credit_profile.current_credit_balance)}</div>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(request.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                            {getStatusIcon(request.status)}
                            <span className="ml-1 capitalize">{request.status}</span>
                          </span>
                        </TableCell>
                        <TableCell>
                          {getActionButtons(request)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by farmer name, phone, or product..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // Reset to first page when searching
              }}
              className="pl-10 w-full sm:w-64"
            />
          </div>
          
          <Select 
            value={filterStatus} 
            onValueChange={(value) => {
              setFilterStatus(value);
              setCurrentPage(1); // Reset to first page when filtering
            }}
          >
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          
          <AdvancedFilter 
            onFilterChange={(filters) => {
              setAdvancedFilters(filters);
              setCurrentPage(1); // Reset to first page when applying filters
            }}
            filterType="credit"
            currentFilters={advancedFilters}
          />
        </div>
        
        <SortControl
          options={[
            { id: "created_at", label: "Date" },
            { id: "farmer_name", label: "Farmer Name" },
            { id: "product_name", label: "Product Name" },
            { id: "total_amount", label: "Amount" },
            { id: "status", label: "Status" }
          ]}
          currentSort={sortBy}
          currentOrder={sortOrder}
          onSortChange={(newSortBy, newSortOrder) => {
            setSortBy(newSortBy);
            setSortOrder(newSortOrder);
          }}
        />
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <PaginationControl
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
};

export default CreditManagement;