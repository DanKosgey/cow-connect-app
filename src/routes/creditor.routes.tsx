import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from "react-router-dom";
import { UserRole } from "@/types/auth.types";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { LoadingSkeleton } from '@/components/LoadingSkeleton';
import { DashboardLayout } from '@/components/DashboardLayout';

// Lazy load creditor components
const CreditorLogin = lazy(() => import("../pages/auth/CreditorLogin"));
const CreditorDashboard = lazy(() => import("../pages/creditor/CreditorDashboard"));
const CreditManagement = lazy(() => import("../pages/creditor/CreditManagement"));
const CreditReports = lazy(() => import("../pages/creditor/CreditReports"));
const FarmerProfiles = lazy(() => import("../pages/creditor/FarmerProfiles"));
const FarmerProfileDetail = lazy(() => import("../pages/creditor/FarmerProfileDetail"));
const PaymentTracking = lazy(() => import("../pages/creditor/PaymentTracking"));
const ProductManagement = lazy(() => import("../pages/creditor/ProductManagement"));

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
                <Route path="credit-management" element={<CreditManagement />} />
                <Route path="product-management" element={<ProductManagement />} />
                <Route path="credit-reports" element={<CreditReports />} />
                <Route path="farmer-profiles" element={<FarmerProfiles />} />
                <Route path="farmer-profiles/:farmerId" element={<FarmerProfileDetail />} />
                <Route path="payment-tracking" element={<PaymentTracking />} />
                <Route index element={<CreditorDashboard />} />
                <Route path="*" element={<Navigate to="/creditor/dashboard" replace />} />
              </Routes>
            </DashboardLayout>
          </ProtectedRoute>
        } />
        {/* Redirect any other paths to login */}
        <Route path="*" element={<Navigate to="/creditor/login" replace />} />
      </Routes>
    </Suspense>
  );
}