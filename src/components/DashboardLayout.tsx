// DashboardLayout.tsx - Enhanced version with proper auth handling and reduced layout shifts
import { ReactNode, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
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
  X,
  Route,
  Target,
  ClipboardList,
  Bell,
  MapPin,
  Wifi
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useCallback, useEffect } from 'react';

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
    { label: 'Notifications', path: '/farmer/notifications', icon: <Bell className="h-5 w-5" /> },
    { label: 'Profile', path: '/farmer/profile', icon: <UserCog className="h-5 w-5" /> },
  ],
  staff: [
    { label: 'Dashboard', path: '/staff/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
    { label: 'New Collection', path: '/staff/collections/new', icon: <ClipboardList className="h-5 w-5" /> },
    { label: 'Collections', path: '/staff/collections', icon: <Milk className="h-5 w-5" /> },
    { label: 'Farmers', path: '/staff/farmers', icon: <Users className="h-5 w-5" /> },
    { label: 'Payments', path: '/staff/payments/approval', icon: <DollarSign className="h-5 w-5" /> },
    { label: 'Performance', path: '/staff/performance', icon: <BarChart3 className="h-5 w-5" /> },
    { label: 'Routes', path: '/staff/routes', icon: <Route className="h-5 w-5" /> },
    { label: 'Profile', path: '/staff/profile', icon: <UserCog className="h-5 w-5" /> },
  ],
  admin: [
    { label: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
    { label: 'Checkpoints', path: '/admin/checkpoints', icon: <MapPin className="h-5 w-5" /> },
    { label: 'Collections', path: '/admin/collections', icon: <Milk className="h-5 w-5" /> },
    { label: 'Payments', path: '/admin/payments', icon: <DollarSign className="h-5 w-5" /> },
    { label: 'Analytics', path: '/admin/analytics', icon: <BarChart3 className="h-5 w-5" /> },
    { label: 'KYC Approvals', path: '/admin/kyc', icon: <CheckCircle className="h-5 w-5" /> },
    { label: 'Farmers', path: '/admin/farmers', icon: <Users className="h-5 w-5" /> },
    { label: 'Staff', path: '/admin/staff', icon: <UserCog className="h-5 w-5" /> },
    { label: 'Settings', path: '/admin/settings', icon: <Settings className="h-5 w-5" /> },
    { label: 'Network Diagnostics', path: '/admin/network-diagnostics', icon: <Wifi className="h-5 w-5" /> },
  ],
};

// Add fixed dimensions to prevent layout shifts
const sidebarStyle = {
  width: '256px', // Fixed width for sidebar
};

const headerStyle = {
  height: '72px', // Fixed height for header
};

// Predefined navigation item heights for consistent layout
const NAV_ITEM_HEIGHT = 44; // px

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { userRole, signOut, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false); // Start closed on mobile

  // Memoize navigation to prevent unnecessary re-renders
  const navigation = useMemo(() => {
    return userRole ? roleNavigation[userRole] || [] : [];
  }, [userRole]);

  // Memoize the active state check
  const isActivePath = useCallback((path: string) => {
    return location.pathname === path;
  }, [location.pathname]);

  // Close sidebar when route changes on mobile
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex w-full flex-col md:flex-row">
      {/* Mobile header with menu toggle */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card" style={headerStyle}>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
        <div className="flex items-center gap-2">
          <Milk className="h-8 w-8 text-primary" />
          <span className="font-bold text-xl">DairyChain</span>
        </div>
        <div className="w-10"></div> {/* Spacer for alignment */}
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          "bg-card border-r border-border transition-all duration-300 ease-in-out flex flex-col",
          "md:static md:translate-x-0 md:top-auto md:bottom-auto",
          "fixed inset-y-0 left-0 z-50 md:z-auto",
          sidebarOpen ? "w-64 translate-x-0" : "w-64 -translate-x-full md:translate-x-0 md:w-20",
          "md:w-64 md:translate-x-0"
        )}
        style={sidebarStyle}
      >
        {/* Logo & Toggle (Desktop) */}
        <div className="hidden md:flex p-4 border-b border-border items-center justify-between" style={{ height: '72px' }}>
          <div className="flex items-center gap-2">
            <Milk className="h-8 w-8 text-primary" />
            <span className="font-bold text-xl">DairyChain</span>
          </div>
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
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto" style={{ 
          // Pre-calculate height to prevent layout shifts
          minHeight: `${navigation.length * NAV_ITEM_HEIGHT + 20}px`
        }}>
          {navigation.map((item, index) => {
            const isActive = isActivePath(item.path);
            return (
              <Link 
                key={item.path} 
                to={item.path}
                onClick={() => {
                  setSidebarOpen(false); // Close sidebar on mobile after selection
                }}
              >
                <Button
                  variant={isActive ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3 transition-all duration-200 h-11",
                    !sidebarOpen && "justify-center",
                    isActive && "shadow-medium"
                  )}
                >
                  <span>
                    {item.icon}
                  </span>
                  <span className={cn(!sidebarOpen && "hidden md:inline")}>
                    {item.label}
                  </span>
                </Button>
              </Link>
            );
          })}
        </nav>

        {/* User Info & Logout - Fixed height to prevent layout shifts */}
        <div className="p-4 border-t border-border space-y-2" style={{ minHeight: '120px' }}>
          {sidebarOpen && user?.email && (
            <div className="px-3 py-2 text-sm hidden md:block">
              <p className="font-medium truncate">{user.email}</p>
              <p className="text-xs text-muted-foreground capitalize">{userRole}</p>
            </div>
          )}
          <Button
            variant="ghost"
            onClick={async () => {
              await signOut();
              navigate('/', { state: { clearAuth: true } });
            }}
            className={cn(
              "w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10 transition-all duration-200 h-11",
              !sidebarOpen && "justify-center"
            )}
          >
            <LogOut className="h-5 w-5" />
            <span className={cn(!sidebarOpen && "hidden md:inline")}>
              Logout
            </span>
          </Button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
};