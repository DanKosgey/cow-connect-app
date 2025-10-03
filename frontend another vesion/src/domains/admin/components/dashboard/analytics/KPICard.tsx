import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface KPICardProps {
  title: string;
  metric: string | number;
  progress?: number;
  target?: string | number;
  trend?: number;
  trendColor?: 'success' | 'danger';
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  metric,
  progress = 0,
  target,
  trend,
  trendColor
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="text-3xl font-bold">{metric}</div>
          {progress !== undefined && (
            <Progress value={progress} className="h-2" />
          )}
          {target && (
            <div className="text-sm text-gray-500">
              Target: {target}
            </div>
          )}
          {trend !== undefined && (
            <div className={`text-sm ${trendColor === 'success' ? 'text-green-500' : 'text-red-500'}`}>
              {trend > 0 ? '+' : ''}{trend}%
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
