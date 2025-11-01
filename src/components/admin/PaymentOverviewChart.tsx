import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { formatCurrency } from '@/utils/formatters';

interface PaymentTrendData {
  date: string;
  collections: number;
  pendingAmount: number;
  paidAmount: number;
}

interface PaymentOverviewChartProps {
  data: PaymentTrendData[];
}

const PaymentOverviewChart = ({ data }: PaymentOverviewChartProps) => {
  // Format the date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Overview</CardTitle>
        <p className="text-sm text-gray-500 mt-1">Collections and payment status trends</p>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
              />
              <YAxis 
                yAxisId="left" 
                orientation="left" 
                tickFormatter={(value) => `KSh${(value / 1000).toFixed(0)}k`}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                tickFormatter={(value) => value.toString()}
              />
              <Tooltip 
                formatter={(value, name) => {
                  if (name === 'collections') {
                    return [value, 'Collections'];
                  }
                  if (name === 'pendingAmount') {
                    return [formatCurrency(Number(value)), 'Pending (KES)'];
                  }
                  if (name === 'paidAmount') {
                    return [formatCurrency(Number(value)), 'Paid (KES)'];
                  }
                  return [value, name];
                }}
                labelFormatter={(label) => new Date(label).toLocaleDateString('en-KE')}
              />
              <Legend />
              <Bar 
                yAxisId="right" 
                dataKey="collections" 
                name="Collections" 
                fill="#3b82f6" 
              />
              <Line 
                yAxisId="left" 
                type="monotone" 
                dataKey="pendingAmount" 
                name="Pending (KES)" 
                stroke="#f59e0b" 
                strokeWidth={2}
                dot={{ r: 4 }}
              />
              <Line 
                yAxisId="left" 
                type="monotone" 
                dataKey="paidAmount" 
                name="Paid (KES)" 
                stroke="#10b981" 
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentOverviewChart;