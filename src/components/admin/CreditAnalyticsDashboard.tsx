import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { 
  CreditCard,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  BarChart3
} from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComprehensiveCreditAnalyticsService } from "@/services/comprehensive-credit-analytics-service";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CreditAnalyticsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);
  const [timeRange, setTimeRange] = useState("30");
  const navigate = useNavigate();

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const report = await ComprehensiveCreditAnalyticsService.getCreditAnalyticsReport();
      
      // Handle case when no data exists
      if (!report) {
        setAnalytics(null);
        return;
      }
      
      setAnalytics(report);
    } catch (err) {
      console.error("Error fetching credit analytics:", err);
      // Set null on error to prevent UI issues
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics, timeRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading credit analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Credit Analytics Dashboard</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Time Range:</span>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Total Credit Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics ? (
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(analytics.totalCreditOutstanding || 0)}
              </p>
            ) : (
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(0)}</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Credit Issued This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics ? (
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(analytics.totalCreditIssuedThisMonth || 0)}
              </p>
            ) : (
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(0)}</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Active Credit Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics ? (
              <p className="text-2xl font-bold text-gray-900">
                {analytics.activeCreditUsers || 0}
              </p>
            ) : (
              <p className="text-2xl font-bold text-gray-900">0</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Avg. Utilization Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics ? (
              <p className="text-2xl font-bold text-gray-900">
                {(analytics.averageCreditUtilizationRate || 0).toFixed(1)}%
              </p>
            ) : (
              <p className="text-2xl font-bold text-gray-900">0%</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Farmers at Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics ? (
              <>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics.farmersAtRiskCount || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">&gt;85% utilization</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-gray-900">0</p>
                <p className="text-xs text-gray-500 mt-1">&gt;85% utilization</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Approaching Settlement
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics ? (
              <>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics.farmersApproachingSettlement || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">Within 3 days</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-gray-900">0</p>
                <p className="text-xs text-gray-500 mt-1">Within 3 days</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-indigo-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Pending Approvals
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics ? (
              <p className="text-2xl font-bold text-gray-900">
                {analytics.pendingCreditApprovals || 0}
              </p>
            ) : (
              <p className="text-2xl font-bold text-gray-900">0</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-gray-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Failed Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics ? (
              <>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics.failedTransactionsThisMonth || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">This month</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-gray-900">0</p>
                <p className="text-xs text-gray-500 mt-1">This month</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4">
        <Button 
          variant="outline" 
          onClick={() => navigate('/admin/credit-reports')}
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          Generate Detailed Report
        </Button>
        <Button 
          variant="outline" 
          onClick={() => navigate('/admin/credit-risk-assessment')}
        >
          <Users className="w-4 h-4 mr-2" />
          View Risk Assessment
        </Button>
        <Button 
          variant="outline" 
          onClick={() => navigate('/admin/credit-settings')}
        >
          <CreditCard className="w-4 h-4 mr-2" />
          Configure Credit Settings
        </Button>
      </div>
    </div>
  );
};

export default CreditAnalyticsDashboard;