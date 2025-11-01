// DashboardLayout.tsx - Enhanced version with proper auth handling and reduced layout shifts
import { ReactNode, useMemo, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Users, 
  Milk, 
  BarChart3, 
  Settings,
  LogOut,
  UserCog,
  CheckCircle,
  FileText,
  Menu,
  X,
  Target,
  ClipboardList,
  Bell,
  Wifi,
  TrendingUp,
  MessageCircle,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Activity,
  DollarSign,
  CreditCard,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface NavItem {
  label: string;
  path: string;
  icon: ReactNode;
  category?: string; // For grouping navigation items
}

interface DashboardLayoutProps {
  children?: ReactNode;
}

// Enhanced navigation with categories and better organization
// Following user preference order: Dashboard, Checkpoints, Collections, Analytics, KYC Approvals, Farmers, Staff, Settings
const roleNavigation: Record<string, NavItem[]> = {
  farmer: [
    // Main Dashboard
    { label: 'Dashboard', path: '/farmer/dashboard', icon: <LayoutDashboard className="h-5 w-5" />, category: 'main' },
    
    // Operations - Core farming activities
    { label: 'My Collections', path: '/farmer/collections', icon: <Milk className="h-5 w-5" />, category: 'operations' },
    
    // Finance - Payments and earnings
    { label: 'Payments', path: '/farmer/payments', icon: <Activity className="h-5 w-5" />, category: 'finance' },
    { label: 'Credit', path: '/farmer/credit', icon: <CreditCard className="h-5 w-5" />, category: 'finance' },
    { label: 'Analytics', path: '/farmer/analytics', icon: <BarChart3 className="h-5 w-5" />, category: 'finance' },
    
    // Communication & Community
    { label: 'Community Forum', path: '/farmer/community', icon: <MessageCircle className="h-5 w-5" />, category: 'community' },
    { label: 'Notifications', path: '/farmer/notifications', icon: <Bell className="h-5 w-5" />, category: 'community' },
    
    // Account Management
    { label: 'KYC Upload', path: '/farmer/kyc-upload', icon: <FileText className="h-5 w-5" />, category: 'account' },
    { label: 'Profile', path: '/farmer/profile', icon: <UserCog className="h-5 w-5" />, category: 'account' },
    
    // System & Settings
    { label: 'Application Status', path: '/farmer/application-status', icon: <Activity className="h-5 w-5" />, category: 'system' },
    { label: 'Documents Under Review', path: '/farmer/documents-under-review', icon: <FileText className="h-5 w-5" />, category: 'system' },
  ],
  staff: [
    { label: 'Dashboard', path: '/staff/dashboard', icon: <LayoutDashboard className="h-5 w-5" />, category: 'main' },
    { label: 'New Collection', path: '/staff/collections/new', icon: <ClipboardList className="h-5 w-5" />, category: 'operations' },
    { label: 'Collections', path: '/staff/collections', icon: <Milk className="h-5 w-5" />, category: 'operations' },
    { label: 'Farmers', path: '/staff/farmers', icon: <Users className="h-5 w-5" />, category: 'management' },
    { label: 'Performance', path: '/staff/performance', icon: <BarChart3 className="h-5 w-5" />, category: 'analytics' },
    { label: 'Profile', path: '/staff/profile', icon: <UserCog className="h-5 w-5" />, category: 'settings' },
  ],
  admin: [
    { label: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard className="h-5 w-5" />, category: 'main' },
    { label: 'Checkpoints', path: '/admin/checkpoints', icon: <Target className="h-5 w-5" />, category: 'operations' },
    { label: 'Collections', path: '/admin/collections', icon: <Milk className="h-5 w-5" />, category: 'operations' },
    { label: 'Payments', path: '/admin/payments', icon: <DollarSign className="h-5 w-5" />, category: 'finance' },
    { label: 'Credit Management', path: '/admin/credit-management', icon: <CreditCard className="h-5 w-5" />, category: 'finance' },
    { label: 'Credit Defaults', path: '/admin/credit-defaults', icon: <AlertTriangle className="h-5 w-5" />, category: 'finance' },
    { label: 'Credit Audit', path: '/admin/credit-audit', icon: <FileText className="h-5 w-5" />, category: 'finance' },
    { label: 'Credit Reports', path: '/admin/credit-reports', icon: <FileText className="h-5 w-5" />, category: 'finance' },
    { label: 'Analytics', path: '/admin/analytics', icon: <BarChart3 className="h-5 w-5" />, category: 'analytics' },
    { label: 'Farmer Performance', path: '/admin/farmer-performance', icon: <Activity className="h-5 w-5" />, category: 'analytics' },
    { label: 'KYC Approvals', path: '/admin/kyc-pending-farmers', icon: <CheckCircle className="h-5 w-5" />, category: 'kyc' },
    { label: 'Farmers', path: '/admin/farmers', icon: <Users className="h-5 w-5" />, category: 'management' },
    { label: 'Staff', path: '/admin/staff', icon: <UserCog className="h-5 w-5" />, category: 'management' },
    { label: 'Settings', path: '/admin/settings', icon: <Settings className="h-5 w-5" />, category: 'settings' },
  ],
};

// Predefined navigation item heights for consistent layout
const NAV_ITEM_HEIGHT = 44; // px

// Custom styles for navigation categories
const categoryStyles: Record<string, { bg: string; text: string; border: string }> = {
  main: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary' },
  operations: { bg: 'bg-accent/10', text: 'text-accent', border: 'border-accent' },
  finance: { bg: 'bg-success/10', text: 'text-success', border: 'border-success' },
  analytics: { bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning' },
  kyc: { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500' },
  management: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500' },
  settings: { bg: 'bg-gray-500/10', text: 'text-gray-500', border: 'border-gray-500' },
  system: { bg: 'bg-destructive/10', text: 'text-destructive', border: 'border-destructive' },
  communications: { bg: 'bg-cyan-500/10', text: 'text-cyan-500', border: 'border-cyan-500' },
  market: { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500' },
  community: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500' },
  account: { bg: 'bg-indigo-500/10', text: 'text-indigo-500', border: 'border-indigo-500' },
};

// Fixed dimensions to prevent layout shifts
const sidebarStyle = {
  width: '256px', // Fixed width for sidebar
};

const headerStyle = {
  height: '72px', // Fixed height for header
};

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { userRole, signOut, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false); // Start closed on mobile
  
  // Memoize the handleLogout function to prevent unnecessary re-renders
  const handleLogout = useCallback(async () => {
    try {
      console.log('[DashboardLayout] Logout initiated', { userRole, userId: user?.id });
      console.log('[PortalAccess] User initiating logout', {
        userRole,
        userId: user?.id,
        timestamp: new Date().toISOString(),
        path: location.pathname
      });
      
      await signOut();
      console.log('[DashboardLayout] Logout completed successfully');
      console.log('[PortalAccess] User logout completed', {
        userRole,
        userId: user?.id,
        timestamp: new Date().toISOString()
      });
      
      // Redirect to role-specific login page or home
      if (userRole) {
        const loginPaths: Record<string, string> = {
          'farmer': '/farmer/login',
          'staff': '/staff/login',
          'admin': '/admin/login'
        };
        
        const loginPath = loginPaths[userRole] || '/';
        console.log('[DashboardLayout] Redirecting to login page', { loginPath });
        console.log('[PortalAccess] Redirecting user after logout', {
          userRole,
          targetPath: loginPath,
          timestamp: new Date().toISOString()
        });
        navigate(loginPath, { state: { clearAuth: true } });
      } else {
        console.log('[DashboardLayout] Redirecting to home page');
        console.log('[PortalAccess] Redirecting user to home after logout', {
          timestamp: new Date().toISOString()
        });
        navigate('/', { state: { clearAuth: true } });
      }
    } catch (error) {
      console.error('[DashboardLayout] Logout error:', error);
      console.log('[PortalAccess] Logout error occurred', {
        userRole,
        userId: user?.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      
      // Even if there's an error, still navigate to appropriate login page
      if (userRole) {
        const loginPaths: Record<string, string> = {
          'farmer': '/farmer/login',
          'staff': '/staff/login',
          'admin': '/admin/login'
        };
        
        const loginPath = loginPaths[userRole] || '/';
        console.log('[DashboardLayout] Redirecting to login page after error', { loginPath });
        console.log('[PortalAccess] Redirecting user after logout error', {
          userRole,
          targetPath: loginPath,
          timestamp: new Date().toISOString()
        });
        navigate(loginPath, { state: { clearAuth: true } });
      } else {
        console.log('[DashboardLayout] Redirecting to home page after error');
        console.log('[PortalAccess] Redirecting user to home after logout error', {
          timestamp: new Date().toISOString()
        });
        navigate('/', { state: { clearAuth: true } });
      }
    }
  }, [userRole, user, location.pathname, navigate, signOut]);

  // Minimal component mount/unmount logging
  useEffect(() => {
    if (import.meta.env.DEV) {
      // Only minimal logging for component lifecycle
    }
    
    return () => {
      // Cleanup
    };
  }, [userRole, user, location.pathname]);

  // Minimal location changes logging
  useEffect(() => {
    if (import.meta.env.DEV) {
      // Only minimal logging for navigation
    }
  }, [location.pathname, userRole, user]);

  // Memoize navigation to prevent unnecessary re-renders
  const navigation = useMemo(() => {
    return userRole ? roleNavigation[userRole] || [] : [];
  }, [userRole]);

  // Group navigation items by category
  const groupedNavigation = useMemo(() => {
    const groups: Record<string, NavItem[]> = {};
    navigation.forEach(item => {
      const category = item.category || 'other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
    });
    return groups;
  }, [navigation]);

  // Memoize the active state check
  const isActivePath = useCallback((path: string) => {
    return location.pathname === path;
  }, [location.pathname]);

  // Close sidebar when route changes on mobile
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Navigation controls functions with reduced logging
  const handleBack = () => {
    if (import.meta.env.DEV) {
      // Minimal logging for navigation actions
    }
    navigate(-1);
  };

  const handleForward = () => {
    if (import.meta.env.DEV) {
      // Minimal logging for navigation actions
    }
    navigate(1);
  };

  const handleRefresh = () => {
    if (import.meta.env.DEV) {
      // Minimal logging for refresh action
    }
    // Reload the current page
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background flex w-full flex-col md:flex-row">
      {/* Mobile header with menu toggle */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card" style={headerStyle}>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            console.log('[DashboardLayout] Mobile menu toggle clicked', { sidebarOpen });
            setSidebarOpen(!sidebarOpen);
          }}
        >
          {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
        <div className="flex items-center gap-2">
          <Milk className="h-8 w-8 text-primary" />
          <span className="font-bold text-xl">Dairy Farmers of Trans Nzoia</span>
        </div>
        <div className="w-10"></div> {/* Spacer for alignment */}
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          "bg-card border-r border-border transition-all duration-300 ease-in-out flex flex-col",
          "md:static md:translate-x-0 md:top-auto md:bottom-auto",
          "fixed inset-y-0 left-0 z-50 md:z-auto",
          sidebarOpen ? "w-64 translate-x-0" : "w-64 -translate-x-full md:translate-x-0 md:w-64"
        )}
        style={sidebarStyle}
      >
        {/* Logo & Toggle (Desktop) */}
        <div className="hidden md:flex p-4 border-b border-border items-center justify-between" style={{ height: '72px' }}>
          <div className="flex items-center gap-2">
            <Milk className="h-8 w-8 text-primary" />
            <span className="font-bold text-xl">Dairy Farmers of Trans Nzoia</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Navigation Controls */}
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                title="Go back"
                className="h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleForward}
                title="Go forward"
                className="h-8 w-8"
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                title="Refresh page"
                className="h-8 w-8"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                console.log('[DashboardLayout] Desktop menu toggle clicked', { sidebarOpen });
                setSidebarOpen(!sidebarOpen);
              }}
              className="ml-2"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Admin Rate Display for Admin */}
        {/* Market Prices display removed as requested */}

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {Object.entries(groupedNavigation).map(([category, items]) => (
            <div key={category} className="mb-2">
              {/* Category header - only show when sidebar is expanded */}
              {sidebarOpen && (
                <div className={cn(
                  "px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded mb-1",
                  categoryStyles[category]?.bg || 'bg-muted',
                  categoryStyles[category]?.text || 'text-muted-foreground'
                )}>
                  {category}
                </div>
              )}
              
              {/* Navigation items */}
              {items.map((item) => {
                const isActive = isActivePath(item.path);
                const categoryStyle = categoryStyles[item.category || 'other'] || categoryStyles.main;
                
                return (
                  <Link 
                    key={item.path} 
                    to={item.path}
                    onClick={() => {
                      console.log('[DashboardLayout] Navigation item clicked', { path: item.path, label: item.label });
                      console.log('[PortalNavigation] User navigating to', {
                        targetPath: item.path,
                        label: item.label,
                        userRole,
                        userId: user?.id,
                        timestamp: new Date().toISOString()
                      });
                      setSidebarOpen(false); // Close sidebar on mobile after selection
                    }}
                  >
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      className={cn(
                        "w-full justify-start gap-3 transition-all duration-200 h-11 mb-1",
                        !sidebarOpen && "justify-center",
                        isActive && "shadow-medium",
                        !isActive && sidebarOpen && categoryStyle.bg,
                        !isActive && sidebarOpen && "hover:bg-opacity-50"
                      )}
                    >
                      <span className={cn(isActive ? "text-primary-foreground" : categoryStyle.text)}>
                        {item.icon}
                      </span>
                      <span className={cn(!sidebarOpen && "hidden md:inline", isActive ? "text-primary-foreground" : "text-foreground")}>
                        {item.label}
                      </span>
                    </Button>
                  </Link>
                );
              })}
            </div>
          ))}
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
            onClick={handleLogout}
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
          onClick={() => {
            console.log('[DashboardLayout] Sidebar overlay clicked, closing sidebar');
            console.log('[PortalNavigation] User closed sidebar via overlay', {
              userRole,
              userId: user?.id,
              timestamp: new Date().toISOString()
            });
            setSidebarOpen(false);
          }}
        ></div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Desktop Navigation Controls */}
        <div className="hidden md:flex items-center justify-end p-2 bg-card border-b border-border">
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              title="Go back"
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleForward}
              title="Go forward"
              className="h-8 w-8"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              title="Refresh page"
              className="h-8 w-8"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
};