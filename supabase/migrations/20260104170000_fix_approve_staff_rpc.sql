-- Migration to fix enum types and update approve_pending_staff RPC
-- Description: Adds 'collector' and 'creditor' to user_role_enum and updates approval logic.

BEGIN;

-- 1. Add new roles to user_role_enum if they don't exist
DO $$
BEGIN
    ALTER TYPE user_role_enum ADD VALUE IF NOT EXISTS 'collector';
    ALTER TYPE user_role_enum ADD VALUE IF NOT EXISTS 'creditor';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Update the RPC function
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
    v_profile_id UUID;
    v_role user_role_enum;
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
    
    -- Validate role exists in enum
    BEGIN
        v_role := p_assigned_role::user_role_enum;
    EXCEPTION WHEN invalid_text_representation THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Invalid role: ' || p_assigned_role
        );
    END;
    
    -- Get pending staff record
    SELECT * INTO v_pending_staff FROM pending_staff WHERE id = p_pending_staff_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Pending staff record not found'
        );
    END IF;
    
    -- 1. Update Profile
    UPDATE profiles
    SET 
        full_name = v_pending_staff.full_name,
        phone = v_pending_staff.phone_number,
        updated_at = NOW()
    WHERE id = v_pending_staff.user_id;

    -- 2. Create Staff Record
    INSERT INTO staff (
        user_id,
        employee_id,
        department,
        "position",
        hire_date,
        status,
        created_at,
        updated_at
    ) VALUES (
        v_pending_staff.user_id,
        'EMP' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0'),
        'General',
        p_assigned_role,
        CURRENT_DATE,
        'active',
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE
    SET 
        status = 'active',
        "position" = p_assigned_role,
        updated_at = NOW();

    -- 3. Update pending_staff status
    UPDATE pending_staff
    SET status = 'approved',
        assigned_role = p_assigned_role,
        reviewed_at = NOW(),
        reviewed_by = p_admin_id,
        updated_at = NOW()
    WHERE id = p_pending_staff_id;
    
    -- 4. Assign role to user
    INSERT INTO user_roles (user_id, role, active)
    VALUES (v_pending_staff.user_id, v_role, true)
    ON CONFLICT (user_id, role) DO UPDATE SET active = true;
    
    -- 5. Create approval history record
    INSERT INTO staff_approval_history (
        pending_staff_id, admin_id, action, previous_status, 
        new_status, assigned_role, admin_notes
    ) VALUES (
        p_pending_staff_id, p_admin_id, 'approved', v_pending_staff.status,
        'approved', p_assigned_role, p_admin_notes
    );
    
    -- 6. Queue notification
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

COMMIT;
