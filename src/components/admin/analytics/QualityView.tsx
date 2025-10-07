import React from 'react';
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

export function QualityView({
  qualityDistribution,
  dailyTrends
}: QualityViewProps) {
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
    <div className="space-y-6">
      {/* Quality Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark">
          <CardHeader>
            <CardTitle className="text-text-light dark:text-text-dark flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              Quality Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={qualityDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {qualityDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [value, 'Collections']} 
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark">
          <CardHeader>
            <CardTitle className="text-text-light dark:text-text-dark flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              Quality Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {qualityDistribution.map((grade, idx) => (
              <div key={idx} className="border-l-4 pl-4 py-2" style={{ borderColor: COLORS[idx % COLORS.length] }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-text-light dark:text-text-dark">{grade.name}</span>
                  <span className="text-sm text-subtle-text-light dark:text-subtle-text-dark">{grade.value} collections</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${grade.percentage}%`,
                      backgroundColor: COLORS[idx % COLORS.length]
                    }}
                  ></div>
                </div>
                <span className="text-xs text-subtle-text-light dark:text-subtle-text-dark">{grade.percentage}% of total</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Quality Trends Over Time */}
      <Card className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark">
        <CardHeader>
          <CardTitle className="text-text-light dark:text-text-dark flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            Quality Trends Over Time
          </CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} 
                formatter={(value) => [value, 'Collections']}
              />
              <Bar dataKey="A+" fill={GRADE_COLORS['A+']} name="Grade A+" stackId="a" />
              <Bar dataKey="A" fill={GRADE_COLORS['A']} name="Grade A" stackId="a" />
              <Bar dataKey="B" fill={GRADE_COLORS['B']} name="Grade B" stackId="a" />
              <Bar dataKey="C" fill={GRADE_COLORS['C']} name="Grade C" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Quality Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {qualityDistribution.map((grade, idx) => (
          <Card 
            key={idx} 
            className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark"
            style={{ borderLeft: `4px solid ${COLORS[idx % COLORS.length]}` }}
          >
            <CardHeader>
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
}