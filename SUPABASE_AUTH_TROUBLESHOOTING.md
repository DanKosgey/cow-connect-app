# Supabase Authentication Troubleshooting

This guide helps diagnose and resolve common Supabase authentication issues in the Dairy Farmers of Trans-Nzoia application.

## Common Authentication Issues

### 1. Login Process Hangs
**Symptoms:**
- "Attempting login" message appears in console but nothing else happens
- Login button stays in loading state indefinitely
- No success or error callback is triggered

**Root Causes:**
1. **Network timeouts** - Supabase requests timing out
2. **Database query hangs** - getUserRole function not returning
3. **RPC function issues** - log_auth_event function problems
4. **Session conflicts** - Existing session interfering with new login

### 2. Role Validation Failures
**Symptoms:**
- Login succeeds but redirects back to login page
- "Invalid role" error messages
- Access denied to role-specific pages

### 3. Session Management Issues
**Symptoms:**
- Unexpected logouts
- Stale session data
- Authentication state inconsistencies

## Diagnostic Steps

### 1. Check User and Role Existence
Navigate to `/admin/auth-debug` and use the "Check User Exists" function to verify:
- User exists in the `auth.users` table
- User has an entry in the `user_roles` table with the correct role

### 2. Test Direct Authentication
Use the "Test Direct Login" function on the debug page to bypass role checking and determine if the issue is with Supabase authentication or role validation.

### 3. Clear Session Data
Use the "Clear Session" button to remove all cached authentication data.

## Solutions

### 1. Add Timeouts to Prevent Hanging
The updated AuthContext now includes timeouts for all Supabase operations:
- getUserRole: 10 second timeout
- signInWithPassword: 15 second timeout
- RPC calls: 5 second timeout

### 2. Improved Error Handling
Enhanced error handling with better logging and error context.

### 3. Session Cleanup
Ensure proper session cleanup on authentication errors.

## Database Verification Queries

Run these queries in your Supabase SQL editor:

```sql
-- Check if admin user exists
SELECT id, email, confirmed_at FROM auth.users WHERE email = 'admin@g.com';

-- Check if user has profile
SELECT * FROM profiles WHERE email = 'admin@g.com';

-- Check user role assignment
SELECT * FROM user_roles WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@g.com');

-- Check if log_auth_event function exists
SELECT proname FROM pg_proc WHERE proname = 'log_auth_event';
```

## Common Fixes

### 1. Recreate Admin User
If the user or role data is missing:

```sql
-- Insert user role if missing
INSERT INTO user_roles (user_id, role) 
SELECT id, 'admin' 
FROM auth.users 
WHERE email = 'admin@g.com'
ON CONFLICT (user_id) 
DO UPDATE SET role = 'admin';

-- Ensure profile exists
INSERT INTO profiles (id, full_name, email)
SELECT id, 'Admin User', email
FROM auth.users 
WHERE email = 'admin@g.com'
ON CONFLICT (id) 
DO NOTHING;
```

### 2. Check RPC Function
Verify the log_auth_event function exists and works:

```sql
-- Test the RPC function
SELECT * FROM log_auth_event('test-user-id', 'LOGIN', '{"test": "data"}');
```

### 3. Clear All Auth Data
Run this in the browser console:

```javascript
// Clear all Supabase auth data
localStorage.clear();
sessionStorage.clear();

// Force sign out
supabase.auth.signOut();
```

## Prevention Tips

1. **Monitor Network**: Ensure stable internet connection
2. **Regular Maintenance**: Periodically clear cache and session data
3. **Database Health**: Monitor Supabase database performance
4. **Error Logging**: Check console logs for detailed error information

## Support Resources

- Supabase Documentation: https://supabase.com/docs
- Supabase Status: https://status.supabase.com/
- Application Logs: Check browser console for detailed error messages