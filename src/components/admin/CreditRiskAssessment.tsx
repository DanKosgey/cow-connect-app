import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  PieChart,
  Shield
} from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface FarmerRiskProfile {
  id: string;
  farmer_id: string;
  farmer_name: string;
  farmer_phone: string;
  credit_tier: string;
  credit_limit: number;
  available_credit: number;
  credit_used: number;
  utilization_percentage: number;
  pending_deductions: number;
  risk_level: 'low' | 'medium' | 'high';
  risk_score: number;
  last_activity: string;
  days_overdue: number;
  default_history: number;
}

const CreditRiskAssessment = () => {
  const [loading, setLoading] = useState(true);
  const [riskProfiles, setRiskProfiles] = useState<FarmerRiskProfile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<FarmerRiskProfile[]>([]);
  const [filterRiskLevel, setFilterRiskLevel] = useState("all");
  const [filterCreditTier, setFilterCreditTier] = useState("all");
  const [sortBy, setSortBy] = useState("risk_score");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    const fetchRiskProfiles = async () => {
      try {
        setLoading(true);
        
        // Get all farmers with their credit profiles
        const { data: farmers, error: farmersError } = await supabase
          .from('farmers')
          .select(`
            id,
            profiles:user_id (full_name, phone),
            farmer_credit_profiles(*)
          `);

        if (farmersError) throw farmersError;

        // Get collections data for pending payments
        const { data: collections, error: collectionsError } = await supabase
          .from('collections')
          .select('farmer_id, total_amount, status');

        if (collectionsError) throw collectionsError;

        // Process data to create risk profiles
        const profiles: FarmerRiskProfile[] = [];
        
        for (const farmer of farmers || []) {
          try {
            const creditProfile = farmer.farmer_credit_profiles?.[0] || null;
            
            if (!creditProfile) continue;

            // Calculate pending payments
            const farmerCollections = collections?.filter(c => c.farmer_id === farmer.id && c.status !== 'Paid') || [];
            const pendingPayments = farmerCollections.reduce((sum, collection) => 
              sum + (collection.total_amount || 0), 0);

            // Calculate utilization
            const utilization = creditProfile.max_credit_amount > 0 ?
              ((creditProfile.max_credit_amount - creditProfile.current_credit_balance) / creditProfile.max_credit_amount) * 100 : 0;

            // Calculate risk score (simplified algorithm)
            let riskScore = 0;
            let riskLevel: 'low' | 'medium' | 'high' = 'low';
            let daysOverdue = 0;
            let defaultHistory = 0;

            // Factor 1: Credit utilization (40% weight)
            if (utilization > 90) {
              riskScore += 40;
              riskLevel = 'high';
            } else if (utilization > 75) {
              riskScore += 25;
              if (riskLevel !== 'high') riskLevel = 'medium';
            } else if (utilization > 50) {
              riskScore += 10;
            }

            // Factor 2: Pending payments (30% weight)
            if (pendingPayments > creditProfile.max_credit_amount * 0.5) {
              riskScore += 30;
              riskLevel = riskLevel === 'low' ? 'medium' : 'high';
            } else if (pendingPayments > 0) {
              riskScore += 15;
              if (riskLevel === 'low') riskLevel = 'medium';
            }

            // Factor 3: Credit tier (20% weight)
            if (creditProfile.credit_tier === 'new') {
              riskScore += 20;
              if (riskLevel === 'low') riskLevel = 'medium';
            } else if (creditProfile.credit_tier === 'established') {
              riskScore += 10;
            }

            // Factor 4: Days overdue (10% weight)
            if (creditProfile.next_settlement_date) {
              const settlementDate = new Date(creditProfile.next_settlement_date);
              const today = new Date();
              daysOverdue = Math.floor((today.getTime() - settlementDate.getTime()) / (1000 * 60 * 60 * 24));
              
              if (daysOverdue > 30) {
                riskScore += 10;
                riskLevel = riskLevel === 'low' ? 'medium' : 'high';
                defaultHistory = 2; // High default risk
              } else if (daysOverdue > 15) {
                riskScore += 5;
                if (riskLevel === 'low') riskLevel = 'medium';
                defaultHistory = 1; // Medium default risk
              }
            }

            profiles.push({
              id: creditProfile.id,
              farmer_id: farmer.id,
              farmer_name: farmer.profiles?.full_name || 'Unknown Farmer',
              farmer_phone: farmer.profiles?.phone || 'No phone',
              credit_tier: creditProfile.credit_tier,
              credit_limit: creditProfile.max_credit_amount,
              available_credit: creditProfile.current_credit_balance,
              credit_used: creditProfile.total_credit_used,
              utilization_percentage: utilization,
              pending_deductions: creditProfile.pending_deductions,
              risk_level: riskLevel,
              risk_score: Math.min(riskScore, 100),
              last_activity: creditProfile.updated_at,
              days_overdue: daysOverdue,
              default_history: defaultHistory
            });
          } catch (err) {
            console.warn(`Error processing farmer ${farmer.id}:`, err);
          }
        }

        setRiskProfiles(profiles);
        setFilteredProfiles(profiles);
      } catch (err) {
        console.error("Error fetching risk profiles:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRiskProfiles();
  }, []);

  useEffect(() => {
    let filtered = [...riskProfiles];

    // Apply risk level filter
    if (filterRiskLevel !== "all") {
      filtered = filtered.filter(profile => profile.risk_level === filterRiskLevel);
    }

    // Apply credit tier filter
    if (filterCreditTier !== "all") {
      filtered = filtered.filter(profile => profile.credit_tier === filterCreditTier);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case "risk_score":
          aValue = a.risk_score;
          bValue = b.risk_score;
          break;
        case "utilization":
          aValue = a.utilization_percentage;
          bValue = b.utilization_percentage;
          break;
        case "name":
          aValue = a.farmer_name.toLowerCase();
          bValue = b.farmer_name.toLowerCase();
          break;
        default:
          return 0;
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredProfiles(filtered);
  }, [riskProfiles, filterRiskLevel, filterCreditTier, sortBy, sortOrder]);

  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskLevelIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high': return <AlertTriangle className="w-4 h-4" />;
      case 'medium': return <TrendingUp className="w-4 h-4" />;
      case 'low': return <Shield className="w-4 h-4" />;
      default: return <Shield className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading risk assessment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Credit Risk Assessment</h1>
        <p className="text-gray-600 mt-2">Analyze farmer credit risk profiles and identify potential defaults</p>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Risk Assessment Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Risk Level</label>
              <Select value={filterRiskLevel} onValueChange={setFilterRiskLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by risk level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Risk Levels</SelectItem>
                  <SelectItem value="high">High Risk</SelectItem>
                  <SelectItem value="medium">Medium Risk</SelectItem>
                  <SelectItem value="low">Low Risk</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Credit Tier</label>
              <Select value={filterCreditTier} onValueChange={setFilterCreditTier}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by credit tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tiers</SelectItem>
                  <SelectItem value="new">New Farmers</SelectItem>
                  <SelectItem value="established">Established Farmers</SelectItem>
                  <SelectItem value="premium">Premium Farmers</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="risk_score">Risk Score</SelectItem>
                  <SelectItem value="utilization">Utilization %</SelectItem>
                  <SelectItem value="name">Farmer Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
              <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Descending</SelectItem>
                  <SelectItem value="asc">Ascending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              High Risk Farmers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">
              {riskProfiles.filter(p => p.risk_level === 'high').length}
            </p>
            <p className="text-xs text-gray-500 mt-1">Require immediate attention</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Medium Risk Farmers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">
              {riskProfiles.filter(p => p.risk_level === 'medium').length}
            </p>
            <p className="text-xs text-gray-500 mt-1">Monitor closely</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Low Risk Farmers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">
              {riskProfiles.filter(p => p.risk_level === 'low').length}
            </p>
            <p className="text-xs text-gray-500 mt-1">Stable credit users</p>
          </CardContent>
        </Card>
      </div>

      {/* Risk Profiles Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Farmer Risk Profiles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Farmer</TableHead>
                  <TableHead>Credit Tier</TableHead>
                  <TableHead>Credit Limit</TableHead>
                  <TableHead>Utilization %</TableHead>
                  <TableHead>Days Overdue</TableHead>
                  <TableHead>Risk Score</TableHead>
                  <TableHead>Risk Level</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProfiles.length > 0 ? (
                  filteredProfiles.map(profile => (
                    <TableRow key={profile.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div>
                          <div className="font-medium text-gray-900">{profile.farmer_name}</div>
                          <div className="text-sm text-gray-500">{profile.farmer_phone}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="capitalize">{profile.credit_tier}</span>
                      </TableCell>
                      <TableCell>{formatCurrency(profile.credit_limit)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                profile.utilization_percentage > 90 ? 'bg-red-500' :
                                profile.utilization_percentage > 75 ? 'bg-yellow-500' :
                                'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(profile.utilization_percentage, 100)}%` }}
                            ></div>
                          </div>
                          <span>{profile.utilization_percentage.toFixed(1)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {profile.days_overdue > 0 ? (
                          <span className="text-red-600 font-medium">{profile.days_overdue} days</span>
                        ) : (
                          <span className="text-green-600">0 days</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                profile.risk_score > 70 ? 'bg-red-500' :
                                profile.risk_score > 40 ? 'bg-yellow-500' :
                                'bg-green-500'
                              }`}
                              style={{ width: `${profile.risk_score}%` }}
                            ></div>
                          </div>
                          <span>{profile.risk_score}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getRiskLevelColor(profile.risk_level)}`}>
                          {getRiskLevelIcon(profile.risk_level)}
                          {profile.risk_level.charAt(0).toUpperCase() + profile.risk_level.slice(1)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>No risk profiles found matching your criteria</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          {filteredProfiles.length > 0 && (
            <div className="mt-4 text-sm text-gray-500">
              Showing {filteredProfiles.length} of {riskProfiles.length} farmer profiles
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4">
        <Button variant="outline">
          <PieChart className="w-4 h-4 mr-2" />
          Export Risk Report
        </Button>
        <Button variant="outline">
          <AlertTriangle className="w-4 h-4 mr-2" />
          Generate Action Plan
        </Button>
      </div>
    </div>
  );
};

export default CreditRiskAssessment;