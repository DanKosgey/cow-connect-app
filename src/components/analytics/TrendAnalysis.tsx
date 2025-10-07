import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TrendData {
  metric: string;
  current: number;
  previous: number;
  trend: 'up' | 'down' | 'stable';
  percentageChange: number;
}

interface TrendAnalysisProps {
  trends: TrendData[];
  title: string;
}

const TrendAnalysis = ({ trends, title }: TrendAnalysisProps) => {
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'stable': return <Minus className="h-4 w-4 text-gray-500" />;
      default: return null;
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-KE').format(num);
  };

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {trends.map((trend, index) => (
            <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="font-medium">{trend.metric}</div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="font-medium">{formatNumber(trend.current)}</div>
                  <div className="text-sm text-muted-foreground">
                    vs {formatNumber(trend.previous)}
                  </div>
                </div>
                <div className="flex items-center">
                  {getTrendIcon(trend.trend)}
                  <span className={`ml-1 text-sm font-medium ${
                    trend.trend === 'up' ? 'text-green-500' : 
                    trend.trend === 'down' ? 'text-red-500' : 'text-gray-500'
                  }`}>
                    {formatPercentage(trend.percentageChange)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default TrendAnalysis;