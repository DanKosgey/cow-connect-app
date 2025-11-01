import { useState } from "react";
import { useCreditReportsData } from "@/hooks/useCreditReportsData";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";
import { 
  Download, 
  TrendingUp, 
  CreditCard, 
  Users, 
  AlertTriangle,
  CheckCircle,
  DollarSign
} from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CreditReports = () => {
  const { 
    useCreditAnalytics,
    useCreditTrends,
    useFarmerCreditReports,
    useCreditCategoryReports,
    useCreditRiskAssessment
  } = useCreditReportsData();
  
  // Get credit analytics data with caching
  const { data: analytics, isLoading: analyticsLoading } = useCreditAnalytics();
  
  // Get credit trends data with caching
  const { data: trends = [], isLoading: trendsLoading } = useCreditTrends(30);
  
  // Get farmer credit reports data with caching
  const { data: farmerReports = [], isLoading: farmerReportsLoading } = useFarmerCreditReports();
  
  // Get credit category reports data with caching
  const { data: categoryReports = [], isLoading: categoryReportsLoading } = useCreditCategoryReports();
  
  // Get credit risk assessment data with caching
  const { data: riskAssessment, isLoading: riskAssessmentLoading } = useCreditRiskAssessment();
  
  const loading = analyticsLoading || trendsLoading || farmerReportsLoading || categoryReportsLoading || riskAssessmentLoading;
  const [error, setError] = useState<string | null>(null);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading credit reports...</p>
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

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Credit Reports & Analytics</h1>
              <p className="text-gray-600 mt-2">Comprehensive insights into farmer credit usage and agrovet purchases</p>
            </div>
            <Button>
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Total Credit Limit</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(analytics?.totalCreditLimit || 0)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Available Credit</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(analytics?.totalAvailableCredit || 0)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Credit Used</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(analytics?.totalCreditUsed || 0)}
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Utilization Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-gray-900">
                {analytics?.creditUtilizationRate?.toFixed(1) || 0}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Credit Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Credit Trends (30 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="totalCreditLimit" 
                      stroke="#8884d8" 
                      name="Total Credit Limit" 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="totalAvailableCredit" 
                      stroke="#82ca9d" 
                      name="Available Credit" 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="totalCreditUsed" 
                      stroke="#ff7300" 
                      name="Credit Used" 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Risk Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Credit Risk Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={riskAssessment?.riskDistribution || []}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="risk_level"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {riskAssessment?.riskDistribution?.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Analysis */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Credit Usage by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryReports}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Bar dataKey="total_amount" fill="#8884d8" name="Total Amount" />
                  <Bar dataKey="credit_amount" fill="#82ca9d" name="Credit Amount" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Farmer Credit Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Farmer Credit Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Farmer</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Credit Limit</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Available Credit</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Credit Used</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Utilization</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {farmerReports.slice(0, 10).map((report) => (
                    <tr key={report.farmer_id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium">{report.farmer_name}</div>
                        <div className="text-sm text-gray-500">{report.farmer_phone}</div>
                      </td>
                      <td className="py-3 px-4">{formatCurrency(report.credit_limit)}</td>
                      <td className="py-3 px-4">{formatCurrency(report.available_credit)}</td>
                      <td className="py-3 px-4">{formatCurrency(report.credit_used)}</td>
                      <td className="py-3 px-4">{report.credit_utilization.toFixed(1)}%</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          report.credit_status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : report.credit_status === 'over_limit' 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-gray-100 text-gray-800'
                        }`}>
                          {report.credit_status === 'active' ? (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Active
                            </>
                          ) : report.credit_status === 'over_limit' ? (
                            <>
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Over Limit
                            </>
                          ) : (
                            'Inactive'
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreditReports;