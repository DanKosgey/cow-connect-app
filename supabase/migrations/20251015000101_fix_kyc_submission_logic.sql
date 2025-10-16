-- Migration: 20251015000100_fix_kyc_submission_logic.sql
-- Description: Fix KYC submission logic to use correct status values and prevent duplicate submissions
-- Estimated time: 1 minute

-- ============================================
-- UP MIGRATION
-- ============================================

BEGIN;

-- Fix submit_kyc_for_review function to use correct status values and logic
CREATE OR REPLACE FUNCTION public.submit_kyc_for_review(
    p_pending_farmer_id UUID,
    p_user_id UUID
)
RETURNS JSON
AS $$
DECLARE
    v_pending_farmer pending_farmers%ROWTYPE;
    v_document_count INTEGER;
    v_result JSON;
BEGIN
    -- Pre-Submission Validation
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
    
    -- Verify all 3 documents uploaded (check kyc_documents table)
    SELECT COUNT(*) INTO v_document_count
    FROM kyc_documents 
    WHERE pending_farmer_id = p_pending_farmer_id
    AND document_type IN ('id_front', 'id_back', 'selfie');
    
    IF v_document_count < 3 THEN
        RETURN json_build_object(
            'success', false,
            'message', 'All 3 KYC documents (ID front, ID back, selfie) must be uploaded'
        );
    END IF;
    
    -- ALLOW submission even if email is not verified
    -- Email verification is no longer a blocker for document submission
    
    -- Check if documents are already submitted for review (correct logic)
    -- The correct check is to see if kyc_complete is already true and submitted_at is set
    IF v_pending_farmer.kyc_complete = true AND v_pending_farmer.submitted_at IS NOT NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Documents already submitted for review'
        );
    END IF;
    
    -- Transaction
    -- Update pending_farmers: status = 'submitted', submitted_at = now(), kyc_complete = true
    UPDATE pending_farmers
    SET status = 'submitted',
        submitted_at = NOW(),
        kyc_complete = true,
        updated_at = NOW()
    WHERE id = p_pending_farmer_id;
    
    -- Insert audit log: action = 'submitted'
    INSERT INTO farmer_approval_history (
        pending_farmer_id, action, 
        previous_status, new_status, timestamp
    ) VALUES (
        p_pending_farmer_id, 'submitted',
        v_pending_farmer.status, 'submitted', NOW()
    );
    
    -- Queue notification: 'kyc_submitted' to farmer
    INSERT INTO farmer_notifications (
        pending_farmer_id, user_email, notification_type,
        subject, body, status, metadata
    ) VALUES (
        p_pending_farmer_id, v_pending_farmer.email, 'kyc_submitted',
        'KYC Documents Received - Under Review',
        'Your KYC documents have been received and are under review. This typically takes 2-3 business days.',
        'pending',
        json_build_object(
            'pending_farmer_id', p_pending_farmer_id,
            'submission_id', p_pending_farmer_id
        )
    );
    
    -- Return success result
    RETURN json_build_object(
        'success', true,
        'message', 'KYC submitted for review',
        'submission_id', p_pending_farmer_id,
        'email_verified', v_pending_farmer.email_verified,
        'estimated_review_time', '2-3 business days'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'An error occurred while submitting KYC for review: ' || SQLERRM
        );
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that function was updated
SELECT proname FROM pg_proc WHERE proname = 'submit_kyc_for_review';

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================

/*
BEGIN;

-- Recreate original function with old logic
-- (Original function would be restored here)

COMMIT;
*/