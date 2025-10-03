import { FC, ReactNode } from 'react';
import { Button } from '../ui/button';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  showBack?: boolean;
}

export const PageHeader: FC<PageHeaderProps> = ({
  title,
  subtitle,
  actions,
  showBack = false,
}) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col space-y-4 md:flex-row md:justify-between md:space-y-0">
      <div className="space-y-2">
        <div className="flex items-center space-x-4">
          {showBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        </div>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center space-x-4">{actions}</div>}
    </div>
  );
};