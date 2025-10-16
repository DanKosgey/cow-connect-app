import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { PageLoader } from '@/components/PageLoader';
import { PageTransition } from '@/components/PageTransition';
import { UserRole } from '@/types/auth.types';
import { DashboardLayout } from '@/components/DashboardLayout';

// Lazy load farmer components
const FarmerLogin = lazy(() => import("../pages/auth/FarmerLogin"));
const FarmerDashboard = lazy(() => import("../pages/farmer-portal/FarmerDashboard"));
const EnhancedFarmerDashboard = lazy(() => import("../pages/farmer-portal/EnhancedFarmerDashboard"));
const CollectionsPage = lazy(() => import("../pages/farmer-portal/CollectionsPage"));
const PaymentsPage = lazy(() => import("../pages/farmer-portal/PaymentsPage"));
// MarketPricesPage removed as requested
const CommunityForumPage = lazy(() => import("../pages/farmer-portal/CommunityForumPage"));
const AnalyticsPage = lazy(() => import("../pages/farmer-portal/AnalyticsPage"));
const QualityReportsPage = lazy(() => import("../pages/farmer-portal/QualityReportsPage"));
const ProfilePage = lazy(() => import("../pages/farmer-portal/ProfilePage"));
const NotificationsPage = lazy(() => import("../pages/farmer-portal/NotificationsPage"));
const EnhancedKYCDocumentUpload = lazy(() => import("../pages/farmer/EnhancedKYCDocumentUpload"));
const ApplicationStatus = lazy(() => import("../pages/farmer/ApplicationStatus"));
const DocumentsUnderReview = lazy(() => import("../pages/farmer/DocumentsUnderReview"));
const FarmerSignup = lazy(() => import("../pages/auth/FarmerSignup"));
const ForgotPassword = lazy(() => import("../pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("../pages/auth/ResetPassword"));
const EmailVerificationCallback = lazy(() => import("../pages/farmer/EmailVerificationCallback"));
const AuthCallback = lazy(() => import("../pages/AuthCallback"));
const KYCUploadDiagnostics = lazy(() => import("../pages/farmer/KYCUploadDiagnostics"));
const TestKYCUpload = lazy(() => import("../pages/farmer/TestKYCUpload"));
const TestKYCFarmerData = lazy(() => import("../pages/farmer/TestKYCFarmerData"));
const TestEnhancedLogging = lazy(() => import("../pages/farmer/TestEnhancedLogging"));
const TestActivityLogging = lazy(() => import("../pages/farmer/TestActivityLogging"));
const TestRoute = lazy(() => import("../pages/farmer/TestRoute"));

const FarmerRoutes = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="login" element={<FarmerLogin />} />
        <Route path="signup" element={<FarmerSignup />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route path="email-verification" element={<EmailVerificationCallback />} />
        <Route path="callback" element={<AuthCallback />} />
        <Route path="kyc-upload-diagnostics" element={
          <ProtectedRoute requiredRole={UserRole.FARMER}>
            <PageTransition>
              <KYCUploadDiagnostics />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="test-kyc-upload" element={
          <ProtectedRoute requiredRole={UserRole.FARMER}>
            <PageTransition>
              <TestKYCUpload />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="test-kyc-farmer-data" element={
          <ProtectedRoute requiredRole={UserRole.FARMER}>
            <PageTransition>
              <TestKYCFarmerData />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="test-enhanced-logging" element={
          <ProtectedRoute requiredRole={UserRole.FARMER}>
            <PageTransition>
              <TestEnhancedLogging />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="test-activity-logging" element={
          <ProtectedRoute requiredRole={UserRole.FARMER}>
            <PageTransition>
              <TestActivityLogging />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="test-route" element={
          <ProtectedRoute requiredRole={UserRole.FARMER}>
            <PageTransition>
              <TestRoute />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="dashboard" element={
          <ProtectedRoute requiredRole={UserRole.FARMER}>
            <DashboardLayout>
              <PageTransition>
                <FarmerDashboard />
              </PageTransition>
            </DashboardLayout>
          </ProtectedRoute>
        } />
        <Route path="enhanced-dashboard" element={
          <ProtectedRoute requiredRole={UserRole.FARMER}>
            <DashboardLayout>
              <PageTransition>
                <EnhancedFarmerDashboard />
              </PageTransition>
            </DashboardLayout>
          </ProtectedRoute>
        } />
        <Route path="collections" element={
          <ProtectedRoute requiredRole={UserRole.FARMER}>
            <DashboardLayout>
              <PageTransition>
                <CollectionsPage />
              </PageTransition>
            </DashboardLayout>
          </ProtectedRoute>
        } />
        <Route path="payments" element={
          <ProtectedRoute requiredRole={UserRole.FARMER}>
            <DashboardLayout>
              <PageTransition>
                <PaymentsPage />
              </PageTransition>
            </DashboardLayout>
          </ProtectedRoute>
        } />
        {/* Market Prices route removed as requested */}
        <Route path="community" element={
          <ProtectedRoute requiredRole={UserRole.FARMER}>
            <DashboardLayout>
              <PageTransition>
                <CommunityForumPage />
              </PageTransition>
            </DashboardLayout>
          </ProtectedRoute>
        } />
        <Route path="analytics" element={
          <ProtectedRoute requiredRole={UserRole.FARMER}>
            <DashboardLayout>
              <PageTransition>
                <AnalyticsPage />
              </PageTransition>
            </DashboardLayout>
          </ProtectedRoute>
        } />
        <Route path="quality" element={
          <ProtectedRoute requiredRole={UserRole.FARMER}>
            <DashboardLayout>
              <PageTransition>
                <QualityReportsPage />
              </PageTransition>
            </DashboardLayout>
          </ProtectedRoute>
        } />
        <Route path="profile" element={
          <ProtectedRoute requiredRole={UserRole.FARMER}>
            <DashboardLayout>
              <PageTransition>
                <ProfilePage />
              </PageTransition>
            </DashboardLayout>
          </ProtectedRoute>
        } />
        <Route path="notifications" element={
          <ProtectedRoute requiredRole={UserRole.FARMER}>
            <DashboardLayout>
              <PageTransition>
                <NotificationsPage />
              </PageTransition>
            </DashboardLayout>
          </ProtectedRoute>
        } />
        <Route path="kyc-upload" element={
          <ProtectedRoute requiredRole={UserRole.FARMER}>
            <DashboardLayout>
              <PageTransition>
                <EnhancedKYCDocumentUpload />
              </PageTransition>
            </DashboardLayout>
          </ProtectedRoute>
        } />
        <Route path="documents-under-review" element={
          <ProtectedRoute requiredRole={UserRole.FARMER}>
            <DashboardLayout>
              <PageTransition>
                <DocumentsUnderReview />
              </PageTransition>
            </DashboardLayout>
          </ProtectedRoute>
        } />
        <Route path="application-status" element={
          <ProtectedRoute requiredRole={UserRole.FARMER}>
            <DashboardLayout>
              <PageTransition>
                <ApplicationStatus />
              </PageTransition>
            </DashboardLayout>
          </ProtectedRoute>
        } />
        <Route path="/" element={<Navigate to="/farmer/enhanced-dashboard" replace />} />
      </Routes>
    </Suspense>
  );
};

export default FarmerRoutes;