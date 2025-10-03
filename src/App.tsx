import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { UserRole } from "@/types/auth.types";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { NotificationProvider } from '@/contexts/NotificationContext';
import Landing from "./pages/Landing";
import AdminLogin from "./pages/admin/AdminLogin";
import StaffLogin from "./pages/staff/StaffLogin";
import FarmerPortal from "./pages/farmer/FarmerPortal";
import AdminDashboard from "./pages/admin/AdminDashboard";
import StaffDashboard from "./pages/staff/StaffDashboard";
import FarmerDashboard from "./pages/farmer/FarmerDashboard";
import NotFound from "./pages/NotFound";
import NewCollection from "./pages/staff/NewCollection";
import FarmerRegistration from "./pages/FarmerRegistration";
import KYCApproval from "./pages/admin/KYCApproval";
import EnhancedCollection from "./pages/staff/EnhancedCollection";
import PaymentProcessing from "./pages/admin/PaymentProcessing";
import Farmers from "./pages/admin/Farmers";
import Staff from "./pages/admin/Staff";
import KYCManagement from "./pages/admin/KYCManagement";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <NotificationProvider>
          <AuthProvider>
            <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/staff/login" element={<StaffLogin />} />
            <Route path="/farmer/portal" element={<FarmerPortal />} />
            <Route path="/register" element={<FarmerRegistration />} />

            {/* Admin Routes */}
            <Route path="/admin/dashboard" element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/kyc-approval" element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <KYCApproval />
              </ProtectedRoute>
            } />
            <Route path="/admin/kyc" element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <KYCManagement />
              </ProtectedRoute>
            } />
            <Route path="/admin/farmers" element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Farmers />
              </ProtectedRoute>
            } />
            <Route path="/admin/staff" element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <Staff />
              </ProtectedRoute>
            } />
            <Route path="/admin/payment-processing" element={
              <ProtectedRoute requiredRole={UserRole.ADMIN}>
                <PaymentProcessing />
              </ProtectedRoute>
            } />

            {/* Staff Routes */}
            <Route path="/staff/dashboard" element={
              <ProtectedRoute requiredRole={UserRole.STAFF}>
                <StaffDashboard />
              </ProtectedRoute>
            } />
            <Route path="/staff/new-collection" element={
              <ProtectedRoute requiredRole={UserRole.STAFF}>
                <NewCollection />
              </ProtectedRoute>
            } />
            <Route path="/staff/enhanced-collection" element={
              <ProtectedRoute requiredRole={UserRole.STAFF}>
                <EnhancedCollection />
              </ProtectedRoute>
            } />

            {/* Farmer Routes */}
            <Route path="/farmer/dashboard" element={
              <ProtectedRoute requiredRole={UserRole.FARMER}>
                <FarmerDashboard />
              </ProtectedRoute>
            } />

            {/* Catch-all route for 404 */}
            <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </NotificationProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
