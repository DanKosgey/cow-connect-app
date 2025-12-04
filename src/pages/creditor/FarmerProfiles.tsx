import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { 
  User, 
  CreditCard, 
  TrendingUp, 
  Search, 
  Filter,
  Eye,
  AlertTriangle,
  Edit,
  Save,
  X,
  SortAsc,
  SortDesc
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
} from '@/components/ui/dialog';
import AdvancedFilter from '@/components/AdvancedFilter';
import SortControl from '@/components/SortControl';
import PaginationControl from '@/components/PaginationControl';

interface FarmerProfile {
  id: string;
  farmer_id: string;
  farmer_name: string;
  farmer_phone: string;
  credit_limit_percentage: number;
  max_credit_amount: number;
  current_credit_balance: number;
  total_credit_used: number;
  utilization_percentage: number;
  last_updated: string;
  is_frozen: boolean; // Added this field
}

const FarmerProfiles = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [farmers, setFarmers] = useState<FarmerProfile[]>([]);
  const [filteredFarmers, setFilteredFarmers] = useState<FarmerProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCreditTier, setFilterCreditTier] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "credit" | "utilization">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [error, setError] = useState<string | null>(null);
  const [editingFarmerId, setEditingFarmerId] = useState<string | null>(null);
  const [editingCreditData, setEditingCreditData] = useState({
    credit_limit_percentage: 70,
    max_credit_amount: 100000
  });
  // Add new state for advanced filters and pagination
  const [advancedFilters, setAdvancedFilters] = useState<Record<string, any>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const { toast } = useToast();

  useEffect(() => {
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
      if (filterStatus === "active") {
        filtered = filtered.filter(farmer => !farmer.is_frozen); // Changed to is_frozen
      } else if (filterStatus === "inactive") {
        filtered = filtered.filter(farmer => farmer.is_frozen); // Changed to is_frozen
      }
    }

    if (filterCreditTier !== "all") {
      if (filterCreditTier === "high") {
        filtered = filtered.filter(farmer => farmer.utilization_percentage > 80);
      } else if (filterCreditTier === "medium") {
        filtered = filtered.filter(farmer => 
          farmer.utilization_percentage >= 60 && farmer.utilization_percentage <= 80
        );
      } else if (filterCreditTier === "low") {
        filtered = filtered.filter(farmer => farmer.utilization_percentage < 60);
      }
    }

    // Apply advanced filters
    if (advancedFilters.status && advancedFilters.status !== "all") {
      if (advancedFilters.status === "active") {
        filtered = filtered.filter(farmer => !farmer.is_frozen); // Changed to is_frozen
      } else if (advancedFilters.status === "inactive") {
        filtered = filtered.filter(farmer => farmer.is_frozen); // Changed to is_frozen
      }
    }

    if (advancedFilters.utilizationHigh) {
      filtered = filtered.filter(farmer => farmer.utilization_percentage > 80);
    }

    if (advancedFilters.utilizationMedium) {
      filtered = filtered.filter(farmer => 
        farmer.utilization_percentage >= 60 && farmer.utilization_percentage <= 80
      );
    }

    if (advancedFilters.utilizationLow) {
      filtered = filtered.filter(farmer => farmer.utilization_percentage < 60);
    }

    if (advancedFilters.minCreditLimit !== undefined) {
      filtered = filtered.filter(farmer => farmer.max_credit_amount >= advancedFilters.minCreditLimit);
    }

    if (advancedFilters.maxCreditLimit !== undefined) {
      filtered = filtered.filter(farmer => farmer.max_credit_amount <= advancedFilters.maxCreditLimit);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case "name":
          comparison = a.farmer_name.localeCompare(b.farmer_name);
          break;
        case "credit":
          comparison = b.max_credit_amount - a.max_credit_amount;
          break;
        case "utilization":
          comparison = b.utilization_percentage - a.utilization_percentage;
          break;
      }
      
      return sortOrder === "asc" ? comparison : -comparison;
    });

    // Apply pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginated = filtered.slice(startIndex, endIndex);
    
    setFilteredFarmers(paginated);
  }, [searchTerm, filterStatus, filterCreditTier, sortBy, sortOrder, farmers, advancedFilters, currentPage, itemsPerPage]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Get all credit profiles with farmer information
      const { data: creditProfiles, error: profilesError } = await supabase
        .from('farmer_credit_profiles')
        .select(`
          id,
          farmer_id,
          credit_limit_percentage,
          max_credit_amount,
          current_credit_balance,
          total_credit_used,
          is_frozen,
          updated_at,
          farmers!farmer_credit_profiles_farmer_id_fkey (
            id,
            full_name,
            phone_number
          )
        `)
        .eq('is_frozen', false);

      if (profilesError) throw profilesError;

      // Handle case when no credit profiles exist
      if (!creditProfiles || creditProfiles.length === 0) {
        setFarmers([]);
        setFilteredFarmers([]);
        return;
      }

      // Process credit profiles with farmer information
      const farmerProfileData: FarmerProfile[] = [];
      for (const profile of creditProfiles || []) {
        try {
          // Calculate utilization percentage
          const utilization = profile.max_credit_amount > 0 
            ? ((profile.max_credit_amount - profile.current_credit_balance) / profile.max_credit_amount) * 100 
            : 0;

          farmerProfileData.push({
            id: profile.id,
            farmer_id: profile.farmer_id,
            farmer_name: profile.farmers?.full_name || 'Unknown Farmer',
            farmer_phone: profile.farmers?.phone_number || 'No phone',
            credit_limit_percentage: profile.credit_limit_percentage,
            max_credit_amount: profile.max_credit_amount,
            current_credit_balance: profile.current_credit_balance,
            total_credit_used: profile.total_credit_used,
            utilization_percentage: Number(utilization.toFixed(1)),
            last_updated: profile.updated_at,
            is_frozen: profile.is_frozen
          });
        } catch (err) {
          console.warn(`Error processing credit profile ${profile.id}:`, err);
        }
      }

      setFarmers(farmerProfileData);
      setFilteredFarmers(farmerProfileData);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching farmer profiles:', err);
      setError(err.message || 'Failed to load farmer profiles');
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tier: string) => {
    switch(tier) {
      case 'premium': return 'bg-purple-100 text-purple-800';
      case 'established': return 'bg-blue-100 text-blue-800';
      case 'new': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const handleEditCreditLimit = (farmer: FarmerProfile) => {
    setEditingFarmerId(farmer.farmer_id);
    setEditingCreditData({
      credit_limit_percentage: farmer.credit_limit_percentage,
      max_credit_amount: farmer.max_credit_amount
    });
  };

  const handleSaveCreditLimit = async () => {
    if (!editingFarmerId) return;
    
    try {
      await CreditService.adjustCreditLimit(
        editingFarmerId,
        editingCreditData.credit_limit_percentage,
        editingCreditData.max_credit_amount
      );
      
      toast({
        title: "Success",
        description: "Credit limit updated successfully",
      });
      
      setEditingFarmerId(null);
      fetchData(); // Refresh the data
    } catch (error) {
      console.error("Error updating credit limit:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update credit limit",
        variant: "destructive",
      });
    }
  };

  const handleGrantCredit = async (farmerId: string, farmerName: string) => {
    try {
      await CreditService.grantCreditToFarmer(farmerId);
      
      toast({
        title: "Success",
        description: `Credit granted to ${farmerName} successfully`,
      });
      
      fetchData(); // Refresh the data
    } catch (error) {
      console.error("Error granting credit:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to grant credit",
        variant: "destructive",
      });
    }
  };

  const handleSort = (column: "name" | "credit" | "utilization") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading farmer profiles...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <h3 className="text-lg font-semibold text-red-900">Error</h3>
          </div>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  // Calculate total pages for pagination
  const totalItems = farmers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Farmer Credit Profiles</h1>
          <p className="text-gray-600 mt-2">View and manage farmer credit profiles</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by farmer name or phone..."
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
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            
            <Select 
              value={filterCreditTier} 
              onValueChange={(value) => {
                setFilterCreditTier(value);
                setCurrentPage(1); // Reset to first page when filtering
              }}
            >
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Credit tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="high">High (&gt;80%)</SelectItem>
                <SelectItem value="medium">Medium (60-80%)</SelectItem>
                <SelectItem value="low">Low (&lt;60%)</SelectItem>
              </SelectContent>
            </Select>
            
            <AdvancedFilter 
              onFilterChange={(filters) => {
                setAdvancedFilters(filters);
                setCurrentPage(1); // Reset to first page when applying filters
              }}
              filterType="farmer"
              currentFilters={advancedFilters}
            />
          </div>
          
          <SortControl
            options={[
              { id: "name", label: "Name" },
              { id: "credit", label: "Credit Limit" },
              { id: "utilization", label: "Utilization" }
            ]}
            currentSort={sortBy}
            currentOrder={sortOrder}
            onSortChange={(newSortBy, newSortOrder) => {
              setSortBy(newSortBy as "name" | "credit" | "utilization");
              setSortOrder(newSortOrder);
            }}
          />
        </div>

        {/* Farmer Profiles Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Farmer Profiles
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredFarmers.length === 0 ? (
              <div className="text-center py-12">
                <User className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No farmer profiles found</h3>
                <p className="text-gray-500">
                  {searchTerm || filterStatus !== "all" || filterCreditTier !== "all"
                    ? "No farmer profiles match your search criteria"
                    : "Farmer profiles will appear here once they are created"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer" onClick={() => handleSort("name")}>
                        <div className="flex items-center">
                          Farmer
                          {sortBy === "name" && (
                            sortOrder === "asc" ? <SortAsc className="ml-1 h-4 w-4" /> : <SortDesc className="ml-1 h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead>Credit Tier</TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort("credit")}>
                        <div className="flex items-center">
                          Credit Limit
                          {sortBy === "credit" && (
                            sortOrder === "asc" ? <SortAsc className="ml-1 h-4 w-4" /> : <SortDesc className="ml-1 h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead>Available Credit</TableHead>
                      <TableHead className="cursor-pointer" onClick={() => handleSort("utilization")}>
                        <div className="flex items-center">
                          Utilization
                          {sortBy === "utilization" && (
                            sortOrder === "asc" ? <SortAsc className="ml-1 h-4 w-4" /> : <SortDesc className="ml-1 h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFarmers.map((farmer) => (
                      <TableRow key={farmer.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{farmer.farmer_name}</div>
                            <div className="text-sm text-gray-500">{farmer.farmer_phone}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{farmer.credit_limit_percentage}%</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{formatCurrency(farmer.max_credit_amount)}</div>
                          <div className="text-sm text-gray-500">{farmer.credit_limit_percentage}% of pending payments</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{formatCurrency(farmer.current_credit_balance)}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  farmer.utilization_percentage > 80 ? 'bg-red-600' : 
                                  farmer.utilization_percentage > 60 ? 'bg-yellow-500' : 'bg-green-600'
                                }`}
                                style={{ width: `${Math.min(farmer.utilization_percentage, 100)}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium">{farmer.utilization_percentage}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${!farmer.is_frozen ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {!farmer.is_frozen ? 'Active' : 'Inactive'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => navigate(`/creditor/farmer-profiles/${farmer.farmer_id}`)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                            {farmer.current_credit_balance <= 0 ? (
                              <Button 
                                variant="default" 
                                size="sm"
                                onClick={() => handleGrantCredit(farmer.farmer_id, farmer.farmer_name)}
                              >
                                <CreditCard className="w-4 h-4 mr-1" />
                                Grant Credit
                              </Button>
                            ) : (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleEditCreditLimit(farmer)}
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                Adjust
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        {/* Credit Limit Adjustment Dialog */}
        <Dialog open={!!editingFarmerId} onOpenChange={(open) => {
          if (!open) setEditingFarmerId(null);
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adjust Credit Limit</DialogTitle>
              <DialogDescription>
                Update credit limit settings for this farmer.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div>
                <label className="text-sm font-medium">Credit Limit Percentage</label>
                <Input
                  type="number"
                  value={editingCreditData.credit_limit_percentage}
                  onChange={(e) => setEditingCreditData({
                    ...editingCreditData,
                    credit_limit_percentage: parseFloat(e.target.value) || 0
                  })}
                  min="0"
                  max="100"
                  step="0.01"
                />
                <p className="text-xs text-muted-foreground mt-1">Percentage of pending payments to use as credit limit</p>
              </div>
              <div>
                <label className="text-sm font-medium">Maximum Credit Amount</label>
                <Input
                  type="number"
                  value={editingCreditData.max_credit_amount}
                  onChange={(e) => setEditingCreditData({
                    ...editingCreditData,
                    max_credit_amount: parseFloat(e.target.value) || 0
                  })}
                  min="0"
                  step="100"
                />
                <p className="text-xs text-muted-foreground mt-1">Maximum credit cap for this farmer</p>
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setEditingFarmerId(null)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveCreditLimit}
              >
                <Save className="w-4 h-4 mr-1" />
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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

export default FarmerProfiles;