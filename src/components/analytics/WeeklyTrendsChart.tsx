import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface WeeklyTrend {
  week: string;
  totalCollections: number;
  totalLiters: number;
  avgQuality: number;
  revenue: number;
}

interface WeeklyTrendsChartProps {
  data: WeeklyTrend[];
}

const WeeklyTrendsChart = ({ data }: WeeklyTrendsChartProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-KE').format(num);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Trends Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip 
                formatter={(value, name) => {
                  if (name === 'totalLiters') return [formatNumber(Number(value)), 'Liters'];
                  if (name === 'avgQuality') return [`${Number(value).toFixed(1)}%`, 'Quality'];
                  if (name === 'revenue') return [formatCurrency(Number(value)), 'Revenue'];
                  if (name === 'totalCollections') return [formatNumber(Number(value)), 'Collections'];
                  return [formatNumber(Number(value)), name];
                }}
              />
              <Legend />
              <Line 
                yAxisId="left" 
                type="monotone" 
                dataKey="totalLiters" 
                stroke="#3b82f6" 
                name="Liters" 
                strokeWidth={2}
              />
              <Line 
                yAxisId="right" 
                type="monotone" 
                dataKey="avgQuality" 
                stroke="#10b981" 
                name="Quality (%)" 
                strokeWidth={2}
              />
              <Line 
                yAxisId="left" 
                type="monotone" 
                dataKey="totalCollections" 
                stroke="#f59e0b" 
                name="Collections" 
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeeklyTrendsChart;