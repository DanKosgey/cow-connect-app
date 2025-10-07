import { FC, ReactNode } from 'react';
import { Button } from '../ui/button';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  description: string;
  actions?: ReactNode;
  icon?: ReactNode;
}

export const PageHeader = ({ title, description, actions, icon }: PageHeaderProps) => {
  return (
    <div className="mb-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            {icon && <span className="text-blue-500">{icon}</span>}
            {title}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">{description}</p>
        </div>
        {actions && <div className="mt-4 md:mt-0">{actions}</div>}
      </div>
    </div>
  );
};
