import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Landing from '@/pages/Landing';
import AdminLogin from '@/pages/admin/AdminLogin';
import StaffLogin from '@/pages/staff/StaffLogin';
import FarmerPortal from '@/pages/farmer/FarmerPortal';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import StaffDashboard from '@/pages/staff/StaffDashboard';
import FarmerDashboard from '@/pages/farmer/FarmerDashboard';
import NotFound from '@/pages/NotFound';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { UserRole } from '@/types/auth.types';

// Staff Portal Components
import CollectionForm from '@/components/staff/CollectionForm';
import RouteManagement from '@/components/staff/RouteManagement';
import PerformanceDashboard from '@/components/staff/PerformanceDashboard';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Landing />,
  },
  {
    path: '/admin/login',
    element: <AdminLogin />,
  },
  {
    path: '/staff/login',
    element: <StaffLogin />,
  },
  {
    path: '/farmer/portal',
    element: <FarmerPortal />,
  },
  // Dashboard and protected routes as children
  {
    path: '/admin',
    children: [
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute requiredRole={UserRole.ADMIN}>
            <AdminDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: '*',
        element: <NotFound />
      }
    ]
  },
  {
    path: '/staff',
    children: [
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute requiredRole={UserRole.STAFF}>
            <StaffDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'collections',
        element: (
          <ProtectedRoute requiredRole={UserRole.STAFF}>
            <CollectionForm />
          </ProtectedRoute>
        ),
      },
      {
        path: 'route',
        element: (
          <ProtectedRoute requiredRole={UserRole.STAFF}>
            <RouteManagement />
          </ProtectedRoute>
        ),
      },
      {
        path: 'performance',
        element: (
          <ProtectedRoute requiredRole={UserRole.STAFF}>
            <PerformanceDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: '*',
        element: <NotFound />
      }
    ]
  },
  {
    path: '/farmer',
    children: [
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute requiredRole={UserRole.FARMER}>
            <FarmerDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: '*',
        element: <NotFound />
      }
    ]
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);

export const AppRouter = () => {
  return <RouterProvider router={router} />;
};