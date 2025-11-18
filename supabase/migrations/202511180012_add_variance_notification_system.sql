-- Migration: 202511180012_add_variance_notification_system.sql
-- Description: Add notification system for significant milk collection variances
-- This migration adds functionality to automatically notify supervisors when significant variances occur

BEGIN;

-- Create a table to store variance notification thresholds
CREATE TABLE IF NOT EXISTS public.variance_notification_thresholds (
  id bigserial PRIMARY KEY,
  variance_type variance_type_enum NOT NULL,
  threshold_percentage numeric NOT NULL,
  notification_recipients jsonb DEFAULT '[]'::jsonb, -- Array of user roles or specific user IDs
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(variance_type)
);

-- Create a function to send variance notifications
CREATE OR REPLACE FUNCTION public.send_variance_notification(
  p_collector_daily_summary_id uuid
)
RETURNS VOID
LANGUAGE plpgsql AS $$
DECLARE
  v_summary record;
  v_threshold record;
  v_notification_title text;
  v_notification_message text;
  v_recipient_roles jsonb;
  v_recipient_user_ids uuid[];
BEGIN
  -- Get the collector daily summary
  SELECT 
    cds.*,
    s.user_id as collector_user_id,
    p.full_name as collector_name
  INTO v_summary
  FROM public.collector_daily_summaries cds
  JOIN public.staff s ON cds.collector_id = s.id
  JOIN public.profiles p ON s.user_id = p.id
  WHERE cds.id = p_collector_daily_summary_id;
  
  -- If summary not found, exit
  IF NOT FOUND THEN
    RAISE NOTICE 'Collector daily summary not found: %', p_collector_daily_summary_id;
    RETURN;
  END IF;
  
  -- Check if there's a threshold for this variance type
  SELECT * INTO v_threshold
  FROM public.variance_notification_thresholds
  WHERE variance_type = v_summary.variance_type
    AND is_active = true;
  
  -- If no threshold found, exit
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Check if variance exceeds threshold
  IF ABS(v_summary.variance_percentage) >= v_threshold.threshold_percentage THEN
    -- Prepare notification content
    v_notification_title := 'Significant Milk Collection Variance Alert';
    
    v_notification_message := format(
      'Collector %s had a significant %s variance of %.2f%% on %s. Total collected: %.2fL, Company received: %.2fL, Variance: %.2fL',
      v_summary.collector_name,
      v_summary.variance_type,
      v_summary.variance_percentage,
      v_summary.collection_date,
      v_summary.total_liters_collected,
      v_summary.total_liters_received,
      v_summary.variance_liters
    );
    
    -- Get recipient roles
    v_recipient_roles := v_threshold.notification_recipients;
    
    -- Get user IDs for recipients
    SELECT ARRAY(
      SELECT DISTINCT ur.user_id
      FROM public.user_roles ur
      WHERE ur.role = ANY (ARRAY(SELECT jsonb_array_elements_text(v_recipient_roles)))
        AND ur.active = true
    ) INTO v_recipient_user_ids;
    
    -- Insert notifications for all recipients
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      category,
      created_at
    )
    SELECT 
      user_id,
      v_notification_title,
      v_notification_message,
      'alert',
      'variance',
      NOW()
    FROM unnest(v_recipient_user_ids) as user_id;
  END IF;
END;
$$;

-- Create a trigger function to automatically send notifications when daily summaries are approved
CREATE OR REPLACE FUNCTION public.trigger_send_variance_notification()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  -- Only send notification for new approvals
  IF NEW.approved_at IS NOT NULL AND OLD.approved_at IS NULL THEN
    PERFORM public.send_variance_notification(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically send notifications
DROP TRIGGER IF EXISTS trigger_send_variance_notification ON public.collector_daily_summaries;
CREATE TRIGGER trigger_send_variance_notification
  AFTER UPDATE ON public.collector_daily_summaries
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_send_variance_notification();

-- Insert default notification thresholds
INSERT INTO public.variance_notification_thresholds (
  variance_type,
  threshold_percentage,
  notification_recipients,
  is_active
) VALUES 
  ('positive', 5.0, '["admin", "staff"]'::jsonb, true),
  ('negative', 5.0, '["admin", "staff"]'::jsonb, true)
ON CONFLICT (variance_type) DO NOTHING;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.send_variance_notification TO authenticated;
GRANT EXECUTE ON FUNCTION public.trigger_send_variance_notification TO authenticated;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that tables were created
SELECT table_name FROM information_schema.tables WHERE table_name = 'variance_notification_thresholds';

-- Check that functions were created
SELECT proname FROM pg_proc WHERE proname IN ('send_variance_notification', 'trigger_send_variance_notification');

-- Check that trigger was created
SELECT tgname FROM pg_trigger WHERE tgname = 'trigger_send_variance_notification';

-- Check default thresholds
SELECT * FROM public.variance_notification_thresholds;

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================

/*
BEGIN;

-- Drop trigger
DROP TRIGGER IF EXISTS trigger_send_variance_notification ON public.collector_daily_summaries;

-- Drop functions
DROP FUNCTION IF EXISTS public.trigger_send_variance_notification;
DROP FUNCTION IF EXISTS public.send_variance_notification;

-- Drop table
DROP TABLE IF EXISTS public.variance_notification_thresholds;

COMMIT;
*/