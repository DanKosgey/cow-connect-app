import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  DataVisualizationContainer,
  EnhancedBarChart,
  EnhancedLineChart,
  EnhancedAreaChart,
  EnhancedPieChart,
  EnhancedRadarChart,
  EnhancedScatterChart
} from '@/components/DataVisualization';
import { 
  TrendingUp, 
  Droplets, 
  DollarSign, 
  Award,
  BarChart3,
  PieChart,
  Radar,
  ScatterChart
} from 'lucide-react';

// Farmer-specific data visualization component
export const FarmerDataVisualization = ({ 
  collectionsData,
  paymentsData,
  qualityData,
  performanceData
}: { 
  collectionsData: any[];
  paymentsData: any[];
  qualityData: any[];
  performanceData: any[];
}) => {
  // Prepare data for different chart types
  const weeklyCollections = collectionsData.slice(0, 7).map(collection => ({
    name: new Date(collection.date).toLocaleDateString('en-US', { weekday: 'short' }),
    liters: collection.liters,
    amount: collection.amount
  }));

  const monthlyPayments = paymentsData.slice(0, 6).map(payment => ({
    name: new Date(payment.date).toLocaleDateString('en-US', { month: 'short' }),
    amount: payment.amount,
    status: payment.status
  }));

  const qualityDistribution = qualityData.reduce((acc: any, item: any) => {
    acc[item.grade] = (acc[item.grade] || 0) + 1;
    return acc;
  }, {});

  const qualityChartData = Object.entries(qualityDistribution).map(([grade, count]) => ({
    name: `Grade ${grade}`,
    value: count as number,
    grade: grade
  }));

  const performanceMetrics = performanceData.map(metric => ({
    subject: metric.name,
    A: metric.value,
    fullMark: 100
  }));

  return (
    <div className="space-y-6">
      {/* Collections Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-primary" />
              Weekly Collections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EnhancedBarChart 
              data={weeklyCollections} 
              dataKey="liters" 
              title="Liters Collected Per Day"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Collections Value Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EnhancedLineChart 
              data={weeklyCollections} 
              dataKeys={['amount']} 
              title="Collection Value Over Time"
            />
          </CardContent>
        </Card>
      </div>

      {/* Quality and Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Quality Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EnhancedPieChart 
              data={qualityChartData} 
              dataKey="value" 
              nameKey="name"
              title="Milk Quality Grades"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radar className="h-5 w-5 text-primary" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EnhancedRadarChart 
              data={performanceMetrics} 
              dataKeys={['A']} 
              title="Farmer Performance Radar"
            />
          </CardContent>
        </Card>
      </div>

      {/* Payments and Earnings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Monthly Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EnhancedAreaChart 
              data={monthlyPayments} 
              dataKey="amount" 
              title="Earnings Over Time"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Payment Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EnhancedBarChart 
              data={monthlyPayments} 
              dataKey="amount" 
              title="Payments by Status"
            />
          </CardContent>
        </Card>
      </div>

      {/* Advanced Analytics */}
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScatterChart className="h-5 w-5 text-primary" />
              Collection Patterns Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EnhancedScatterChart 
              data={weeklyCollections} 
              dataKeys={['liters', 'amount']} 
              title="Liters vs Earnings Correlation"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Mini data visualization cards for dashboard
export const MiniDataVisualization = ({ 
  title,
  value,
  change,
  icon,
  chartData,
  dataKey
}: { 
  title: string;
  value: string;
  change: string;
  icon: React.ReactNode;
  chartData: any[];
  dataKey: string;
}) => {
  const isPositive = !change.includes('-');
  
  return (
    <Card className="border border-border hover:shadow-md transition-all duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <div className="p-2 rounded-full bg-primary/10 text-primary">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className={`flex items-center mt-1 text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {change}
        </div>
        <div className="h-16 mt-2">
          <EnhancedAreaChart 
            data={chartData} 
            dataKey={dataKey}
            height={64}
          />
        </div>
      </CardContent>
    </Card>
  );
};