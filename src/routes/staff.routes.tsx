import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { UserRole } from '@/types/auth.types';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { StaffPortalLayout } from '@/components/staff/StaffPortalLayout';

// Lazy load pages
const BatchApprovalPage = lazy(() => import('@/pages/staff-portal/BatchApprovalPage'));
const StaffPortalDashboard = lazy(() => import('@/pages/staff-portal/StaffPortalDashboard'));

const StaffPortalRoutes: React.FC = () => {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <Routes>
        <Route path="/staff-only/dashboard" element={
          <ProtectedRoute requiredRole={UserRole.STAFF}>
            <StaffPortalLayout>
              <StaffPortalDashboard />
            </StaffPortalLayout>
          </ProtectedRoute>
        } />
        <Route path="/staff-only/batch-approval" element={
          <ProtectedRoute requiredRole={UserRole.STAFF}>
            <StaffPortalLayout>
              <BatchApprovalPage />
            </StaffPortalLayout>
          </ProtectedRoute>
        } />
      </Routes>
    </Suspense>
  );
};

export default StaffPortalRoutes;