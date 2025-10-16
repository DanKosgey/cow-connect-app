# Navigation Debugging

## Purpose

This document describes the debugging measures added to identify and resolve navigation issues in the farmer registration and KYC upload flow.

## Debugging Added

### 1. Enhanced Logging in FarmerSignup Component

**File**: `src/pages/auth/FarmerSignup.tsx`

Added detailed logging around the navigation call:
- Log before attempting navigation
- Log after navigation call completes
- This will help determine if the navigation call is being executed

### 2. Enhanced Logging in EnhancedKYCDocumentUpload Component

**File**: `src/pages/farmer/EnhancedKYCDocumentUpload.tsx`

Added detailed logging throughout the useEffect hook:
- Log when component mounts
- Log authentication state
- Log when fetching farmer data
- Log results of farmer data fetch
- Log navigation attempts
- This will help determine if the component is being mounted and what's happening during data fetching

### 3. Enhanced Logging in ProtectedRoute Component

**File**: `src/components/ProtectedRoute.tsx`

Added detailed logging for authentication state changes:
- Log authentication state changes
- Log role mismatches
- Log navigation redirects
- Log when access is allowed
- This will help determine if the ProtectedRoute is blocking access

### 4. Enhanced Logging in DashboardLayout Component

**File**: `src/components/DashboardLayout.tsx`

Added logging for location changes:
- Log when location changes
- Log user role and ID
- This will help determine if the layout component is receiving navigation events

### 5. Enhanced Logging in AuthProvider

**File**: `src/contexts/SimplifiedAuthContext.tsx`

Added logging for context value changes:
- Log user authentication state
- Log user role
- Log loading state
- This will help determine if authentication state is changing as expected

## How to Use

### Monitoring Console Logs

With these debugging measures in place, you should monitor the browser console for:

1. **FarmerSignup Logs**:
   - "FarmerSignup: Attempting navigation to KYC upload page"
   - "FarmerSignup: Navigation call completed"

2. **EnhancedKYCDocumentUpload Logs**:
   - "EnhancedKYCDocumentUpload: Component mounted"
   - "EnhancedKYCDocumentUpload: Fetching farmer data for user"
   - "EnhancedKYCDocumentUpload: Found pending farmer data"

3. **ProtectedRoute Logs**:
   - "ProtectedRoute auth state changed"
   - "ProtectedRoute: Redirecting to login"
   - "ProtectedRoute: Role mismatch"
   - "ProtectedRoute: Allowing access to protected route"

4. **DashboardLayout Logs**:
   - "DashboardLayout: Location changed"

5. **AuthProvider Logs**:
   - "SimplifiedAuthContext: Context value changed"

## Expected Flow

When a user completes registration, the expected flow should be:

1. FarmerSignup component calls `navigate('/farmer/enhanced-kyc-upload')`
2. React Router navigates to the KYC upload route
3. ProtectedRoute checks authentication and allows access
4. DashboardLayout renders the KYC upload component
5. EnhancedKYCDocumentUpload component mounts and fetches farmer data

## Troubleshooting Steps

If navigation issues persist, check for:

1. **Missing Navigation Call**: 
   - Look for "FarmerSignup: Attempting navigation" log
   - If missing, the navigation code is not being reached

2. **Blocked by ProtectedRoute**:
   - Look for "ProtectedRoute: Redirecting to login" or "ProtectedRoute: Role mismatch"
   - Check if user is properly authenticated with correct role

3. **Component Not Mounting**:
   - Look for "EnhancedKYCDocumentUpload: Component mounted"
   - If missing, the component is not being rendered

4. **Authentication State Issues**:
   - Look for "SimplifiedAuthContext: Context value changed"
   - Check if user authentication state is correct

5. **Loading State Problems**:
   - Look for loading state logs
   - Check if components are stuck in loading states

## Additional Debugging

If the issue is still not resolved, you can:

1. Add breakpoints in the browser debugger
2. Check the React DevTools component tree
3. Monitor the Network tab for failed requests
4. Check for JavaScript errors that might prevent navigation