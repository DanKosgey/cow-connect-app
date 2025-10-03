import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { 
  Home,
  Map,
  Milk,
  Award,
  Settings,
  LogOut,
  User,
  MessageSquare,
  HelpCircle
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '../lib/logger';
import { useEffect } from 'react';

const menuItems = [
  {
    title: "Dashboard",
    url: "/staff",
    icon: Home,
  },
  {
    title: "Routes",
    url: "/staff/routes",
    icon: Map,
  },
  {
    title: "Collections",
    url: "/staff/collections",
    icon: Milk,
  },
  {
    title: "Rewards",
    url: "/staff/rewards",
    icon: Award,
  },
  {
    title: "Messages",
    url: "/staff/messages",
    icon: MessageSquare,
  },
  {
    title: "Help & Support",
    url: "/staff/help",
    icon: HelpCircle,
  },
];

export function StaffSidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();

  useEffect(() => {
    logger.debug('StaffSidebar component mounted');
    return () => {
      logger.debug('StaffSidebar component unmounted');
    };
  }, []);

  const handleNavigation = (path: string) => {
    logger.info('Navigation triggered', { path });
  };

  const handleLogout = async () => {
    try {
      await logout();
      logger.info('User logged out successfully');
    } catch (error) {
      logger.error('Error during logout', error);
    }
  };

  logger.time('Sidebar Render');

  return (
    <Sidebar className="border-r border-blue-200 bg-white/90 backdrop-blur-sm">
      <SidebarHeader className="border-b border-blue-200 p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <Milk className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">
              DairyChain Pro
            </h2>
            <p className="text-xs text-blue-600 flex items-center gap-1">
              <User className="h-3 w-3" />
              Staff Portal
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-gradient-to-b from-blue-50/30 to-indigo-50/30">
        <SidebarGroup>
          <SidebarGroupLabel className="text-blue-700 font-medium flex items-center gap-2">
            <User className="h-4 w-4" />
            Staff Management
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    isActive={location.pathname === item.url}
                    className="hover:bg-blue-100 data-[active=true]:bg-gradient-to-r data-[active=true]:from-blue-100 data-[active=true]:to-indigo-100 data-[active=true]:border-r-2 data-[active=true]:border-blue-500 data-[active=true]:text-blue-700"
                  >
                    <Link 
                      to={item.url} 
                      className="flex items-center space-x-3 text-gray-700 hover:text-blue-700 transition-colors" 
                      onClick={() => handleNavigation(item.url)}
                      aria-current={location.pathname === item.url ? "page" : undefined}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-blue-200 p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center space-x-3 mb-4">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-sm">
              {user?.user_metadata?.full_name ? user.user_metadata.full_name.charAt(0) : 'ST'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.user_metadata?.full_name || user?.email || 'Staff Member'}</p>
            <p className="text-xs text-blue-600 truncate">Staff ID: {user?.id || 'Unknown'}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-50">
            <Settings className="h-4 w-4 mr-1" />
            Settings
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="border-blue-300 text-blue-700 hover:bg-blue-50"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );

  logger.timeEnd('Sidebar Render');
}