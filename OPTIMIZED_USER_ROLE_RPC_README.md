# Optimized User Role RPC Function

## Problem
The existing `get_user_role_secure` RPC function was timing out during authentication, causing warnings and fallback to slower direct queries.

## Solution
Created an optimized RPC function that uses a database view for better performance.

## Files Created/Modified

### Migration File
- `supabase/migrations/20251213000100_create_optimized_user_role_rpc.sql`
  - Creates a `user_roles_view` for active user roles
  - Creates `get_user_role_optimized` RPC function
  - Adds performance index on `user_roles` table
  - Grants proper permissions

### Code Changes
- `src/lib/supabase/auth-service.ts`
  - Updated `fetchUserRoleFromRPC` to use the new optimized function
  - Increased timeout to 5000ms for consistency
  - Added retry logic with exponential backoff (2 retries)
  - Added explicit response parsing for both scalar and array formats
  - Added delay when called immediately after sign-in to ensure auth is ready
  - Enhanced logging for debugging

### Helper Files
- `apply_optimized_user_role_rpc.sql` - Instructions for applying the migration
- `test_optimized_user_role_rpc.sql` - Test queries to verify the new function

## How to Apply

1. **Apply the migration:**
   ```bash
   # If using Supabase CLI
   supabase db push

   # Or run the SQL directly in Supabase dashboard
   # Copy contents of 20251213000100_create_optimized_user_role_rpc.sql
   ```

2. **Test the function:**
   - Run queries from `test_optimized_user_role_rpc.sql`
   - Replace `'your-user-id-here'` with actual user IDs

3. **Verify in application:**
   - Login and check that RPC timeout warnings are reduced
   - Monitor authentication performance

## Improvements Made

1. **Increased timeout:** Consistent 5000ms timeout across the application
2. **Retry logic:** Added retry with exponential backoff (2 retries with 500ms base delay)
3. **Auth synchronization:** Added small delay when called immediately after sign-in
4. **Response parsing:** Enhanced to handle both scalar and array response formats
5. **Explicit casting:** Database function now explicitly casts role to TEXT
6. **Enhanced logging:** More detailed logging for debugging purposes
7. **Better error handling:** Improved error categorization and handling

## Testing

Run the test scripts to verify the improvements:
- `test-rpc-function.ts` - Tests the raw RPC function
- `test-auth-service-enhanced.ts` - Tests the enhanced auth service logic