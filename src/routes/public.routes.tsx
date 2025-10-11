import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, useLocation } from "react-router-dom";
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { PageTransition } from '@/components/PageTransition';
import { preloadRouteWhenIdle } from '@/utils/routePreloader';

// Lazy load public components
const Landing = lazy(() => import("../pages/Landing"));
const Login = lazy(() => import("../pages/auth/Login"));
const AuthTestPage = lazy(() => import("../pages/auth/AuthTestPage"));
const AuthFlowTest = lazy(() => import("../pages/auth/AuthFlowTest"));
const FarmerSignup = lazy(() => import("../pages/auth/FarmerSignup"));
const EmailVerificationWaiting = lazy(() => import("../pages/auth/EmailVerificationWaiting"));
const ForgotPassword = lazy(() => import("../pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("../pages/auth/ResetPassword"));
const PasswordResetTest = lazy(() => import("../pages/auth/PasswordResetTest"));
const TestDBConnection = lazy(() => import("../pages/TestDBConnection"));
const TestAuthFlow = lazy(() => import("../pages/TestAuthFlow"));
const AuthCallback = lazy(() => import("../pages/AuthCallback"));
const EmailVerificationCallback = lazy(() => import("../pages/farmer/EmailVerificationCallback"));
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
        <Route path="/auth-flow-test" element={
          <PageTransition>
            <AuthFlowTest />
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
            <PasswordResetTest />
          </PageTransition>
        } />
        <Route path="/test-db" element={
          <PageTransition>
            <TestDBConnection />
          </PageTransition>
        } />
        <Route path="/test-auth" element={
          <PageTransition>
            <TestAuthFlow />
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