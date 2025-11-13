import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from "react-router-dom";
import { UserRole } from "@/types/auth.types";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { DashboardLayout } from '@/components/DashboardLayout';

// Lazy load creditor components
const CreditorLogin = lazy(() => import("../pages/auth/CreditorLogin"));
const CreditorDashboard = lazy(() => import("../pages/creditor/CreditorDashboard"));

export default function CreditorRoutes() {
  return (
    <Suspense fallback={<LoadingSkeleton type="dashboard" />}>
      <Routes>
        <Route path="login" element={<CreditorLogin />} />
        <Route path="/*" element={
          <ProtectedRoute requiredRole={UserRole.CREDITOR}>
            <DashboardLayout>
              <Routes>
                <Route path="dashboard" element={<CreditorDashboard />} />
                <Route index element={<CreditorDashboard />} />
                <Route path="*" element={<Navigate to="/creditor/dashboard" replace />} />
              </Routes>
            </DashboardLayout>
          </ProtectedRoute>
        } />
      </Routes>
    </Suspense>
  );
}