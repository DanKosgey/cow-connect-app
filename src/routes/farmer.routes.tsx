import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { PageLoader } from '@/components/PageLoader';
import { PageTransition } from '@/components/PageTransition';
import { UserRole } from '@/types/auth.types';

// Lazy load farmer components
const FarmerLogin = lazy(() => import("../pages/auth/FarmerLogin"));
const FarmerDashboard = lazy(() => import("../pages/farmer-portal/FarmerDashboard"));
const EnhancedFarmerDashboard = lazy(() => import("../pages/farmer-portal/EnhancedFarmerDashboard"));
const CollectionsPage = lazy(() => import("../pages/farmer-portal/CollectionsPage"));
const PaymentsPage = lazy(() => import("../pages/farmer-portal/PaymentsPage"));
const MarketPricesPage = lazy(() => import("../pages/farmer-portal/MarketPricesPage"));
const CommunityForumPage = lazy(() => import("../pages/farmer-portal/CommunityForumPage"));
const PerformanceInsightsPage = lazy(() => import("../pages/farmer-portal/PerformanceInsightsPage"));
const QualityReportsPage = lazy(() => import("../pages/farmer-portal/QualityReportsPage"));
const ProfilePage = lazy(() => import("../pages/farmer-portal/ProfilePage"));
const NotificationsPage = lazy(() => import("../pages/farmer-portal/NotificationsPage"));
const EnhancedKYCDocumentUpload = lazy(() => import("../pages/farmer/EnhancedKYCDocumentUpload"));
const ApplicationStatus = lazy(() => import("../pages/farmer/ApplicationStatus"));
const DocumentsUnderReview = lazy(() => import("../pages/farmer/DocumentsUnderReview"));

export default function FarmerRoutes() {
  return (
    <Suspense fallback={<PageLoader type="dashboard" />}>
      <Routes>
        <Route path="login" element={<FarmerLogin />} />
        <Route path="dashboard" element={
          <ProtectedRoute requiredRole={UserRole.FARMER}>
            <PageTransition>
              <EnhancedFarmerDashboard />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="collections" element={
          <ProtectedRoute requiredRole={UserRole.FARMER}>
            <PageTransition>
              <CollectionsPage />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="payments" element={
          <ProtectedRoute requiredRole={UserRole.FARMER}>
            <PageTransition>
              <PaymentsPage />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="market-prices" element={
          <ProtectedRoute requiredRole={UserRole.FARMER}>
            <PageTransition>
              <MarketPricesPage />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="community" element={
          <ProtectedRoute requiredRole={UserRole.FARMER}>
            <PageTransition>
              <CommunityForumPage />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="insights" element={
          <ProtectedRoute requiredRole={UserRole.FARMER}>
            <PageTransition>
              <PerformanceInsightsPage />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="quality" element={
          <ProtectedRoute requiredRole={UserRole.FARMER}>
            <PageTransition>
              <QualityReportsPage />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="profile" element={
          <ProtectedRoute requiredRole={UserRole.FARMER}>
            <PageTransition>
              <ProfilePage />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="notifications" element={
          <ProtectedRoute requiredRole={UserRole.FARMER}>
            <PageTransition>
              <NotificationsPage />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="kyc-upload" element={
          <ProtectedRoute requiredRole={UserRole.FARMER}>
            <PageTransition>
              <EnhancedKYCDocumentUpload />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="documents-under-review" element={
          <ProtectedRoute requiredRole={UserRole.FARMER}>
            <PageTransition>
              <DocumentsUnderReview />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="application-status" element={
          <ProtectedRoute requiredRole={UserRole.FARMER}>
            <PageTransition>
              <ApplicationStatus />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}