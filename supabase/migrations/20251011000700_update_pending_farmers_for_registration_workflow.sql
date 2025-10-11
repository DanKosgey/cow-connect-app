-- Migration: 20251011000700_update_pending_farmers_for_registration_workflow.sql
-- Description: Add missing columns to pending_farmers table for complete registration workflow
-- Estimated time: 1 minute

-- ============================================
-- UP MIGRATION
-- ============================================

BEGIN;

-- Add missing columns to pending_farmers table if they don't exist
DO $$
BEGIN
    -- Add age column with validation
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'pending_farmers' 
        AND column_name = 'age'
    ) THEN
        ALTER TABLE public.pending_farmers ADD COLUMN age INTEGER CHECK (age >= 18 AND age <= 100);
    END IF;

    -- Add id_number column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'pending_farmers' 
        AND column_name = 'id_number'
    ) THEN
        ALTER TABLE public.pending_farmers ADD COLUMN id_number TEXT;
    END IF;

    -- Add breeding_method column with validation
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'pending_farmers' 
        AND column_name = 'breeding_method'
    ) THEN
        ALTER TABLE public.pending_farmers ADD COLUMN breeding_method TEXT 
        CHECK (breeding_method IN ('male_bull', 'artificial_insemination', 'both'));
    END IF;

    -- Add cow_breeds column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'pending_farmers' 
        AND column_name = 'cow_breeds'
    ) THEN
        ALTER TABLE public.pending_farmers ADD COLUMN cow_breeds JSONB DEFAULT '[]'::jsonb;
    END IF;

    -- Add indexes for performance
    CREATE INDEX IF NOT EXISTS idx_pending_farmers_age 
        ON public.pending_farmers (age);
    CREATE INDEX IF NOT EXISTS idx_pending_farmers_id_number 
        ON public.pending_farmers (id_number);
    CREATE INDEX IF NOT EXISTS idx_pending_farmers_breeding_method 
        ON public.pending_farmers (breeding_method);
END
$$;

-- Update existing functions to ensure they work with the new schema
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
    
    -- Verify no pending submission already exists
    IF v_pending_farmer.status = 'submitted' THEN
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

-- Check that tables have the required columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'pending_farmers' 
AND column_name IN ('age', 'id_number', 'breeding_method', 'cow_breeds')
ORDER BY ordinal_position;

-- Check that indexes were created
SELECT indexname FROM pg_indexes WHERE tablename = 'pending_farmers' AND indexname LIKE 'idx_pending_farmers_%';

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================

/*
BEGIN;

-- This migration is additive and doesn't remove columns to avoid data loss
-- In a rollback scenario, you would need to manually remove columns if needed

COMMIT;
*/