# Authentication Troubleshooting Guide

## Common Login Issues and Solutions

### 1. Stuck Authentication State
If you're unable to log in because of cached authentication data:

1. **Navigate to the diagnostics page**: Go to `/admin/diagnostics` or `/admin/auth-debug`
2. **Clear all authentication data**: Click the "Clear All Auth Data" button
3. **Go to the login page**: Click "Go to Login" or navigate to `/admin/login`
4. **Try logging in again** with your credentials

### 2. Session Persistence Issues
If you're automatically logged in but can't access the correct pages:

1. **Sign out completely**: Use the "Sign Out" button on the login page
2. **Clear browser cache**: 
   - Press `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
   - Select "Cached images and files" and "Cookies and other site data"
   - Set time range to "All time"
   - Click "Clear data"
3. **Restart your browser**
4. **Try logging in again**

### 3. Role Validation Problems
If login succeeds but you're redirected incorrectly:

1. **Check your user role** in the database:
   - Ensure your user account has the correct role in the `user_roles` table
   - For admin access, your role should be `admin`
2. **Clear cached role data**:
   - Use the diagnostics page to clear auth data
   - Or manually delete localStorage items:
     - `cached_role`
     - `auth_cache_timestamp`

### 4. Direct Database Verification
To verify your account exists and has the correct role:

1. **Check the `profiles` table**:
   - Your user ID should exist in the profiles table
2. **Check the `user_roles` table**:
   - Your user ID should have an entry with role `admin`
3. **Check the `auth.users` table** (Supabase Authentication):
   - Your email should be confirmed
   - Your account should not be disabled

### 5. Testing Credentials Directly
Use the Auth Debug page to test your credentials:

1. **Navigate to `/admin/auth-debug`**
2. **Enter your email and password**
3. **Click "Test Login"**
4. **Check the results** for any error messages

### 6. Browser Console Debugging
Open the browser console (`F12` or `Ctrl+Shift+J`) and look for:

1. **Authentication errors**
2. **Network request failures**
3. **JavaScript exceptions**

### 7. Network Issues
If authentication requests are failing:

1. **Check your internet connection**
2. **Verify the Supabase URL in your environment variables**
3. **Check if the Supabase service is accessible**

## Emergency Reset Procedure

If nothing else works:

1. **Clear all browser data** for the site:
   - Press `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
   - Select all options (browsing history, cookies, cache, etc.)
   - Set time range to "All time"
   - Click "Clear data"

2. **Restart your browser**

3. **Navigate to the diagnostics page**:
   - Go to `/admin/diagnostics`
   - Click "Clear All Auth Data"

4. **Try logging in again**

## Contact Support

If you continue to experience issues:

1. **Take a screenshot** of any error messages
2. **Note the time** the error occurred
3. **Check the browser console** for detailed error information
4. **Contact the development team** with this information

## Additional Notes

- The login button should automatically reset after 3 seconds on login failure
- All authentication data is cached for performance but can be cleared at any time
- Session timeouts are set to 2 hours of inactivity