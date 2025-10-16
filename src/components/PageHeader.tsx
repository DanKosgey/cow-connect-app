import { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export const PageHeader = ({ title, description, actions, className = "" }: PageHeaderProps) => {
  return (
    <div className={`flex flex-col md:flex-row md:items-center md:justify-between mb-8 ${className}`}>
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        {description && <p className="text-gray-600 mt-2">{description}</p>}
      </div>
      {actions && <div className="mt-4 md:mt-0">{actions}</div>}
    </div>
  );
};