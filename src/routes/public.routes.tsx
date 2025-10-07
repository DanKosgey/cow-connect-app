import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, useLocation } from "react-router-dom";
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { PageTransition } from '@/components/PageTransition';
import { preloadRouteWhenIdle } from '@/utils/routePreloader';

// Lazy load public components
const Landing = lazy(() => {
  const promise = import("../pages/Landing");
  // Preload commonly accessed pages
  setTimeout(() => {
    preloadRouteWhenIdle(() => import("../pages/auth/Login"));
    preloadRouteWhenIdle(() => import("../pages/auth/FarmerSignup"));
  }, 1000);
  return promise;
});

const Login = lazy(() => import("../pages/auth/Login"));
const AuthTestPage = lazy(() => import("../pages/auth/AuthTestPage"));
const FarmerSignup = lazy(() => import("../pages/auth/FarmerSignup"));
const EmailConfirmation = lazy(() => import("../pages/EmailConfirmation"));
const CompleteRegistration = lazy(() => import("../pages/CompleteRegistration"));
const AuthCallback = lazy(() => import("../pages/AuthCallback"));
const NotFound = lazy(() => import("../pages/NotFound"));

export default function PublicRoutes() {
  const location = useLocation();
  
  // Preload commonly accessed routes
  useEffect(() => {
    preloadRouteWhenIdle(() => import("../pages/auth/Login"));
    preloadRouteWhenIdle(() => import("../pages/auth/FarmerSignup"));
  }, []);
  
  return (
    <Suspense fallback={<LoadingSkeleton type="form" />}>
      <Routes location={location}>
        <Route path="/" element={
          <PageTransition>
            <Landing />
          </PageTransition>
        } />
        <Route path="/login" element={
          <PageTransition>
            <Login />
          </PageTransition>
        } />
        <Route path="/auth-test" element={
          <PageTransition>
            <AuthTestPage />
          </PageTransition>
        } />
        <Route path="/register" element={
          <PageTransition>
            <FarmerSignup />
          </PageTransition>
        } />
        <Route path="/auth/callback" element={
          <PageTransition>
            <AuthCallback />
          </PageTransition>
        } />
        <Route path="/email-confirmation" element={
          <PageTransition>
            <EmailConfirmation />
          </PageTransition>
        } />
        <Route path="/complete-registration" element={
          <PageTransition>
            <CompleteRegistration />
          </PageTransition>
        } />
        <Route path="*" element={
          <PageTransition>
            <NotFound />
          </PageTransition>
        } />
      </Routes>
    </Suspense>
  );
}