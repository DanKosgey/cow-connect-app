-- Create missing tables for farmer approval workflow
-- These tables are needed by the approve_pending_farmer and reject_pending_farmer functions

-- 1. Create farmer_approval_history table
CREATE TABLE IF NOT EXISTS farmer_approval_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pending_farmer_id UUID REFERENCES pending_farmers(id) ON DELETE CASCADE,
    farmer_id UUID REFERENCES farmers(id) ON DELETE SET NULL,
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL CHECK (action IN ('approved', 'rejected', 'resubmitted')),
    previous_status TEXT,
    new_status TEXT,
    rejection_reason TEXT,
    admin_notes TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for farmer_approval_history
CREATE INDEX IF NOT EXISTS idx_farmer_approval_history_pending_farmer_id 
    ON farmer_approval_history(pending_farmer_id);
CREATE INDEX IF NOT EXISTS idx_farmer_approval_history_farmer_id 
    ON farmer_approval_history(farmer_id);
CREATE INDEX IF NOT EXISTS idx_farmer_approval_history_admin_id 
    ON farmer_approval_history(admin_id);
CREATE INDEX IF NOT EXISTS idx_farmer_approval_history_timestamp 
    ON farmer_approval_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_farmer_approval_history_action 
    ON farmer_approval_history(action);

-- 2. Create farmer_notifications table
CREATE TABLE IF NOT EXISTS farmer_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pending_farmer_id UUID REFERENCES pending_farmers(id) ON DELETE CASCADE,
    farmer_id UUID REFERENCES farmers(id) ON DELETE SET NULL,
    user_email TEXT NOT NULL,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('approved', 'rejected', 'resubmit_required', 'general')),
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for farmer_notifications
CREATE INDEX IF NOT EXISTS idx_farmer_notifications_pending_farmer_id 
    ON farmer_notifications(pending_farmer_id);
CREATE INDEX IF NOT EXISTS idx_farmer_notifications_farmer_id 
    ON farmer_notifications(farmer_id);
CREATE INDEX IF NOT EXISTS idx_farmer_notifications_user_email 
    ON farmer_notifications(user_email);
CREATE INDEX IF NOT EXISTS idx_farmer_notifications_status 
    ON farmer_notifications(status);
CREATE INDEX IF NOT EXISTS idx_farmer_notifications_notification_type 
    ON farmer_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_farmer_notifications_created_at 
    ON farmer_notifications(created_at);

-- Enable RLS on both tables
ALTER TABLE farmer_approval_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmer_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for farmer_approval_history
-- Admins can view all records
CREATE POLICY "Admins can view all approval history"
ON farmer_approval_history FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
    AND ur.active = true
  )
);

-- Farmers can view their own approval history
CREATE POLICY "Farmers can view own approval history"
ON farmer_approval_history FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM pending_farmers pf
    WHERE pf.id = farmer_approval_history.pending_farmer_id
    AND pf.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM farmers f
    WHERE f.id = farmer_approval_history.farmer_id
    AND f.user_id = auth.uid()
  )
);

-- Service role can manage all records
CREATE POLICY "Service role can manage all approval history"
ON farmer_approval_history FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- RLS Policies for farmer_notifications
-- Admins can view all notifications
CREATE POLICY "Admins can view all notifications"
ON farmer_notifications FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
    AND ur.active = true
  )
);

-- Farmers can view their own notifications
CREATE POLICY "Farmers can view own notifications"
ON farmer_notifications FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM pending_farmers pf
    WHERE pf.id = farmer_notifications.pending_farmer_id
    AND pf.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM farmers f
    WHERE f.id = farmer_notifications.farmer_id
    AND f.user_id = auth.uid()
  )
);

-- Service role can manage all notifications
CREATE POLICY "Service role can manage all notifications"
ON farmer_notifications FOR ALL TO service_role
USING (true) WITH CHECK (true);
