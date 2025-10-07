import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  path: string;
  isCurrent?: boolean;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
}

const breadcrumbMap: Record<string, string> = {
  'dashboard': 'Dashboard',
  'farmers': 'Farmers',
  'staff': 'Staff',
  'payments': 'Payments',
  'collections': 'Collections',
  'kyc': 'KYC',
  'settings': 'Settings',
  'invite': 'Invite',
  'analytics': 'Analytics',
  'profile': 'Profile',
  'notifications': 'Notifications'
};

export function Breadcrumb({ items }: BreadcrumbProps) {
  const location = useLocation();
  
  // Generate breadcrumbs from current location if not provided
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathnames = location.pathname.split('/').filter(x => x);
    
    if (pathnames.length === 0) {
      return [{ label: 'Home', path: '/', isCurrent: true }];
    }
    
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Home', path: '/', isCurrent: false }
    ];
    
    pathnames.forEach((pathname, index) => {
      const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
      const label = breadcrumbMap[pathname] || pathname;
      const isCurrent = index === pathnames.length - 1;
      
      breadcrumbs.push({
        label,
        path: routeTo,
        isCurrent
      });
    });
    
    // Mark last item as current
    if (breadcrumbs.length > 0) {
      breadcrumbs[breadcrumbs.length - 1].isCurrent = true;
    }
    
    return breadcrumbs;
  };
  
  const breadcrumbs = items || generateBreadcrumbs();
  
  if (breadcrumbs.length <= 1) {
    return null;
  }
  
  return (
    <nav className="flex mb-4" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-2">
        {breadcrumbs.map((breadcrumb, index) => (
          <li key={breadcrumb.path} className="inline-flex items-center">
            {index > 0 && (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            {breadcrumb.isCurrent ? (
              <span className="ml-1 text-sm font-medium text-foreground md:ml-2">
                {breadcrumb.label}
              </span>
            ) : (
              <Link 
                to={breadcrumb.path}
                className={cn(
                  "ml-1 text-sm font-medium text-muted-foreground hover:text-foreground md:ml-2",
                  index === 0 && "flex items-center"
                )}
              >
                {index === 0 && <Home className="h-4 w-4 mr-1" />}
                {breadcrumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}