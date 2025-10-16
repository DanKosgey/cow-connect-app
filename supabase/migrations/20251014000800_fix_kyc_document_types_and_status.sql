-- Migration: 20251014000800_fix_kyc_document_types_and_status.sql
-- Description: Fix any inconsistencies in KYC document types and status for proper approval validation
-- Estimated time: 1 minute

-- ============================================
-- UP MIGRATION
-- ============================================

BEGIN;

-- Fix any document types that might be inconsistent
UPDATE kyc_documents 
SET document_type = 'id_front' 
WHERE document_type IN ('national_id_front', 'id front', 'id-front', 'front') 
AND pending_farmer_id IS NOT NULL;

UPDATE kyc_documents 
SET document_type = 'id_back' 
WHERE document_type IN ('national_id_back', 'id back', 'id-back', 'back') 
AND pending_farmer_id IS NOT NULL;

UPDATE kyc_documents 
SET document_type = 'selfie' 
WHERE document_type IN ('selfie_1', 'selfie1', 'photo', 'picture') 
AND pending_farmer_id IS NOT NULL;

-- Ensure all pending documents have the correct status
UPDATE kyc_documents 
SET status = 'pending' 
WHERE pending_farmer_id IS NOT NULL 
AND status NOT IN ('approved', 'rejected');

-- Create a function to check document completeness for a pending farmer
-- This can be used for debugging and verification
CREATE OR REPLACE FUNCTION public.check_pending_farmer_documents(p_pending_farmer_id UUID)
RETURNS JSON
SECURITY DEFINER
AS $$
DECLARE
    v_document_count INTEGER;
    v_documents JSON;
BEGIN
    -- Count documents
    SELECT COUNT(*) INTO v_document_count
    FROM kyc_documents 
    WHERE pending_farmer_id = p_pending_farmer_id;
    
    -- Get document details
    SELECT json_agg(
        json_build_object(
            'document_type', document_type,
            'status', status,
            'file_name', file_name
        )
    ) INTO v_documents
    FROM kyc_documents 
    WHERE pending_farmer_id = p_pending_farmer_id;
    
    RETURN json_build_object(
        'pending_farmer_id', p_pending_farmer_id,
        'total_documents', v_document_count,
        'documents', v_documents,
        'has_required_documents', v_document_count >= 3,
        'document_types', (
            SELECT json_agg(DISTINCT document_type)
            FROM kyc_documents 
            WHERE pending_farmer_id = p_pending_farmer_id
        )
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check document types and counts for pending farmers
SELECT 
    pending_farmer_id,
    COUNT(*) as document_count,
    COUNT(CASE WHEN document_type = 'id_front' THEN 1 END) as id_front_count,
    COUNT(CASE WHEN document_type = 'id_back' THEN 1 END) as id_back_count,
    COUNT(CASE WHEN document_type = 'selfie' THEN 1 END) as selfie_count,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count
FROM kyc_documents 
WHERE pending_farmer_id IS NOT NULL
GROUP BY pending_farmer_id
HAVING COUNT(*) > 0
ORDER BY document_count DESC
LIMIT 10;

COMMIT;

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================

/*
BEGIN;

-- Drop the check function
DROP FUNCTION IF EXISTS public.check_pending_farmer_documents(UUID);

COMMIT;
*/