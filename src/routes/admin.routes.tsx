import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { UserRole } from "@/types/auth.types";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { PageLoader } from '@/components/PageLoader';
import { PageTransition } from '@/components/PageTransition';
import { preloadRouteWhenIdle } from '@/utils/routePreloader';

// Lazy load admin components with preload optimization
const AdminDashboard = lazy(() => {
  const promise = import("../pages/admin/AdminDashboard");
  // Preload other frequently accessed pages when the app is idle
  setTimeout(() => {
    preloadRouteWhenIdle(() => import("../pages/admin/Farmers"));
    preloadRouteWhenIdle(() => import("../pages/admin/Staff"));
  }, 2000); // Reduced delay
  return promise;
});

const AdminLogin = lazy(() => import("../pages/auth/AdminLogin"));
const AuthDiagnostics = lazy(() => import("../pages/auth/AuthDiagnostics"));
const ConnectionTestPage = lazy(() => import("../pages/admin/ConnectionTestPage"));
const Farmers = lazy(() => import("../pages/admin/Farmers"));
const Staff = lazy(() => import("../pages/admin/Staff"));
const PaymentSystem = lazy(() => import("../pages/admin/PaymentSystem"));
const CollectionsAnalyticsDashboard = lazy(() => import("../pages/admin/CollectionsAnalyticsDashboard"));
const KYCAdminDashboard = lazy(() => import("../pages/admin/KYCAdminDashboard"));
const KYCPendingFarmersDashboard = lazy(() => import("../pages/admin/KYCPendingFarmersDashboard"));
const KYCPendingFarmerDetails = lazy(() => import("../pages/admin/KYCPendingFarmerDetails"));
const Settings = lazy(() => import("../pages/admin/Settings"));
const AdminInvite = lazy(() => import("../pages/admin/AdminInvite"));
const AnalyticsDashboard = lazy(() => import("../pages/admin/AnalyticsDashboard"));
const Checkpoints = lazy(() => import("../pages/admin/Checkpoints"));
const AuthTestPage = lazy(() => import("../pages/admin/AuthTestPage"));
const AuthDebugPage = lazy(() => import("../pages/admin/AuthDebugPage"));
const NetworkDiagnosticsPage = lazy(() => import("../pages/admin/NetworkDiagnosticsPage"));

export default function AdminRoutes() {
  const location = useLocation();
  
  // Preload commonly accessed routes when on the dashboard
  useEffect(() => {
    if (location.pathname.includes('dashboard')) {
      // Reduced preloading to only the most essential pages
      preloadRouteWhenIdle(() => import("../pages/admin/Farmers"));
      preloadRouteWhenIdle(() => import("../pages/admin/Staff"));
    }
    
    // Preload the dashboard when on other pages
    if (!location.pathname.includes('dashboard')) {
      preloadRouteWhenIdle(() => import("../pages/admin/AdminDashboard"));
    }
  }, [location.pathname]);
  
  return (
    <Suspense fallback={<PageLoader type="dashboard" />}>
      <Routes location={location}>
        <Route path="login" element={<AdminLogin />} />
        <Route path="diagnostics" element={<AuthDiagnostics />} />
        <Route path="connection-test" element={<ConnectionTestPage />} />
        <Route path="auth-debug" element={<AuthDebugPage />} />
        <Route path="network-diagnostics" element={
          <ProtectedRoute requiredRole={UserRole.ADMIN}>
            <PageTransition>
              <NetworkDiagnosticsPage />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="checkpoints" element={
          <ProtectedRoute requiredRole={UserRole.ADMIN}>
            <PageTransition>
              <Checkpoints />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="dashboard" element={
          <ProtectedRoute requiredRole={UserRole.ADMIN}>
            <PageTransition>
              <AdminDashboard />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="farmers" element={
          <ProtectedRoute requiredRole={UserRole.ADMIN}>
            <PageTransition>
              <Farmers />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="staff" element={
          <ProtectedRoute requiredRole={UserRole.ADMIN}>
            <PageTransition>
              <Staff />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="payments" element={
          <ProtectedRoute requiredRole={UserRole.ADMIN}>
            <PageTransition>
              <PaymentSystem />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="collections" element={
          <ProtectedRoute requiredRole={UserRole.ADMIN}>
            <PageTransition>
              <CollectionsAnalyticsDashboard />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="kyc" element={
          <ProtectedRoute requiredRole={UserRole.ADMIN}>
            <PageTransition>
              <KYCAdminDashboard />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="kyc-pending-farmers" element={
          <ProtectedRoute requiredRole={UserRole.ADMIN}>
            <PageTransition>
              <KYCPendingFarmersDashboard />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="kyc-pending-farmers/:id" element={
          <ProtectedRoute requiredRole={UserRole.ADMIN}>
            <PageTransition>
              <KYCPendingFarmerDetails />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="settings" element={
          <ProtectedRoute requiredRole={UserRole.ADMIN}>
            <PageTransition>
              <Settings />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="invite" element={
          <ProtectedRoute requiredRole={UserRole.ADMIN}>
            <PageTransition>
              <AdminInvite />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="analytics" element={
          <ProtectedRoute requiredRole={UserRole.ADMIN}>
            <PageTransition>
              <AnalyticsDashboard />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="auth-test" element={
          <ProtectedRoute requiredRole={UserRole.ADMIN}>
            <PageTransition>
              <AuthTestPage />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}