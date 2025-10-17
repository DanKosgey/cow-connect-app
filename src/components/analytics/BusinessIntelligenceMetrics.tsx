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
  TrendingDownIcon,
  ChevronUp,
  ChevronDown,
  Users,
  BarChart3,
  AlertCircle
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

  console.log('BusinessIntelligenceMetrics component rendered with timeRange:', timeRange);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        console.log('Fetching business intelligence metrics for time range:', timeRange);
        const data = await businessIntelligenceService.calculateBusinessIntelligenceMetrics(timeRange);
        console.log('Business intelligence metrics fetched:', data);
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
    console.log('Getting icon component for:', iconName);
    switch (iconName) {
      case 'DollarSign': 
        console.log('Returning DollarSign icon');
        return DollarSign;
      case 'TrendingUp': 
        console.log('Returning TrendingUp icon');
        return TrendingUp;
      case 'Activity': 
        console.log('Returning Activity icon');
        return Activity;
      case 'Award': 
        console.log('Returning Award icon');
        return Award;
      case 'Users': 
        console.log('Returning Users icon');
        return Users;
      case 'BarChart3': 
        console.log('Returning BarChart3 icon');
        return BarChart3;
      default: 
        console.log('Returning default TrendingUp icon');
        return TrendingUp;
    }
  };

  if (loading) {
    console.log('BusinessIntelligenceMetrics is loading');
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="hover:shadow-lg transition-shadow animate-pulse">
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

  // Check if metrics are empty
  if (!metrics || metrics.length === 0) {
    console.log('BusinessIntelligenceMetrics has no data');
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
        <p className="text-gray-500">Business intelligence metrics could not be calculated.</p>
      </div>
    );
  }

  const BusinessIntelligenceCard = ({ metric }: { metric: BusinessIntelligenceMetric }) => {
    console.log('BusinessIntelligenceCard rendering metric:', metric);
    
    const IconComponent = getIconComponent(metric.icon);
    
    // Determine gradient based on metric type
    let gradientClass = "from-blue-500 to-blue-700";
    if (metric.id.includes('revenue') || metric.id.includes('cost')) {
      gradientClass = "from-green-500 to-green-700";
    } else if (metric.id.includes('quality')) {
      gradientClass = "from-purple-500 to-purple-700";
    } else if (metric.id.includes('collection')) {
      gradientClass = "from-amber-500 to-amber-700";
    } else if (metric.id.includes('farmer') || metric.id.includes('retention')) {
      gradientClass = "from-indigo-500 to-indigo-700";
    } else if (metric.id.includes('profit')) {
      gradientClass = "from-teal-500 to-teal-700";
    }
    
    console.log('Icon component:', IconComponent, 'Gradient class:', gradientClass);
    
    return (
      <Card className="hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-0 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-700">{metric.title}</CardTitle>
          <div className={`p-2 rounded-full bg-gradient-to-r ${gradientClass} shadow-md`}>
            <IconComponent className="h-4 w-4 text-white" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">{metric.value}</div>
          <div className="flex items-center mt-1">
            {metric.changeType === 'positive' ? (
              <ChevronUp className="h-4 w-4 text-green-500 mr-1" />
            ) : metric.changeType === 'negative' ? (
              <ChevronDown className="h-4 w-4 text-red-500 mr-1" />
            ) : null}
            <span className={`text-xs font-medium ${metric.changeType === 'positive' ? 'text-green-600' : metric.changeType === 'negative' ? 'text-red-600' : 'text-muted-foreground'}`}>
              {metric.change > 0 ? '+' : ''}{metric.change.toFixed(1)}% {metric.changeType === 'positive' ? 'increase' : metric.changeType === 'negative' ? 'decrease' : 'no change'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">{metric.description}</p>
        </CardContent>
      </Card>
    );
  };

  // Determine grid columns based on number of metrics (max 4 per row)
  let gridColsClass = '';
  if (metrics.length === 1) {
    gridColsClass = 'grid-cols-1';
  } else if (metrics.length === 2) {
    gridColsClass = 'grid-cols-1 md:grid-cols-2';
  } else if (metrics.length === 3) {
    gridColsClass = 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
  } else {
    gridColsClass = 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';
  }

  console.log('Grid columns class:', gridColsClass, 'Metrics count:', metrics.length, 'Metrics:', metrics);

  return (
    <div className={`grid ${gridColsClass} gap-6`}>
      {metrics.map((metric) => (
        <BusinessIntelligenceCard key={metric.id} metric={metric} />
      ))}
    </div>
  );
};

export default BusinessIntelligenceMetrics;