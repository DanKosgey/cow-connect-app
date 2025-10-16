# Navigation Diagnostics

## Purpose

This document describes the diagnostic tools added to help identify and resolve navigation issues in the farmer registration and KYC upload flow.

## Diagnostic Components Added

### 1. NavigationDiagnostics Component

**File**: `src/components/NavigationDiagnostics.tsx`

A diagnostic component that displays:
- Current path
- User authentication status
- User role
- Loading state
- Quick navigation buttons for testing

This component is only visible in development mode.

### 2. Integration Points

**Files Modified**:
1. `src/pages/auth/FarmerSignup.tsx` - Added NavigationDiagnostics at the top
2. `src/pages/farmer/EnhancedKYCDocumentUpload.tsx` - Added NavigationDiagnostics at the top

## How to Use

### In Development Mode

1. **View Diagnostic Information**: The diagnostic panel will automatically appear at the top of the Farmer Signup and KYC Upload pages
2. **Test Navigation**: Use the buttons to navigate to different pages and observe the behavior
3. **Check Console Logs**: Monitor browser console for detailed navigation state changes

### Diagnostic Information Provided

- **Current Path**: Shows the current URL path
- **User Status**: Displays authentication status and user ID
- **Role Information**: Shows the user's role
- **Loading State**: Indicates if authentication context is still loading

## Common Navigation Issues to Look For

1. **Authentication Redirects**: Users being redirected to login despite being authenticated
2. **Role Mismatches**: Users being redirected to wrong dashboards due to role issues
3. **Route Guard Issues**: ProtectedRoute component blocking access incorrectly
4. **Loading State Problems**: Components not rendering due to prolonged loading states

## Testing Scenarios

1. **Registration Flow**:
   - Complete registration process
   - Verify navigation to KYC upload page
   - Check that user remains authenticated

2. **KYC Submission**:
   - Upload documents
   - Submit for review
   - Verify navigation to application status page

3. **Page Refreshes**:
   - Refresh pages during different stages
   - Verify authentication state persistence

## Console Logging

The diagnostic component logs navigation state changes to the console:
- Location changes
- Authentication state updates
- Navigation attempts

These logs can help identify where in the flow issues might be occurring.

## Troubleshooting Steps

If navigation issues are observed:

1. **Check Console Logs**: Look for error messages or unexpected redirects
2. **Verify Authentication**: Ensure user is properly authenticated with correct role
3. **Test Direct Navigation**: Try navigating directly to URLs to see if issue is with redirects
4. **Check ProtectedRoute Logic**: Verify role checking logic isn't blocking access incorrectly
5. **Examine Loading States**: Ensure components aren't stuck in loading states

## Additional Debugging

For more detailed debugging, you can:

1. Add additional console.log statements in navigation functions
2. Check browser network tab for failed requests
3. Verify service worker isn't interfering with navigation
4. Check for any JavaScript errors that might prevent navigation