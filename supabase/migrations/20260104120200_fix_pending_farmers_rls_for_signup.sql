-- Fix RLS policies for pending_farmers table to allow new user signup
-- This migration ensures that authenticated users can create their pending farmer record during signup

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert own pending farmer record" ON pending_farmers;
DROP POLICY IF EXISTS "Users can view own pending farmer record" ON pending_farmers;
DROP POLICY IF EXISTS "Users can update own pending farmer record" ON pending_farmers;
DROP POLICY IF EXISTS "Admins can view all pending farmers" ON pending_farmers;
DROP POLICY IF EXISTS "Admins can manage all pending farmers" ON pending_farmers;
DROP POLICY IF EXISTS "Service role can manage all pending farmers" ON pending_farmers;

-- Enable RLS on pending_farmers table (if not already enabled)
ALTER TABLE pending_farmers ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to INSERT their own pending farmer record
CREATE POLICY "Users can insert own pending farmer record"
ON pending_farmers
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Allow users to view their own pending farmer record
CREATE POLICY "Users can view own pending farmer record"
ON pending_farmers
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Allow users to update their own pending farmer record
CREATE POLICY "Users can update own pending farmer record"
ON pending_farmers
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Allow admins to view all pending farmers
CREATE POLICY "Admins can view all pending farmers"
ON pending_farmers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
    AND ur.active = true
  )
);

-- Policy: Allow admins to manage all pending farmers (update/delete)
CREATE POLICY "Admins can manage all pending farmers"
ON pending_farmers
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
    AND ur.active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
    AND ur.active = true
  )
);

-- Policy: Allow service role to manage all pending farmers
CREATE POLICY "Service role can manage all pending farmers"
ON pending_farmers
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
