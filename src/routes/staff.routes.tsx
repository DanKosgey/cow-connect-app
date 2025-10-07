import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { UserRole } from "@/types/auth.types";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { PageTransition } from '@/components/PageTransition';
import { preloadRouteWhenIdle } from '@/utils/routePreloader';

// Lazy load staff components
const StaffDashboard = lazy(() => {
  const promise = import("../components/staff/EnhancedStaffDashboard");
  // Preload other frequently accessed pages when the app is idle
  setTimeout(() => {
    preloadRouteWhenIdle(() => import("../components/staff/EnhancedCollectionForm"));
    preloadRouteWhenIdle(() => import("../components/staff/EnhancedFarmerDirectory"));
    preloadRouteWhenIdle(() => import("../components/staff/EnhancedPaymentApproval"));
  }, 1000);
  return promise;
});

const StaffLogin = lazy(() => import("../pages/auth/StaffLogin"));
const PaymentApproval = lazy(() => import("../components/staff/EnhancedPaymentApproval"));
const PaymentHistory = lazy(() => import("../pages/staff-portal/PaymentHistory"));
const CollectionForm = lazy(() => import("../components/staff/EnhancedCollectionForm"));
const CollectionHistory = lazy(() => import("../components/staff/CollectionHistoryPage"));
const DetailedAnalytics = lazy(() => import("../components/staff/DetailedAnalyticsDashboard"));
const FarmerDirectory = lazy(() => import("../components/staff/EnhancedFarmerDirectory"));
const PerformanceDashboard = lazy(() => import("../components/staff/EnhancedPerformanceDashboard"));
const RouteManagement = lazy(() => import("../components/staff/RouteManagement"));
const StaffPortalLanding = lazy(() => import("../pages/staff-portal/StaffPortalLanding"));
const StaffPerformanceTracking = lazy(() => import("../components/staff/StaffPerformanceTracking"));
const QualityControlManagement = lazy(() => import("../components/staff/QualityControlManagement"));
const InventoryManagement = lazy(() => import("../components/staff/InventoryManagement"));
const ComprehensiveReporting = lazy(() => import("../components/staff/ComprehensiveReporting"));

export default function StaffRoutes() {
  const location = useLocation();
  
  // Preload commonly accessed routes when on the dashboard
  useEffect(() => {
    if (location.pathname.includes('dashboard')) {
      preloadRouteWhenIdle(() => import("../components/staff/EnhancedCollectionForm"));
      preloadRouteWhenIdle(() => import("../components/staff/EnhancedFarmerDirectory"));
      preloadRouteWhenIdle(() => import("../components/staff/EnhancedPaymentApproval"));
    }
    
    // Preload the dashboard when on other pages
    if (!location.pathname.includes('dashboard')) {
      preloadRouteWhenIdle(() => import("../components/staff/EnhancedStaffDashboard"));
    }
  }, [location.pathname]);
  
  return (
    <Suspense fallback={<LoadingSkeleton type="dashboard" />}>
      <Routes location={location}>
        <Route path="login" element={<StaffLogin />} />
        <Route path="dashboard" element={
          <ProtectedRoute requiredRole={UserRole.STAFF}>
            <PageTransition>
              <StaffDashboard />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="collections/new" element={
          <ProtectedRoute requiredRole={UserRole.STAFF}>
            <PageTransition>
              <CollectionForm />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="collections" element={
          <ProtectedRoute requiredRole={UserRole.STAFF}>
            <PageTransition>
              <CollectionForm />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="collections/history" element={
          <ProtectedRoute requiredRole={UserRole.STAFF}>
            <PageTransition>
              <CollectionHistory />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="farmers" element={
          <ProtectedRoute requiredRole={UserRole.STAFF}>
            <PageTransition>
              <FarmerDirectory />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="payments/approval" element={
          <ProtectedRoute requiredRole={UserRole.STAFF}>
            <PageTransition>
              <PaymentApproval />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="payments/history" element={
          <ProtectedRoute requiredRole={UserRole.STAFF}>
            <PageTransition>
              <PaymentHistory />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="performance" element={
          <ProtectedRoute requiredRole={UserRole.STAFF}>
            <PageTransition>
              <PerformanceDashboard />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="analytics" element={
          <ProtectedRoute requiredRole={UserRole.STAFF}>
            <PageTransition>
              <DetailedAnalytics />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="performance-tracking" element={
          <ProtectedRoute requiredRole={UserRole.STAFF}>
            <PageTransition>
              <StaffPerformanceTracking />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="quality-control" element={
          <ProtectedRoute requiredRole={UserRole.STAFF}>
            <PageTransition>
              <QualityControlManagement />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="inventory" element={
          <ProtectedRoute requiredRole={UserRole.STAFF}>
            <PageTransition>
              <InventoryManagement />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="reports" element={
          <ProtectedRoute requiredRole={UserRole.STAFF}>
            <PageTransition>
              <ComprehensiveReporting />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="routes" element={
          <ProtectedRoute requiredRole={UserRole.STAFF}>
            <PageTransition>
              <RouteManagement />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="" element={
          <ProtectedRoute requiredRole={UserRole.STAFF}>
            <PageTransition>
              <StaffPortalLanding />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="" replace />} />
      </Routes>
    </Suspense>
  );
}