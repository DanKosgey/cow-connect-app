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
  BarChart3, 
  Users, 
  Milk, 
  DollarSign, 
  Shield, 
  Settings,
  Home,
  LogOut,
  Wheat,
  Tractor,
  Bot
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useEffect } from 'react';

const menuItems = [
  {
    title: "Dashboard",
    url: "/admin",
    icon: Home,
  },
  {
    title: "AI Intelligence",
    url: "/admin/ai",
    icon: Bot,
  },
  {
    title: "KYC Management",
    url: "/admin/kyc",
    icon: Shield,
  },
  {
    title: "Collections",
    url: "/admin/collections",
    icon: Milk,
  },
  {
    title: "Payments",
    url: "/admin/payments",
    icon: DollarSign,
  },
  {
    title: "Analytics",
    url: "/admin/analytics",
    icon: BarChart3,
  },
  {
    title: "Errads Center",
    url: "/admin/errads",
    icon: BarChart3, // You can use a different icon if you want
  },
];

export function AdminSidebar() {
  const location = useLocation();

  const handleNavigation = (path: string) => {
    console.log('Navigation triggered', { path });
  };

  // Function to determine if a menu item should be active
  const isMenuItemActive = (itemUrl: string) => {
    // Get the current pathname
    const currentPath = location.pathname;
    
    // Exact match
    if (currentPath === itemUrl) {
      return true;
    }
    
    // Special handling for dashboard routes
    if (itemUrl === "/admin") {
      // Dashboard item should be active for both /admin and /admin/dashboard
      return currentPath === "/admin" || currentPath === "/admin/dashboard";
    }
    
    // For other items, check if the current path starts with the item URL
    // This handles cases where there might be query parameters or sub-routes
    if (itemUrl !== "/admin" && currentPath.startsWith(itemUrl)) {
      return true;
    }
    
    return false;
  };

  return (
    <Sidebar className="border-r border-green-200 bg-white/90 backdrop-blur-sm">
      <SidebarHeader className="border-b border-green-200 p-4 bg-gradient-to-r from-green-50 to-emerald-50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
            <Milk className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold bg-gradient-to-r from-green-700 to-emerald-700 bg-clip-text text-transparent">
              DairyChain Pro
            </h2>
            <p className="text-xs text-green-600 flex items-center gap-1">
              <Wheat className="h-3 w-3" />
              Admin Portal
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-gradient-to-b from-green-50/30 to-emerald-50/30">
        <SidebarGroup>
          <SidebarGroupLabel className="text-green-700 font-medium flex items-center gap-2">
            <Tractor className="h-4 w-4" />
            Farm Management
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    isActive={isMenuItemActive(item.url)}
                    className="hover:bg-green-100 data-[active=true]:bg-gradient-to-r data-[active=true]:from-green-100 data-[active=true]:to-emerald-100 data-[active=true]:border-r-2 data-[active=true]:border-green-500 data-[active=true]:text-green-700"
                  >
                    <Link to={item.url} className="flex items-center space-x-3 text-gray-700 hover:text-green-700 transition-colors" onClick={() => handleNavigation(item.url)}>
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

      <SidebarFooter className="border-t border-green-200 p-4 bg-gradient-to-r from-green-50 to-emerald-50">
        <div className="flex items-center space-x-3 mb-4">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-gradient-to-br from-green-600 to-emerald-600 text-white text-sm">
              AD
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">Farm Administrator</p>
            <p className="text-xs text-green-600 truncate">admin@dairychain.com</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" className="flex-1 border-green-300 text-green-700 hover:bg-green-50">
            <Settings className="h-4 w-4 mr-1" />
            Settings
          </Button>
          <Link to="/">
            <Button variant="outline" size="sm" className="border-green-300 text-green-700 hover:bg-green-50">
              <LogOut className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}