import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { UserRole } from "@/types/auth.types";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { PageTransition } from '@/components/PageTransition';
import { preloadRouteWhenIdle } from '@/utils/routePreloader';

// Lazy load farmer components
const FarmerDashboard = lazy(() => {
  const promise = import("../pages/farmer-portal/EnhancedFarmerDashboard");
  // Preload other frequently accessed pages when the app is idle
  setTimeout(() => {
    preloadRouteWhenIdle(() => import("../pages/farmer-portal/CollectionsPage"));
    preloadRouteWhenIdle(() => import("../pages/farmer-portal/PaymentsPage"));
    preloadRouteWhenIdle(() => import("../pages/farmer-portal/ProfilePage"));
  }, 1000);
  return promise;
});

const FarmerLogin = lazy(() => import("../pages/auth/FarmerLogin"));
const FarmerSignup = lazy(() => import("../pages/auth/FarmerSignup"));
const CollectionsPage = lazy(() => import("../pages/farmer-portal/CollectionsPage"));
const PaymentsPage = lazy(() => import("../pages/farmer-portal/PaymentsPage"));
const ProfilePage = lazy(() => import("../pages/farmer-portal/ProfilePage"));
const NotificationsPage = lazy(() => import("../pages/farmer-portal/NotificationsPage"));

export default function FarmerRoutes() {
  const location = useLocation();
  
  // Preload commonly accessed routes when on the dashboard
  useEffect(() => {
    if (location.pathname.includes('dashboard')) {
      preloadRouteWhenIdle(() => import("../pages/farmer-portal/CollectionsPage"));
      preloadRouteWhenIdle(() => import("../pages/farmer-portal/PaymentsPage"));
      preloadRouteWhenIdle(() => import("../pages/farmer-portal/ProfilePage"));
    }
    
    // Preload the dashboard when on other pages
    if (!location.pathname.includes('dashboard')) {
      preloadRouteWhenIdle(() => import("../pages/farmer-portal/EnhancedFarmerDashboard"));
    }
  }, [location.pathname]);
  
  return (
    <Suspense fallback={<LoadingSkeleton type="dashboard" />}>
      <Routes location={location}>
        <Route path="login" element={<FarmerLogin />} />
        <Route path="signup" element={<FarmerSignup />} />
        <Route path="dashboard" element={
          <ProtectedRoute requiredRole={UserRole.FARMER}>
            <PageTransition>
              <FarmerDashboard />
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
        <Route path="" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}