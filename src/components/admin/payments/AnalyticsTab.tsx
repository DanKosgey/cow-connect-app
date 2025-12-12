import React from 'react';
import { 
  BarChart3,
  PieChart,
  CheckCircle,
  Clock,
  AlertCircle,
  DollarSign,
  Users
} from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Label
} from 'recharts';

interface AnalyticsTabProps {
  activeAnalyticsTab: string;
  setActiveAnalyticsTab: (tab: string) => void;
  analytics: any;
  creditAnalytics: any;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const AnalyticsTab: React.FC<AnalyticsTabProps> = ({
  activeAnalyticsTab,
  setActiveAnalyticsTab,
  analytics,
  creditAnalytics
}) => {
  return (
    <div className="space-y-6">
      {/* Mini tab navigation */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex border-b border-gray-200 mb-6">
          <button
            className={`px-4 py-2 font-medium text-sm rounded-t-lg ${
              activeAnalyticsTab === 'credit' 
                ? 'border-b-2 border-indigo-600 text-indigo-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveAnalyticsTab('credit')}
          >
            Credit Analytics
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm rounded-t-lg ${
              activeAnalyticsTab === 'farmers-payments' 
                ? 'border-b-2 border-indigo-600 text-indigo-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveAnalyticsTab('farmers-payments')}
          >
            Farmers Payments
          </button>
        </div>

        {/* Credit Analytics Content */}
        {activeAnalyticsTab === 'credit' && (
          <div className="space-y-6">
            {/* Credit Utilization Overview */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Credit Utilization</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Credit Distribution Pie Chart */}
                <div className="md:col-span-2">
                  <h4 className="font-semibold text-gray-800 mb-4">Credit Distribution</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={creditAnalytics.creditDistribution.slice(0, 5)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="creditUsed"
                          nameKey="name"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {creditAnalytics.creditDistribution.slice(0, 5).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                        <Legend />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                {/* Credit Metrics */}
                <div className="space-y-4">
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-purple-700">Total Credit Used</p>
                    <p className="text-2xl font-bold text-purple-900">{formatCurrency(creditAnalytics.totalCreditUsed)}</p>
                    <p className="text-xs text-purple-600">Pending deductions from payments</p>
                  </div>
                  
                  <div className="bg-indigo-50 p-4 rounded-lg">
                    <p className="text-sm text-indigo-700">Credit Impact</p>
                    <p className="text-2xl font-bold text-indigo-900">{creditAnalytics.creditImpact.toFixed(1)}%</p>
                    <p className="text-xs text-indigo-600">Of total payments</p>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-blue-700">Active Credit Users</p>
                    <p className="text-2xl font-bold text-blue-900">{creditAnalytics.creditDistribution.length}</p>
                    <p className="text-xs text-blue-600">Farmers using credit</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Credit Impact Analysis */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Credit Impact Analysis</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-700">Gross Payments</p>
                  <p className="text-xl font-bold text-green-900">{formatCurrency(analytics.total_pending + analytics.total_paid)}</p>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-purple-700">Credit Deductions</p>
                  <p className="text-xl font-bold text-purple-900">{formatCurrency(analytics.total_credit_used)}</p>
                  <p className="text-xs text-purple-600">Pending deductions from payments</p>
                </div>
                
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <p className="text-sm text-indigo-700">Net Payments</p>
                  <p className="text-xl font-bold text-indigo-900">{formatCurrency(analytics.total_net_payment)}</p>
                </div>
              </div>
              
              {/* Credit Analytics by Farmer */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Farmer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credit Used</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Payment</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credit %</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {creditAnalytics.creditDistribution.map((farmer: any, index: number) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{farmer.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(farmer.totalAmount)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(farmer.creditUsed)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(farmer.netPayment)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            farmer.creditPercentage > 20 ? 'bg-red-100 text-red-800' : 
                            farmer.creditPercentage > 10 ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-green-100 text-green-800'
                          }`}>
                            {farmer.creditPercentage.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {farmer.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {creditAnalytics.creditDistribution.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                          No credit usage data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Farmers Payments Content */}
        {activeAnalyticsTab === 'farmers-payments' && (
          <div className="space-y-6">
            {/* Top Farmers Section */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-2 mb-6">
                <Users className="w-5 h-5 text-primary" />
                <h3 className="text-xl font-bold text-gray-900">Top Performing Farmers</h3>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top 10 Farmers by Total Payments */}
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 mb-4">Top 10 Farmers by Total Payments</h4>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {creditAnalytics.creditDistribution
                      .slice(0, 10)
                      .map((farmer: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                              <span className="text-indigo-800 font-medium text-sm">{index + 1}</span>
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{farmer.name}</p>
                              <p className="text-sm text-gray-500">{formatCurrency(farmer.totalAmount)}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-900">{formatCurrency(farmer.netPayment)}</p>
                            <p className="text-xs text-gray-500">Net Payment</p>
                          </div>
                        </div>
                      ))
                    }
                    {creditAnalytics.creditDistribution.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No farmer payment data available
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Payment Distribution */}
                <div className="space-y-6">
                  {/* Payment Status Distribution */}
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-4">Payment Status Distribution</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                          <span className="text-gray-700">Paid</span>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(analytics.total_paid)}</p>
                          <p className="text-sm text-gray-500">
                            {analytics.total_pending + analytics.total_paid > 0 
                              ? ((analytics.total_paid / (analytics.total_pending + analytics.total_paid)) * 100).toFixed(1) 
                              : '0.0'}%
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                          <span className="text-gray-700">Pending</span>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(analytics.total_pending)}</p>
                          <p className="text-sm text-gray-500">
                            {analytics.total_pending + analytics.total_paid > 0 
                              ? ((analytics.total_pending / (analytics.total_pending + analytics.total_paid)) * 100).toFixed(1) 
                              : '0.0'}%
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                          <span className="text-gray-700">Credit Used</span>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(analytics.total_credit_used)}</p>
                          <p className="text-sm text-gray-500">
                            {analytics.total_paid + analytics.total_credit_used > 0 
                              ? ((analytics.total_credit_used / (analytics.total_paid + analytics.total_credit_used)) * 100).toFixed(1) 
                              : '0.0'}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Credit Usage Insights */}
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-4">Credit Usage Insights</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">High Credit Users</span>
                        <span className="font-medium">
                          {creditAnalytics.creditDistribution.filter((f: any) => f.creditPercentage > 20).length} farmers
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Moderate Credit Users</span>
                        <span className="font-medium">
                          {creditAnalytics.creditDistribution.filter((f: any) => f.creditPercentage > 10 && f.creditPercentage <= 20).length} farmers
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Low Credit Users</span>
                        <span className="font-medium">
                          {creditAnalytics.creditDistribution.filter((f: any) => f.creditPercentage <= 10).length} farmers
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Farmer Payment Trends */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-2 mb-6">
                <BarChart3 className="w-5 h-5 text-primary" />
                <h3 className="text-xl font-bold text-gray-900">Farmer Payment Trends</h3>
              </div>
              
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={analytics.daily_trend.map((item: any) => ({
                      date: item.date,
                      paid: item.paidAmount,
                      pending: item.pendingAmount,
                      credit: item.creditUsed
                    }))}
                    margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                  >
                    <defs>
                      <linearGradient id="paidGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="pendingGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="creditGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      stroke="#666"
                      fontSize={12}
                    >
                      <Label value="Days" offset={-10} position="insideBottom" />
                    </XAxis>
                    
                    <YAxis 
                      tickFormatter={(value) => `KSh${(value / 1000).toFixed(0)}k`} 
                      stroke="#666"
                      fontSize={12}
                      tickMargin={10}
                    >
                      <Label value="Amount (KES)" angle={-90} position="insideLeft" offset={10} />
                    </YAxis>
                    
                    <Tooltip 
                      formatter={(value, name) => {
                        const formattedValue = formatCurrency(Number(value));
                        switch(name) {
                          case 'paid': return [formattedValue, 'Paid Amounts'];
                          case 'pending': return [formattedValue, 'Pending Amounts'];
                          case 'credit': return [formattedValue, 'Credit Used'];
                          default: return [formattedValue, name];
                        }
                      }}
                      labelFormatter={(label) => `Date: ${new Date(label).toLocaleDateString()}`}
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb', 
                        borderRadius: '0.5rem',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                      }}
                      itemStyle={{ color: '#333' }}
                      labelStyle={{ fontWeight: 'bold', color: '#333' }}
                    />
                    
                    <Legend 
                      verticalAlign="top" 
                      height={40}
                      wrapperStyle={{ paddingBottom: '10px' }}
                    />
                    
                    <ReferenceLine y={0} stroke="#000" strokeWidth={0.5} />
                    
                    {/* Area charts for better visualization */}
                    <Area 
                      type="monotone" 
                      dataKey="paid" 
                      fill="url(#paidGradient)" 
                      stroke="none"
                      name="Paid Amounts"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="pending" 
                      fill="url(#pendingGradient)" 
                      stroke="none"
                      name="Pending Amounts"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="credit" 
                      fill="url(#creditGradient)" 
                      stroke="none"
                      name="Credit Used"
                    />
                    
                    {/* Line charts for clear trends */}
                    <Line 
                      type="monotone" 
                      dataKey="paid" 
                      stroke="#10b981" 
                      strokeWidth={2} 
                      dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#10b981' }} 
                      activeDot={{ r: 6, strokeWidth: 2, fill: '#fff', stroke: '#10b981' }} 
                      name="Paid Amounts" 
                      animationDuration={500}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="pending" 
                      stroke="#f59e0b" 
                      strokeWidth={2} 
                      dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#f59e0b' }} 
                      activeDot={{ r: 6, strokeWidth: 2, fill: '#fff', stroke: '#f59e0b' }} 
                      name="Pending Amounts" 
                      animationDuration={500}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="credit" 
                      stroke="#8b5cf6" 
                      strokeWidth={2} 
                      dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: '#8b5cf6' }} 
                      activeDot={{ r: 6, strokeWidth: 2, fill: '#fff', stroke: '#8b5cf6' }} 
                      name="Credit Used" 
                      animationDuration={500}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              
              {/* Enhanced insights section */}
              <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BarChart3 className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 mb-1">Farmer Payment Trends</p>
                    <p className="text-sm text-gray-600">This chart shows daily payment trends including paid amounts, pending payments, and credit deductions.</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-800">
                        <div className="w-2 h-2 rounded-full bg-green-500 mr-1"></div>
                        Paid = Completed payments
                      </span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                        <div className="w-2 h-2 rounded-full bg-yellow-500 mr-1"></div>
                        Pending = Awaiting processing
                      </span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full bg-purple-100 text-purple-800">
                        <div className="w-2 h-2 rounded-full bg-purple-500 mr-1"></div>
                        Credit = Deductions applied
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsTab;