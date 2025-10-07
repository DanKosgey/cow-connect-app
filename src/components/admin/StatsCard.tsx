import { Card, CardContent } from '@/components/ui/card';
import { ReactNode } from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  color: string;
  description?: string;
}

export const StatsCard = ({ title, value, icon, color, description }: StatsCardProps) => {
  return (
    <Card className={`border-l-4 ${color} hover:shadow-lg transition-shadow duration-300`}>
      <CardContent className="p-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            {description && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{description}</p>
            )}
          </div>
          <div className={`p-2 rounded-full ${color.replace('border-l', 'bg').replace('-500', '-100')} dark:${color.replace('border-l', 'bg').replace('-500', '-900/30')}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};