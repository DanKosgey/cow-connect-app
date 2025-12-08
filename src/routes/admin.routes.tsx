import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { UserRole } from "@/types/auth.types";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { PageLoader } from '@/components/PageLoader';
import { PageTransition } from '@/components/PageTransition';
import { preloadRouteWhenIdle } from '@/utils/routePreloader';
import AdminDebugLogger from '@/utils/adminDebugLogger';
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
const ConnectionTestPage = lazy(() => import("../pages/admin/ConnectionTestPage"));
const Farmers = lazy(() => import("../pages/admin/Farmers"));
const Staff = lazy(() => import("../pages/admin/Staff"));
const PaymentSystem = lazy(() => import("../pages/admin/PaymentSystem"));
const FarmerPaymentDetails = lazy(() => import("../pages/admin/FarmerPaymentDetails"));
const PaymentBatchManagement = lazy(() => import("../pages/admin/PaymentBatchManagement"));
const PaymentReports = lazy(() => import("../pages/admin/PaymentReports"));
const CollectionsAnalyticsDashboard = lazy(() => import("../pages/admin/CollectionsAnalyticsDashboard"));
const KYCAdminDashboard = lazy(() => import("../pages/admin/KYCAdminDashboard"));
const KYCPendingFarmersDashboard = lazy(() => import("../pages/admin/KYCPendingFarmersDashboard"));
const KYCPendingFarmerDetails = lazy(() => import("../pages/admin/KYCPendingFarmerDetails"));
const KYCStorageTest = lazy(() => import('@/pages/admin/KYCStorageTest'));
const Settings = lazy(() => import("../pages/admin/Settings"));
const AdminInvite = lazy(() => import("../pages/admin/AdminInvite"));
const AnalyticsDashboard = lazy(() => import("../pages/admin/AnalyticsDashboard"));
const Checkpoints = lazy(() => import("../pages/admin/Checkpoints"));
const AuthDiagnosticsPage = lazy(() => import("../pages/admin/AuthDiagnosticsPage"));
const AuthDebugPage = lazy(() => import("../pages/admin/AuthDebugPage"));
const NetworkDiagnosticsPage = lazy(() => import("../pages/admin/NetworkDiagnosticsPage"));
const InvitationManagement = lazy(() => import("../pages/admin/InvitationManagement"));
const StorageDiagnostics = lazy(() => import('@/pages/admin/StorageDiagnostics'));
const StorageTest = lazy(() => import('@/pages/admin/StorageTest'));
const FarmerPerformanceDashboard = lazy(() => import('@/pages/admin/FarmerPerformanceDashboard'));
const CreditManagementEssentials = lazy(() => import('@/pages/admin/CreditManagementEssentials'));
// Removed CreditReports, CreditDefaultManagement, and CreditTransactionAudit imports
const CreditRiskAssessment = lazy(() => import('@/components/admin/CreditRiskAssessment'));
const CreditSettings = lazy(() => import('@/components/admin/CreditSettings'));
const PenaltyManagementPage = lazy(() => import('@/pages/admin/PenaltyManagementPage'));
const ErrorReportingDashboard = lazy(() => import('@/pages/admin/ErrorReportingDashboard'));
const VarianceReportingDashboard = lazy(() => import('@/components/admin/variance/ModularEnhancedVarianceReportingDashboard'));
const VarianceInsightsDashboard = lazy(() => import('@/pages/admin/VarianceInsightsDashboard'));
const CollectorsPage = lazy(() => import('@/pages/admin/CollectorsPage'));
const CollectionsDebugPage = lazy(() => import('@/pages/admin/CollectionsDebugPage'));
const ServicesPage = lazy(() => import('@/pages/admin/ServicesPage'));
const AdminAIMonitoringDashboard = lazy(() => import('@/pages/admin/ai/AdminAIMonitoringDashboard'));

export const adminRoutes = [
  { path: '/admin/login', element: <AdminLogin /> },
  { path: '/admin/connection-test', element: <ConnectionTestPage /> },
  { path: '/admin/auth-debug', element: <AuthDebugPage /> },
  { path: '/admin/*', element: <AdminPortalLayout><div>Placeholder</div></AdminPortalLayout> },
  { path: '/admin/farmers', element: <Farmers /> },
  { path: '/admin/staff', element: <Staff /> },
  { path: '/admin/payments', element: <PaymentSystem /> },
  { path: '/admin/payments/farmer/:farmerId', element: <FarmerPaymentDetails /> },
  { path: '/admin/payments/batches', element: <PaymentBatchManagement /> },
  { path: '/admin/payments/reports', element: <PaymentReports /> },
  { path: '/admin/collections', element: <CollectionsAnalyticsDashboard /> },
  { path: '/admin/kyc', element: <KYCAdminDashboard /> },
  { path: '/admin/kyc-pending-farmers', element: <KYCPendingFarmersDashboard /> },
  { path: '/admin/kyc-pending-farmer/:id', element: <KYCPendingFarmerDetails /> },
  { path: '/admin/kyc-storage-test', element: <KYCStorageTest /> },
  { path: '/admin/settings', element: <Settings /> },
  { path: '/admin/invite', element: <AdminInvite /> },
  { path: '/admin/notifications', element: <AdminNotifications /> },
  { path: '/admin/analytics', element: <AnalyticsDashboard /> },
  { path: '/admin/checkpoints', element: <Checkpoints /> },
  { path: '/admin/farmer-performance', element: <FarmerPerformanceDashboard /> },
  { path: '/admin/credit-management', element: <CreditManagementEssentials /> },
  // Removed credit-defaults, credit-audit, and credit-reports routes
  { path: '/admin/credit-risk-assessment', element: <CreditRiskAssessment /> },
  { path: '/admin/credit-settings', element: <CreditSettings /> },
  { path: '/admin/error-reporting', element: <ErrorReportingDashboard /> },
  { path: '/admin/variance-reporting', element: <VarianceReportingDashboard /> },
  { path: '/admin/variance-insights', element: <VarianceInsightsDashboard /> },
  { path: '/admin/penalty-management', element: <PenaltyManagementPage /> },
  { path: '/admin/collectors', element: <CollectorsPage /> },
  { path: '/admin/collections-debug', element: <CollectionsDebugPage /> },
  { path: '/admin/deductions', element: <ServicesPage /> },
  { path: '/admin/ai-monitoring', element: <AdminAIMonitoringDashboard /> },
  { path: '/admin', element: <Navigate to="/admin/dashboard" replace /> },
];

export default function AdminRoutes() {
  const location = useLocation();
  
  AdminDebugLogger.route('AdminRoutes component rendering', { 
    pathname: location.pathname,
    search: location.search,
    hash: location.hash
  });
  
  // Preload commonly accessed routes when on the dashboard
  useEffect(() => {
    AdminDebugLogger.route('Preload effect triggered', { pathname: location.pathname });
    
    if (location.pathname.includes('dashboard')) {
      AdminDebugLogger.route('On dashboard, preloading Farmers and Staff pages');
      // Reduced preloading to only the most essential pages
      preloadRouteWhenIdle(() => import("../pages/admin/Farmers"));
      preloadRouteWhenIdle(() => import("../pages/admin/Staff"));
    }
    
    // Preload the dashboard when on other pages
    if (!location.pathname.includes('dashboard')) {
      AdminDebugLogger.route('Not on dashboard, preloading AdminDashboard');
      preloadRouteWhenIdle(() => import("../pages/admin/AdminDashboard"));
    }
  }, [location.pathname]);
  
  return (
    <Suspense fallback={<PageLoader type="dashboard" />}>
      <Routes location={location}>
        <Route path="login" element={<AdminLogin />} />
        <Route path="connection-test" element={<ConnectionTestPage />} />
        <Route path="auth-debug" element={<AuthDebugPage />} />
        <Route path="auth-diagnostics" element={
          <ProtectedRoute requiredRole={UserRole.ADMIN}>
            <PageTransition>
              <AuthDiagnosticsPage />
            </PageTransition>
          </ProtectedRoute>
        } />
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
                <Route path="payments/farmer/:farmerId" element={<FarmerPaymentDetails />} />
                <Route path="payments/batches" element={<PaymentBatchManagement />} />
                <Route path="payments/reports" element={<PaymentReports />} />
                <Route path="collections" element={<CollectionsAnalyticsDashboard />} />
                <Route path="kyc" element={<KYCAdminDashboard />} />
                <Route path="kyc-pending-farmers" element={<KYCPendingFarmersDashboard />} />
                <Route path="kyc-pending-farmer/:id" element={<KYCPendingFarmerDetails />} />
                <Route path="kyc-storage-test" element={<KYCStorageTest />} />
                <Route path="settings" element={<Settings />} />
                <Route path="invite" element={<AdminInvite />} />
                <Route path="notifications" element={<AdminNotifications />} />
                <Route path="analytics" element={<AnalyticsDashboard />} />
                <Route path="checkpoints" element={<Checkpoints />} />
                <Route path="network-diagnostics" element={<NetworkDiagnosticsPage />} />
                <Route path="auth-diagnostics" element={<AuthDiagnosticsPage />} />
                <Route path="invitation-management" element={<InvitationManagement />} />
                <Route path="storage-diagnostics" element={<StorageDiagnostics />} />
                <Route path="storage-test" element={<StorageTest />} />
                <Route path="kyc-storage-test" element={<KYCStorageTest />} />
                <Route path="farmer-performance" element={<FarmerPerformanceDashboard />} />
                <Route path="credit-management" element={<CreditManagementEssentials />} />
                {/* Removed credit-defaults, credit-audit, and credit-reports routes */}
                <Route path="credit-risk-assessment" element={<CreditRiskAssessment />} />
                <Route path="credit-settings" element={<CreditSettings />} />
                <Route path="error-reporting" element={<ErrorReportingDashboard />} />
                <Route path="variance-reporting" element={<VarianceReportingDashboard />} />
                <Route path="variance-insights" element={<VarianceInsightsDashboard />} />
                <Route path="penalty-management" element={<PenaltyManagementPage />} />
                <Route path="collectors" element={<CollectorsPage />} />
                <Route path="collections-debug" element={<CollectionsDebugPage />} />
                <Route path="deductions" element={<ServicesPage />} />
                <Route path="ai-monitoring" element={<AdminAIMonitoringDashboard />} />
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
        <Route path="payments/farmer/:farmerId" element={
          <ProtectedRoute requiredRole={UserRole.ADMIN}>
            <PageTransition>
              <FarmerPaymentDetails />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="payments/batches" element={
          <ProtectedRoute requiredRole={UserRole.ADMIN}>
            <PageTransition>
              <PaymentBatchManagement />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="payments/reports" element={
          <ProtectedRoute requiredRole={UserRole.ADMIN}>
            <PageTransition>
              <PaymentReports />
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
        <Route path="kyc-pending-farmer/:id" element={
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
        <Route path="credit-management" element={
          <ProtectedRoute requiredRole={UserRole.ADMIN}>
            <PageTransition>
              <CreditManagementEssentials />
            </PageTransition>
          </ProtectedRoute>
        } />
        {/* Removed credit-defaults, credit-audit, and credit-reports routes */}
        <Route path="credit-risk-assessment" element={
          <ProtectedRoute requiredRole={UserRole.ADMIN}>
            <PageTransition>
              <CreditRiskAssessment />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="credit-settings" element={
          <ProtectedRoute requiredRole={UserRole.ADMIN}>
            <PageTransition>
              <CreditSettings />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}