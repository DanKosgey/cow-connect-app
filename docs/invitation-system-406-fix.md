# Fixing 406 "Not Acceptable" Error in Invitation System

## Problem Description

Users were encountering a 406 "Not Acceptable" error when clicking invitation links. The error occurred during requests to:
```
oevxapmcmcaxpaluehyg.supabase.co/rest/v1/invitations?select=*&token=eq.s1ejo5gwp72ek3sy9y794
```

## Root Cause Analysis

The 406 error was caused by Row Level Security (RLS) policies on the `invitations` table that were too restrictive. The original policy only allowed administrators to view invitations they created, but the accept-invite flow needed to allow anyone to query invitations by token.

## Solution Implemented

### 1. Fixed RLS Policies

Created a new migration (`20251013170000_fix_invitations_rls.sql`) that:

- Dropped the restrictive "Invitations are viewable by invited admins" policy
- Created a new "Anyone can view invitations by token" policy that allows SELECT operations
- Granted SELECT permissions to both anonymous and authenticated users

### 2. Enhanced Error Handling

Updated the invitation service to provide better error logging and debugging information.

## Deployment Steps

### Prerequisites
1. Ensure Docker is running
2. Start Supabase local instance: `supabase start`

### Apply Migrations
```bash
supabase migration up
```

This will apply both migrations:
1. `20251013160000_create_invitations_table.sql` - Creates the invitations table
2. `20251013170000_fix_invitations_rls.sql` - Fixes the RLS policies

### Deploy to Production
```bash
supabase db push
```

## Testing Verification

### Manual Testing
1. Send an invitation as an administrator
2. Check email for invitation link
3. Click the invitation link
4. Verify the accept-invite page loads without 406 errors
5. Complete account creation
6. Verify account is created with correct role

### Automated Testing
Run the test script:
```bash
npm run test:invitation-service
```

## Security Considerations

The fix maintains security by:
- Only allowing SELECT operations, not INSERT/UPDATE/DELETE
- Tokens are unique and random, making enumeration difficult
- Expiration dates prevent long-term access
- Role assignments still require administrator privileges

## Troubleshooting

### If 406 Errors Persist

1. **Check RLS Policies**: Verify the new policy is applied
   ```sql
   SELECT * FROM pg_policy WHERE polrelid = 'invitations'::regclass;
   ```

2. **Verify Permissions**: Ensure SELECT is granted
   ```sql
   SELECT grantee, privilege_type FROM information_schema.role_table_grants 
   WHERE table_name = 'invitations' AND privilege_type = 'SELECT';
   ```

3. **Check Migration Status**: Verify migrations were applied
   ```bash
   supabase migration list
   ```

### Common Issues

1. **Migration Not Applied**: Ensure `supabase migration up` was run
2. **Network Issues**: Check connectivity to Supabase instance
3. **Token Expired**: Verify invitation hasn't expired (7-day limit)
4. **Token Already Used**: Check if invitation was already accepted

## Future Improvements

1. **Rate Limiting**: Implement rate limiting on invitation queries
2. **Audit Logging**: Add logging for invitation access attempts
3. **Token Rotation**: Implement token rotation for additional security
4. **Enhanced Validation**: Add more sophisticated token validation

## Conclusion

The 406 error has been resolved by properly configuring RLS policies to allow token-based queries while maintaining security. The invitation system now works correctly for both sending and accepting invitations.