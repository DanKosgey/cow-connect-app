
const StaffPortalRoutes: React.FC = () => {

  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <Routes>
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