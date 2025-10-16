# Fix for 401 Unauthorized Error in Invitation System

## Problem Description

The invitation system was experiencing 401 Unauthorized errors when users tried to accept invitations. This was happening due to:

1. Missing Row Level Security (RLS) policies on the `user_roles` table
2. Insufficient permissions for users to insert their own role assignments
3. Authentication issues during the invitation acceptance flow
4. Poor error handling that didn't provide enough information for debugging
5. A circular dependency in RLS policies causing infinite recursion errors
6. Rate limiting issues with frequent account creation attempts
7. Row Level Security policy violations during role assignment

## Root Cause Analysis

The main issues were:

1. The `user_roles` table had RLS enabled but no policies allowing users to insert their own roles
2. When accepting an invitation, the system tried to insert a role assignment without proper authentication context
3. The invitation acceptance flow was not properly handling the authentication state transitions
4. Error messages were too generic to help with debugging
5. Complex RLS policies were causing recursion issues
6. Supabase auth has rate limiting for security purposes
7. Direct role assignment was violating RLS policies due to insufficient privileges

## Solution Implemented

### 1. Database Migration (`20251013180000_fix_user_roles_rls.sql`)

Created a new migration that:

- Enables RLS on the `user_roles` table if not already enabled
- Adds policies allowing:
  - Users to insert their own role assignments
  - Users to view their own roles
  - Users to update their own roles
  - Users to delete their own roles
  - Service role to manage all roles for backend operations
- Grants necessary permissions to authenticated users and service role

### 2. Updated Invitation Service

Modified the `acceptInvitation` method in `invitation-service.ts` to:

- Properly handle role assignment with appropriate error handling
- Include rollback functionality if role assignment fails
- Maintain better error logging for debugging
- Use Edge Function for role assignment to avoid RLS policy violations

### 3. Enhanced Accept Invite Page

Updated the `accept-invite.tsx` page to:

- Provide more detailed error messages to users
- Improve error handling and user feedback
- Ensure the flow works correctly with the updated invitation service
- Handle rate limiting errors from Supabase auth

### 4. Improved Error Handling

Enhanced error handling throughout the invitation flow:

- More specific error messages for different failure points
- Better logging for debugging purposes
- Clear feedback to users about what went wrong
- Special handling for rate limiting errors

### 5. Fixed RLS Policy Recursion Issue

Resolved the infinite recursion error in RLS policies by:

- Simplifying policy logic to avoid recursion
- Removing complex self-referencing policies
- Using straightforward user-based policies

### 6. Edge Function for Role Assignment

Created a dedicated Edge Function for role assignment to avoid RLS policy violations:

- Uses service role privileges to bypass RLS restrictions
- Provides secure role assignment during invitation acceptance
- Eliminates the need for complex client-side authentication during role assignment

## How to Apply the Fix

1. Apply the database migration:
   ```sql
   -- The migration will be automatically applied when you deploy
   ```

2. Deploy the updated frontend code

3. Deploy the Edge Functions:
   - `supabase/functions/send-email/index.ts`
   - `supabase/functions/assign-role/index.ts`

4. Test the invitation flow:
   - Create a new invitation
   - Click the invitation link
   - Complete the account creation process
   - Verify that the user is properly assigned their role

## Verification

After applying the fix, the following should work correctly:

- Invitation emails are sent successfully
- Invitation links can be clicked without 401 errors
- Users can create accounts through the invitation flow
- Users are properly assigned their roles
- Admins can still manage invitations and user roles
- Error messages are more informative for debugging
- No infinite recursion errors in RLS policies
- Rate limiting errors are handled gracefully
- Role assignment works without RLS policy violations

## Additional Notes

The fix ensures that:
- Security is maintained through proper RLS policies
- Users can only manage their own roles
- Error handling is improved for better debugging
- Users receive clear feedback when issues occur
- RLS policies are simple and avoid recursion issues
- Rate limiting is handled gracefully with appropriate user feedback
- Role assignment uses secure backend operations with proper privileges

## Troubleshooting

If you still encounter issues:

1. Check the browser console for detailed error messages
2. Verify that the database migration has been applied
3. Ensure that the Supabase RLS policies are correctly configured
4. Check that the user has a valid session when accepting the invitation
5. Verify that no circular dependencies exist in RLS policies
6. For rate limiting errors, wait for the specified time period before retrying
7. Ensure Edge Functions are deployed and working correctly

## Rate Limiting Information

Supabase Auth implements rate limiting for security purposes:
- Account creation requests are rate limited
- Users must wait a specified time period (typically 30 seconds) between attempts
- The system provides clear error messages with wait times
- Client-side code should handle these errors gracefully and inform users

## Edge Function Information

Two Edge Functions are used to handle backend operations:

1. `send-email`: Handles email delivery to eliminate CORS issues
2. `assign-role`: Handles role assignment with service role privileges to avoid RLS policy violations

These functions use the service role key for full access to database operations while keeping the key secure on the server side.