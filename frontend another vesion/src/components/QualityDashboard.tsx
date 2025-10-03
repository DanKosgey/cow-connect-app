import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { lazy, Suspense, memo } from 'react';
import SkeletonLoader from '@/components/ui/SkeletonLoader';

// Lazy load heavy chart components
const PieChart = lazy(() => import('recharts').then(module => ({ default: module.PieChart })));
const Pie = lazy(() => import('recharts').then(module => ({ default: module.Pie })));
const Cell = lazy(() => import('recharts').then(module => ({ default: module.Cell })));
const ResponsiveContainer = lazy(() => import('recharts').then(module => ({ default: module.ResponsiveContainer })));
const Tooltip = lazy(() => import('recharts').then(module => ({ default: module.Tooltip })));
const Legend = lazy(() => import('recharts').then(module => ({ default: module.Legend })));

interface QualityDataPoint {
  grade: string;
  count: number;
}

interface QualityDashboardProps {
  qualityData: QualityDataPoint[];
}

const COLORS = ['#16a34a', '#22c55e', '#86efac', '#dcfce7'];

export const QualityDashboard = memo(({ qualityData }: QualityDashboardProps) => {
  // Transform data for Recharts pie chart
  const pieData = qualityData.map(item => ({
    name: `Grade ${item.grade}`,
    value: item.count
  }));

  // Calculate total collections
  const totalCollections = qualityData.reduce((sum, item) => sum + item.count, 0);
  
  // Calculate quality distribution percentages
  const qualityPercentages = qualityData.map(item => ({
    grade: item.grade,
    percentage: totalCollections > 0 ? Math.round((item.count / totalCollections) * 100) : 0
  }));

  return (
    <Card className="border-green-200 bg-white/70 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-gray-900">Quality Dashboard</CardTitle>
        <CardDescription>Track your milk quality grades over time</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div className="h-64">
            <h3 className="text-lg font-medium mb-2 text-center">Grade Distribution</h3>
            <Suspense fallback={<div className="h-full flex items-center justify-center"><SkeletonLoader type="chart" /></div>}>
              <ResponsiveContainer width="100%" height="90%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Suspense>
          </div>
          
          {/* Grade Statistics */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium mb-2">Grade Statistics</h3>
            {qualityPercentages.map((item) => (
              <div key={item.grade} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="font-medium">Grade {item.grade}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-bold text-green-700">{item.percentage}%</span>
                  <span className="text-sm text-gray-600">({qualityData.find(d => d.grade === item.grade)?.count} collections)</span>
                </div>
              </div>
            ))}
            
            <div className="pt-4 border-t border-green-200">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Collections</span>
                <span className="text-lg font-bold text-gray-900">{totalCollections}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function
  return JSON.stringify(prevProps.qualityData) === JSON.stringify(nextProps.qualityData);
});