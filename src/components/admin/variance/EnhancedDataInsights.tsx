import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';

interface DataInsight {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: 'green' | 'red' | 'blue';
}

interface EnhancedDataInsightsProps {
  insights: DataInsight[];
}

const EnhancedDataInsights: React.FC<EnhancedDataInsightsProps> = ({ insights }) => {
  // Get color classes based on the color prop
  const getColorClasses = (color: string) => {
    switch (color) {
      case 'green':
        return {
          bg: 'bg-green-50 dark:bg-green-900/20',
          border: 'border-green-200 dark:border-green-800/50',
          text: 'text-green-800 dark:text-green-300',
          iconBg: 'bg-green-100 dark:bg-green-900/30',
          iconText: 'text-green-600 dark:text-green-400'
        };
      case 'red':
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800/50',
          text: 'text-red-800 dark:text-red-300',
          iconBg: 'bg-red-100 dark:bg-red-900/30',
          iconText: 'text-red-600 dark:text-red-400'
        };
      case 'blue':
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-200 dark:border-blue-800/50',
          text: 'text-blue-800 dark:text-blue-300',
          iconBg: 'bg-blue-100 dark:bg-blue-900/30',
          iconText: 'text-blue-600 dark:text-blue-400'
        };
      default:
        return {
          bg: 'bg-gray-50 dark:bg-gray-800',
          border: 'border-gray-200 dark:border-gray-700',
          text: 'text-gray-800 dark:text-gray-300',
          iconBg: 'bg-gray-100 dark:bg-gray-700',
          iconText: 'text-gray-600 dark:text-gray-400'
        };
    }
  };

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader>
        <CardTitle>Data Insights</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {insights.map((insight, index) => {
            const colors = getColorClasses(insight.color);
            
            return (
              <div 
                key={index} 
                className={`${colors.bg} ${colors.border} border rounded-lg p-4 transition-all duration-200 hover:scale-[1.02]`}
              >
                <div className="flex items-start gap-3">
                  <div className={`${colors.iconBg} ${colors.iconText} p-2 rounded-lg`}>
                    {insight.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-semibold text-base ${colors.text} mb-1`}>
                      {insight.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {insight.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

// Predefined insight components for common use cases
const VarianceAnalysisInsights: React.FC = () => {
  const insights = [
    {
      title: "Positive Variances",
      description: "Occur when the company receives more milk than was collected by the collector. This could indicate measurement errors or other factors.",
      icon: <TrendingUp className="h-5 w-5" />,
      color: "green" as const
    },
    {
      title: "Negative Variances",
      description: "Occur when the company receives less milk than was collected by the collector. This could indicate spillage, theft, or measurement errors.",
      icon: <TrendingDown className="h-5 w-5" />,
      color: "red" as const
    },
    {
      title: "Penalty System",
      description: "Penalties are automatically calculated based on variance percentages and applied according to the configured penalty rates.",
      icon: <AlertTriangle className="h-5 w-5" />,
      color: "blue" as const
    }
  ];

  return <EnhancedDataInsights insights={insights} />;
};

export { EnhancedDataInsights, VarianceAnalysisInsights };