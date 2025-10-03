import { createBrowserRouter, RouteObject } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Index from "@/core/components/Index";
import Login from "@/auth/pages/LoginPage";
import AdminDashboard from "@/admin/pages/AdminDashboardPage";
import FarmerPortal from "@/farmers/pages/FarmerPortalPage";
import AdminKYC from "@/admin/pages/AdminKYCPage";
import AdminCollections from "@/admin/pages/AdminCollectionsPage";
import AdminPayments from "@/admin/pages/AdminPaymentsPage";
import AdminAnalytics from "@/admin/pages/AdminAnalyticsPage";
import AdminAIPage from "@/admin/pages/AdminAIPage";
import FarmerKYC from "@/farmers/pages/FarmerKYCPage";
import StaffCollections from "@/staff/pages/StaffCollectionsPage";
import NotFound from "@/core/components/NotFound";
import Errads from "@/admin/pages/ErradsPage";
import StaffPortal from "@/staff/pages/StaffPortalPage";
import Tasks from "@/core/components/Tasks";
import Features from "@/core/components/Features";
import ApiTestPage from "@/core/components/ApiTestPage";
import FarmerRegister from "@/farmers/pages/FarmerRegisterPage";
import KYCExample from "@/core/components/KYCExample";
import { AuthProvider } from '@/auth/components/providers/AuthProvider';
import PerformanceDashboardPage from "@/admin/pages/PerformanceDashboardPage";

// Lazy load components
const AdminLogin = lazy(() => import("@/auth/pages/AdminLoginPage"));
const StaffLogin = lazy(() => import("@/auth/pages/StaffLoginPage"));
const FarmerLogin = lazy(() => import("@/auth/pages/FarmerLoginPage"));
const FarmerProfile = lazy(() => import("@/farmers/pages/FarmerProfilePage"));
const FarmerDashboardPage = lazy(() => import("@/farmers/pages/FarmerDashboardPage"));
const FarmerDashboardExample = lazy(() => import("@/farmers/pages/FarmerDashboardExamplePage"));
const CollectionRecordingPage = lazy(() => import("@/collections/pages/CollectionRecordingPage"));
const CollectionExample = lazy(() => import("@/collections/pages/CollectionExamplePage"));

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

// Wrap route elements with AuthProvider only when needed
const wrapWithAuth = (Component: React.ComponentType) => {
  return (
    <AuthProvider>
      <Component />
    </AuthProvider>
  );
};

const routes: RouteObject[] = [
  {
    path: "/",
    element: <Index />,
  },
  {
    path: "/login",
    element: (
      <AuthProvider>
        <Login />
      </AuthProvider>
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
    element: <Features />,
  },
  {
    path: "/api-test",
    element: <ApiTestPage />,
  },
  {
    path: "/kyc-example",
    element: <KYCExample />,
  },
  {
    path: "/admin",
    element: wrapWithAuth(AdminDashboard),
  },
  // Add common admin portal routes that might be expected
  {
    path: "/admin/dashboard",
    element: wrapWithAuth(AdminDashboard),
  },
  {
    path: "/admin/kyc",
    element: wrapWithAuth(AdminKYC),
  },
  {
    path: "/admin/collections",
    element: wrapWithAuth(AdminCollections),
  },
  {
    path: "/admin/payments",
    element: wrapWithAuth(AdminPayments),
  },
  {
    path: "/admin/analytics",
    element: wrapWithAuth(AdminAnalytics),
  },
  {
    path: "/admin/ai",
    element: wrapWithAuth(AdminAIPage),
  },
  {
    path: "/admin/tasks",
    element: wrapWithAuth(Tasks),
  },
  {
    path: "/admin/performance",
    element: wrapWithAuth(PerformanceDashboardPage),
  },
  {
    path: "/farmer",
    element: wrapWithAuth(FarmerPortal),
  },
  // Add common farmer portal routes that might be expected
  {
    path: "/farmer/dashboard",
    element: wrapWithAuth(FarmerPortal),
  },
  {
    path: "/farmer/profile",
    element: wrapWithAuth(FarmerProfile),
  },
  {
    path: "/farmer/kyc",
    element: wrapWithAuth(FarmerKYC),
  },
  {
    path: "/farmer/dashboard",
    element: (
      <Suspense fallback={<PageLoader />}>
        <FarmerDashboardPage />
      </Suspense>
    ),
  },
  {
    path: "/farmer/dashboard/example",
    element: (
      <Suspense fallback={<PageLoader />}>
        <FarmerDashboardExample />
      </Suspense>
    ),
  },
  {
    path: "/collections/record",
    element: (
      <Suspense fallback={<PageLoader />}>
        <CollectionRecordingPage />
      </Suspense>
    ),
  },
  {
    path: "/collections/example",
    element: (
      <Suspense fallback={<PageLoader />}>
        <CollectionExample />
      </Suspense>
    ),
  },
  {
    path: "/farmer/register",
    element: <FarmerRegister />,
  },
  {
    path: "/staff",
    element: wrapWithAuth(StaffPortal),
  },
  // Add the missing /staff/dashboard route that redirects to /staff
  {
    path: "/staff/dashboard",
    element: wrapWithAuth(StaffPortal),
  },
  // Add specific staff tab routes for better navigation
  {
    path: "/staff/routes",
    element: wrapWithAuth(StaffPortal),
  },
  {
    path: "/staff/collections",
    element: wrapWithAuth(StaffPortal),
  },
  {
    path: "/staff/rewards",
    element: wrapWithAuth(StaffPortal),
  },
  {
    path: "/staff/tasks",
    element: wrapWithAuth(Tasks),
  },
  {
    path: "/admin/errads",
    element: wrapWithAuth(Errads),
  },
  {
    path: "*",
    element: <NotFound />,
  },
];

export const router = createBrowserRouter(routes);