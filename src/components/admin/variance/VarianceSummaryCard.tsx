import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface VarianceSummaryCardProps {
  title: string;
  value: string | number;
  previousValue?: string | number;
  changePercentage?: number;
  valueType?: 'currency' | 'number' | 'percentage';
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  colorScheme?: 'positive' | 'negative' | 'neutral' | 'primary';
  benchmarkValue?: number;
  benchmarkLabel?: string;
  isGood?: boolean;
}

const VarianceSummaryCard: React.FC<VarianceSummaryCardProps> = ({
  title,
  value,
  previousValue,
  changePercentage,
  valueType = 'number',
  trend = 'neutral',
  icon,
  colorScheme = 'neutral',
  benchmarkValue,
  benchmarkLabel = 'Industry Benchmark',
  isGood
}) => {
  // Determine color classes based on color scheme
  const getColorClasses = () => {
    switch (colorScheme) {
      case 'positive':
        return {
          bg: 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30',
          text: 'text-green-700 dark:text-green-300',
          border: 'border-green-200 dark:border-green-800/50',
          badge: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
        };
      case 'negative':
        return {
          bg: 'bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/30 dark:to-rose-900/30',
          text: 'text-red-700 dark:text-red-300',
          border: 'border-red-200 dark:border-red-800/50',
          badge: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
        };
      case 'primary':
        return {
          bg: 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30',
          text: 'text-blue-700 dark:text-blue-300',
          border: 'border-blue-200 dark:border-blue-800/50',
          badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
        };
      default:
        return {
          bg: 'bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-800 dark:to-slate-800',
          text: 'text-gray-700 dark:text-gray-300',
          border: 'border-gray-200 dark:border-gray-700',
          badge: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
        };
    }
  };

  const colors = getColorClasses();

  // Format value based on type
  const formatValue = (val: string | number) => {
    if (typeof val === 'number') {
      switch (valueType) {
        case 'currency':
          // Format as currency without KSh prefix for better display
          return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        case 'percentage':
          return `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`;
        default:
          return val.toLocaleString();
      }
    }
    return val;
  };

  // Get trend icon
  const getTrendIcon = () => {
    if (changePercentage === undefined) return null;
    
    if (changePercentage > 0) {
      return <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />;
    } else if (changePercentage < 0) {
      return <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4" />;
    }
    return <Minus className="h-3 w-3 sm:h-4 sm:w-4" />;
  };

  // Get trend text
  const getTrendText = () => {
    if (changePercentage === undefined) return null;
    return `${changePercentage >= 0 ? '↑' : '↓'} ${Math.abs(changePercentage).toFixed(1)}%`;
  };

  return (
    <Card className={`${colors.bg} ${colors.border} border rounded-xl shadow-sm hover:shadow-md transition-all duration-300 h-full transform hover:-translate-y-0.5`}>
      <CardContent className="p-4 h-full flex flex-col">
        <div className="flex items-start justify-between flex-1">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground mb-1 truncate">{title}</p>
            <h3 className={`text-2xl font-bold ${colors.text} truncate`}>
              {title === 'Total Penalties' ? '' : ''}
              {formatValue(value)}
            </h3>
          </div>
          {icon && (
            <div className={`p-2 rounded-lg ${colors.badge} flex-shrink-0 ml-2`}>
              {icon}
            </div>
          )}
        </div>
        
        {(previousValue !== undefined || changePercentage !== undefined || benchmarkValue !== undefined) && (
          <div className="mt-3 flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-1">
              {changePercentage !== undefined && (
                <Badge 
                  variant={changePercentage >= 0 ? "default" : "destructive"}
                  className="flex items-center gap-1 text-[0.65rem] font-medium px-2 py-1"
                >
                  {getTrendIcon()}
                  <span className="truncate">{getTrendText()}</span>
                </Badge>
              )}
              
              {benchmarkValue !== undefined && (
                <Badge 
                  variant={isGood ? "default" : "destructive"}
                  className="flex items-center gap-1 text-[0.65rem] font-medium px-2 py-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="truncate">{benchmarkLabel}: {formatValue(benchmarkValue)}</span>
                </Badge>
              )}
            </div>
            
            {previousValue !== undefined && (
              <p className="text-[0.65rem] text-muted-foreground truncate">
                Previous: {formatValue(previousValue)}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VarianceSummaryCard;