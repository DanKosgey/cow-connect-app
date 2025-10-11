-- Migration: 20251011000100_farmer_registration_system.sql
-- Description: Create complete farmer registration system with all necessary tables and functions
-- Estimated time: 3 minutes

-- ============================================
-- UP MIGRATION
-- ============================================

BEGIN;

-- 1. Create pending_farmers table
CREATE TABLE IF NOT EXISTS public.pending_farmers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    registration_number TEXT UNIQUE,
    national_id TEXT,
    phone_number TEXT,
    full_name TEXT,
    email TEXT,
    address TEXT,
    farm_location TEXT,
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    number_of_cows INTEGER,
    feeding_type TEXT,
    kyc_complete BOOLEAN DEFAULT false,
    email_verified BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected')),
    rejection_reason TEXT,
    rejection_count INTEGER DEFAULT 0,
    submitted_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for pending_farmers
CREATE INDEX IF NOT EXISTS idx_pending_farmers_user_id ON pending_farmers(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_farmers_status ON pending_farmers(status);
CREATE INDEX IF NOT EXISTS idx_pending_farmers_email_verified ON pending_farmers(email_verified);
CREATE INDEX IF NOT EXISTS idx_pending_farmers_created_at ON pending_farmers(created_at);

-- 2. Modify kyc_documents table to add pending_farmer_id column if it doesn't exist
-- First check if the column exists, if not, add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'kyc_documents' 
        AND column_name = 'pending_farmer_id'
    ) THEN
        ALTER TABLE public.kyc_documents ADD COLUMN pending_farmer_id UUID REFERENCES pending_farmers(id) ON DELETE CASCADE;
    END IF;
END
$$;

-- Update existing kyc_documents records to set pending_farmer_id based on farmer_id
-- This is a one-time migration step to maintain data consistency
-- Only run if pending_farmer_id is NULL and farmer_id exists
UPDATE public.kyc_documents 
SET pending_farmer_id = (
    SELECT p.id 
    FROM public.pending_farmers p 
    JOIN public.farmers f ON p.user_id = f.user_id 
    WHERE f.id = public.kyc_documents.farmer_id
)
WHERE pending_farmer_id IS NULL AND farmer_id IS NOT NULL
AND EXISTS (
    SELECT 1 
    FROM public.pending_farmers p 
    JOIN public.farmers f ON p.user_id = f.user_id 
    WHERE f.id = public.kyc_documents.farmer_id
);

-- Make sure the farmer_id column can be NULL (to support the new workflow)
ALTER TABLE public.kyc_documents ALTER COLUMN farmer_id DROP NOT NULL;

-- Create indexes for kyc_documents
CREATE INDEX IF NOT EXISTS idx_kyc_documents_pending_farmer_id ON kyc_documents(pending_farmer_id);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_farmer_id ON kyc_documents(farmer_id);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_document_type ON kyc_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_status ON kyc_documents(status);

-- 3. Create farmer_approval_history table
CREATE TABLE IF NOT EXISTS public.farmer_approval_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pending_farmer_id UUID REFERENCES pending_farmers(id) ON DELETE CASCADE,
    farmer_id UUID REFERENCES public.farmers(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES auth.users(id),
    action TEXT CHECK (action IN ('submitted', 'approved', 'rejected', 'resubmitted')),
    previous_status TEXT,
    new_status TEXT,
    rejection_reason TEXT,
    admin_notes TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for farmer_approval_history
CREATE INDEX IF NOT EXISTS idx_farmer_approval_history_pending_farmer_id ON farmer_approval_history(pending_farmer_id);
CREATE INDEX IF NOT EXISTS idx_farmer_approval_history_farmer_id ON farmer_approval_history(farmer_id);
CREATE INDEX IF NOT EXISTS idx_farmer_approval_history_admin_id ON farmer_approval_history(admin_id);
CREATE INDEX IF NOT EXISTS idx_farmer_approval_history_action ON farmer_approval_history(action);
CREATE INDEX IF NOT EXISTS idx_farmer_approval_history_timestamp ON farmer_approval_history(timestamp);

-- 4. Create farmer_notifications table
CREATE TABLE IF NOT EXISTS public.farmer_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pending_farmer_id UUID REFERENCES pending_farmers(id) ON DELETE CASCADE,
    farmer_id UUID REFERENCES public.farmers(id) ON DELETE CASCADE,
    user_email TEXT,
    notification_type TEXT CHECK (notification_type IN ('kyc_submitted', 'approved', 'rejected', 'reminder')),
    subject TEXT,
    body TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ
);

-- Create indexes for farmer_notifications
CREATE INDEX IF NOT EXISTS idx_farmer_notifications_pending_farmer_id ON farmer_notifications(pending_farmer_id);
CREATE INDEX IF NOT EXISTS idx_farmer_notifications_farmer_id ON farmer_notifications(farmer_id);
CREATE INDEX IF NOT EXISTS idx_farmer_notifications_user_email ON farmer_notifications(user_email);
CREATE INDEX IF NOT EXISTS idx_farmer_notifications_notification_type ON farmer_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_farmer_notifications_status ON farmer_notifications(status);
CREATE INDEX IF NOT EXISTS idx_farmer_notifications_created_at ON farmer_notifications(created_at);

-- 5. Create approve_pending_farmer function
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
    -- Verify pending_farmer exists and status is 'submitted' or 'under_review'
    SELECT * INTO v_pending_farmer 
    FROM pending_farmers 
    WHERE id = p_pending_farmer_id 
    AND status IN ('submitted', 'under_review');
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Pending farmer not found or invalid status'
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

-- 6. Create reject_pending_farmer function
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

-- 7. Create resubmit_kyc_documents function
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
    -- Update pending_farmers: status = 'draft', rejection_reason = NULL
    UPDATE pending_farmers
    SET status = 'draft',
        rejection_reason = NULL
    WHERE id = p_pending_farmer_id;
    
    -- Keep existing KYC documents (will be replaced by new uploads)
    
    -- Insert audit log: action = 'resubmitted'
    INSERT INTO farmer_approval_history (
        pending_farmer_id, action, 
        previous_status, new_status, timestamp
    ) VALUES (
        p_pending_farmer_id, 'resubmitted',
        'rejected', 'draft', NOW()
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

-- 8. Create get_pending_farmers_for_review function
CREATE OR REPLACE FUNCTION public.get_pending_farmers_for_review(
    p_admin_id UUID,
    p_status_filter TEXT DEFAULT 'submitted',
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
    id UUID,
    user_id UUID,
    full_name TEXT,
    email TEXT,
    phone_number TEXT,
    gender TEXT,
    national_id TEXT,
    address TEXT,
    farm_location TEXT,
    number_of_cows INTEGER,
    feeding_type TEXT,
    status TEXT,
    email_verified BOOLEAN,
    registration_number TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID,
    rejection_reason TEXT,
    rejection_count INTEGER,
    kyc_complete BOOLEAN,
    id_front_url TEXT,
    id_back_url TEXT,
    selfie_url TEXT,
    submission_date TIMESTAMPTZ,
    days_pending INTEGER,
    rejection_history_count BIGINT,
    last_rejection_reason TEXT
)
AS $$
BEGIN
    -- Verify admin_id has admin privileges
    IF NOT EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = p_admin_id AND role = 'admin' AND active = true
    ) THEN
        -- Return empty result set if not admin
        RETURN QUERY SELECT 
            NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, 
            NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::INTEGER, NULL::TEXT, NULL::TEXT, 
            NULL::BOOLEAN, NULL::TEXT, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, 
            NULL::TIMESTAMPTZ, NULL::UUID, NULL::TEXT, NULL::INTEGER, NULL::BOOLEAN, 
            NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ, NULL::INTEGER, 
            NULL::BIGINT, NULL::TEXT
        WHERE false;
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT 
        pf.id,
        pf.user_id,
        pf.full_name,
        pf.email,
        pf.phone_number,
        pf.gender,
        pf.national_id,
        pf.address,
        pf.farm_location,
        pf.number_of_cows,
        pf.feeding_type,
        pf.status,
        pf.email_verified,
        pf.registration_number,
        pf.created_at,
        pf.updated_at,
        pf.submitted_at,
        pf.reviewed_at,
        pf.reviewed_by,
        pf.rejection_reason,
        pf.rejection_count,
        pf.kyc_complete,
        -- Document URLs (simplified - actual implementation would generate signed URLs)
        (SELECT file_path FROM kyc_documents WHERE pending_farmer_id = pf.id AND document_type = 'id_front' LIMIT 1) as id_front_url,
        (SELECT file_path FROM kyc_documents WHERE pending_farmer_id = pf.id AND document_type = 'id_back' LIMIT 1) as id_back_url,
        (SELECT file_path FROM kyc_documents WHERE pending_farmer_id = pf.id AND document_type = 'selfie' LIMIT 1) as selfie_url,
        pf.submitted_at as submission_date,
        -- Days pending calculation
        CASE 
            WHEN pf.submitted_at IS NOT NULL THEN 
                EXTRACT(DAY FROM (NOW() - pf.submitted_at))::INTEGER
            ELSE 0
        END as days_pending,
        -- Rejection history count
        (SELECT COUNT(*) FROM farmer_approval_history WHERE pending_farmer_id = pf.id AND action = 'rejected') as rejection_history_count,
        -- Last rejection reason
        (SELECT rejection_reason FROM farmer_approval_history 
         WHERE pending_farmer_id = pf.id AND action = 'rejected' 
         ORDER BY timestamp DESC LIMIT 1) as last_rejection_reason
    FROM pending_farmers pf
    WHERE pf.status = COALESCE(p_status_filter, 'submitted')
    ORDER BY 
        -- Priority: First-time submissions before resubmissions
        pf.rejection_count ASC,
        -- Then by submission date (oldest first)
        pf.submitted_at ASC NULLS LAST
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- 9. Create submit_kyc_for_review function (updated version that allows submission without email verification)
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

-- Check that tables were created
SELECT tablename FROM pg_tables WHERE tablename IN ('pending_farmers', 'kyc_documents', 'farmer_approval_history', 'farmer_notifications');

-- Check that functions were created
SELECT proname FROM pg_proc WHERE proname IN 
('approve_pending_farmer', 'reject_pending_farmer', 'resubmit_kyc_documents', 
'get_pending_farmers_for_review', 'submit_kyc_for_review');

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================

/*
BEGIN;

DROP FUNCTION IF EXISTS public.submit_kyc_for_review(UUID, UUID);
DROP FUNCTION IF EXISTS public.get_pending_farmers_for_review(UUID, TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.resubmit_kyc_documents(UUID, UUID);
DROP FUNCTION IF EXISTS public.reject_pending_farmer(UUID, UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.approve_pending_farmer(UUID, UUID, TEXT);

DROP TABLE IF EXISTS public.farmer_notifications;
DROP TABLE IF EXISTS public.farmer_approval_history;
-- Don't drop kyc_documents or pending_farmers as they may be used by other parts of the system
-- Instead, we would remove the pending_farmer_id column if needed

COMMIT;
*/