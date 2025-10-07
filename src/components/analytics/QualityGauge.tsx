import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface QualityGaugeProps {
  value: number;
  max: number;
  label: string;
  description: string;
}

const QualityGauge = ({ value, max, label, description }: QualityGaugeProps) => {
  const percentage = (value / max) * 100;
  
  // Determine color based on percentage
  let color = 'text-red-500';
  if (percentage >= 80) color = 'text-green-500';
  else if (percentage >= 60) color = 'text-yellow-500';
  
  // Calculate the stroke dasharray for the gauge
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <div className="relative w-40 h-40">
          {/* Background circle */}
          <svg className="w-full h-full" viewBox="0 0 140 140">
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="10"
            />
            {/* Progress circle */}
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 70 70)"
              className={color}
            />
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-bold ${color}`}>{value.toFixed(1)}</span>
            <span className="text-sm text-muted-foreground">/ {max}</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-4 text-center">{description}</p>
      </CardContent>
    </Card>
  );
};

export default QualityGauge;