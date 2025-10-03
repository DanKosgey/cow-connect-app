import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Users, 
  Milk, 
  DollarSign, 
  BarChart3, 
  Settings, 
  LogOut,
  UserCog,
  CheckCircle,
  FileText,
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface NavItem {
  label: string;
  path: string;
  icon: ReactNode;
}

interface DashboardLayoutProps {
  children: ReactNode;
}

const roleNavigation: Record<string, NavItem[]> = {
  farmer: [
    { label: 'Dashboard', path: '/farmer/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
    { label: 'My Collections', path: '/farmer/collections', icon: <Milk className="h-5 w-5" /> },
    { label: 'Payments', path: '/farmer/payments', icon: <DollarSign className="h-5 w-5" /> },
    { label: 'Analytics', path: '/farmer/analytics', icon: <BarChart3 className="h-5 w-5" /> },
    { label: 'Profile', path: '/farmer/profile', icon: <UserCog className="h-5 w-5" /> },
  ],
  staff: [
    { label: 'Dashboard', path: '/staff/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
    { label: 'New Collection', path: '/staff/new-collection', icon: <Milk className="h-5 w-5" /> },
    { label: 'My Collections', path: '/staff/collections', icon: <FileText className="h-5 w-5" /> },
    { label: 'Farmers', path: '/staff/farmers', icon: <Users className="h-5 w-5" /> },
    { label: 'Profile', path: '/staff/profile', icon: <UserCog className="h-5 w-5" /> },
  ],
  admin: [
    { label: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
    { label: 'Farmers', path: '/admin/farmers', icon: <Users className="h-5 w-5" /> },
    { label: 'Staff', path: '/admin/staff', icon: <UserCog className="h-5 w-5" /> },
    { label: 'KYC Approvals', path: '/admin/kyc', icon: <CheckCircle className="h-5 w-5" /> },
    { label: 'Collections', path: '/admin/collections', icon: <Milk className="h-5 w-5" /> },
    { label: 'Payments', path: '/admin/payments', icon: <DollarSign className="h-5 w-5" /> },
    { label: 'Analytics', path: '/admin/analytics', icon: <BarChart3 className="h-5 w-5" /> },
    { label: 'Settings', path: '/admin/settings', icon: <Settings className="h-5 w-5" /> },
  ],
};

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { userRole, signOut, user } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navigation = userRole ? roleNavigation[userRole] || [] : [];

  return (
    <div className="min-h-screen bg-background flex w-full">
      {/* Sidebar */}
      <aside
        className={cn(
          "bg-card border-r border-border transition-all duration-300 flex flex-col",
          sidebarOpen ? "w-64" : "w-20"
        )}
      >
        {/* Logo & Toggle */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <Milk className="h-8 w-8 text-primary" />
              <span className="font-bold text-xl">DairyChain</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="ml-auto"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navigation.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3",
                    !sidebarOpen && "justify-center"
                  )}
                >
                  {item.icon}
                  {sidebarOpen && <span>{item.label}</span>}
                </Button>
              </Link>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-border space-y-2">
          {sidebarOpen && (
            <div className="px-3 py-2 text-sm">
              <p className="font-medium">{user?.email}</p>
              <p className="text-xs text-muted-foreground capitalize">{userRole}</p>
            </div>
          )}
          <Button
            variant="ghost"
            onClick={signOut}
            className={cn(
              "w-full justify-start gap-3 text-destructive hover:text-destructive",
              !sidebarOpen && "justify-center"
            )}
          >
            <LogOut className="h-5 w-5" />
            {sidebarOpen && <span>Logout</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
};
