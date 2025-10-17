import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { UserRole } from "@/types/auth.types";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { PageTransition } from '@/components/PageTransition';
import { preloadRouteWhenIdle } from '@/utils/routePreloader';
import { StaffPortalLayout } from '@/components/staff/StaffPortalLayout';

// Lazy load staff components
const StaffDashboard = lazy(() => {
  const promise = import("../components/staff/EnhancedStaffDashboard");
  // Preload other frequently accessed pages when the app is idle
  setTimeout(() => {
    preloadRouteWhenIdle(() => import("../components/staff/EnhancedCollectionForm"));
    preloadRouteWhenIdle(() => import("../components/staff/EnhancedFarmerDirectory"));
  }, 1000);
  return promise;
});

const StaffLogin = lazy(() => import("../pages/auth/StaffLogin"));
const CollectionForm = lazy(() => import("../components/staff/EnhancedCollectionForm"));
const CollectionHistory = lazy(() => import("../components/staff/CollectionHistoryPage"));
const DetailedAnalytics = lazy(() => import("../components/staff/DetailedAnalyticsDashboard"));
const FarmerDirectory = lazy(() => import("../components/staff/EnhancedFarmerDirectory"));
const PerformanceDashboard = lazy(() => import("../components/staff/EnhancedPerformanceDashboard"));
const StaffPortalLanding = lazy(() => import("../pages/staff-portal/StaffPortalLanding"));
const StaffPerformanceTracking = lazy(() => import("../components/staff/StaffPerformanceTracking"));
const QualityControlManagement = lazy(() => import("../components/staff/QualityControlManagement"));
const InventoryManagement = lazy(() => import("../components/staff/InventoryManagement"));
const ComprehensiveReporting = lazy(() => import("../components/staff/ComprehensiveReporting"));

// New components
const StaffNotifications = lazy(() => import("../components/staff/StaffNotifications"));
const StaffQuickActions = lazy(() => import("../components/staff/StaffQuickActions"));
const FarmerVisitsTracker = lazy(() => import("../components/staff/FarmerVisitsTracker"));
const QualityReports = lazy(() => import("../components/staff/QualityReports"));
const PerformanceInsights = lazy(() => import("../components/staff/PerformanceInsights"));

export default function StaffRoutes() {
  const location = useLocation();
  
  // Preload commonly accessed routes when on the dashboard
  useEffect(() => {
    if (location.pathname.includes('dashboard')) {
      preloadRouteWhenIdle(() => import("../components/staff/EnhancedCollectionForm"));
      preloadRouteWhenIdle(() => import("../components/staff/EnhancedFarmerDirectory"));
    }
    
    // Preload the dashboard when on other pages
    if (!location.pathname.includes('dashboard')) {
      preloadRouteWhenIdle(() => import("../components/staff/EnhancedStaffDashboard"));
    }
  }, [location.pathname]);
  
  return (
    <Suspense fallback={<LoadingSkeleton type="dashboard" />}>
      <Routes>
        <Route path="login" element={<StaffLogin />} />
        <Route path="/*" element={
          <ProtectedRoute requiredRole={UserRole.STAFF}>
            <StaffPortalLayout>
              <Routes>
                <Route path="dashboard" element={<StaffDashboard />} />
                <Route path="collections/new" element={<CollectionForm />} />
                <Route path="collections" element={<CollectionHistory />} />
                <Route path="farmers" element={<FarmerDirectory />} />
                <Route path="performance" element={<PerformanceDashboard />} />
                <Route path="analytics" element={<DetailedAnalytics />} />
                <Route path="performance-tracking" element={<StaffPerformanceTracking />} />
                <Route path="quality-control" element={<QualityControlManagement />} />
                <Route path="inventory" element={<InventoryManagement />} />
                <Route path="reports" element={<ComprehensiveReporting />} />
                <Route path="notifications" element={<StaffNotifications />} />
                <Route path="quick-actions" element={<StaffQuickActions />} />
                <Route path="farmer-visits" element={<FarmerVisitsTracker />} />
                <Route path="quality-reports" element={<QualityReports />} />
                <Route path="performance-insights" element={<PerformanceInsights />} />
                <Route index element={<StaffPortalLanding />} />
                <Route path="*" element={<Navigate to="/staff" replace />} />
              </Routes>
            </StaffPortalLayout>
          </ProtectedRoute>
        } />
      </Routes>
    </Suspense>
  );
}