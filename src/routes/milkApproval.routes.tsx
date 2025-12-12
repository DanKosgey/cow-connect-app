import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { UserRole } from "@/types/auth.types";
import { ProtectedRoute } from "../components/auth/ProtectedRoute";
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { PageTransition } from '@/components/PageTransition';
import { preloadRouteWhenIdle } from '@/utils/routePreloader';
import { MilkApprovalDashboardLayout } from '@/components/milkApproval/MilkApprovalDashboardLayout';

// Lazy load milk approval components
const StaffLogin = lazy(() => import("../pages/auth/StaffLogin"));
const MilkApprovalStaffDashboard = lazy(() => import("../pages/staff-portal/MilkApprovalStaffDashboard"));
const MilkApprovalDashboard = lazy(() => import("../pages/staff-portal/MilkApprovalPage"));
const VarianceReportPage = lazy(() => import("../pages/staff-portal/VarianceReportPage"));
// Removed CollectorPerformanceDashboard import as it doesn't exist and should be excluded per requirements

export default function MilkApprovalRoutes() {
  const location = useLocation();
  
  return (
    <Suspense fallback={<LoadingSkeleton type="dashboard" />}>
      <Routes>
        <Route path="login" element={<StaffLogin />} />
        <Route path="/*" element={
          <ProtectedRoute requiredRole={UserRole.STAFF}>
            <MilkApprovalDashboardLayout>
              <Routes>
                <Route path="dashboard" element={<MilkApprovalStaffDashboard />} />
                <Route path="approvals" element={<MilkApprovalDashboard />} />
                <Route path="variance-reports" element={<VarianceReportPage />} />
                {/* Removed collector-performance route as it should be excluded from staff view per requirements */}
                <Route index element={<MilkApprovalStaffDashboard />} />
                <Route path="*" element={<Navigate to="/milk-approval/dashboard" replace />} />
              </Routes>
            </MilkApprovalDashboardLayout>
          </ProtectedRoute>
        } />
        {/* Redirect any other paths to login */}
        <Route path="*" element={<Navigate to="/milk-approval/login" replace />} />
      </Routes>
    </Suspense>
  );
}