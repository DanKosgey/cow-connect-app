import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  color?: string;
  className?: string;
}

export const StatCard = ({ 
  title, 
  value, 
  description, 
  icon, 
  color = "bg-blue-100", 
  className = "" 
}: StatCardProps) => {
  return (
    <Card className={`border border-border hover:shadow-md transition-shadow ${className}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        {icon && (
          <div className={`p-2 rounded-full ${color}`}>
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
};