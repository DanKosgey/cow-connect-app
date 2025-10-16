import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { UserRole } from "@/types/auth.types";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { PageLoader } from '@/components/PageLoader';
import { PageTransition } from '@/components/PageTransition';
import { preloadRouteWhenIdle } from '@/utils/routePreloader';
// Lazy load admin components with preload optimization
import { AdminPortalLayout } from '@/components/admin/AdminPortalLayout';

// Lazy load admin components with preload optimization
const AdminNotifications = lazy(() => import("../pages/admin/AdminNotifications"));
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
const KYCStorageTest = lazy(() => import('@/pages/admin/KYCStorageTest'));
const Settings = lazy(() => import("../pages/admin/Settings"));
const AdminInvite = lazy(() => import("../pages/admin/AdminInvite"));
const AnalyticsDashboard = lazy(() => import("../pages/admin/AnalyticsDashboard"));
const Checkpoints = lazy(() => import("../pages/admin/Checkpoints"));
const AuthTestPage = lazy(() => import("../pages/admin/AuthTestPage"));
const AuthDebugPage = lazy(() => import("../pages/admin/AuthDebugPage"));
const NetworkDiagnosticsPage = lazy(() => import("../pages/admin/NetworkDiagnosticsPage"));
const InvitationManagement = lazy(() => import("../pages/admin/InvitationManagement"));
const StorageDiagnostics = lazy(() => import('@/pages/admin/StorageDiagnostics'));
const StorageTest = lazy(() => import('@/pages/admin/StorageTest'));
const FarmerPerformanceDashboard = lazy(() => import('@/pages/admin/FarmerPerformanceDashboard'));

export const adminRoutes = [
  { path: '/admin/login', element: <AdminLogin /> },
  { path: '/admin/diagnostics', element: <AuthDiagnostics /> },
  { path: '/admin/connection-test', element: <ConnectionTestPage /> },
  { path: '/admin/auth-debug', element: <AuthDebugPage /> },
  { path: '/admin/network-diagnostics', element: <NetworkDiagnosticsPage /> },
  { path: '/admin/checkpoints', element: <Checkpoints /> },
  { path: '/admin/*', element: <AdminPortalLayout><div>Placeholder</div></AdminPortalLayout> },
  { path: '/admin/farmers', element: <Farmers /> },
  { path: '/admin/staff', element: <Staff /> },
  { path: '/admin/payments', element: <PaymentSystem /> },
  { path: '/admin/collections', element: <CollectionsAnalyticsDashboard /> },
  { path: '/admin/kyc', element: <KYCAdminDashboard /> },
  { path: '/admin/kyc-pending-farmers', element: <KYCPendingFarmersDashboard /> },
  { path: '/admin/kyc-pending-farmers/:id', element: <KYCPendingFarmerDetails /> },
  { path: '/admin/kyc-storage-test', element: <KYCStorageTest /> },
  { path: '/admin/settings', element: <Settings /> },
  { path: '/admin/invite', element: <AdminInvite /> },
  { path: '/admin/notifications', element: <AdminNotifications /> },
  { path: '/admin/analytics', element: <AnalyticsDashboard /> },
  { path: '/admin/farmer-performance', element: <FarmerPerformanceDashboard /> },
  { path: '/admin/auth-test', element: <AuthTestPage /> },
  { path: '/admin', element: <Navigate to="/admin/dashboard" replace /> },
];

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
        <Route path="/*" element={
          <ProtectedRoute requiredRole={UserRole.ADMIN}>
            <AdminPortalLayout>
              <Routes>
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="farmers" element={<Farmers />} />
                <Route path="staff" element={<Staff />} />
                <Route path="payments" element={<PaymentSystem />} />
                <Route path="collections" element={<CollectionsAnalyticsDashboard />} />
                <Route path="kyc" element={<KYCAdminDashboard />} />
                <Route path="kyc-pending-farmers" element={<KYCPendingFarmersDashboard />} />
                <Route path="kyc-pending-farmers/:id" element={<KYCPendingFarmerDetails />} />
                <Route path="kyc-storage-test" element={<KYCStorageTest />} />
                <Route path="settings" element={<Settings />} />
                <Route path="invite" element={<AdminInvite />} />
                <Route path="notifications" element={<AdminNotifications />} />
                <Route path="analytics" element={<AnalyticsDashboard />} />
                <Route path="checkpoints" element={<Checkpoints />} />
                <Route path="network-diagnostics" element={<NetworkDiagnosticsPage />} />
                <Route path="invitation-management" element={<InvitationManagement />} />
                <Route path="storage-diagnostics" element={<StorageDiagnostics />} />
                <Route path="storage-test" element={<StorageTest />} />
                <Route path="kyc-storage-test" element={<KYCStorageTest />} />
                <Route path="farmer-performance" element={<FarmerPerformanceDashboard />} />
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="*" element={<Navigate to="/admin" replace />} />
              </Routes>
            </AdminPortalLayout>
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
          <Route path="notifications" element={
            <ProtectedRoute requiredRole={UserRole.ADMIN}>
              <PageTransition>
                <AdminNotifications />
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