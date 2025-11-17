# Fix for PostgreSQL Role "admin" Does Not Exist Error

## Problem
The application is experiencing an error where the `get_user_role_secure` function fails with the message:
```
role "admin" does not exist (error code 22023)
```

This happens because the PostgreSQL function is trying to switch to or check for a role named "admin" that hasn't been created in the database.

## Solution

### 1. Apply the Database Migration
Run the migration file we created:
```
supabase/migrations/20251117000100_fix_get_user_role_function.sql
```

This migration will:
- Create the missing `admin` PostgreSQL role
- Create or replace the `get_user_role_secure` function with a proper implementation that doesn't use `SET ROLE`
- Set up proper Row Level Security (RLS) policies
- Grant necessary permissions

### 2. Verify the Fix
Run the diagnostic script:
```
diagnose-get-user-role.sql
```

This will check:
- If the admin role exists
- The function definition
- RLS policies
- Permissions

### 3. Test the Application
After applying the migration:
1. Restart your Supabase local development server (if using one)
2. Clear your browser cache and localStorage
3. Try logging in again

## What the Migration Does

### Creates the Missing Role
```sql
CREATE ROLE admin;
```

### Fixes the Function
The new implementation of `get_user_role_secure`:
- Uses `SECURITY DEFINER` instead of `SET ROLE`
- Queries the `user_roles` table directly
- Handles errors gracefully
- Returns the user's role without switching PostgreSQL roles

### Sets Up Proper RLS
- Enables RLS on the `user_roles` table
- Allows users to read their own role
- Allows service roles to read all roles

### Grants Permissions
- Grants execute permission on the function to authenticated users
- Grants necessary table permissions

## Alternative Solutions (If Migration Can't Be Applied)

If you can't apply the migration directly, you can run these commands in your Supabase SQL Editor:

```sql
-- 1. Create the missing admin role
CREATE ROLE admin;

-- 2. Fix the function
CREATE OR REPLACE FUNCTION public.get_user_role_secure(user_id_param UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM user_roles
  WHERE user_id = user_id_param AND active = true;
  
  RETURN user_role;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

-- 3. Enable RLS on user_roles table
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
CREATE POLICY "Users can read own role"
ON user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role can read all roles"
ON user_roles
FOR SELECT
TO service_role
USING (true);

-- 5. Grant permissions
GRANT SELECT ON user_roles TO authenticated;
GRANT ALL ON user_roles TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_role_secure(UUID) TO authenticated;
```

## Why This Happens

This error typically occurs when:
1. A PostgreSQL function uses `SET ROLE` to switch to a role that doesn't exist
2. The database schema was created without properly setting up all required roles
3. There's a mismatch between the expected roles in the application code and the actual database roles

The fix ensures that:
- All required roles exist
- Functions don't rely on switching roles unnecessarily
- Proper security mechanisms are in place