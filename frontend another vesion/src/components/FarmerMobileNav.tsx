import { useState } from 'react';
import { 
  Home, 
  Milk, 
  DollarSign, 
  BarChart3, 
  User, 
  FileText, 
  Bell, 
  Settings,
  Menu,
  X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { name: 'Dashboard', href: '/farmer', icon: Home },
  { name: 'Collections', href: '/farmer/collections', icon: Milk },
  { name: 'Payments', href: '/farmer/payments', icon: DollarSign },
  { name: 'Analytics', href: '/farmer/analytics', icon: BarChart3 },
  { name: 'Profile', href: '/farmer/profile', icon: User },
  { name: 'Documents', href: '/farmer/documents', icon: FileText },
  { name: 'Notifications', href: '/farmer/notifications', icon: Bell },
  { name: 'Settings', href: '/farmer/settings', icon: Settings },
];

export function FarmerMobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  
  // Add swipe navigation to close the menu when swiping left
  const { elementRef } = useSwipeNavigation({
    onSwipeLeft: () => setIsOpen(false),
    minSwipeDistance: 30
  });

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className="md:hidden border-green-300 text-green-700 hover:bg-green-50"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent 
        side="left" 
        className="w-[300px] sm:w-[400px] bg-gradient-to-b from-green-50 to-emerald-50 border-r border-green-200"
        ref={elementRef}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-green-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <Milk className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold bg-gradient-to-r from-green-700 to-emerald-700 bg-clip-text text-transparent">
                  DairyChain Pro
                </h2>
                <p className="text-xs text-green-600">Farmer Portal</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsOpen(false)}
              className="text-green-700 hover:bg-green-100"
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Close menu</span>
            </Button>
          </div>
          
          <nav 
            className="flex-1 overflow-y-auto py-4"
            role="navigation"
            aria-label="Mobile navigation"
          >
            <div className="space-y-1 px-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className="flex items-center space-x-3 rounded-lg px-4 py-3 text-base font-medium text-green-700 hover:bg-green-100 transition-colors"
                    onClick={() => setIsOpen(false)}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
          
          <div className="p-4 border-t border-green-200">
            <Button 
              variant="outline" 
              className="w-full border-green-300 text-green-700 hover:bg-green-50"
              onClick={() => setIsOpen(false)}
            >
              Close Menu
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}