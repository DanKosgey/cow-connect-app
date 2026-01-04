-- ============================================================================
-- STAFF ONBOARDING SYSTEM - DATABASE SCHEMA
-- ============================================================================
-- Complete end-to-end staff invitation and approval system
-- ============================================================================

-- 1. Create staff_invitations table
CREATE TABLE IF NOT EXISTS staff_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    invitation_token TEXT UNIQUE NOT NULL,
    suggested_role TEXT CHECK (suggested_role IN ('staff', 'collector', 'creditor', 'admin')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for staff_invitations
CREATE INDEX IF NOT EXISTS idx_staff_invitations_email ON staff_invitations(email);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_token ON staff_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_status ON staff_invitations(status);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_invited_by ON staff_invitations(invited_by);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_expires_at ON staff_invitations(expires_at);

-- 2. Create pending_staff table (similar to pending_farmers)
CREATE TABLE IF NOT EXISTS pending_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    invitation_id UUID REFERENCES staff_invitations(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone_number TEXT,
    national_id TEXT,
    address TEXT,
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    date_of_birth DATE,
    requested_role TEXT CHECK (requested_role IN ('staff', 'collector', 'creditor')),
    assigned_role TEXT CHECK (assigned_role IN ('staff', 'collector', 'creditor', 'admin')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for pending_staff
CREATE INDEX IF NOT EXISTS idx_pending_staff_user_id ON pending_staff(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_staff_email ON pending_staff(email);
CREATE INDEX IF NOT EXISTS idx_pending_staff_status ON pending_staff(status);
CREATE INDEX IF NOT EXISTS idx_pending_staff_invitation_id ON pending_staff(invitation_id);
CREATE INDEX IF NOT EXISTS idx_pending_staff_requested_role ON pending_staff(requested_role);

-- 3. Create staff_approval_history table
CREATE TABLE IF NOT EXISTS staff_approval_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pending_staff_id UUID REFERENCES pending_staff(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL CHECK (action IN ('approved', 'rejected')),
    previous_status TEXT,
    new_status TEXT,
    assigned_role TEXT,
    rejection_reason TEXT,
    admin_notes TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for staff_approval_history
CREATE INDEX IF NOT EXISTS idx_staff_approval_history_pending_staff_id ON staff_approval_history(pending_staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_approval_history_admin_id ON staff_approval_history(admin_id);
CREATE INDEX IF NOT EXISTS idx_staff_approval_history_timestamp ON staff_approval_history(timestamp);

-- 4. Create staff_notifications table
CREATE TABLE IF NOT EXISTS staff_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pending_staff_id UUID REFERENCES pending_staff(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('invitation', 'approved', 'rejected', 'general')),
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for staff_notifications
CREATE INDEX IF NOT EXISTS idx_staff_notifications_pending_staff_id ON staff_notifications(pending_staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_notifications_user_email ON staff_notifications(user_email);
CREATE INDEX IF NOT EXISTS idx_staff_notifications_status ON staff_notifications(status);
CREATE INDEX IF NOT EXISTS idx_staff_notifications_notification_type ON staff_notifications(notification_type);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE staff_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_approval_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_notifications ENABLE ROW LEVEL SECURITY;

-- staff_invitations policies
CREATE POLICY "Admins can manage all invitations"
ON staff_invitations FOR ALL TO authenticated
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

CREATE POLICY "Anyone can view invitation by token"
ON staff_invitations FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "Service role can manage all invitations"
ON staff_invitations FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- pending_staff policies
CREATE POLICY "Users can insert own pending staff record"
ON pending_staff FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own pending staff record"
ON pending_staff FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all pending staff"
ON pending_staff FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
    AND ur.active = true
  )
);

CREATE POLICY "Admins can manage all pending staff"
ON pending_staff FOR ALL TO authenticated
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

CREATE POLICY "Service role can manage all pending staff"
ON pending_staff FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- staff_approval_history policies
CREATE POLICY "Admins can view all staff approval history"
ON staff_approval_history FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
    AND ur.active = true
  )
);

CREATE POLICY "Users can view own staff approval history"
ON staff_approval_history FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM pending_staff ps
    WHERE ps.id = staff_approval_history.pending_staff_id
    AND ps.user_id = auth.uid()
  )
);

CREATE POLICY "Service role can manage all staff approval history"
ON staff_approval_history FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- staff_notifications policies
CREATE POLICY "Admins can view all staff notifications"
ON staff_notifications FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
    AND ur.active = true
  )
);

CREATE POLICY "Users can view own staff notifications"
ON staff_notifications FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM pending_staff ps
    WHERE ps.id = staff_notifications.pending_staff_id
    AND ps.user_id = auth.uid()
  )
);

CREATE POLICY "Service role can manage all staff notifications"
ON staff_notifications FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to generate unique invitation token
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    token TEXT;
    exists BOOLEAN;
BEGIN
    LOOP
        -- Generate a random token (32 characters)
        token := encode(gen_random_bytes(24), 'base64');
        token := replace(token, '/', '_');
        token := replace(token, '+', '-');
        
        -- Check if token already exists
        SELECT EXISTS(SELECT 1 FROM staff_invitations WHERE invitation_token = token) INTO exists;
        
        -- If token doesn't exist, return it
        IF NOT exists THEN
            RETURN token;
        END IF;
    END LOOP;
END;
$$;

-- Function to create staff invitation
CREATE OR REPLACE FUNCTION create_staff_invitation(
    p_email TEXT,
    p_invited_by UUID,
    p_suggested_role TEXT DEFAULT 'staff'
)
RETURNS JSON
SECURITY DEFINER
AS $$
DECLARE
    v_token TEXT;
    v_invitation_id UUID;
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- Verify admin privileges
    IF NOT EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = p_invited_by AND role = 'admin' AND active = true
    ) THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Only admins can send invitations'
        );
    END IF;
    
    -- Check if email already has a pending invitation
    IF EXISTS (
        SELECT 1 FROM staff_invitations 
        WHERE email = p_email AND status = 'pending' AND expires_at > NOW()
    ) THEN
        RETURN json_build_object(
            'success', false,
            'message', 'An active invitation already exists for this email'
        );
    END IF;
    
    -- Generate token and set expiry (7 days)
    v_token := generate_invitation_token();
    v_expires_at := NOW() + INTERVAL '7 days';
    
    -- Create invitation
    INSERT INTO staff_invitations (
        email, invited_by, invitation_token, suggested_role, expires_at
    ) VALUES (
        p_email, p_invited_by, v_token, p_suggested_role, v_expires_at
    ) RETURNING id INTO v_invitation_id;
    
    -- Queue notification email
    INSERT INTO staff_notifications (
        user_email, notification_type, subject, body, metadata
    ) VALUES (
        p_email,
        'invitation',
        'You''ve been invited to join Dairy Farmers of Trans Nzoia',
        'You have been invited to join as ' || p_suggested_role || '. Click the link to complete your registration.',
        json_build_object(
            'invitation_id', v_invitation_id,
            'token', v_token,
            'suggested_role', p_suggested_role
        )
    );
    
    RETURN json_build_object(
        'success', true,
        'invitation_id', v_invitation_id,
        'token', v_token,
        'expires_at', v_expires_at
    );
END;
$$ LANGUAGE plpgsql;

-- Function to approve pending staff
CREATE OR REPLACE FUNCTION approve_pending_staff(
    p_pending_staff_id UUID,
    p_admin_id UUID,
    p_assigned_role TEXT,
    p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSON
SECURITY DEFINER
AS $$
DECLARE
    v_pending_staff pending_staff%ROWTYPE;
BEGIN
    -- Verify admin privileges
    IF NOT EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = p_admin_id AND role = 'admin' AND active = true
    ) THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Only admins can approve staff'
        );
    END IF;
    
    -- Get pending staff record
    SELECT * INTO v_pending_staff FROM pending_staff WHERE id = p_pending_staff_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Pending staff record not found'
        );
    END IF;
    
    -- Update pending_staff status
    UPDATE pending_staff
    SET status = 'approved',
        assigned_role = p_assigned_role,
        reviewed_at = NOW(),
        reviewed_by = p_admin_id,
        updated_at = NOW()
    WHERE id = p_pending_staff_id;
    
    -- Assign role to user
    INSERT INTO user_roles (user_id, role, active)
    VALUES (v_pending_staff.user_id, p_assigned_role, true)
    ON CONFLICT (user_id, role) DO UPDATE SET active = true;
    
    -- Create approval history record
    INSERT INTO staff_approval_history (
        pending_staff_id, admin_id, action, previous_status, 
        new_status, assigned_role, admin_notes
    ) VALUES (
        p_pending_staff_id, p_admin_id, 'approved', v_pending_staff.status,
        'approved', p_assigned_role, p_admin_notes
    );
    
    -- Queue notification
    INSERT INTO staff_notifications (
        pending_staff_id, user_email, notification_type, subject, body, metadata
    ) VALUES (
        p_pending_staff_id,
        v_pending_staff.email,
        'approved',
        'Your application has been approved!',
        'Congratulations! You have been approved as ' || p_assigned_role || '.',
        json_build_object('assigned_role', p_assigned_role)
    );
    
    RETURN json_build_object(
        'success', true,
        'message', 'Staff member approved successfully',
        'assigned_role', p_assigned_role
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error approving staff: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql;

-- Function to reject pending staff
CREATE OR REPLACE FUNCTION reject_pending_staff(
    p_pending_staff_id UUID,
    p_admin_id UUID,
    p_rejection_reason TEXT,
    p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSON
SECURITY DEFINER
AS $$
DECLARE
    v_pending_staff pending_staff%ROWTYPE;
BEGIN
    -- Verify admin privileges
    IF NOT EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = p_admin_id AND role = 'admin' AND active = true
    ) THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Only admins can reject staff'
        );
    END IF;
    
    -- Get pending staff record
    SELECT * INTO v_pending_staff FROM pending_staff WHERE id = p_pending_staff_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Pending staff record not found'
        );
    END IF;
    
    -- Update pending_staff status
    UPDATE pending_staff
    SET status = 'rejected',
        rejection_reason = p_rejection_reason,
        reviewed_at = NOW(),
        reviewed_by = p_admin_id,
        updated_at = NOW()
    WHERE id = p_pending_staff_id;
    
    -- Create approval history record
    INSERT INTO staff_approval_history (
        pending_staff_id, admin_id, action, previous_status, 
        new_status, rejection_reason, admin_notes
    ) VALUES (
        p_pending_staff_id, p_admin_id, 'rejected', v_pending_staff.status,
        'rejected', p_rejection_reason, p_admin_notes
    );
    
    -- Queue notification
    INSERT INTO staff_notifications (
        pending_staff_id, user_email, notification_type, subject, body, metadata
    ) VALUES (
        p_pending_staff_id,
        v_pending_staff.email,
        'rejected',
        'Application Update',
        'Your application has been rejected. Reason: ' || p_rejection_reason,
        json_build_object('rejection_reason', p_rejection_reason)
    );
    
    RETURN json_build_object(
        'success', true,
        'message', 'Staff application rejected'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Error rejecting staff: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql;
