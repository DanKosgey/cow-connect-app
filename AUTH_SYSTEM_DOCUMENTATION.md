# Authentication System Documentation

## Overview

This document describes the new authentication system for the Cow Connect application. The system has been redesigned to provide enhanced security, improved user experience, and better maintainability.

## Key Features

1. **Enhanced Security**
   - HTTP-only cookie storage for sessions
   - Automatic token refresh
   - Proper CSRF protection
   - Secure password validation

2. **Improved User Experience**
   - Unified login/signup flows
   - Better error handling
   - Loading states
   - "Remember Me" functionality

3. **Simplified Architecture**
   - Centralized authentication service
   - Reusable React hooks
   - Clear separation of concerns
   - Type-safe implementation

## Architecture

### Core Components

#### 1. Authentication Service (`auth-service.ts`)
The core authentication logic is encapsulated in a singleton service that handles:
- User authentication (login/signup)
- Session management
- Password reset functionality
- Role management

#### 2. React Context (`AuthContext.tsx`)
Provides authentication state to the entire application through React Context API.

#### 3. Custom Hooks
- `useAuth`: Main hook for accessing authentication state and methods
- `useUser`: Hook for accessing user-specific data

#### 4. UI Components
- `LoginForm`: Unified login form with role selection
- `SignupForm`: Account creation form
- `PasswordReset`: Password reset functionality
- `ProtectedRoute`: Route protection component

## Implementation Details

### File Structure
```
/src
  /lib
    /supabase
      client.ts          # Supabase client configuration
      auth-service.ts    # Core authentication service
  /hooks
    useAuth.ts           # Main authentication hook
    useUser.ts           # User data hook
  /contexts
    AuthContext.tsx      # Authentication context provider
  /components
    /auth
      LoginForm.tsx      # Unified login form
      SignupForm.tsx     # Signup form
      PasswordReset.tsx  # Password reset components
      ProtectedRoute.tsx # Protected route component
  /utils
    auth-helpers.ts      # Authentication helper functions
```

### Authentication Flow

1. **Login Process**
   - User selects their role
   - Enters email and password
   - Credentials are validated
   - Session is created
   - User is redirected to role-specific dashboard

2. **Signup Process**
   - User selects their role
   - Provides required information
   - Account is created in Supabase
   - Role is assigned in user_roles table
   - Role-specific profile is created
   - User receives email verification

3. **Session Management**
   - Sessions are automatically refreshed before expiration
   - Cross-tab synchronization using BroadcastChannel API
   - Proper cleanup on logout

### Security Measures

1. **Session Storage**
   - Uses HTTP-only cookies instead of localStorage
   - Prevents XSS attacks

2. **CSRF Protection**
   - Built-in CSRF protection through Supabase

3. **Password Validation**
   - Minimum 6-character requirement
   - Can be extended with additional complexity rules

4. **Rate Limiting**
   - Backend rate limiting for authentication endpoints

## Usage Examples

### Protecting Routes
```tsx
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { UserRole } from '@/types/auth.types';

const AdminDashboard = () => (
  <ProtectedRoute requiredRole={UserRole.ADMIN}>
    <div>Admin Dashboard Content</div>
  </ProtectedRoute>
);
```

### Using Authentication Hooks
```tsx
import { useAuth } from '@/hooks/useAuth';

const UserProfile = () => {
  const { user, logout } = useAuth();
  
  return (
    <div>
      <p>Welcome, {user?.email}!</p>
      <button onClick={logout}>Sign Out</button>
    </div>
  );
};
```

### Checking User Roles
```tsx
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types/auth.types';

const RoleBasedComponent = () => {
  const { hasRole } = useAuth();
  
  if (hasRole(UserRole.ADMIN)) {
    return <AdminPanel />;
  }
  
  if (hasRole(UserRole.FARMER)) {
    return <FarmerDashboard />;
  }
  
  return <Unauthorized />;
};
```

## Migration from Old System

### Key Changes
1. **Removed Complex Session Management**: The old system had redundant session management logic spread across multiple files. The new system centralizes this in the auth service.

2. **Simplified Role Checking**: Role checking now happens through a simple `hasRole` method instead of complex caching mechanisms.

3. **Unified Login Flow**: Instead of separate login pages for each role, there's now a unified login with role selection.

4. **Better Error Handling**: More consistent and user-friendly error handling throughout the authentication flow.

### Migration Steps
1. Replace imports of `SimplifiedAuthContext` with the new `AuthContext`
2. Update route protection components to use the new `ProtectedRoute`
3. Replace direct calls to authManager with the new authService
4. Update UI components to use the new login/signup forms

## Testing

The authentication system includes comprehensive tests:
- Unit tests for the authentication service
- Hook tests for useAuth and useUser
- Helper function tests
- Component tests for UI elements

Run tests with:
```bash
npm test
```

## Troubleshooting

### Common Issues

1. **Session Not Persisting**
   - Check browser cookie settings
   - Ensure HTTPS in production
   - Verify Supabase configuration

2. **Role-Based Access Not Working**
   - Verify user_roles table has correct entries
   - Check role assignment during signup
   - Confirm role checking logic

3. **Login Redirect Loops**
   - Check ProtectedRoute implementation
   - Verify dashboard paths in routing configuration
   - Ensure proper session validation

### Debugging Tips

1. Enable verbose logging in development
2. Check browser developer tools for network requests
3. Verify Supabase auth logs
4. Test with fresh user accounts

## Future Improvements

1. **Multi-Factor Authentication**: Add support for 2FA
2. **OAuth Providers**: Integrate Google, GitHub login
3. **Session Activity Tracking**: Track user activity for security
4. **Advanced Role Management**: Implement permission-based access control