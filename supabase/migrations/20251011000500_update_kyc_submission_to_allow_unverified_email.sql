-- Migration: 20251011000400_update_kyc_submission_to_allow_unverified_email.sql
-- Description: Update submit_kyc_for_review function to allow submission without email verification
-- Estimated time: 1 minute
-- Backup recommendations: Not required for function update

-- ============================================
-- UP MIGRATION
-- ============================================

BEGIN;

-- Update submit_kyc_for_review function to allow submission without email verification
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
    
    -- Verify each document file exists in storage bucket
    -- This would typically be handled at the application level
    
    -- Verify document upload timestamps are recent (within 24 hours)
    -- This would typically be handled at the application level
    
    -- ALLOW submission even if email is not verified
    -- Email verification is no longer a blocker for document submission
    
    -- Verify no pending submission already exists
    IF v_pending_farmer.status = 'submitted' THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Documents already submitted for review'
        );
    END IF;
    
    -- Document Quality Checks (basic)
    -- Verify each file size > 50KB (not empty)
    -- Verify file MIME types are valid (image/jpeg, image/png, application/pdf)
    -- These would typically be handled at the application level
    
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
    
    -- Queue notification: new submission alert to admin team
    -- This would typically be handled by a trigger or separate process
    
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

-- Revert to previous version of the function (if needed)
-- This would require the previous function definition

COMMIT;
*/