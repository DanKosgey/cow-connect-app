import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  DollarSign, 
  TrendingUp, 
  Activity, 
  Award,
  TrendingUpIcon,
  TrendingDownIcon
} from 'lucide-react';
import { businessIntelligenceService } from '@/services/business-intelligence-service';
import { Skeleton } from '@/components/ui/skeleton';

interface BusinessIntelligenceMetric {
  id: string;
  title: string;
  value: string | number;
  change: number;
  changeType: 'positive' | 'negative' | 'neutral';
  description: string;
  icon: string;
}

// Memoized skeleton component to prevent re-creation
const BusinessIntelligenceSkeleton = React.memo(() => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    {[1, 2, 3, 4].map((i) => (
      <Card key={i} className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-20 mb-2" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-3 w-32 mt-2" />
        </CardContent>
      </Card>
    ))}
  </div>
));

const BusinessIntelligenceDashboard = ({ timeRange = 'week' }: { timeRange?: string }) => {
  const [metrics, setMetrics] = useState<BusinessIntelligenceMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoize the fetch function to prevent unnecessary re-renders
  const fetchMetrics = useMemo(() => async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await businessIntelligenceService.calculateBusinessIntelligenceMetrics(timeRange);
      setMetrics(data);
    } catch (err) {
      console.error('Error fetching business intelligence metrics:', err);
      setError('Failed to load business intelligence data');
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'DollarSign': return DollarSign;
      case 'TrendingUp': return TrendingUp;
      case 'Activity': return Activity;
      case 'Award': return Award;
      default: return TrendingUp;
    }
  };

  // Memoize the error component
  const ErrorComponent = useMemo(() => (
    error ? (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    ) : null
  ), [error]);

  // Memoize the loading skeleton
  const LoadingSkeleton = useMemo(() => loading ? <BusinessIntelligenceSkeleton /> : null, [loading]);

  // Memoize the business intelligence card component
  const BusinessIntelligenceCard = useMemo(() => React.memo(({ metric }: { metric: BusinessIntelligenceMetric }) => {
    const IconComponent = getIconComponent(metric.icon);
    return (
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
          <div className="p-2 rounded-full bg-blue-100">
            <IconComponent className="h-4 w-4 text-blue-600" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metric.value}</div>
          <div className="flex items-center mt-1">
            {metric.changeType === 'positive' ? (
              <TrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
            ) : metric.changeType === 'negative' ? (
              <TrendingDownIcon className="h-4 w-4 text-red-500 mr-1" />
            ) : null}
            <span className={`text-xs ${metric.changeType === 'positive' ? 'text-green-500' : metric.changeType === 'negative' ? 'text-red-500' : 'text-muted-foreground'}`}>
              {metric.change > 0 ? '+' : ''}{metric.change.toFixed(1)}% {metric.changeType === 'positive' ? 'increase' : metric.changeType === 'negative' ? 'decrease' : 'no change'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{metric.description}</p>
        </CardContent>
      </Card>
    );
  }), [getIconComponent]);

  if (loading) {
    return <BusinessIntelligenceSkeleton />;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((metric) => (
        <BusinessIntelligenceCard key={metric.id} metric={metric} />
      ))}
    </div>
  );
};

export default React.memo(BusinessIntelligenceDashboard);