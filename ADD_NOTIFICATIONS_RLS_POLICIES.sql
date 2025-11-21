-- SQL Commands to add RLS policies for notifications table
-- Run these commands in the Supabase Dashboard SQL editor

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