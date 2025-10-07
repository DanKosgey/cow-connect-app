// Toast providers are mounted at app root (src/main.tsx)
import { TooltipProvider } from "@/components/ui/tooltip";
import { SkipLink } from '@/components/ui/SkipLink';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/SimplifiedAuthContext";
import { NotificationProvider } from '@/contexts/NotificationContext';
import { ErrorBoundary } from "./components/ErrorBoundary";
import { lazy, Suspense, useEffect } from 'react';
import { PageLoader } from '@/components/PageLoader';

// Lazy load route components
const PublicRoutes = lazy(() => import("./routes/public.routes"));
const AdminRoutes = lazy(() => import("./routes/admin.routes"));
const StaffRoutes = lazy(() => import("./routes/staff.routes"));
const FarmerRoutes = lazy(() => import("./routes/farmer.routes"));

// Configure React Query with performance optimizations
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 15, // 15 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false, // Don't refetch on component mount if data is fresh
      retry: 1,
    },
    mutations: {
      retry: 1,
    }
  },
});

const App = () => {
  // Clear authentication cache on app startup to prevent stale session issues
  useEffect(() => {
    // Only in development mode to help with debugging
    if (import.meta.env.DEV) {
      console.log('App starting, clearing potential stale auth cache');
    }
    
    // Clear expired cache items
    const cacheTimestamp = localStorage.getItem('auth_cache_timestamp');
    if (cacheTimestamp) {
      const cacheAge = Date.now() - parseInt(cacheTimestamp);
      // If cache is older than 10 minutes, clear it
      if (cacheAge > 10 * 60 * 1000) {
        localStorage.removeItem('cached_user');
        localStorage.removeItem('cached_role');
        localStorage.removeItem('auth_cache_timestamp');
        if (import.meta.env.DEV) {
          console.log('Cleared expired auth cache');
        }
      }
    }
    
    // Also clear any potentially corrupted auth data
    const lastClearTime = localStorage.getItem('last_auth_clear_time');
    if (lastClearTime) {
      const timeSinceLastClear = Date.now() - parseInt(lastClearTime);
      // If it's been more than 1 hour since last clear, do a full clear
      if (timeSinceLastClear > 60 * 60 * 1000) {
        // Clear specific Supabase items
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-') || key.startsWith('supabase-')) {
            localStorage.removeItem(key);
          }
        });
        localStorage.removeItem('last_auth_clear_time');
        if (import.meta.env.DEV) {
          console.log('Cleared old Supabase auth items');
        }
      }
    }
    
    // Log current auth state for debugging
    if (import.meta.env.DEV) {
      console.log('Current auth state:', {
        cachedUser: localStorage.getItem('cached_user'),
        cachedRole: localStorage.getItem('cached_role'),
        cacheTimestamp: localStorage.getItem('auth_cache_timestamp'),
        pendingProfile: localStorage.getItem('pending_profile')
      });
      
      // Log any Supabase-specific items
      const supabaseItems: Record<string, string> = {};
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || key.startsWith('supabase-')) {
          supabaseItems[key] = localStorage.getItem(key) || '';
        }
      });
      console.log('Supabase items:', supabaseItems);
    }
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
      <TooltipProvider>
      <SkipLink targetId="main-content">Skip to main content</SkipLink>
          <BrowserRouter>
            <NotificationProvider>
              <AuthProvider>
                <main id="main-content">
                  <Suspense fallback={<PageLoader type="dashboard" />}>
                    <Routes>
                      {/* Public routes including unified login */}
                      <Route path="/*" element={<PublicRoutes />} />
                      
                      {/* Role-specific routes with their own login pages */}
                      <Route path="/admin/*" element={<AdminRoutes />} />
                      <Route path="/staff/*" element={<StaffRoutes />} />
                      <Route path="/farmer/*" element={<FarmerRoutes />} />
                    </Routes>
                  </Suspense>
                </main>
              </AuthProvider>
            </NotificationProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;