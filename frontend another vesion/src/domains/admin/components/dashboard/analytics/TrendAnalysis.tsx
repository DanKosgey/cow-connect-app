import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart } from '@/components/ui/bar-chart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';

interface TrendDataPoint {
  date: string;
  value: number;
}

interface TrendAnalysisProps {
  dailyData: TrendDataPoint[];
  weeklyData: TrendDataPoint[];
  monthlyData: TrendDataPoint[];
}

export function TrendAnalysis({ dailyData, weeklyData, monthlyData }: TrendAnalysisProps) {
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  
  const getDataForRange = () => {
    switch (timeRange) {
      case 'daily':
        return {
          data: dailyData.slice(-30).map(d => d.value),
          labels: dailyData.slice(-30).map(d => {
            const date = new Date(d.date);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          }),
          title: 'Daily Collections (Last 30 Days)'
        };
      case 'weekly':
        return {
          data: weeklyData.slice(-12).map(d => d.value),
          labels: weeklyData.slice(-12).map(d => {
            const date = new Date(d.date);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          }),
          title: 'Weekly Collections (Last 12 Weeks)'
        };
      case 'monthly':
        return {
          data: monthlyData.map(d => d.value),
          labels: monthlyData.map(d => {
            const [year, month] = d.date.split('-');
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${monthNames[parseInt(month) - 1]} ${year}`;
          }),
          title: 'Monthly Collections'
        };
      default:
        return {
          data: [],
          labels: [],
          title: ''
        };
    }
  };

  const { data, labels, title } = getDataForRange();

  return (
    <Card className="border-green-200 bg-white/70 backdrop-blur-sm">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-gray-900">Trend Analysis</CardTitle>
            <CardDescription>Production trends over time</CardDescription>
          </div>
          <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <BarChart 
            data={data} 
            labels={labels} 
            title={title}
            color="rgb(22, 163, 74)" // green-600
          />
        </div>
        <div className="mt-4 text-center text-sm text-gray-600">
          <p>Showing {data.length} data points for {title.toLowerCase()}</p>
        </div>
      </CardContent>
    </Card>
  );
}