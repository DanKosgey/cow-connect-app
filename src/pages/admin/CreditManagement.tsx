import { useState, useEffect } from "react";
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
import { useToast } from "@/hooks/useToast";

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

interface CreditLimit {
  id: string;
  farmer_id: string;
  credit_limit_percentage: number;
  max_credit_amount: number;
  current_credit_balance: number;
  total_credit_used: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  farmers: {
    profiles: {
      full_name: string;
      phone: string;
    };
  };
}

const CreditManagement = () => {
  const [loading, setLoading] = useState(true);
  const [farmers, setFarmers] = useState<FarmerCreditSummary[]>([]);
  const [creditLimits, setCreditLimits] = useState<CreditLimit[]>([]);
  const [filteredFarmers, setFilteredFarmers] = useState<FarmerCreditSummary[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
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

        // Get all credit limits
        const { data: creditLimitsData, error: creditLimitsError } = await supabase
          .from('farmer_credit_limits')
          .select(`
            *,
            farmers!inner(
              profiles:user_id (full_name, phone)
            )
          `)
          .eq('is_active', true);

        if (creditLimitsError) throw creditLimitsError;

        setCreditLimits(creditLimitsData as CreditLimit[]);

        // For each farmer, calculate credit information
        const farmerSummaries: FarmerCreditSummary[] = [];
        
        for (const farmer of farmersData || []) {
          try {
            // Get pending payments
            const { data: pendingCollections, error: collectionsError } = await supabase
              .from('collections')
              .select('total_amount')
              .eq('farmer_id', farmer.id)
              .neq('status', 'Paid');

            if (collectionsError) {
              console.warn(`Error fetching collections for farmer ${farmer.id}:`, collectionsError);
              continue;
            }

            const pendingPayments = pendingCollections?.reduce((sum, collection) => 
              sum + (collection.total_amount || 0), 0) || 0;

            // Get credit limit for this farmer
            const creditLimit = creditLimitsData?.find((cl: any) => cl.farmer_id === farmer.id);
            
            let creditLimitAmount = 0;
            let availableCredit = 0;
            let creditUsed = 0;
            let creditPercentage = 0;

            if (creditLimit) {
              creditLimitAmount = creditLimit.max_credit_amount;
              availableCredit = creditLimit.current_credit_balance;
              creditUsed = creditLimit.total_credit_used;
              creditPercentage = creditLimit.credit_limit_percentage;
            } else {
              // Calculate default credit limit (70% of pending payments, max 100,000)
              creditLimitAmount = Math.min(pendingPayments * 0.7, 100000);
              availableCredit = 0;
              creditUsed = 0;
              creditPercentage = 70;
            }

            farmerSummaries.push({
              farmer_id: farmer.id,
              farmer_name: farmer.profiles?.full_name || 'Unknown Farmer',
              farmer_phone: farmer.profiles?.phone || 'No phone',
              credit_limit: creditLimitAmount,
              available_credit: availableCredit,
              credit_used: creditUsed,
              pending_payments: pendingPayments,
              credit_percentage: creditPercentage
            });
          } catch (err) {
            console.warn(`Error processing farmer ${farmer.id}:`, err);
          }
        }

        setFarmers(farmerSummaries);
        setFilteredFarmers(farmerSummaries);
      } catch (err) {
        console.error("Error fetching credit management data:", err);
        setError("Failed to load credit management data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
        filtered = filtered.filter(farmer => farmer.available_credit > 50000);
      } else if (filterStatus === "low_credit") {
        filtered = filtered.filter(farmer => farmer.available_credit < 10000);
      } else if (filterStatus === "no_credit") {
        filtered = filtered.filter(farmer => farmer.available_credit === 0);
      }
    }

    setFilteredFarmers(filtered);
  }, [searchTerm, filterStatus, farmers]);

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
      window.location.reload();
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Credit Management</h1>
          <p className="text-gray-600 mt-2">Manage farmer credit limits and monitor credit usage</p>
        </div>

        {/* Summary Cards */}
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

          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Total Credit Used</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(
                  creditLimits.reduce((sum, cl) => sum + (cl.total_credit_used || 0), 0)
                )}
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Available Credit</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(
                  creditLimits.reduce((sum, cl) => sum + (cl.current_credit_balance || 0), 0)
                )}
              </p>
            </CardContent>
          </Card>
        </div>

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
                    <TableHead>Credit %</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFarmers.map((farmer) => {
                    const hasCredit = farmer.available_credit > 0;
                    const creditUtilization = farmer.credit_limit > 0 
                      ? (farmer.credit_used / farmer.credit_limit) * 100 
                      : 0;
                    
                    return (
                      <TableRow key={farmer.farmer_id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{farmer.farmer_name}</TableCell>
                        <TableCell>{farmer.farmer_phone}</TableCell>
                        <TableCell>{formatCurrency(farmer.pending_payments)}</TableCell>
                        <TableCell>{formatCurrency(farmer.credit_limit)}</TableCell>
                        <TableCell className={farmer.available_credit > 0 ? "text-green-600 font-semibold" : ""}>
                          {formatCurrency(farmer.available_credit)}
                        </TableCell>
                        <TableCell>{formatCurrency(farmer.credit_used)}</TableCell>
                        <TableCell>{farmer.credit_percentage}%</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            hasCredit 
                              ? creditUtilization > 80 
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
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAdjustCreditLimit(farmer.farmer_id, farmer.farmer_name)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            {!hasCredit && farmer.pending_payments > 0 && (
                              <Button
                                size="sm"
                                onClick={() => handleGrantCredit(farmer.farmer_id, farmer.farmer_name)}
                              >
                                <CreditCard className="w-4 h-4 mr-1" />
                                Grant Credit
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
      </div>
    </div>
  );
};

export default CreditManagement;