import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from "react-router-dom";
import { UserRole } from "@/types/auth.types";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { StaffPortalLayout } from '@/components/staff/StaffPortalLayout';

// Lazy load staff components
const StaffLogin = lazy(() => import("../pages/auth/StaffLogin"));
const StaffPortalDashboard = lazy(() => import("../pages/staff-portal/StaffPortalDashboard"));
const MilkApprovalPage = lazy(() => import("../pages/staff-portal/MilkApprovalPage"));
const VarianceReportPage = lazy(() => import("../pages/staff-portal/VarianceReportPage"));
const CollectorPerformanceDashboard = lazy(() => import("../pages/staff-portal/CollectorPerformanceDashboard"));

export default function StaffOnlyRoutes() {
  return (
    <Suspense fallback={<LoadingSkeleton type="dashboard" />}>
      <Routes>
        <Route path="login" element={<StaffLogin />} />
        <Route path="/*" element={
          <ProtectedRoute requiredRole={UserRole.STAFF}>
            <StaffPortalLayout>
              <Routes>
                <Route path="dashboard" element={<StaffPortalDashboard />} />
                <Route path="milk-approval" element={<MilkApprovalPage />} />
                <Route path="variance-reports" element={<VarianceReportPage />} />
                <Route path="collector-performance" element={<CollectorPerformanceDashboard />} />
                <Route index element={<StaffPortalDashboard />} />
                <Route path="*" element={<Navigate to="/staff-only/dashboard" replace />} />
              </Routes>
            </StaffPortalLayout>
          </ProtectedRoute>
        } />
      </Routes>
    </Suspense>
  );
}