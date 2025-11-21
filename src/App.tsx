// Toast providers are mounted at app root (src/main.tsx)
import React from 'react';
import { TooltipProvider } from "@/components/ui/tooltip";
import { SkipLink } from '@/components/ui/SkipLink';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/SimplifiedAuthContext";
import { NotificationProvider } from '@/contexts/NotificationContext';
import { ErrorBoundary } from "./components/ErrorBoundary";
import { lazy, Suspense, useEffect } from 'react';
import { PageLoader } from '@/components/PageLoader';

// Ensure React is properly imported
if (typeof React === 'undefined') {
  throw new Error('React is not properly imported in App');
}

// Lazy load route components
const PublicRoutes = lazy(() => import("./routes/public.routes"));
const AdminRoutes = lazy(() => import("./routes/admin.routes"));
const CollectorRoutes = lazy(() => import("./routes/collector.routes"));
const FarmerRoutes = lazy(() => import("./routes/farmer.routes"));
const MilkApprovalRoutes = lazy(() => import("./routes/milkApproval.routes"));
const CollectorOnlyRoutes = lazy(() => import("./routes/collector-only.routes"));
const StaffOnlyRoutes = lazy(() => import("./routes/staff-only.routes"));
const CreditorRoutes = lazy(() => import("./routes/creditor.routes"));
const CreditDashboard = lazy(() => import("./pages/farmer-portal/CreditDashboard"));
const ShopPage = lazy(() => import("./pages/farmer-portal/ShopPage"));
const CommunityForumPage = lazy(() => import("./pages/farmer-portal/CommunityForumPage"));

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
      // Add a timeout to prevent hanging queries
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    }
  },
});

const App = () => {
  // Clear authentication cache on app startup to prevent stale session issues
  useEffect(() => {
    // Only minimal logging in development mode
    if (import.meta.env.DEV) {
      console.log('App starting');
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

    // Minimal auth state logging for debugging
    if (import.meta.env.DEV) {
      const hasCachedData = localStorage.getItem('cached_user') || localStorage.getItem('cached_role');
      if (hasCachedData) {
        console.log('Auth cache present');
      }
    }
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <SkipLink targetId="main-content">Skip to main content</SkipLink>
          <BrowserRouter future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true
          }}>
            <NotificationProvider>
              <AuthProvider>
                <main id="main-content">
                  <Suspense fallback={<PageLoader type="dashboard" />}>
                    <Routes>
                      {/* Public routes including unified login */}
                      <Route path="/*" element={<PublicRoutes />} />

                      {/* Role-specific routes with their own login pages */}
                      <Route path="/admin/*" element={<AdminRoutes />} />
                      <Route path="/collector/*" element={<CollectorRoutes />} />
                      <Route path="/farmer/*" element={<FarmerRoutes />} />
                      <Route path="/milk-approval/*" element={<MilkApprovalRoutes />} />
                      <Route path="/collector-only/*" element={<CollectorOnlyRoutes />} />
                      <Route path="/staff-only/*" element={<StaffOnlyRoutes />} />
                      <Route path="/creditor/*" element={<CreditorRoutes />} />

                      {/* Direct routes for farmer portal pages if needed, though they should be under /farmer/* */}
                      <Route path="/farmer-portal/credit" element={<CreditDashboard />} />
                      <Route path="/farmer-portal/shop" element={<ShopPage />} />
                      <Route path="/farmer-portal/community" element={<CommunityForumPage />} />
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