import { createBrowserRouter, RouteObject, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Index from "./pages/Index";

import { AuthProvider } from './contexts/AuthContext';
import NotFound from "./pages/NotFound";
import { AdminRoute } from './components/AdminRoute';
import { StaffRoute } from './components/StaffRoute';
import { FarmerRoute } from './components/FarmerRoute';
import { ProtectedRoute } from './components/ProtectedRoute';

// Lazy load components
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const StaffLogin = lazy(() => import("./pages/StaffLogin"));
const FarmerLogin = lazy(() => import("./pages/FarmerLogin"));
const FarmerProfile = lazy(() => import("./pages/FarmerProfile"));
const FarmerDashboardPage = lazy(() => import("./pages/FarmerDashboardPage"));
const FarmerCollectionsPage = lazy(() => import("./domains/farmers/pages/FarmerCollectionsPage"));
const FarmerLandingPage = lazy(() => import("./domains/farmers/pages/FarmerLandingPage"));
const FarmerNotificationsPage = lazy(() => import("./domains/farmers/pages/FarmerNotificationsPage"));
const FarmerSupportPage = lazy(() => import("./domains/farmers/pages/FarmerSupportPage"));
const FarmerSettingsPage = lazy(() => import("./domains/farmers/pages/FarmerSettingsPage"));
const FarmerDocumentsPage = lazy(() => import("./domains/farmers/pages/FarmerDocumentsPage"));
const FarmerAnalyticsPage = lazy(() => import("./domains/farmers/pages/FarmerAnalyticsPage"));
const FarmerEmailVerificationPage = lazy(() => import("./domains/farmers/pages/FarmerEmailVerificationPage"));
const FarmerPasswordResetPage = lazy(() => import("./domains/farmers/pages/FarmerPasswordResetPage"));

const CollectionRecordingPage = lazy(() => import("./pages/CollectionRecordingPage"));
// Lazy load portal components for route-based code splitting
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const FarmerPortal = lazy(() => import("./pages/FarmerPortal"));
const StaffPortal = lazy(() => import("./pages/StaffPortal"));

// Other components
const AdminKYC = lazy(() => import("./pages/AdminKYC"));
const AdminCollections = lazy(() => import("./pages/AdminCollections"));
const AdminPayments = lazy(() => import("./pages/AdminPayments"));
const AdminAnalytics = lazy(() => import("./pages/AdminAnalytics"));
const AdminAIPage = lazy(() => import("./pages/AdminAI"));
const AdminStaff = lazy(() => import("./pages/AdminStaff"));
const FarmerKYC = lazy(() => import("./pages/FarmerKYC"));
const StaffCollections = lazy(() => import("./pages/StaffCollections"));
const Tasks = lazy(() => import("./pages/tasks"));
const Features = lazy(() => import("./pages/Features"));
const FarmerRegister = lazy(() => import("./pages/FarmerRegister"));
const PerformanceDashboardPage = lazy(() => import("./pages/PerformanceDashboardPage"));

// Loading component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="flex flex-col items-center justify-center space-y-2">
      <svg
        className="animate-spin h-8 w-8 text-green-600"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        ></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
      <p className="text-sm text-gray-600">Loading page...</p>
    </div>
  </div>
);

const LoginPage = lazy(() => import("./domains/auth/pages/LoginPage"));

const routes: RouteObject[] = [
  {
    path: "/",
    element: <Index />,
  },

  {
    path: "/login",
    element: (
      <Suspense fallback={<PageLoader />}>
        <LoginPage />
      </Suspense>
    ),
  },

  {
    path: "/admin/login",
    element: (
      <Suspense fallback={<PageLoader />}>
        <AdminLogin />
      </Suspense>
    ),
  },
  {
    path: "/staff/login",
    element: (
      <Suspense fallback={<PageLoader />}>
        <StaffLogin />
      </Suspense>
    ),
  },
  {
    path: "/farmer/login",
    element: (
      <Suspense fallback={<PageLoader />}>
        <FarmerLogin />
      </Suspense>
    ),
  },
  {
    path: "/features",
    element: (
      <Suspense fallback={<PageLoader />}>
        <Features />
      </Suspense>
    ),
  },

  {
    path: "/admin",
    element: (
      <AdminRoute>
        <AdminDashboard />
      </AdminRoute>
    ),
  },
  // Add common admin portal routes that might be expected
  {
    path: "/admin/dashboard",
    element: (
      <AdminRoute>
        <AdminDashboard />
      </AdminRoute>
    ),
  },
  {
    path: "/admin/kyc",
    element: (
      <AdminRoute>
        <AdminKYC />
      </AdminRoute>
    ),
  },
  {
    path: "/admin/collections",
    element: (
      <AdminRoute>
        <AdminCollections />
      </AdminRoute>
    ),
  },
  {
    path: "/admin/payments",
    element: (
      <AdminRoute>
        <AdminPayments />
      </AdminRoute>
    ),
  },
  {
    path: "/admin/analytics",
    element: (
      <AdminRoute>
        <AdminAnalytics />
      </AdminRoute>
    ),
  },
  {
    path: "/admin/ai",
    element: (
      <AdminRoute>
        <AdminAIPage />
      </AdminRoute>
    ),
  },
  {
    path: "/admin/tasks",
    element: (
      <AdminRoute>
        <Tasks />
      </AdminRoute>
    ),
  },
  {
    path: "/admin/performance",
    element: (
      <AdminRoute>
        <PerformanceDashboardPage />
      </AdminRoute>
    ),
  },
  {
    path: "/admin/staff",
    element: (
      <AdminRoute>
        <AdminStaff />
      </AdminRoute>
    ),
  },
  {
    path: "/farmer",
    element: (
      <FarmerRoute>
        <FarmerLandingPage />
      </FarmerRoute>
    ),
  },
  {
    path: "/farmer/dashboard",
    element: (
      <FarmerRoute>
        <FarmerPortal />
      </FarmerRoute>
    ),
  },
  {
    path: "/farmer/profile",
    element: (
      <FarmerRoute>
        <FarmerProfile />
      </FarmerRoute>
    ),
  },
  {
    path: "/farmer/kyc",
    element: (
      <FarmerRoute>
        <FarmerKYC />
      </FarmerRoute>
    ),
  },
  {
    path: "/farmer/collections",
    element: (
      <FarmerRoute>
        <FarmerCollectionsPage />
      </FarmerRoute>
    ),
  },
  {
    path: "/farmer/notifications",
    element: (
      <FarmerRoute>
        <FarmerNotificationsPage />
      </FarmerRoute>
    ),
  },
  {
    path: "/farmer/support",
    element: (
      <FarmerRoute>
        <FarmerSupportPage />
      </FarmerRoute>
    ),
  },
  {
    path: "/farmer/settings",
    element: (
      <FarmerRoute>
        <FarmerSettingsPage />
      </FarmerRoute>
    ),
  },
  {
    path: "/farmer/documents",
    element: (
      <FarmerRoute>
        <FarmerDocumentsPage />
      </FarmerRoute>
    ),
  },
  {
    path: "/farmer/analytics",
    element: (
      <FarmerRoute>
        <FarmerAnalyticsPage />
      </FarmerRoute>
    ),
  },
  {
    path: "/farmer/verify-email",
    element: (
      <ProtectedRoute>
        <FarmerEmailVerificationPage />
      </ProtectedRoute>
    ),
  },
  {
    path: "/farmer/reset-password",
    element: (
      <ProtectedRoute>
        <FarmerPasswordResetPage />
      </ProtectedRoute>
    ),
  },

  {
    path: "/collections/record",
    element: (
      <StaffRoute>
        <CollectionRecordingPage />
      </StaffRoute>
    ),
  },

  {
    path: "/farmer/register",
    element: (
      <Suspense fallback={<PageLoader />}>
        <FarmerRegister />
      </Suspense>
    ),
  },
  {
    path: "/staff",
    element: (
      <StaffRoute>
        <StaffPortal />
      </StaffRoute>
    ),
  },
  // Add the missing /staff/dashboard route that redirects to /staff
  {
    path: "/staff/dashboard",
    element: (
      <StaffRoute>
        <StaffPortal />
      </StaffRoute>
    ),
  },
  // Add specific staff tab routes for better navigation
  {
    path: "/staff/routes",
    element: (
      <StaffRoute>
        <StaffPortal />
      </StaffRoute>
    ),
  },
  {
    path: "/staff/collections",
    element: (
      <StaffRoute>
        <StaffPortal />
      </StaffRoute>
    ),
  },
  {
    path: "/staff/rewards",
    element: (
      <StaffRoute>
        <StaffPortal />
      </StaffRoute>
    ),
  },
  {
    path: "/staff/tasks",
    element: (
      <StaffRoute>
        <Tasks />
      </StaffRoute>
    ),
  },

  {
    path: "*",
    element: <NotFound />,
  },
];

export const router = createBrowserRouter(routes);