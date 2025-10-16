-- Migration: 20251014000600_ensure_correct_function_signatures.sql
-- Description: Ensure approve_pending_farmer and reject_pending_farmer functions have correct signatures
-- Estimated time: 1 minute

-- ============================================
-- UP MIGRATION
-- ============================================

BEGIN;

-- Drop any existing functions with incorrect signatures
DROP FUNCTION IF EXISTS public.approve_pending_farmer(UUID, UUID);
DROP FUNCTION IF EXISTS public.approve_pending_farmer(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.reject_pending_farmer(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.reject_pending_farmer(UUID, UUID, TEXT, TEXT);

-- Recreate approve_pending_farmer function with correct signature
CREATE OR REPLACE FUNCTION public.approve_pending_farmer(
    p_pending_farmer_id UUID,
    p_admin_id UUID,
    p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSON
SECURITY DEFINER
AS $$
DECLARE
    v_pending_farmer pending_farmers%ROWTYPE;
    v_new_farmer_id UUID;
    v_document_count INTEGER;
    v_email_exists BOOLEAN;
    v_result JSON;
BEGIN
    -- Validation Phase
    -- Verify pending_farmer exists and status is 'email_verified' (new status values)
    SELECT * INTO v_pending_farmer 
    FROM pending_farmers 
    WHERE id = p_pending_farmer_id 
    AND status IN ('email_verified'); -- Only allow approval of email_verified farmers
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Pending farmer not found or invalid status. Only email_verified farmers can be approved.'
        );
    END IF;
    
    -- Verify all 3 KYC documents exist (id_front, id_back, selfie)
    SELECT COUNT(*) INTO v_document_count
    FROM kyc_documents 
    WHERE pending_farmer_id = p_pending_farmer_id
    AND document_type IN ('id_front', 'id_back', 'selfie')
    AND status = 'pending';
    
    IF v_document_count < 3 THEN
        RETURN json_build_object(
            'success', false,
            'message', 'All 3 KYC documents (ID front, ID back, selfie) must be uploaded and pending'
        );
    END IF;
    
    -- Verify admin_id has admin privileges
    IF NOT EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = p_admin_id AND role = 'admin' AND active = true
    ) THEN
        RETURN json_build_object(
            'success', false,
            'message', 'User is not authorized to approve farmers'
        );
    END IF;
    
    -- Verify farmer email doesn't already exist in farmers table
    SELECT EXISTS (
        SELECT 1 FROM farmers 
        WHERE email = v_pending_farmer.email
    ) INTO v_email_exists;
    
    IF v_email_exists THEN
        RETURN json_build_object(
            'success', false,
            'message', 'A farmer with this email already exists'
        );
    END IF;
    
    -- Transaction Phase
    -- Insert new record into farmers table with all data from pending_farmers
    INSERT INTO farmers (
        user_id, registration_number, national_id, phone_number, full_name, 
        address, farm_location, kyc_status, registration_completed, email,
        gender, number_of_cows, feeding_type, created_at, updated_at,
        created_by, updated_by
    ) VALUES (
        v_pending_farmer.user_id, v_pending_farmer.registration_number, v_pending_farmer.national_id,
        v_pending_farmer.phone_number, v_pending_farmer.full_name, v_pending_farmer.address,
        v_pending_farmer.farm_location, 'approved', true, v_pending_farmer.email,
        v_pending_farmer.gender, v_pending_farmer.number_of_cows, v_pending_farmer.feeding_type,
        v_pending_farmer.created_at, NOW(),
        p_admin_id, p_admin_id
    ) RETURNING id INTO v_new_farmer_id;
    
    -- Update kyc_documents records: set farmer_id = new farmer id, set pending_farmer_id = NULL
    UPDATE kyc_documents 
    SET farmer_id = v_new_farmer_id,
        pending_farmer_id = NULL,
        status = 'approved',
        updated_at = NOW()
    WHERE pending_farmer_id = p_pending_farmer_id;
    
    -- Update pending_farmers record: set status = 'approved', reviewed_at = now(), reviewed_by = admin_id
    UPDATE pending_farmers
    SET status = 'approved',
        reviewed_at = NOW(),
        reviewed_by = p_admin_id
    WHERE id = p_pending_farmer_id;
    
    -- Insert audit record into farmer_approval_history
    INSERT INTO farmer_approval_history (
        pending_farmer_id, farmer_id, admin_id, action, 
        previous_status, new_status, admin_notes, timestamp
    ) VALUES (
        p_pending_farmer_id, v_new_farmer_id, p_admin_id, 'approved',
        v_pending_farmer.status, 'approved', p_admin_notes, NOW()
    );
    
    -- Queue notification email: 'approved' type
    INSERT INTO farmer_notifications (
        pending_farmer_id, farmer_id, user_email, notification_type,
        subject, body, status, metadata
    ) VALUES (
        p_pending_farmer_id, v_new_farmer_id, v_pending_farmer.email, 'approved',
        '🎉 Your Farmer Account Has Been Approved!', 
        'Congratulations! Your farmer account has been approved. You can now access your dashboard and start using all features.',
        'pending',
        json_build_object(
            'pending_farmer_id', p_pending_farmer_id,
            'farmer_id', v_new_farmer_id,
            'admin_id', p_admin_id
        )
    );
    
    -- Return success result
    RETURN json_build_object(
        'success', true,
        'farmer_id', v_new_farmer_id,
        'message', 'Farmer approved successfully',
        'email_queued', true
    );
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log error to system log table (if exists)
        -- For now, just return error message
        RETURN json_build_object(
            'success', false,
            'message', 'An error occurred while approving the farmer: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql;

-- Recreate reject_pending_farmer function with correct signature
CREATE OR REPLACE FUNCTION public.reject_pending_farmer(
    p_pending_farmer_id UUID,
    p_admin_id UUID,
    p_rejection_reason TEXT,
    p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSON
SECURITY DEFINER
AS $$
DECLARE
    v_pending_farmer pending_farmers%ROWTYPE;
    v_new_rejection_count INTEGER;
    v_can_resubmit BOOLEAN;
    v_result JSON;
BEGIN
    -- Validation Phase
    -- Verify pending_farmer exists
    SELECT * INTO v_pending_farmer 
    FROM pending_farmers 
    WHERE id = p_pending_farmer_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Pending farmer not found'
        );
    END IF;
    
    -- Verify rejection_reason is not empty (required field)
    IF p_rejection_reason IS NULL OR TRIM(p_rejection_reason) = '' THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Rejection reason is required'
        );
    END IF;
    
    -- Verify admin_id has admin privileges
    IF NOT EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = p_admin_id AND role = 'admin' AND active = true
    ) THEN
        RETURN json_build_object(
            'success', false,
            'message', 'User is not authorized to reject farmers'
        );
    END IF;
    
    -- Check if farmer has been rejected too many times (max 3 rejections)
    v_new_rejection_count := v_pending_farmer.rejection_count + 1;
    
    IF v_new_rejection_count >= 3 THEN
        v_can_resubmit := false;
    ELSE
        v_can_resubmit := true;
    END IF;
    
    -- Transaction Phase
    -- Update pending_farmers
    UPDATE pending_farmers
    SET status = 'rejected',
        rejection_reason = p_rejection_reason,
        reviewed_at = NOW(),
        reviewed_by = p_admin_id,
        rejection_count = v_new_rejection_count
    WHERE id = p_pending_farmer_id;
    
    -- DO NOT delete KYC documents (allow resubmission)
    
    -- Insert audit record into farmer_approval_history
    INSERT INTO farmer_approval_history (
        pending_farmer_id, admin_id, action, 
        previous_status, new_status, rejection_reason, admin_notes, timestamp
    ) VALUES (
        p_pending_farmer_id, p_admin_id, 'rejected',
        v_pending_farmer.status, 'rejected', p_rejection_reason, p_admin_notes, NOW()
    );
    
    -- Queue notification email: 'rejected' type with specific reason
    INSERT INTO farmer_notifications (
        pending_farmer_id, user_email, notification_type,
        subject, body, status, metadata
    ) VALUES (
        p_pending_farmer_id, v_pending_farmer.email, 'rejected',
        'Action Required: Update Your KYC Documents',
        'Your farmer registration has been rejected. Reason: ' || p_rejection_reason || 
        '. Please review the requirements and resubmit your documents.',
        'pending',
        json_build_object(
            'pending_farmer_id', p_pending_farmer_id,
            'admin_id', p_admin_id,
            'rejection_reason', p_rejection_reason,
            'rejection_count', v_new_rejection_count,
            'can_resubmit', v_can_resubmit
        )
    );
    
    -- If rejection_count >= 3, flag for manual review (handled by application logic)
    
    -- Return success result
    RETURN json_build_object(
        'success', true,
        'message', 'Farmer application rejected',
        'rejection_count', v_new_rejection_count,
        'can_resubmit', v_can_resubmit,
        'email_queued', true
    );
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log error to system log table (if exists)
        -- For now, just return error message
        RETURN json_build_object(
            'success', false,
            'message', 'An error occurred while rejecting the farmer: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that functions were created with correct parameters
SELECT proname, proargnames FROM pg_proc WHERE proname IN ('approve_pending_farmer', 'reject_pending_farmer');

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================

/*
BEGIN;

-- Drop the recreated functions
DROP FUNCTION IF EXISTS public.approve_pending_farmer(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.reject_pending_farmer(UUID, UUID, TEXT, TEXT);

-- Restore original functions would go here if needed

COMMIT;
*/