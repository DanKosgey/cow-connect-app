# Authentication Troubleshooting Guide

This guide helps diagnose and resolve common authentication issues in the Dairy Farmers of Trans-Nzoia application.

## Common Authentication Issues

### 1. Unable to Login
**Symptoms:**
- Login appears to succeed but redirects back to login page
- "Invalid credentials" error despite correct credentials
- Login button gets stuck in loading state

**Solutions:**
1. **Check User Role**: Ensure the user has the correct role assigned in the `user_roles` table
2. **Clear Browser Cache**: Clear localStorage and sessionStorage
3. **Verify Database Records**: Check that user exists in `auth.users` and has corresponding records in `profiles` and role-specific tables

### 2. Session Timeout Issues
**Symptoms:**
- Unexpected logout after short periods
- "Session expired" errors
- Inability to perform actions that require authentication

**Solutions:**
1. **Check Session Configuration**: Verify Supabase auth settings in `client.ts`
2. **Network Connectivity**: Ensure stable internet connection
3. **Token Refresh**: Check if automatic token refresh is working

### 3. Role-Based Access Issues
**Symptoms:**
- Access denied to pages that should be accessible
- Incorrect redirection between portals
- Missing navigation items

**Solutions:**
1. **Verify User Role**: Check `user_roles` table for correct role assignment
2. **Check ProtectedRoute Configuration**: Verify role requirements in route files
3. **Clear Auth Cache**: Clear cached authentication data

## Diagnostic Tools

### Auth Test Page
Navigate to `/admin/auth-test` to access the authentication diagnostics page. This page provides:

1. **Login Testing**: Test login with different credentials and roles
2. **Session Information**: View current session details
3. **User Information**: View current user details
4. **Role Information**: View assigned roles
5. **Cache Management**: Clear authentication cache
6. **Session Refresh**: Force session refresh

### Manual Diagnostics
You can also run these commands in the browser console:

```javascript
// Check current session
supabase.auth.getSession().then(console.log);

// Check current user
supabase.auth.getUser().then(console.log);

// Sign out
supabase.auth.signOut();

// Refresh session
supabase.auth.refreshSession().then(console.log);
```

## Database Verification

### Check User Records
```sql
-- Check if user exists in auth.users
SELECT id, email, confirmed_at FROM auth.users WHERE email = 'user@example.com';

-- Check user profile
SELECT * FROM profiles WHERE id = 'user-uuid';

-- Check user role
SELECT * FROM user_roles WHERE user_id = 'user-uuid';

-- Check role-specific records
SELECT * FROM farmers WHERE user_id = 'user-uuid';
SELECT * FROM staff WHERE user_id = 'user-uuid';
```

## Common Fixes

### 1. Clear Authentication Cache
```javascript
// Run in browser console
localStorage.removeItem('cached_user');
localStorage.removeItem('cached_role');
localStorage.removeItem('auth_cache_timestamp');
localStorage.removeItem('pending_profile');
sessionStorage.clear();
```

### 2. Force Session Refresh
Navigate to the Auth Test Page and click "Force Session Refresh"

### 3. Complete Sign Out
Use the sign out button on the Auth Test Page or run:
```javascript
supabase.auth.signOut();
```

### 4. Verify Role Assignment
Ensure the user has the correct role in the `user_roles` table:
```sql
INSERT INTO user_roles (user_id, role) 
VALUES ('user-uuid', 'admin') 
ON CONFLICT (user_id) 
DO UPDATE SET role = 'admin';
```

## Prevention Tips

1. **Regular Session Management**: The system automatically refreshes sessions every 10 minutes
2. **Proper Sign Out**: Always use the sign out function rather than just closing the browser
3. **Network Stability**: Maintain a stable internet connection to prevent session interruptions
4. **Browser Compatibility**: Use modern browsers for best authentication experience

## Support

If issues persist after trying these solutions:
1. Check browser console for error messages
2. Verify Supabase project configuration
3. Contact system administrator for database access issues
4. Review logs in Supabase dashboard