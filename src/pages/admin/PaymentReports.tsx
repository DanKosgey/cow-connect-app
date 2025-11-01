import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Calendar,
  Download,
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Droplet,
  CheckCircle,
  Clock
} from '@/utils/iconImports';
import useToastNotifications from '@/hooks/useToastNotifications';
import { formatCurrency } from '@/utils/formatters';
import RefreshButton from '@/components/ui/RefreshButton';
import { usePaymentReportsData } from '@/hooks/usePaymentReportsData';

interface PaymentReport {
  date: string;
  total_collections: number;
  total_liters: number;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  farmers_count: number;
}

interface FarmerReport {
  farmer_id: string;
  farmer_name: string;
  total_collections: number;
  total_liters: number;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  payment_percentage: number;
}

const PaymentReports = () => {
  const toast = useToastNotifications();
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const { data: reportsData, isLoading, isError, error, refetch } = usePaymentReportsData(dateRange);
  
  const dailyReports = reportsData?.dailyReports || [];
  const farmerReports = reportsData?.farmerReports || [];
  const summary = reportsData?.summary || {
    total_collections: 0,
    total_liters: 0,
    total_amount: 0,
    paid_amount: 0,
    pending_amount: 0,
    farmers_count: 0
  };
  const loading = isLoading;

  useEffect(() => {
    if (error) {
      console.error('Error fetching reports:', error);
      toast.error('Error', 'Failed to fetch payment reports');
    }
  }, [error, toast]);

  const exportReport = async (type: 'daily' | 'farmer') => {
    try {
      // In a real implementation, you would generate a CSV file
      // For now, we'll just show a success message
      toast.success('Success', `${type === 'daily' ? 'Daily' : 'Farmer'} report export initiated.`);
    } catch (error: any) {
      console.error('Error exporting report:', error);
      toast.error('Error', 'Failed to export report: ' + (error.message || 'Unknown error'));
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 font-medium">Generating payment reports...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Payment Reports</h1>
              <p className="text-gray-600">Detailed analytics and reports on farmer payments</p>
            </div>
            <div className="mt-4 md:mt-0">
              <RefreshButton 
                isRefreshing={loading} 
                onRefresh={refetch} 
                className="bg-white border-gray-300 hover:bg-gray-50 rounded-lg shadow-sm"
              />
            </div>
          </div>

          {/* Date Range Filter */}
          <Card className="mb-8 bg-white rounded-xl shadow-lg">
            <CardHeader>
              <CardTitle>Report Period</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({...prev, start: e.target.value}))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <Input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({...prev, end: e.target.value}))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={() => refetch()}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                  >
                    Generate Report
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-blue-500">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Farmers</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.farmers_count}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-green-500">
              <div className="flex items-center">
                <BarChart3 className="w-8 h-8 text-green-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Collections</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.total_collections}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-yellow-500">
              <div className="flex items-center">
                <Droplet className="w-8 h-8 text-yellow-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Liters</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.total_liters.toFixed(2)}L</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-purple-500">
              <div className="flex items-center">
                <DollarSign className="w-8 h-8 text-purple-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.total_amount)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-green-500">
              <div className="flex items-center">
                <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Paid</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.paid_amount)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-yellow-500">
              <div className="flex items-center">
                <Clock className="w-8 h-8 text-yellow-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.pending_amount)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Daily Reports */}
          <Card className="mb-8 bg-white rounded-xl shadow-lg">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Daily Payment Report
                </CardTitle>
                <Button
                  onClick={() => exportReport('daily')}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Collections</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Liters</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pending</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Farmers</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {dailyReports.map((report, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {new Date(report.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-gray-900">{report.total_collections}</td>
                        <td className="px-6 py-4 text-gray-900">{report.total_liters.toFixed(2)}L</td>
                        <td className="px-6 py-4 font-semibold text-gray-900">
                          {formatCurrency(report.total_amount)}
                        </td>
                        <td className="px-6 py-4 text-green-600">
                          {formatCurrency(report.paid_amount)}
                        </td>
                        <td className="px-6 py-4 text-yellow-600">
                          {formatCurrency(report.pending_amount)}
                        </td>
                        <td className="px-6 py-4 text-gray-900">-</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {dailyReports.length === 0 && (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No daily reports found for the selected period</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Farmer Reports */}
          <Card className="bg-white rounded-xl shadow-lg">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Farmer Payment Report
                </CardTitle>
                <Button
                  onClick={() => exportReport('farmer')}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Farmer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Collections</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Liters</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pending</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {farmerReports.map((report, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {report.farmer_name}
                        </td>
                        <td className="px-6 py-4 text-gray-900">{report.total_collections}</td>
                        <td className="px-6 py-4 text-gray-900">{report.total_liters.toFixed(2)}L</td>
                        <td className="px-6 py-4 font-semibold text-gray-900">
                          {formatCurrency(report.total_amount)}
                        </td>
                        <td className="px-6 py-4 text-green-600">
                          {formatCurrency(report.paid_amount)}
                        </td>
                        <td className="px-6 py-4 text-yellow-600">
                          {formatCurrency(report.pending_amount)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`font-semibold ${
                            report.payment_percentage >= 80 
                              ? 'text-green-600' 
                              : report.payment_percentage >= 50 
                              ? 'text-yellow-600' 
                              : 'text-red-600'
                          }`}>
                            {report.payment_percentage.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {farmerReports.length === 0 && (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No farmer reports found for the selected period</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PaymentReports;