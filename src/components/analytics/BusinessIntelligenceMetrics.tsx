import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Activity,
  Award,
  TrendingUpIcon,
  TrendingDownIcon
} from 'lucide-react';
import { businessIntelligenceService } from '@/services/business-intelligence-service';

interface BusinessIntelligenceMetric {
  id: string;
  title: string;
  value: string | number;
  change: number;
  changeType: 'positive' | 'negative' | 'neutral';
  description: string;
  icon: string;
}

const BusinessIntelligenceMetrics = ({ timeRange = 'week' }: { timeRange?: string }) => {
  const [metrics, setMetrics] = useState<BusinessIntelligenceMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const data = await businessIntelligenceService.calculateBusinessIntelligenceMetrics(timeRange);
        setMetrics(data);
      } catch (error) {
        console.error('Error fetching business intelligence metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [timeRange]);

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'DollarSign': return DollarSign;
      case 'TrendingUp': return TrendingUp;
      case 'Activity': return Activity;
      case 'Award': return Award;
      default: return TrendingUp;
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
              <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="h-6 bg-gray-200 rounded animate-pulse w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded animate-pulse w-1/3"></div>
              <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4 mt-2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const BusinessIntelligenceCard = ({ metric }: { metric: BusinessIntelligenceMetric }) => {
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
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((metric) => (
        <BusinessIntelligenceCard key={metric.id} metric={metric} />
      ))}
    </div>
  );
};

export default BusinessIntelligenceMetrics;