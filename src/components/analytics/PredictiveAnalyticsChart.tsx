import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

interface HistoricalDataPoint {
  date: string;
  value: number;
}

interface ForecastDataPoint {
  date: string;
  value: number;
  isForecast?: boolean;
}

interface PredictiveAnalyticsChartProps {
  historicalData: HistoricalDataPoint[];
  forecastData: ForecastDataPoint[];
  title: string;
  dataKey: string;
  color: string;
}

const PredictiveAnalyticsChart = ({ 
  historicalData, 
  forecastData, 
  title, 
  dataKey, 
  color 
}: PredictiveAnalyticsChartProps) => {
  // Combine historical and forecast data
  const combinedData = [
    ...historicalData.map(item => ({ ...item, isHistorical: true })),
    ...forecastData.map(item => ({ ...item, isForecast: true, isHistorical: false }))
  ];

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
            <LineChart
              data={combinedData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
              />
              <YAxis />
              <Tooltip 
                formatter={(value) => [formatNumber(Number(value)), dataKey]}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                name="Actual"
                stroke={color}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              {/* Forecast line with dashed style */}
              <Line
                type="monotone"
                dataKey="value"
                name="Forecast"
                stroke={color}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 4, fill: '#f59e0b' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 flex items-center justify-center space-x-6">
          <div className="flex items-center">
            <div className="w-4 h-1 bg-blue-500 mr-2"></div>
            <span className="text-sm">Historical Data</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-1 bg-blue-500 mr-2" style={{ borderStyle: 'dashed' }}></div>
            <span className="text-sm">Forecast</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PredictiveAnalyticsChart;