# Invitation System Setup Guide

## Overview

This guide explains how to set up and test the invitation system that allows administrators to invite new staff members to join the application.

## Prerequisites

1. Docker Desktop installed and running
2. Supabase CLI installed
3. Access to your Supabase project

## Setup Steps

### 1. Start Local Supabase Instance

```bash
docker desktop start
supabase start
```

### 2. Apply Database Migration

The invitation system requires a new database table. Apply the migration:

```bash
supabase migration up
```

This will create the `invitations` table with the following schema:

```sql
CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role user_role_enum NOT NULL,
  token text UNIQUE NOT NULL,
  invited_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  message text,
  accepted boolean DEFAULT false,
  accepted_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 3. Deploy to Production

To deploy the migration to your production Supabase instance:

```bash
supabase db push
```

### 4. Test the Invitation Flow

1. Log in as an administrator
2. Navigate to the Staff Management section
3. Click "Add Staff" to open the invitation dialog
4. Enter the email address, role, and optional message
5. Click "Send Invitation"
6. Check the recipient's email for the invitation
7. Click the invitation link in the email
8. Complete the account creation form
9. Verify the user is created with the correct role

## Key Features

### Invitation Creation

- Generates unique tokens for each invitation
- Sets expiration to 7 days from creation
- Stores invitation details in the database
- Sends email with secure invitation link

### Token Validation

- Checks if token exists in the database
- Verifies token has not expired
- Ensures invitation has not been previously accepted
- Provides clear error messages for invalid tokens

### Role Assignment

- Automatically assigns the correct role to new users
- Links users to the administrator who sent the invitation
- Maintains audit trail of invitations

## Security Considerations

1. **Token Security**: Tokens are randomly generated and unique
2. **Expiration**: Invitations expire after 7 days
3. **Single Use**: Tokens can only be used once
4. **Role-Based Access**: Only administrators can create invitations
5. **Database Constraints**: Foreign key relationships ensure data integrity

## Troubleshooting

### Common Issues

1. **406 Error**: Ensure the accept-invite route is properly configured
2. **Invalid Token**: Check that the token exists and hasn't expired
3. **Email Not Received**: Verify the Resend API key and domain configuration
4. **Role Not Assigned**: Check database constraints and RLS policies

### Debugging Steps

1. Check browser console for JavaScript errors
2. Verify database records in the `invitations` table
3. Confirm Supabase Edge Functions are deployed correctly
4. Test invitation flow with different email addresses

## Testing

### Manual Testing

1. Create invitation as admin user
2. Receive email with invitation link
3. Click link and verify token validation
4. Complete account creation form
5. Verify role assignment in database
6. Test with expired tokens
7. Test with already accepted tokens

### Automated Testing

The system includes unit tests for:
- Token generation and validation
- Invitation creation and storage
- Role assignment functionality
- Error handling scenarios

## Future Improvements

1. **Invitation Analytics**: Track acceptance rates and patterns
2. **Bulk Invitations**: Allow multiple invitations at once
3. **Custom Expiration**: Let admins set custom expiration dates
4. **Invitation Reminders**: Automatically send reminders for unaccepted invitations
5. **Role Templates**: Predefined role configurations for common scenarios