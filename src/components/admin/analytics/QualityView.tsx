import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Award, BarChart3, TrendingUp } from '@/utils/iconImports';

interface QualityViewProps {
  qualityDistribution: any[];
  dailyTrends: any[];
}

// Memoized chart components to prevent unnecessary re-renders
const QualityDistributionChart = memo(({ data }: { data: any[] }) => {
  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];
  
  if (data.length === 0) return <div className="flex items-center justify-center h-full text-gray-500">No data available</div>;
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={true}
          label={({ name, percentage }) => `${name}: ${percentage}%`}
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
          stroke="#fff"
          strokeWidth={2}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value) => [value, 'Collections']} 
          contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} 
          labelStyle={{ color: '#f3f4f6' }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
});

const QualityTrendsChart = memo(({ data }: { data: any[] }) => {
  const GRADE_COLORS = { 'A+': '#10b981', 'A': '#3b82f6', 'B': '#f59e0b', 'C': '#ef4444' };
  
  if (data.length === 0) return <div className="flex items-center justify-center h-full text-gray-500">No data available</div>;
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="date" stroke="#9ca3af" />
        <YAxis stroke="#9ca3af" />
        <Tooltip 
          contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} 
          formatter={(value) => [value, 'Collections']}
          labelStyle={{ color: '#f3f4f6' }}
        />
        <Bar dataKey="A+" fill={GRADE_COLORS['A+']} name="Grade A+" stackId="a" radius={[4, 4, 0, 0]} />
        <Bar dataKey="A" fill={GRADE_COLORS['A']} name="Grade A" stackId="a" radius={[4, 4, 0, 0]} />
        <Bar dataKey="B" fill={GRADE_COLORS['B']} name="Grade B" stackId="a" radius={[4, 4, 0, 0]} />
        <Bar dataKey="C" fill={GRADE_COLORS['C']} name="Grade C" stackId="a" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
});

export const QualityView = memo(({ 
  qualityDistribution,
  dailyTrends
}: QualityViewProps) => {
  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];
  const GRADE_COLORS = { 'A+': '#10b981', 'A': '#3b82f6', 'B': '#f59e0b', 'C': '#ef4444' };

  // Calculate quality trends over time
  const qualityTrends = dailyTrends.map(day => ({
    date: day.date,
    'A+': dailyTrends.filter(d => d.date === day.date)[0]?.qualityDistribution?.['A+'] || 0,
    'A': dailyTrends.filter(d => d.date === day.date)[0]?.qualityDistribution?.['A'] || 0,
    'B': dailyTrends.filter(d => d.date === day.date)[0]?.qualityDistribution?.['B'] || 0,
    'C': dailyTrends.filter(d => d.date === day.date)[0]?.qualityDistribution?.['C'] || 0,
  }));

  return (
    <div className="space-y-8">
      {/* Quality Distribution */}
      
      {/* Quality Trends Over Time */}
      <Card className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300">
        <CardHeader className="pb-4">
          <CardTitle className="text-text-light dark:text-text-dark flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-green-500" />
            Quality Trends Over Time
          </CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <QualityTrendsChart data={dailyTrends} />
        </CardContent>
      </Card>

      {/* Quality Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {qualityDistribution.map((grade, idx) => (
          <Card 
            key={idx} 
            className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
            style={{ borderLeft: `4px solid ${COLORS[idx % COLORS.length]}` }}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-text-light dark:text-text-dark">{grade.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" style={{ color: COLORS[idx % COLORS.length] }}>
                {grade.percentage}%
              </div>
              <p className="text-sm text-subtle-text-light dark:text-subtle-text-dark mt-1">
                {grade.value} collections
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
});