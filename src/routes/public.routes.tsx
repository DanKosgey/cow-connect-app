import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { PageTransition } from '@/components/PageTransition';
import { preloadRouteWhenIdle } from '@/utils/routePreloader';

// Lazy load public components
const Landing = lazy(() => import("../pages/Landing"));
const Login = lazy(() => import("../pages/auth/Login"));


const FarmerSignup = lazy(() => import("../pages/auth/FarmerSignup"));
const EmailVerificationWaiting = lazy(() => import("../pages/auth/EmailVerificationWaiting"));
const ForgotPassword = lazy(() => import("../pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("../pages/auth/ResetPassword"));



const AuthCallback = lazy(() => import("../pages/AuthCallback"));
const EmailVerificationCallback = lazy(() => import("../pages/farmer/EmailVerificationCallback"));
const AcceptInvitePage = lazy(() => import("../pages/accept-invite"));
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
        <Route path="/auth/login" element={<Navigate to="/login" replace />} />
        <Route path="/auth-test" element={
          <PageTransition>
            <NotFound />
          </PageTransition>
        } />
        <Route path="/auth-flow-test" element={
          <PageTransition>
            <NotFound />
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
        <Route path="/verify-email" element={
          <PageTransition>
            <EmailVerificationCallback />
          </PageTransition>
        } />
        <Route path="/auth/email-verification-waiting" element={
          <PageTransition>
            <EmailVerificationWaiting />
          </PageTransition>
        } />
        <Route path="/auth/forgot-password" element={
          <PageTransition>
            <ForgotPassword />
          </PageTransition>
        } />
        <Route path="/auth/reset-password" element={
          <PageTransition>
            <ResetPassword />
          </PageTransition>
        } />
        <Route path="/auth/reset-test" element={
          <PageTransition>
            <NotFound />
          </PageTransition>
        } />
        <Route path="/test-db" element={
          <PageTransition>
            <NotFound />
          </PageTransition>
        } />
        <Route path="/test-auth" element={
          <PageTransition>
            <NotFound />
          </PageTransition>
        } />
        <Route path="/accept-invite" element={
          <PageTransition>
            <AcceptInvitePage />
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