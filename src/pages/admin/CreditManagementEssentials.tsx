import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CreditServiceEssentials } from "@/services/credit-service-essentials";
import { 
  CreditCard, 
  Users, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Edit, 
  Plus,
  AlertCircle,
  CheckCircle,
  Clock,
  ShoppingCart,
  BarChart3,
  History,
  Settings,
  Pause,
  Play,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import CreditApprovalQueue from "@/components/admin/CreditApprovalQueue";
import CreditAnalyticsDashboard from "@/components/admin/CreditAnalyticsDashboard";

const CreditManagementEssentials = () => {
  const [loading, setLoading] = useState(true);
  const [farmers, setFarmers] = useState<any[]>([]);
  const [filteredFarmers, setFilteredFarmers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'farmers' | 'approvals' | 'analytics'>('farmers');
  const [adjustCreditDialog, setAdjustCreditDialog] = useState<{open: boolean, farmerId: string, farmerName: string, currentLimit: number}>({open: false, farmerId: '', farmerName: '', currentLimit: 0});
  const [newCreditLimit, setNewCreditLimit] = useState(0);
  const [rejectionDialog, setRejectionDialog] = useState<{open: boolean, requestId: string, farmerName: string}>({open: false, requestId: '', farmerName: ''});
  const [rejectionReason, setRejectionReason] = useState("");
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get all farmers with their profiles
      const { data: farmersData, error: farmersError } = await supabase
        .from('farmers')
        .select(`
          id,
          profiles:user_id (full_name, phone)
        `);

      if (farmersError) throw farmersError;

      // Handle case when no farmers exist
      if (!farmersData || farmersData.length === 0) {
        setFarmers([]);
        setFilteredFarmers([]);
        return;
      }

      // For each farmer, get credit information
      const farmerCreditData = [];
      for (const farmer of farmersData || []) {
        try {
          // Get credit profile
          const creditProfile = await CreditServiceEssentials.getCreditProfile(farmer.id);
          
          // Get pending payments from approved collections only
          const { data: pendingCollections, error: collectionsError } = await supabase
            .from('collections')
            .select('total_amount')
            .eq('farmer_id', farmer.id)
            .eq('approved_for_company', true) // Only consider approved collections
            .neq('status', 'Paid');

          if (collectionsError) {
            console.warn(`Error fetching collections for farmer ${farmer.id}:`, collectionsError);
            continue;
          }

          const pendingPayments = pendingCollections?.reduce((sum, collection) => 
            sum + (collection.total_amount || 0), 0) || 0;

          farmerCreditData.push({
            farmer_id: farmer.id,
            farmer_name: farmer.profiles?.full_name || 'Unknown Farmer',
            farmer_phone: farmer.profiles?.phone || 'No phone',
            credit_profile: creditProfile,
            pending_payments: pendingPayments
          });
        } catch (err) {
          console.warn(`Error processing farmer ${farmer.id}:`, err);
        }
      }

      setFarmers(farmerCreditData);
      setFilteredFarmers(farmerCreditData);
      
      // Get pending requests count
      const { count, error: countError } = await supabase
        .from('credit_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (!countError) {
        setPendingRequestsCount(count || 0);
      }
    } catch (err) {
      console.error("Error fetching credit management data:", err);
      setError("Failed to load credit management data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    // Filter farmers based on search term and status
    let filtered = farmers;

    if (searchTerm) {
      filtered = filtered.filter(farmer => 
        farmer.farmer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        farmer.farmer_phone.includes(searchTerm)
      );
    }

    if (filterStatus !== "all") {
      if (filterStatus === "high_credit") {
        filtered = filtered.filter(farmer => 
          farmer.credit_profile?.current_credit_balance > 50000);
      } else if (filterStatus === "low_credit") {
        filtered = filtered.filter(farmer => 
          farmer.credit_profile?.current_credit_balance < 10000);
      } else if (filterStatus === "no_credit") {
        filtered = filtered.filter(farmer => 
          !farmer.credit_profile || farmer.credit_profile.current_credit_balance === 0);
      }
    }

    setFilteredFarmers(filtered);
  }, [searchTerm, filterStatus, farmers]);

  const handleGrantCredit = async (farmerId: string, farmerName: string) => {
    try {
      await CreditServiceEssentials.grantCreditToFarmer(farmerId);
      toast({
        title: "Credit Granted",
        description: `Credit successfully granted to ${farmerName}`,
      });
      // Refresh data
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Error granting credit: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleAdjustCreditLimit = async () => {
    try {
      const { farmerId, currentLimit } = adjustCreditDialog;
      
      // Validate input
      if (newCreditLimit <= 0) {
        toast({
          title: "Invalid Input",
          description: "Credit limit must be greater than zero",
          variant: "destructive",
        });
        return;
      }
      
      // Update credit profile with new limit
      const { data: creditProfile, error: profileError } = await supabase
        .from('farmer_credit_profiles')
        .select('*')
        .eq('farmer_id', farmerId)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!creditProfile) throw new Error('Credit profile not found');

      const { error: updateError } = await supabase
        .from('farmer_credit_profiles')
        .update({
          max_credit_amount: newCreditLimit,
          updated_at: new Date().toISOString()
        })
        .eq('id', creditProfile.id);

      if (updateError) throw updateError;

      // Create transaction record for adjustment
      const { error: transactionError } = await supabase
        .from('credit_transactions')
        .insert({
          farmer_id: farmerId,
          transaction_type: 'credit_adjusted',
          amount: newCreditLimit - currentLimit,
          balance_before: creditProfile.current_credit_balance,
          balance_after: creditProfile.current_credit_balance,
          description: `Credit limit adjusted from ${formatCurrency(currentLimit)} to ${formatCurrency(newCreditLimit)}`,
          approved_by: (await supabase.auth.getUser()).data.user?.id,
          approval_status: 'approved'
        })
        .select();

      if (transactionError) throw transactionError;

      setAdjustCreditDialog({open: false, farmerId: '', farmerName: '', currentLimit: 0});
      setNewCreditLimit(0);
      toast({
        title: "Credit Limit Adjusted",
        description: "Credit limit adjusted successfully",
      });
      // Refresh data
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Error adjusting credit limit: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleFreezeCredit = async (farmerId: string, farmerName: string, freeze: boolean) => {
    try {
      const { data: creditProfile, error: profileError } = await supabase
        .from('farmer_credit_profiles')
        .select('*')
        .eq('farmer_id', farmerId)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!creditProfile) throw new Error('Credit profile not found');

      const { error: updateError } = await supabase
        .from('farmer_credit_profiles')
        .update({
          is_frozen: freeze,
          freeze_reason: freeze ? 'Admin action' : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', creditProfile.id);

      if (updateError) throw updateError;

      // Create transaction record
      const { error: transactionError } = await supabase
        .from('credit_transactions')
        .insert({
          farmer_id: farmerId,
          transaction_type: 'credit_adjusted',
          amount: 0,
          balance_before: creditProfile.current_credit_balance,
          balance_after: creditProfile.current_credit_balance,
          description: freeze ? 'Credit line frozen by admin' : 'Credit line unfrozen by admin',
          approved_by: (await supabase.auth.getUser()).data.user?.id,
          approval_status: 'approved'
        })
        .select();

      if (transactionError) throw transactionError;

      toast({
        title: "Credit Status Updated",
        description: `Credit ${freeze ? 'frozen' : 'unfrozen'} for ${farmerName}`,
      });
      // Refresh data
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Error ${freeze ? 'freezing' : 'unfreezing'} credit: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleViewHistory = async (farmerId: string) => {
    // This would typically open a modal with detailed history
    // For now, we'll just show a toast
    toast({
      title: "View History",
      description: `Viewing detailed transaction history for farmer ${farmerId}`,
    });
  };

  const handleRejectRequest = async () => {
    try {
      if (!rejectionReason.trim()) {
        toast({
          title: "Reason Required",
          description: "Please provide a reason for rejection",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('credit_requests')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
          approved_by: (await supabase.auth.getUser()).data.user?.id,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', rejectionDialog.requestId);

      if (error) throw error;

      setRejectionDialog({open: false, requestId: '', farmerName: ''});
      setRejectionReason("");
      toast({
        title: "Request Rejected",
        description: `Credit request for ${rejectionDialog.farmerName} has been rejected`,
      });
      // Refresh data
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Error rejecting credit request: ${error.message}`,
        variant: "destructive",
      });
    }
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
          <Button 
            className="mt-4" 
            onClick={fetchData}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Credit Management</h1>
              <p className="text-gray-600 mt-2">Manage farmer credit limits and monitor credit usage</p>
            </div>
            <div className="mt-4 md:mt-0 flex items-center gap-4">
              <div className="flex items-center gap-2 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">
                <Bell className="w-4 h-4" />
                <span className="font-medium">{pendingRequestsCount} pending requests</span>
              </div>
              <Button variant="outline" onClick={fetchData}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex border-b border-gray-200 mt-6">
            <button
              className={`py-2 px-4 font-medium text-sm ${activeTab === 'farmers' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('farmers')}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Farmers Overview
            </button>
            <button
              className={`py-2 px-4 font-medium text-sm relative ${activeTab === 'approvals' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('approvals')}
            >
              <ShoppingCart className="w-4 h-4 inline mr-2" />
              Approval Queue
              {pendingRequestsCount > 0 && (
                <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {pendingRequestsCount}
                </span>
              )}
            </button>
            <button
              className={`py-2 px-4 font-medium text-sm ${activeTab === 'analytics' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('analytics')}
            >
              <BarChart3 className="w-4 h-4 inline mr-2" />
              Analytics
            </button>
          </div>
        </div>

        {activeTab === 'farmers' ? (
          <>
            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search farmers by name or phone..."
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
                  <SelectItem value="all">All Farmers</SelectItem>
                  <SelectItem value="high_credit">High Credit (&gt;50,000)</SelectItem>
                  <SelectItem value="low_credit">Low Credit (&lt;10,000)</SelectItem>
                  <SelectItem value="no_credit">No Credit Available</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            </div>

            {/* Farmers Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Farmers Credit Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Farmer</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Pending Payments</TableHead>
                        <TableHead>Credit Limit</TableHead>
                        <TableHead>Available Credit</TableHead>
                        <TableHead>Credit Used</TableHead>
                        <TableHead>Utilization</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFarmers.length > 0 ? (
                        filteredFarmers.map((farmer) => {
                          const creditProfile = farmer.credit_profile;
                          const hasCredit = creditProfile && creditProfile.current_credit_balance > 0;
                          const creditLimit = creditProfile?.max_credit_amount || 0;
                          const availableCredit = creditProfile?.current_credit_balance || 0;
                          const creditUsed = creditProfile?.total_credit_used || 0;
                          const utilization = creditLimit > 0 ? 
                            ((creditLimit - availableCredit) / creditLimit) * 100 : 0;
                        
                          return (
                            <TableRow key={farmer.farmer_id} className="hover:bg-gray-50">
                              <TableCell className="font-medium">{farmer.farmer_name}</TableCell>
                              <TableCell>{farmer.farmer_phone}</TableCell>
                              <TableCell>{formatCurrency(farmer.pending_payments)}</TableCell>
                              <TableCell>{formatCurrency(creditLimit)}</TableCell>
                              <TableCell className={availableCredit > 0 ? "text-green-600 font-semibold" : ""}>
                                {formatCurrency(availableCredit)}
                              </TableCell>
                              <TableCell>{formatCurrency(creditUsed)}</TableCell>
                              <TableCell>{utilization.toFixed(1)}%</TableCell>
                              <TableCell>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  hasCredit 
                                    ? utilization > 80 
                                      ? "bg-red-100 text-red-800" 
                                      : "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}>
                                  {hasCredit ? (
                                    <>
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Active
                                    </>
                                  ) : (
                                    <>
                                      <Clock className="w-3 h-3 mr-1" />
                                      No Credit
                                    </>
                                  )}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-2">
                                  {!hasCredit && farmer.pending_payments > 0 && (
                                    <Button
                                      size="sm"
                                      onClick={() => handleGrantCredit(farmer.farmer_id, farmer.farmer_name)}
                                    >
                                      <CreditCard className="w-4 h-4 mr-1" />
                                      Grant Credit
                                    </Button>
                                  )}
                                  
                                  {hasCredit && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setAdjustCreditDialog({
                                            open: true,
                                            farmerId: farmer.farmer_id,
                                            farmerName: farmer.farmer_name,
                                            currentLimit: creditLimit
                                          });
                                          setNewCreditLimit(creditLimit);
                                        }}
                                      >
                                        <Edit className="w-4 h-4 mr-1" />
                                        Adjust
                                      </Button>
                                      
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleFreezeCredit(farmer.farmer_id, farmer.farmer_name, !creditProfile.is_frozen)}
                                      >
                                        {creditProfile.is_frozen ? (
                                          <>
                                            <Play className="w-4 h-4 mr-1" />
                                            Unfreeze
                                          </>
                                        ) : (
                                          <>
                                            <Pause className="w-4 h-4 mr-1" />
                                            Freeze
                                          </>
                                        )}
                                      </Button>
                                      
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleViewHistory(farmer.farmer_id)}
                                      >
                                        <History className="w-4 h-4 mr-1" />
                                        History
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                            <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <p>No farmers found in the system</p>
                            <p className="text-sm mt-1">Add farmers to see credit information</p>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              
                {filteredFarmers.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No farmers found matching your criteria</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : activeTab === 'approvals' ? (
          <div key="approvals-tab">
            <CreditApprovalQueue />
          </div>
        ) : (
          <div key="analytics-tab">
            <CreditAnalyticsDashboard />
          </div>
        )}
      </div>

      {/* Adjust Credit Limit Dialog */}
      <Dialog open={adjustCreditDialog.open} onOpenChange={(open) => setAdjustCreditDialog({...adjustCreditDialog, open})}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Credit Limit for {adjustCreditDialog.farmerName}</DialogTitle>
            <DialogDescription>
              Adjust the credit limit for this farmer. Enter the new credit limit amount below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Credit Limit (KES)</label>
              <Input
                type="number"
                value={newCreditLimit}
                onChange={(e) => setNewCreditLimit(Number(e.target.value))}
                placeholder="Enter new credit limit"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAdjustCreditDialog({open: false, farmerId: '', farmerName: '', currentLimit: 0})}>
                Cancel
              </Button>
              <Button onClick={handleAdjustCreditLimit}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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

export default CreditManagementEssentials;