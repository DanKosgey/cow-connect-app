import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

interface DataPoint {
  date: string;
  [key: string]: number | string;
}

interface MultiSeriesAreaChartProps {
  data: DataPoint[];
  title: string;
  dataKeys: { key: string; name: string; color: string }[];
}

const MultiSeriesAreaChart = ({ data, title, dataKeys }: MultiSeriesAreaChartProps) => {
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-KE').format(num);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip 
                formatter={(value) => [formatNumber(Number(value)), 'Value']}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Legend />
              {dataKeys.map((item) => (
                <Area
                  key={item.key}
                  type="monotone"
                  dataKey={item.key}
                  name={item.name}
                  stroke={item.color}
                  fill={item.color}
                  fillOpacity={0.3}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default MultiSeriesAreaChart;