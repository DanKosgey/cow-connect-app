import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CreditService } from "@/services/credit-service";
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
  Clock
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
import { useToast } from "@/components/ui/use-toast";
import RefreshButton from '@/components/ui/RefreshButton';
import { useCreditManagementData } from '@/hooks/useCreditManagementData';
import CreditRequestManagement from '@/components/creditor/CreditRequestManagement';
import StatusBadge from '@/components/StatusBadge';

interface FarmerCreditSummary {
  farmer_id: string;
  farmer_name: string;
  farmer_phone: string;
  credit_limit: number;
  available_credit: number;
  credit_used: number;
  pending_payments: number;
  credit_percentage: number;
}

const CreditManagement = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'farmers' | 'requests'>('farmers');
  const { toast } = useToast();

  const { data: creditData, isLoading, isError, error: queryError, refetch } = useCreditManagementData(searchTerm, filterStatus);

  const farmers = creditData?.farmers || [];
  const creditLimits = creditData?.creditLimits || [];
  const filteredFarmers = farmers;
  const loading = isLoading;

  const handleAdjustCreditLimit = async (farmerId: string, farmerName: string) => {
    try {
      // In a real implementation, this would open a modal to adjust credit limits
      toast({
        title: "Feature Coming Soon",
        description: `Adjusting credit limit for ${farmerName}. This feature will be available in the next update.`,
      });
    } catch (error) {
      console.error("Error adjusting credit limit:", error);
      toast({
        title: "Error",
        description: "Failed to adjust credit limit",
        variant: "destructive",
      });
    }
  };

  const handleGrantCredit = async (farmerId: string, farmerName: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await CreditService.grantCreditToFarmer(farmerId, user?.id);

      toast({
        title: "Success",
        description: `Credit granted to ${farmerName}`,
      });

      // Refresh data
      refetch();
    } catch (error: any) {
      console.error("Error granting credit:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to grant credit",
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
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Credit Management</h1>
            <p className="text-gray-600 mt-2">Manage farmer credit limits and monitor credit usage</p>
          </div>
          <div className="mt-4 md:mt-0">
            <RefreshButton
              isRefreshing={loading}
              onRefresh={refetch}
              className="bg-white border-gray-300 hover:bg-gray-50 rounded-lg shadow-sm"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            className={`px-4 py-2 font-medium text-sm ${activeTab === 'farmers' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('farmers')}
          >
            Farmer Credit Profiles
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm ${activeTab === 'requests' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('requests')}
          >
            Credit Requests
          </button>
        </div>

        {activeTab === 'farmers' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Total Farmers</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-gray-900">{farmers.length}</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Active Credit Lines</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-gray-900">
                    {creditLimits.filter(cl => cl.current_credit_balance > 0).length}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-orange-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Avg. Credit Limit</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(
                      creditLimits.reduce((sum, cl) => sum + cl.max_credit_amount, 0) /
                      (creditLimits.length || 1)
                    )}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-purple-500">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Total Credit Used</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(creditLimits.reduce((sum, cl) => sum + cl.total_credit_used, 0))}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search farmers..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="w-full md:w-48">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="high_credit">High Credit (&gt;50k)</SelectItem>
                    <SelectItem value="low_credit">Low Credit (&lt;10k)</SelectItem>
                    <SelectItem value="no_credit">No Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Farmers Table */}
            <Card>
              <CardHeader>
                <CardTitle>Farmer Credit Profiles</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Farmer</TableHead>
                      <TableHead>Credit Limit</TableHead>
                      <TableHead>Available Credit</TableHead>
                      <TableHead>Credit Used</TableHead>
                      <TableHead>Pending Payments</TableHead>
                      <TableHead>Status</TableHead>

                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFarmers.map((farmer) => (
                      <TableRow key={farmer.farmer_id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{farmer.farmer_name}</div>
                            <div className="text-sm text-gray-500">{farmer.farmer_phone}</div>
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(farmer.credit_limit || 0)}</TableCell>
                        <TableCell>{formatCurrency(farmer.available_credit || 0)}</TableCell>
                        <TableCell>{formatCurrency(farmer.credit_used || 0)}</TableCell>
                        <TableCell>{formatCurrency(farmer.pending_payments || 0)}</TableCell>
                        <TableCell>
                          <StatusBadge
                            status="active"
                            type="default"
                          />
                        </TableCell>

                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        ) : (
          <CreditRequestManagement />
        )}
      </div>
    </div>
  );
};

export default CreditManagement;