import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Milk, 
  User, 
  FileText, 
  Bell, 
  Settings,
  BarChart3,
  HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const FarmerNavigation: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  
  const navItems = [
    {
      name: 'Dashboard',
      href: '/farmer',
      icon: Home,
    },
    {
      name: 'Collections',
      href: '/farmer/collections',
      icon: Milk,
    },
    {
      name: 'Analytics',
      href: '/farmer/analytics',
      icon: BarChart3,
    },
    {
      name: 'Profile',
      href: '/farmer/profile',
      icon: User,
    },
    {
      name: 'Documents',
      href: '/farmer/documents',
      icon: FileText,
    },
    {
      name: 'Notifications',
      href: '/farmer/notifications',
      icon: Bell,
    },
    {
      name: 'Support',
      href: '/farmer/support',
      icon: HelpCircle,
    },
    {
      name: 'Settings',
      href: '/farmer/settings',
      icon: Settings,
    },
  ];

  return (
    <nav 
      className="flex flex-col space-y-1"
      role="navigation"
      aria-label="Farmer dashboard navigation"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.href;
        
        return (
          <Link
            key={item.name}
            to={item.href}
            className={`
              flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors
              ${isActive
                ? 'bg-green-100 text-green-700'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }
            `}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className="mr-3 h-5 w-5" />
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
};

export default FarmerNavigation;