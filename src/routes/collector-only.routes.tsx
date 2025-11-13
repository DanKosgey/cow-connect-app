import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { UserRole } from "@/types/auth.types";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { preloadRouteWhenIdle } from '@/utils/routePreloader';
import { CollectorPortalLayout } from '@/components/collector/CollectorPortalLayout';

// Lazy load collector components
const CollectorDashboard = lazy(() => {
  const promise = import("../components/collector/EnhancedCollectorDashboard");
  // Preload other frequently accessed pages when the app is idle
  setTimeout(() => {
    preloadRouteWhenIdle(() => import("../components/collector/EnhancedCollectionForm"));
    preloadRouteWhenIdle(() => import("../components/collector/EnhancedFarmerDirectory"));
  }, 1000);
  return promise;
});

const CollectorLogin = lazy(() => import("../pages/auth/CollectorOnlyLogin"));
const CollectionForm = lazy(() => import("../components/collector/EnhancedCollectionForm"));
const CollectionHistory = lazy(() => import("../components/collector/CollectionHistoryPage"));
const DetailedAnalytics = lazy(() => import("../components/collector/DetailedAnalyticsDashboard"));
const FarmerDirectory = lazy(() => import("../components/collector/EnhancedFarmerDirectory"));
const PerformanceDashboard = lazy(() => import("../components/collector/EnhancedPerformanceDashboard"));
const CollectorPerformanceTracking = lazy(() => import("../components/collector/CollectorPerformanceTracking"));
const QualityControlManagement = lazy(() => import("../components/collector/QualityControlManagement"));
const InventoryManagement = lazy(() => import("../components/collector/InventoryManagement"));
const ComprehensiveReporting = lazy(() => import("../components/collector/ComprehensiveReporting"));

// New components
const CollectorNotifications = lazy(() => import("../components/collector/CollectorNotifications"));
const CollectorQuickActions = lazy(() => import("../components/collector/CollectorQuickActions"));
const FarmerVisitsTracker = lazy(() => import("../components/collector/FarmerVisitsTracker"));
const QualityReports = lazy(() => import("../components/collector/QualityReports"));
const PerformanceInsights = lazy(() => import("../components/collector/PerformanceInsights"));
const CollectorPortalLanding = lazy(() => import("../pages/collector-portal/CollectorPortalLanding"));

export default function CollectorOnlyRoutes() {
  const location = useLocation();
  
  // Preload commonly accessed routes when on the dashboard
  useEffect(() => {
    if (location.pathname.includes('dashboard')) {
      preloadRouteWhenIdle(() => import("../components/collector/EnhancedCollectionForm"));
      preloadRouteWhenIdle(() => import("../components/collector/EnhancedFarmerDirectory"));
    }
    
    // Preload the dashboard when on other pages
    if (!location.pathname.includes('dashboard')) {
      preloadRouteWhenIdle(() => import("../components/collector/EnhancedCollectorDashboard"));
    }
  }, [location.pathname]);
  
  return (
    <Suspense fallback={<LoadingSkeleton type="dashboard" />}>
      <Routes>
        <Route path="login" element={<CollectorLogin />} />
        <Route path="/*" element={
          <ProtectedRoute requiredRole={UserRole.COLLECTOR}>
            <CollectorPortalLayout>
              <Routes>
                <Route path="dashboard" element={<CollectorDashboard />} />
                <Route path="collections/new" element={<CollectionForm />} />
                <Route path="collections" element={<CollectionHistory />} />
                <Route path="farmers" element={<FarmerDirectory />} />
                <Route path="performance" element={<PerformanceDashboard />} />
                <Route path="analytics" element={<DetailedAnalytics />} />
                <Route path="performance-tracking" element={<CollectorPerformanceTracking />} />
                <Route path="quality-control" element={<QualityControlManagement />} />
                <Route path="inventory" element={<InventoryManagement />} />
                <Route path="reports" element={<ComprehensiveReporting />} />
                <Route path="notifications" element={<CollectorNotifications />} />
                <Route path="quick-actions" element={<CollectorQuickActions />} />
                <Route path="farmer-visits" element={<FarmerVisitsTracker />} />
                <Route path="quality-reports" element={<QualityReports />} />
                <Route path="performance-insights" element={<PerformanceInsights />} />
                <Route index element={<CollectorPortalLanding />} />
                <Route path="*" element={<Navigate to="/collector-only/dashboard" replace />} />
              </Routes>
            </CollectorPortalLayout>
          </ProtectedRoute>
        } />
      </Routes>
    </Suspense>
  );
}