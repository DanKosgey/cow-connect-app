// Toast providers are mounted at app root (src/main.tsx)
import React from 'react';
import { TooltipProvider } from "@/components/ui/tooltip";
import { SkipLink } from '@/components/ui/SkipLink';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext"; // Updated import
import { NotificationProvider } from '@/contexts/NotificationContext';
import { ErrorBoundary } from "./components/ErrorBoundary";
import { lazy, Suspense, useEffect } from 'react';
import { PageLoader } from '@/components/PageLoader';
// Removed authManager import as it's no longer needed

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
  // Simplified auth state management
  useEffect(() => {
    // Only minimal logging in development mode
    if (import.meta.env.DEV) {
      console.log('App starting');
    }
    
    // Add event listener for storage changes to handle cross-tab logout
    const handleStorageChange = (e: StorageEvent) => {
      // Enhanced session key detection
      if ((e.key === 'sb-current-session' || e.key?.includes('supabase')) && e.newValue === null) {
        // Session was cleared in another tab, redirect to login
        if (window.location.pathname !== '/' && !window.location.pathname.includes('/login')) {
          window.location.href = '/';
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Cleanup
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
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
              <AuthProvider> // Updated to use new AuthProvider
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