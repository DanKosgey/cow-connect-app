-- Migration: 20251014000400_update_resubmit_kyc_function.sql
-- Description: Update resubmit_kyc_documents function to use correct status values
-- Estimated time: 1 minute

-- ============================================
-- UP MIGRATION
-- ============================================

BEGIN;

-- Update resubmit_kyc_documents function to use correct status values
CREATE OR REPLACE FUNCTION public.resubmit_kyc_documents(
    p_pending_farmer_id UUID,
    p_user_id UUID
)
RETURNS JSON
AS $$
DECLARE
    v_pending_farmer pending_farmers%ROWTYPE;
    v_attempts_remaining INTEGER;
    v_result JSON;
BEGIN
    -- Validation
    -- Verify pending_farmer belongs to user_id
    SELECT * INTO v_pending_farmer 
    FROM pending_farmers 
    WHERE id = p_pending_farmer_id AND user_id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Pending farmer not found or does not belong to user'
        );
    END IF;
    
    -- Verify current status is 'rejected'
    IF v_pending_farmer.status != 'rejected' THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Can only resubmit documents for rejected applications'
        );
    END IF;
    
    -- Verify rejection_count < 3 (max resubmissions)
    IF v_pending_farmer.rejection_count >= 3 THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Maximum resubmission attempts reached'
        );
    END IF;
    
    -- Verify previous rejection was at least 1 hour ago (prevent spam)
    IF v_pending_farmer.reviewed_at IS NOT NULL AND 
       v_pending_farmer.reviewed_at > NOW() - INTERVAL '1 hour' THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Must wait at least 1 hour after rejection before resubmitting'
        );
    END IF;
    
    -- Transaction
    -- Update pending_farmers: status = 'pending_verification', rejection_reason = NULL
    UPDATE pending_farmers
    SET status = 'pending_verification',
        rejection_reason = NULL
    WHERE id = p_pending_farmer_id;
    
    -- Keep existing KYC documents (will be replaced by new uploads)
    
    -- Insert audit log: action = 'resubmitted'
    INSERT INTO farmer_approval_history (
        pending_farmer_id, action, 
        previous_status, new_status, timestamp
    ) VALUES (
        p_pending_farmer_id, 'resubmitted',
        'rejected', 'pending_verification', NOW()
    );
    
    -- Queue notification to admin team (if needed)
    -- For now, we'll handle this in the application layer
    
    -- Calculate attempts remaining
    v_attempts_remaining := 2 - v_pending_farmer.rejection_count;
    
    -- Return success result
    RETURN json_build_object(
        'success', true,
        'message', 'You can now upload new documents',
        'rejection_reason', v_pending_farmer.rejection_reason,
        'attempts_remaining', v_attempts_remaining
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'An error occurred while preparing for resubmission: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that function was updated
SELECT proname FROM pg_proc WHERE proname = 'resubmit_kyc_documents';

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================

/*
BEGIN;

-- Recreate original function with old status values
-- (Original function would be restored here)

COMMIT;
*/