import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CreditServiceEssentials } from "@/services/credit-service-essentials";
import { Search, Filter, Download, AlertCircle, RefreshCw, BarChart3, ShoppingCart, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { CreditHeader } from "@/components/admin/credit/CreditHeader";
import { FarmersTable } from "@/components/admin/credit/FarmersTable";
import { useCreditData } from "@/hooks/useCreditData";
import CreditApprovalQueue from "@/components/admin/CreditApprovalQueue";
import { CreditAnalyticsDashboard } from "@/components/admin/credit/CreditAnalyticsDashboard";

const CreditManagementEssentials = () => {
  const { toast } = useToast();
  const {
    loading,
    farmers,
    filteredFarmers,
    setFilteredFarmers,
    error,
    pendingRequestsCount,
    autoApproveInfo,
    setAutoApproveInfo,
    fetchData
  } = useCreditData();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [activeTab, setActiveTab] = useState<'farmers' | 'approvals' | 'analytics'>('farmers');
  const [adjustCreditDialog, setAdjustCreditDialog] = useState<{
    open: boolean;
    farmerId: string;
    farmerName: string;
    currentLimit: number
  }>({ open: false, farmerId: '', farmerName: '', currentLimit: 0 });
  const [newCreditLimit, setNewCreditLimit] = useState(0);

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
  }, [searchTerm, filterStatus, farmers, setFilteredFarmers]);

  const handleGrantCredit = async (farmerId: string, farmerName: string) => {
    try {
      await CreditServiceEssentials.grantCreditToFarmer(farmerId);
      toast({
        title: "Credit Recalculated",
        description: `Credit limit recalculated for ${farmerName} based on pending collections`,
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: `Error recalculating credit: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleAdjustCreditLimit = async () => {
    try {
      const { farmerId, currentLimit } = adjustCreditDialog;

      if (newCreditLimit <= 0) {
        toast({
          title: "Invalid Input",
          description: "Credit limit must be greater than zero",
          variant: "destructive",
        });
        return;
      }

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

      setAdjustCreditDialog({ open: false, farmerId: '', farmerName: '', currentLimit: 0 });
      setNewCreditLimit(0);
      toast({
        title: "Credit Limit Adjusted",
        description: "Credit limit adjusted successfully",
      });
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

      toast({
        title: "Credit Status Updated",
        description: `Credit ${freeze ? 'frozen' : 'unfrozen'} for ${farmerName}`,
      });
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
    toast({
      title: "View History",
      description: `Viewing detailed transaction history for farmer ${farmerId}`,
    });
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
          <Button className="mt-4" onClick={fetchData}>
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
        <CreditHeader
          autoApproveInfo={autoApproveInfo}
          setAutoApproveInfo={setAutoApproveInfo}
          pendingRequestsCount={pendingRequestsCount}
          onRefresh={fetchData}
        />

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

        {activeTab === 'farmers' ? (
          <>
            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 mb-6 mt-6">
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
            <FarmersTable
              farmers={filteredFarmers}
              onGrantCredit={handleGrantCredit}
              onAdjustCredit={(farmerId, farmerName, currentLimit) => {
                setAdjustCreditDialog({ open: true, farmerId, farmerName, currentLimit });
                setNewCreditLimit(currentLimit);
              }}
              onFreezeCredit={handleFreezeCredit}
              onViewHistory={handleViewHistory}
            />
          </>
        ) : activeTab === 'approvals' ? (
          <div key="approvals-tab" className="mt-6">
            <CreditApprovalQueue />
          </div>
        ) : (
          <div key="analytics-tab" className="mt-6">
            <CreditAnalyticsDashboard />
          </div>
        )}

        {/* Adjust Credit Limit Dialog */}
        <Dialog open={adjustCreditDialog.open} onOpenChange={(open) => setAdjustCreditDialog({ ...adjustCreditDialog, open })}>
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
                <Button variant="outline" onClick={() => setAdjustCreditDialog({ open: false, farmerId: '', farmerName: '', currentLimit: 0 })}>
                  Cancel
                </Button>
                <Button onClick={handleAdjustCreditLimit}>
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default CreditManagementEssentials;