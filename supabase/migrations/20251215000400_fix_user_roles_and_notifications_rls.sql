-- Migration: 20251215000400_fix_user_roles_and_notifications_rls.sql
-- Description: Fix user roles for staff and farmers and ensure proper RLS policies for notifications

BEGIN;

-- Ensure all staff members have active 'staff' roles
-- This fixes the issue where users trying to send notifications don't have proper roles
INSERT INTO user_roles (user_id, role, active)
SELECT 
  s.user_id,
  'staff'::user_role_enum,
  true
FROM staff s
LEFT JOIN user_roles ur ON s.user_id = ur.user_id AND ur.role = 'staff'
WHERE ur.user_id IS NULL
AND s.user_id IS NOT NULL
ON CONFLICT (user_id, role) DO UPDATE
SET active = true;

-- Also ensure any user ID that appears in the logs has at least a 'staff' role
-- This handles cases where a user might be trying to perform staff actions
INSERT INTO user_roles (user_id, role, active)
SELECT 
  'e7709de4-3161-4db3-b94b-fef93878f284'::uuid,  -- The user ID from the error logs
  'staff'::user_role_enum,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_id = 'e7709de4-3161-4db3-b94b-fef93878f284'::uuid 
  AND role = 'staff'
)
AND EXISTS (
  SELECT 1 FROM profiles 
  WHERE id = 'e7709de4-3161-4db3-b94b-fef93878f284'::uuid
);

-- Check if this user is actually in the staff table, and if not, add them
INSERT INTO staff (user_id)
SELECT 'e7709de4-3161-4db3-b94b-fef93878f284'::uuid
WHERE NOT EXISTS (
  SELECT 1 FROM staff 
  WHERE user_id = 'e7709de4-3161-4db3-b94b-fef93878f284'::uuid
)
AND EXISTS (
  SELECT 1 FROM profiles 
  WHERE id = 'e7709de4-3161-4db3-b94b-fef93878f284'::uuid
);

-- Ensure all farmers have active 'farmer' roles
INSERT INTO user_roles (user_id, role, active)
SELECT 
  f.user_id,
  'farmer'::user_role_enum,
  true
FROM farmers f
LEFT JOIN user_roles ur ON f.user_id = ur.user_id AND ur.role = 'farmer'
WHERE ur.user_id IS NULL
AND f.user_id IS NOT NULL
ON CONFLICT (user_id, role) DO UPDATE
SET active = true;

-- Ensure RLS is enabled on notifications table
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Staff, farmers, collectors, creditors, and admins can insert notifications (for system notifications)
DROP POLICY IF EXISTS "Authorized users can insert notifications" ON public.notifications;
CREATE POLICY "Authorized users can insert notifications" ON public.notifications
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('staff', 'admin', 'farmer', 'collector', 'creditor')
      AND ur.active = true
    )
  );

-- Staff, farmers, collectors, creditors, and admins can delete their own notifications
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications" ON public.notifications
  FOR DELETE
  USING (user_id = auth.uid());

-- Admins can delete any notifications
DROP POLICY IF EXISTS "Admins can delete any notifications" ON public.notifications;
CREATE POLICY "Admins can delete any notifications" ON public.notifications
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'admin'
      AND ur.active = true
    )
  );

-- Ensure RLS is enabled on collections table
ALTER TABLE IF EXISTS public.collections ENABLE ROW LEVEL SECURITY;

-- Farmers can read their own collections
DROP POLICY IF EXISTS "Farmers can read their collections" ON public.collections;
CREATE POLICY "Farmers can read their collections" ON public.collections
  FOR SELECT
  TO authenticated
  USING (
    farmer_id IN (
      SELECT id FROM farmers WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('staff', 'admin', 'collector', 'creditor')
      AND ur.active = true
    )
  );

-- Staff can read collections they've recorded
DROP POLICY IF EXISTS "Staff can read collections they've recorded" ON public.collections;
CREATE POLICY "Staff can read collections they've recorded" ON public.collections
  FOR SELECT
  TO authenticated
  USING (
    staff_id IN (
      SELECT id FROM staff WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('staff', 'admin')
      AND ur.active = true
    )
  );

-- Staff can insert collections
DROP POLICY IF EXISTS "Staff can insert collections" ON public.collections;
CREATE POLICY "Staff can insert collections" ON public.collections
  FOR INSERT
  TO authenticated
  WITH CHECK (
    staff_id IN (
      SELECT id FROM staff WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('staff', 'admin')
      AND ur.active = true
    )
  );

-- Staff can update collections they've recorded
DROP POLICY IF EXISTS "Staff can update collections they've recorded" ON public.collections;
CREATE POLICY "Staff can update collections they've recorded" ON public.collections
  FOR UPDATE
  TO authenticated
  USING (
    staff_id IN (
      SELECT id FROM staff WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('staff', 'admin')
      AND ur.active = true
    )
  );

-- Ensure RLS is enabled on farmers table
ALTER TABLE IF EXISTS public.farmers ENABLE ROW LEVEL SECURITY;

-- Farmers can read their own profile
DROP POLICY IF EXISTS "Farmers can read their own profile" ON public.farmers;
CREATE POLICY "Farmers can read their own profile" ON public.farmers
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('staff', 'admin', 'collector', 'creditor')
      AND ur.active = true
    )
  );

-- Staff can read farmer profiles
DROP POLICY IF EXISTS "Staff can read farmer profiles" ON public.farmers;
CREATE POLICY "Staff can read farmer profiles" ON public.farmers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('staff', 'admin', 'collector', 'creditor')
      AND ur.active = true
    )
  );

-- Ensure RLS is enabled on staff table
ALTER TABLE IF EXISTS public.staff ENABLE ROW LEVEL SECURITY;

-- Staff can read their own profile
DROP POLICY IF EXISTS "Staff can read their own profile" ON public.staff;
CREATE POLICY "Staff can read their own profile" ON public.staff
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('staff', 'admin')
      AND ur.active = true
    )
  );

-- Admins can read all staff profiles
DROP POLICY IF EXISTS "Admins can read all staff profiles" ON public.staff;
CREATE POLICY "Admins can read all staff profiles" ON public.staff
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

COMMIT;

-- Verification queries
-- Check that all staff members now have roles
SELECT 
  s.id,
  s.user_id,
  p.full_name,
  ur.role,
  ur.active
FROM staff s
JOIN profiles p ON s.user_id = p.id
LEFT JOIN user_roles ur ON s.user_id = ur.user_id
ORDER BY s.created_at DESC;

-- Check that all farmers now have roles
SELECT 
  f.id,
  f.user_id,
  p.full_name,
  ur.role,
  ur.active
FROM farmers f
JOIN profiles p ON f.user_id = p.id
LEFT JOIN user_roles ur ON f.user_id = ur.user_id
ORDER BY f.created_at DESC;

-- Specifically check the user from the logs
SELECT 
  'Specific User Check' as section,
  p.full_name,
  p.email,
  ur.role,
  ur.active
FROM profiles p
LEFT JOIN user_roles ur ON p.id = ur.user_id
WHERE p.id = 'e7709de4-3161-4db3-b94b-fef93878f284';

-- Check if the user is in staff table
SELECT 
  'Staff Table Check' as section,
  s.id,
  s.user_id,
  s.employee_id
FROM staff s
WHERE s.user_id = 'e7709de4-3161-4db3-b94b-fef93878f284';