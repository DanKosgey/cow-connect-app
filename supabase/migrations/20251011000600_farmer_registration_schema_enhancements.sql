-- Migration: 20251011000600_farmer_registration_schema_enhancements.sql
-- Description: Enhance farmer registration schema to align frontend and backend
-- Estimated time: 2 minutes

-- ============================================
-- UP MIGRATION
-- ============================================

BEGIN;

-- 1. Ensure pending_farmers table has all required columns
-- Add missing columns if they don't exist
DO $$
BEGIN
    -- Add age column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'pending_farmers' 
        AND column_name = 'age'
    ) THEN
        ALTER TABLE public.pending_farmers ADD COLUMN age INTEGER;
    END IF;

    -- Add id_number column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'pending_farmers' 
        AND column_name = 'id_number'
    ) THEN
        ALTER TABLE public.pending_farmers ADD COLUMN id_number TEXT;
    END IF;

    -- Add breeding_method column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'pending_farmers' 
        AND column_name = 'breeding_method'
    ) THEN
        ALTER TABLE public.pending_farmers ADD COLUMN breeding_method TEXT;
    END IF;

    -- Add cow_breeds column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'pending_farmers' 
        AND column_name = 'cow_breeds'
    ) THEN
        ALTER TABLE public.pending_farmers ADD COLUMN cow_breeds JSONB;
    END IF;

    -- Add gender column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'pending_farmers' 
        AND column_name = 'gender'
    ) THEN
        ALTER TABLE public.pending_farmers ADD COLUMN gender TEXT CHECK (gender IN ('male', 'female', 'other'));
    END IF;

    -- Add kyc_complete column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'pending_farmers' 
        AND column_name = 'kyc_complete'
    ) THEN
        ALTER TABLE public.pending_farmers ADD COLUMN kyc_complete BOOLEAN DEFAULT false;
    END IF;

    -- Add rejection_count column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'pending_farmers' 
        AND column_name = 'rejection_count'
    ) THEN
        ALTER TABLE public.pending_farmers ADD COLUMN rejection_count INTEGER DEFAULT 0;
    END IF;

    -- Add rejection_reason column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'pending_farmers' 
        AND column_name = 'rejection_reason'
    ) THEN
        ALTER TABLE public.pending_farmers ADD COLUMN rejection_reason TEXT;
    END IF;

    -- Add reviewed_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'pending_farmers' 
        AND column_name = 'reviewed_at'
    ) THEN
        ALTER TABLE public.pending_farmers ADD COLUMN reviewed_at TIMESTAMPTZ;
    END IF;

    -- Add reviewed_by column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'pending_farmers' 
        AND column_name = 'reviewed_by'
    ) THEN
        ALTER TABLE public.pending_farmers ADD COLUMN reviewed_by UUID REFERENCES auth.users(id);
    END IF;

    -- Add submitted_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'pending_farmers' 
        AND column_name = 'submitted_at'
    ) THEN
        ALTER TABLE public.pending_farmers ADD COLUMN submitted_at TIMESTAMPTZ;
    END IF;
END
$$;

-- 2. Ensure kyc_documents table has all required columns
-- Make sure the pending_farmer_id column exists and is properly configured
DO $$
BEGIN
    -- Add pending_farmer_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'kyc_documents' 
        AND column_name = 'pending_farmer_id'
    ) THEN
        ALTER TABLE public.kyc_documents ADD COLUMN pending_farmer_id UUID REFERENCES pending_farmers(id) ON DELETE CASCADE;
    END IF;

    -- Add rejection_reason column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'kyc_documents' 
        AND column_name = 'rejection_reason'
    ) THEN
        ALTER TABLE public.kyc_documents ADD COLUMN rejection_reason TEXT;
    END IF;

    -- Add verified_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'kyc_documents' 
        AND column_name = 'verified_at'
    ) THEN
        ALTER TABLE public.kyc_documents ADD COLUMN verified_at TIMESTAMPTZ;
    END IF;
END
$$;

-- 3. Update kyc_documents table to ensure proper constraints
-- Make farmer_id nullable to support the new workflow
ALTER TABLE public.kyc_documents ALTER COLUMN farmer_id DROP NOT NULL;

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pending_farmers_status ON pending_farmers(status);
CREATE INDEX IF NOT EXISTS idx_pending_farmers_email ON pending_farmers(email);
CREATE INDEX IF NOT EXISTS idx_pending_farmers_created_at ON pending_farmers(created_at);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_pending_farmer_id ON kyc_documents(pending_farmer_id);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_status ON kyc_documents(status);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_document_type ON kyc_documents(document_type);

-- 5. Update the farmers table to ensure it has all required columns
DO $$
BEGIN
    -- Add physical_address column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'farmers' 
        AND column_name = 'physical_address'
    ) THEN
        ALTER TABLE public.farmers ADD COLUMN physical_address TEXT;
    END IF;

    -- Add gps_latitude column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'farmers' 
        AND column_name = 'gps_latitude'
    ) THEN
        ALTER TABLE public.farmers ADD COLUMN gps_latitude NUMERIC;
    END IF;

    -- Add gps_longitude column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'farmers' 
        AND column_name = 'gps_longitude'
    ) THEN
        ALTER TABLE public.farmers ADD COLUMN gps_longitude NUMERIC;
    END IF;

    -- Add bank_account_name column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'farmers' 
        AND column_name = 'bank_account_name'
    ) THEN
        ALTER TABLE public.farmers ADD COLUMN bank_account_name TEXT;
    END IF;

    -- Add bank_account_number column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'farmers' 
        AND column_name = 'bank_account_number'
    ) THEN
        ALTER TABLE public.farmers ADD COLUMN bank_account_number TEXT;
    END IF;

    -- Add bank_name column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'farmers' 
        AND column_name = 'bank_name'
    ) THEN
        ALTER TABLE public.farmers ADD COLUMN bank_name TEXT;
    END IF;

    -- Add bank_branch column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'farmers' 
        AND column_name = 'bank_branch'
    ) THEN
        ALTER TABLE public.farmers ADD COLUMN bank_branch TEXT;
    END IF;
END
$$;

-- 6. Create or replace functions to ensure they match the current schema
CREATE OR REPLACE FUNCTION public.get_pending_farmers_for_review(
    p_admin_id UUID,
    p_status_filter TEXT DEFAULT 'email_verified',
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
    WHERE pf.status = COALESCE(p_status_filter, 'email_verified')
    ORDER BY 
        -- Priority: First-time submissions before resubmissions
        pf.rejection_count ASC,
        -- Then by submission date (oldest first)
        pf.submitted_at ASC NULLS LAST
    LIMIT p_limit
    OFFSET p_offset;
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
AND column_name IN ('age', 'id_number', 'breeding_method', 'cow_breeds', 'gender', 'kyc_complete', 'rejection_count', 'rejection_reason', 'reviewed_at', 'reviewed_by', 'submitted_at')
ORDER BY ordinal_position;

SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'kyc_documents' 
AND column_name IN ('pending_farmer_id', 'rejection_reason', 'verified_at')
ORDER BY ordinal_position;

SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'farmers' 
AND column_name IN ('physical_address', 'gps_latitude', 'gps_longitude', 'bank_account_name', 'bank_account_number', 'bank_name', 'bank_branch')
ORDER BY ordinal_position;

-- Check that indexes were created
SELECT indexname FROM pg_indexes WHERE tablename = 'pending_farmers' AND indexname LIKE 'idx_pending_farmers_%';
SELECT indexname FROM pg_indexes WHERE tablename = 'kyc_documents' AND indexname LIKE 'idx_kyc_documents_%';

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================

/*
BEGIN;

-- This migration is additive and doesn't remove columns to avoid data loss
-- In a rollback scenario, you would need to manually remove columns if needed

COMMIT;
*/