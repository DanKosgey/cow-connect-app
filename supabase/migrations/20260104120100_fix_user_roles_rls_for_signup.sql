-- Fix RLS policies for user_roles table to allow new user signup
-- This migration ensures that authenticated users can assign themselves the 'farmer' role during signup

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert own role" ON user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
DROP POLICY IF EXISTS "Service role can manage all roles" ON user_roles;

-- Enable RLS on user_roles table (if not already enabled)
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to INSERT their own 'farmer' role during signup
-- This is safe because we only allow the 'farmer' role for self-assignment
CREATE POLICY "Users can insert own farmer role"
ON user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND role = 'farmer'
);

-- Policy: Allow users to view their own roles
CREATE POLICY "Users can view own roles"
ON user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Allow users to update their own roles (set active/inactive)
CREATE POLICY "Users can update own roles"
ON user_roles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Allow service role to manage all roles (for admin operations)
CREATE POLICY "Service role can manage all roles"
ON user_roles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Optional: Allow admins to manage roles
-- Uncomment if you have an admin role system
-- CREATE POLICY "Admins can manage all roles"
-- ON user_roles
-- FOR ALL
-- TO authenticated
-- USING (
--   EXISTS (
--     SELECT 1 FROM user_roles ur
--     WHERE ur.user_id = auth.uid()
--     AND ur.role = 'admin'
--     AND ur.active = true
--   )
-- )
-- WITH CHECK (
--   EXISTS (
--     SELECT 1 FROM user_roles ur
--     WHERE ur.user_id = auth.uid()
--     AND ur.role = 'admin'
--     AND ur.active = true
--   )
-- );
