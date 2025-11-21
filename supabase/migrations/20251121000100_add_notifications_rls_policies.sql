-- Migration: 20251121000100_add_notifications_rls_policies.sql
-- Description: Add RLS policies for notifications table to allow users to manage their own notifications
-- and allow staff/admins to send notifications on behalf of the system

BEGIN;

-- Ensure RLS is enabled on notifications
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

-- Staff and admins can insert notifications (for system notifications)
DROP POLICY IF EXISTS "Staff and admins can insert notifications" ON public.notifications;
CREATE POLICY "Staff and admins can insert notifications" ON public.notifications
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('staff', 'admin')
      AND ur.active = true
    )
  );

-- Admins can delete notifications
DROP POLICY IF EXISTS "Admins can delete notifications" ON public.notifications;
CREATE POLICY "Admins can delete notifications" ON public.notifications
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'admin'
      AND ur.active = true
    )
  );

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;

COMMIT;