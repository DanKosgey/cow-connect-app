import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ComposedChart,
  Line,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { TrendingUp, DollarSign, CreditCard, CheckCircle } from 'lucide-react';

interface PaymentTrendData {
  date: string;
  collections: number;
  pendingAmount: number;
  paidAmount: number;
  creditUsed: number;
}

interface PaymentOverviewChartProps {
  data: PaymentTrendData[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const PaymentOverviewChart = ({ data }: PaymentOverviewChartProps) => {
  const [activeMetric, setActiveMetric] = useState<string | null>(null);

  // Calculate summary stats
  const totalPending = data.reduce((sum, d) => sum + d.pendingAmount, 0);
  const totalPaid = data.reduce((sum, d) => sum + d.paidAmount, 0);
  const totalCredit = data.reduce((sum, d) => sum + d.creditUsed, 0);
  const totalCollections = data.reduce((sum, d) => sum + d.collections, 0);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-xl shadow-2xl p-4 backdrop-blur-sm">
          <p className="font-bold text-white mb-3 text-sm border-b border-gray-700 pb-2">
            📅 {new Date(label).toLocaleDateString('en-KE', { weekday: 'short', month: 'short', day: 'numeric' })}
          </p>
          <div className="space-y-2">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-6">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full shadow-lg" 
                    style={{ 
                      backgroundColor: entry.color,
                      boxShadow: `0 0 8px ${entry.color}50`
                    }}
                  />
                  <span className="text-xs text-gray-300 font-medium">{entry.name}</span>
                </div>
                <span className="text-sm font-bold text-white">
                  {entry.name === 'Collections' 
                    ? `${entry.value} items`
                    : formatCurrency(Number(entry.value))}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const StatCard = ({ icon: Icon, label, value, color, metric }: any) => (
    <div 
      className={`relative overflow-hidden rounded-xl p-4 transition-all duration-300 cursor-pointer transform hover:scale-[1.02] ${
        activeMetric === metric ? 'ring-2 ring-offset-2' : ''
      }`}
      style={{ 
        background: `linear-gradient(135deg, ${color}20 0%, ${color}05 100%)`,
        borderLeft: `4px solid ${color}`,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
      }}
      onMouseEnter={() => setActiveMetric(metric)}
      onMouseLeave={() => setActiveMetric(null)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-600 mb-1">{label}</p>
          <p className="text-xl font-bold text-gray-900">{value}</p>
        </div>
        <div 
          className="p-2 rounded-lg"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
      <div 
        className="absolute bottom-0 left-0 h-1 transition-all duration-300"
        style={{ 
          width: activeMetric === metric ? '100%' : '0%',
          backgroundColor: color
        }}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={TrendingUp}
          label="Total Collections"
          value={totalCollections}
          color="#3b82f6"
          metric="collections"
        />
        <StatCard
          icon={CheckCircle}
          label="Total Paid"
          value={formatCurrency(totalPaid)}
          color="#10b981"
          metric="paid"
        />
        <StatCard
          icon={DollarSign}
          label="Total Pending"
          value={formatCurrency(totalPending)}
          color="#f59e0b"
          metric="pending"
        />
        <StatCard
          icon={CreditCard}
          label="Credit Used"
          value={formatCurrency(totalCredit)}
          color="#8b5cf6"
          metric="credit"
        />
      </div>

      {/* Main Chart */}
      <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-gray-50">
        <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Payment Overview
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">Interactive trends and analytics dashboard</p>
            </div>
            <div className="flex gap-2">
              <div className="px-3 py-1 bg-white rounded-full text-xs font-medium text-gray-700 shadow-sm">
                📊 Live Data
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={data}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <defs>
                  {/* Gradient definitions for area fills */}
                  <linearGradient id="pendingGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="paidGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="creditGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.6}/>
                  </linearGradient>
                </defs>
                
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="#e5e7eb" 
                  strokeOpacity={0.5}
                />
                
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  stroke="#6b7280"
                  style={{ fontSize: '12px', fontWeight: 500 }}
                />
                
                <YAxis 
                  yAxisId="left" 
                  orientation="left" 
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  stroke="#6b7280"
                  style={{ fontSize: '12px', fontWeight: 500 }}
                />
                
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  tickFormatter={(value) => value.toString()}
                  stroke="#3b82f6"
                  style={{ fontSize: '12px', fontWeight: 500 }}
                />
                
                <Tooltip content={<CustomTooltip />} />
                
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="circle"
                  formatter={(value) => (
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                      {value}
                    </span>
                  )}
                />
                
                {/* Area for pending - gives a filled effect */}
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="pendingAmount"
                  fill="url(#pendingGradient)"
                  stroke="none"
                  opacity={activeMetric === 'pending' || !activeMetric ? 1 : 0.2}
                />
                
                {/* Area for paid */}
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="paidAmount"
                  fill="url(#paidGradient)"
                  stroke="none"
                  opacity={activeMetric === 'paid' || !activeMetric ? 1 : 0.2}
                />
                
                {/* Area for credit */}
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="creditUsed"
                  fill="url(#creditGradient)"
                  stroke="none"
                  opacity={activeMetric === 'credit' || !activeMetric ? 1 : 0.2}
                />
                
                {/* Bar for collections count */}
                <Bar 
                  yAxisId="right" 
                  dataKey="collections" 
                  name="Collections" 
                  fill="url(#barGradient)"
                  radius={[8, 8, 0, 0]}
                  opacity={activeMetric === 'collections' || !activeMetric ? 0.8 : 0.2}
                />
                
                {/* Thin line for pending amount */}
                <Line 
                  yAxisId="left" 
                  type="monotone" 
                  dataKey="pendingAmount" 
                  name="Pending" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  dot={{ 
                    r: 4, 
                    fill: '#f59e0b', 
                    strokeWidth: 2, 
                    stroke: '#fff',
                    filter: 'drop-shadow(0 2px 4px rgba(245, 158, 11, 0.3))'
                  }}
                  activeDot={{ 
                    r: 6, 
                    fill: '#f59e0b',
                    stroke: '#fff',
                    strokeWidth: 3,
                    filter: 'drop-shadow(0 4px 8px rgba(245, 158, 11, 0.5))'
                  }}
                  opacity={activeMetric === 'pending' || !activeMetric ? 1 : 0.3}
                />
                
                {/* Thin line for paid amount */}
                <Line 
                  yAxisId="left" 
                  type="monotone" 
                  dataKey="paidAmount" 
                  name="Paid" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ 
                    r: 4, 
                    fill: '#10b981', 
                    strokeWidth: 2, 
                    stroke: '#fff',
                    filter: 'drop-shadow(0 2px 4px rgba(16, 185, 129, 0.3))'
                  }}
                  activeDot={{ 
                    r: 6,
                    fill: '#10b981',
                    stroke: '#fff',
                    strokeWidth: 3,
                    filter: 'drop-shadow(0 4px 8px rgba(16, 185, 129, 0.5))'
                  }}
                  opacity={activeMetric === 'paid' || !activeMetric ? 1 : 0.3}
                />
                
                {/* Thin line for credit used */}
                <Line 
                  yAxisId="left" 
                  type="monotone" 
                  dataKey="creditUsed" 
                  name="Credit Used" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  dot={{ 
                    r: 4, 
                    fill: '#8b5cf6', 
                    strokeWidth: 2, 
                    stroke: '#fff',
                    filter: 'drop-shadow(0 2px 6px rgba(139, 92, 246, 0.5))'
                  }}
                  activeDot={{ 
                    r: 6,
                    fill: '#8b5cf6',
                    stroke: '#fff',
                    strokeWidth: 3,
                    filter: 'drop-shadow(0 4px 12px rgba(139, 92, 246, 0.7))'
                  }}
                  opacity={activeMetric === 'credit' || !activeMetric ? 1 : 0.3}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          
          {/* Enhanced info section */}
          <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-100">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CreditCard className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-1">
                  💡 Interactive Chart Tips
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-800">
                    <div className="w-2 h-2 rounded-full bg-green-500 mr-1"></div>
                    Solid line = Actual values
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full bg-purple-100 text-purple-800">
                    <div className="w-2 h-2 rounded-full bg-purple-500 mr-1"></div>
                    Shaded area = Trend visualization
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentOverviewChart;